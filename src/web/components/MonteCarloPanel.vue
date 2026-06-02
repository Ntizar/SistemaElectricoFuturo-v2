<template>
  <div class="mc-panel" v-if="mostrar">
    <div class="mc-header">
      <h3>🎲 Monte Carlo — Simulación estocástica</h3>
      <button class="btn-close" @click="mostrar = false">×</button>
    </div>

    <div class="mc-controls">
      <div class="mc-param">
        <label>Nº de semillas</label>
        <select v-model.number="numSemillas">
          <option :value="10">10 (rápido)</option>
          <option :value="50">50 (normal)</option>
          <option :value="100">100 (detallado)</option>
          <option :value="200">200 (preciso)</option>
        </select>
      </div>

      <div class="mc-param">
        <label>Variación gas (±%)</label>
        <input type="range" v-model.number="varGas" min="10" max="80" step="5" />
        <span>{{ varGas }}%</span>
      </div>

      <div class="mc-param">
        <label>Variación CO₂ (±%)</label>
        <input type="range" v-model.number="varCO2" min="10" max="80" step="5" />
        <span>{{ varCO2 }}%</span>
      </div>

      <div class="mc-param">
        <label>Variación viento (±%)</label>
        <input type="range" v-model.number="varViento" min="5" max="40" step="5" />
        <span>{{ varViento }}%</span>
      </div>

      <button class="btn-ejecutar" @click="ejecutar" :disabled="ejecutando">
        {{ ejecutando ? `⏳ ${progreso}/${numSemillas}` : '▶ Ejecutar Monte Carlo' }}
      </button>
    </div>

    <!-- Resultados -->
    <div v-if="resultados.length > 0" class="mc-resultados">
      <div class="mc-estadisticas">
        <div class="stat">
          <span class="stat-label">Precio medio</span>
          <span class="stat-value">{{ estadisticas.precio.media }} €/MWh</span>
          <span class="stat-range">P5: {{ estadisticas.precio.p5 }} — P95: {{ estadisticas.precio.p95 }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Emisiones</span>
          <span class="stat-value">{{ estadisticas.emisiones.media }} MtCO₂</span>
          <span class="stat-range">P5: {{ estadisticas.emisiones.p5 }} — P95: {{ estadisticas.emisiones.p95 }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">ENS</span>
          <span class="stat-value">{{ estadisticas.ens.media }} TWh</span>
          <span class="stat-range">P5: {{ estadisticas.ens.p5 }} — P95: {{ estadisticas.ens.p95 }}</span>
        </div>
      </div>

      <!-- Histograma de precios -->
      <div ref="histogramaRef" class="mc-histograma"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick, watch } from 'vue';
import Plotly from 'plotly.js-dist-min';
import type { SimParams, SimResult } from '../../engine/types';
import { simular } from '../../engine/index';
import { getWeatherData, procesarOpenMeteo } from '../../engine/weather/open-meteo';
import { aplicarClimateShift } from '../../engine/weather/climate-shift';

const props = defineProps<{ params: SimParams }>();
const emit = defineEmits<{ (e: 'resultado', res: SimResult[]): void }>();

const mostrar = ref(true);
const numSemillas = ref(50);
const varGas = ref(30);
const varCO2 = ref(30);
const varViento = ref(15);
const ejecutando = ref(false);
const progreso = ref(0);
const resultados = ref<SimResult[]>([]);
const histogramaRef = ref<HTMLDivElement>();

function aleatorioSemilla(): SimParams {
  const p = JSON.parse(JSON.stringify(props.params));
  const gas = p.costes.precioGas;
  const co2 = p.costes.precioCO2;

  p.costes.precioGas = gas * (1 + (Math.random() - 0.5) * 2 * (varGas.value / 100));
  p.costes.precioCO2 = co2 * (1 + (Math.random() - 0.5) * 2 * (varCO2.value / 100));
  p.clima.factorViento = p.clima.factorViento * (1 + (Math.random() - 0.5) * 2 * (varViento.value / 100));

  return p;
}

const estadisticas = computed(() => {
  if (!resultados.value.length) return { precio: { media: 0, p5: 0, p95: 0 }, emisiones: { media: 0, p5: 0, p95: 0 }, ens: { media: 0, p5: 0, p95: 0 } };

  const precios = resultados.value.map(r => r.resumen.precioMedio).sort((a, b) => a - b);
  const emisiones = resultados.value.map(r => r.resumen.emisionesMtCO2).sort((a, b) => a - b);
  const ens = resultados.value.map(r => r.resumen.ensTWh).sort((a, b) => a - b);

  const p = (arr: number[], pct: number) => arr[Math.floor(arr.length * pct / 100)] || 0;
  const mean = (arr: number[]) => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 100) / 100;

  return {
    precio: { media: mean(precios), p5: p(precios, 5), p95: p(precios, 95) },
    emisiones: { media: mean(emisiones), p5: p(emisiones, 5), p95: p(emisiones, 95) },
    ens: { media: mean(ens), p5: p(ens, 5), p95: p(ens, 95) },
  };
});

async function ejecutar() {
  ejecutando.value = true;
  progreso.value = 0;
  resultados.value = [];

  // Descargar datos climáticos una vez
  const rawData = await getWeatherData(props.params.clima.anioReferencia);
  const base = procesarOpenMeteo(rawData);

  const semillas = [];
  for (let i = 0; i < numSemillas.value; i++) {
    semillas.push(aleatorioSemilla());
  }

  // Ejecutar en batches de 5
  const BATCH = 5;
  for (let i = 0; i < semillas.length; i += BATCH) {
    const batch = semillas.slice(i, i + BATCH);
    const promesas = batch.map(async (p) => {
      const weather = aplicarClimateShift(base, {
        deltaT: p.clima.deltaT,
        factorRadiacionSolar: p.clima.factorRadiacionSolar,
        factorViento: p.clima.factorViento,
        sequiaExtrema: p.clima.sequiaExtrema,
        hidraulicidad: p.clima.hidraulicidad,
        olaCalorExtrema: p.clima.olaCalorExtrema,
      });
      return simular(p, weather);
    });

    const batchResults = await Promise.all(promesas);
    resultados.value.push(...batchResults);
    progreso.value = Math.min(i + BATCH, semillas.length);
    await new Promise(r => setTimeout(r, 0)); // Yield to UI
  }

  ejecutando.value = false;
  emit('resultado', resultados.value);

  // Render histograma
  await nextTick();
  renderHistograma();
}

function renderHistograma() {
  if (!histogramaRef.value || !resultados.value.length) return;

  const precios = resultados.value.map(r => r.resumen.precioMedio);

  const trace = {
    x: precios,
    type: 'histogram' as const,
    nbinsx: 30,
    marker: { color: 'rgba(37, 99, 235, 0.6)', line: { color: '#3b82f6', width: 1 } },
  };

  const layout = {
    height: 250,
    margin: { t: 10, r: 20, b: 40, l: 50 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { family: 'Inter', color: '#94a3b8', size: 11 },
    xaxis: { title: 'Precio medio (€/MWh)', gridcolor: 'rgba(148,163,184,0.08)' },
    yaxis: { title: 'Frecuencia', gridcolor: 'rgba(148,163,184,0.08)' },
  };

  Plotly.react(histogramaRef.value, [trace], layout, { responsive: true, displayModeBar: false });
}
</script>

<style scoped>
.mc-panel {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 12px;
  padding: 1rem;
}

.mc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.8rem;
}

.mc-header h3 { font-size: 0.9rem; color: #e2e8f0; }

.btn-close {
  background: none;
  border: none;
  color: #64748b;
  font-size: 1.2rem;
  cursor: pointer;
}

.mc-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-end;
  margin-bottom: 1rem;
}

.mc-param {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.mc-param label {
  font-size: 0.75rem;
  color: #94a3b8;
}

.mc-param select, .mc-param span {
  background: rgba(30, 41, 59, 0.8);
  color: #e2e8f0;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 6px;
  padding: 0.3rem 0.5rem;
  font-size: 0.8rem;
}

.mc-param input[type="range"] {
  width: 120px;
}

.btn-ejecutar {
  padding: 0.6rem 1.2rem;
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.85rem;
}

.btn-ejecutar:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
}

.btn-ejecutar:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.mc-resultados {
  margin-top: 1rem;
}

.mc-estadisticas {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.8rem;
  margin-bottom: 1rem;
}

.stat {
  background: rgba(30, 41, 59, 0.4);
  border-radius: 8px;
  padding: 0.6rem 0.8rem;
}

.stat-label {
  display: block;
  font-size: 0.7rem;
  color: #64748b;
}

.stat-value {
  display: block;
  font-size: 1.1rem;
  font-weight: 700;
  color: #e2e8f0;
}

.stat-range {
  display: block;
  font-size: 0.7rem;
  color: #475569;
  margin-top: 0.15rem;
}

.mc-histograma {
  width: 100%;
  min-height: 250px;
}
</style>
