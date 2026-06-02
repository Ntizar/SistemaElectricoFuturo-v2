<template>
  <div class="app">
    <!-- Header -->
    <header class="app-header">
      <div class="header-left">
        <h1>⚡ Sistema Eléctrico Futuro</h1>
        <span class="version">v2.0 — Motor de Simulación</span>
      </div>
      <div class="header-right">
        <span v-if="progresoAnimacion" class="progreso">{{ progresoAnimacion }}</span>
        <span class="status" :class="statusClass">{{ statusText }}</span>
      </div>
    </header>

    <!-- KPIs -->
    <div v-if="errorMsg" class="error-banner">
      ⚠️ {{ errorMsg }}
      <button class="btn-dismiss" @click="errorMsg = null">×</button>
    </div>
    <KPICards :resumen="resultado?.resumen || null" />

    <!-- Main content -->
    <div class="main-layout">
      <!-- Control Panel -->
      <ControlPanel
        :cargando="cargando"
        @simular="ejecutarSimulacion"
        @params-change="onParamsChange"
      />

      <!-- Charts -->
      <div class="charts-area">
        <!-- Tabs -->
        <div class="chart-tabs">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            :class="['tab', { active: tabActivo === tab.id }]"
            @click="tabActivo = tab.id"
          >{{ tab.icon }} {{ tab.nombre }}</button>
        </div>

        <!-- Tab content -->
        <div class="tab-content">
          <HourlyChart v-if="tabActivo === 'mix'" :hourly="resultado?.hourly || []" />
          <TrajectoryChart v-if="tabActivo === 'trayectoria'" :trajectory="trayectoria" />
          <ComparisonView
            v-if="tabActivo === 'comparacion'"
            :escenarios="escenariosComparados"
            @remove="removeEscenario"
          />
          <HeatmapChart v-if="tabActivo === 'heatmap'" :hourly="resultado?.hourly || []" />
          <DispatchSankey v-if="tabActivo === 'sankey'" :resumen="resultado?.resumen || null" />
          <MonteCarloPanel v-if="tabActivo === 'mc'" :params="params" />
          <div v-if="tabActivo === 'info'" class="info-tab">
            <div class="info-content">
              <h3>ℹ️ Información del modelo</h3>
              <div class="info-grid">
                <div class="info-card">
                  <h4>🔧 Motor de simulación</h4>
                  <p>Merit-order con costes marginales corto plazo (SRMC). Despacho por precio creciente cada hora.</p>
                  <p><strong>Tecnologías:</strong> 12 tipos — Nuclear, Solar FV, Eólica On/Off, Hidro (flu/embalse), CCGT, Carbón, Baterías, Bombeo, V2G, Importación.</p>
                </div>
                <div class="info-card">
                  <h4>🌍 Datos climáticos</h4>
                  <p>Open-Meteo Archive API (2020-2025). Ajustes IPCC: ΔT, brightening solar, sequía hidro, factor viento.</p>
                  <p><strong>CF solar:</strong> GHI directo, CF eólico: viento 100m.</p>
                </div>
                <div class="info-card">
                  <h4>💰 Precios</h4>
                  <p>SRMC = sum(merito) + gas×heatrate + co₂×intensidad. Peajes (P1/P2/P3) + cargo de capacidad + superávit/déficit + CfD (si activo).</p>
                </div>
                <div class="info-card">
                  <h4>📦 Almacenamiento</h4>
                  <p>Baterías Li-ion (SOC, eficiencia 90%, degradación), Bombeo reversible (70-80% roundtrip), V2G (10GW/40GWh).</p>
                </div>
                <div class="info-card">
                  <h4>☢️ Nuclear</h4>
                  <p>Calendario ENRESA real: recarga cada ~18 meses, ~6-12 semanas por reactor. 7 reactores (7,336 MW).</p>
                </div>
                <div class="info-card">
                  <h4>📊 Calibración</h4>
                  <p>Validado contra REE 2025: precio 63€/MWh, demanda 248TWh, nuclear 51.9TWh (CF 0.90), solar 52.5TWh, eólica 55.6TWh.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <footer class="app-footer">
      <span>Sistema Eléctrico Futuro v2.0 — Motor de simulación del sistema eléctrico español</span>
      <span>Motor: TypeScript headless | Climatología: Open-Meteo | Calibración: REE 2025</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import ControlPanel from './components/ControlPanel.vue';
import KPICards from './components/KPICards.vue';
import HourlyChart from './components/HourlyChart.vue';
import TrajectoryChart from './components/TrajectoryChart.vue';
import ComparisonView from './components/ComparisonView.vue';
import MonteCarloPanel from './components/MonteCarloPanel.vue';
import HeatmapChart from './components/HeatmapChart.vue';
import DispatchSankey from './components/DispatchSankey.vue';
import type { SimParams, SimResult, YearSummary } from '../engine/types';
import { PARAMS_DEFAULT, ESCENARIOS_PREDEFINIDOS } from '../engine/defaults';
import { simular } from '../engine/index';
import { getWeatherData, procesarOpenMeteo } from '../engine/weather/open-meteo';
import { aplicarClimateShift } from '../engine/weather/climate-shift';

// State
const cargando = ref(false);
const errorMsg = ref<string | null>(null);
const resultado = ref<SimResult | null>(null);
const params = ref<SimParams>({ ...PARAMS_DEFAULT });
const trayectoria = ref<YearSummary[]>([]);
const escenariosComparados = ref<Array<{ nombre: string; resumen: any }>>([]);
const progresoAnimacion = ref('');
const totalAnosTrayectoria = 2035 - 2026 + 1; // 10
const datosBaseClima = ref<any>(null);

const tabActivo = ref('mix');
const tabs = [
  { id: 'mix', nombre: 'Mix Horario', icon: '📊' },
  { id: 'trayectoria', nombre: 'Trayectoria', icon: '📈' },
  { id: 'comparacion', nombre: 'Comparación', icon: '⚖️' },
  { id: 'heatmap', nombre: 'Heatmap', icon: '🗺️' },
  { id: 'sankey', nombre: 'Flujo Anual', icon: '🔀' },
  { id: 'mc', nombre: 'Monte Carlo', icon: '🎲' },
  { id: 'info', nombre: 'Información', icon: 'ℹ️' },
];

const statusClass = computed(() => {
  if (cargando.value) return 'loading';
  if (resultado.value) return 'ready';
  return 'idle';
});

const statusText = computed(() => {
  if (cargando.value) return '⏳ Simulando...';
  if (resultado.value) return '✅ Listo';
  return '💤 Sin simular';
});

function onParamsChange(p: SimParams) {
  params.value = p;
}

async function ejecutarSimulacion() {
  cargando.value = true;
  errorMsg.value = null;
  resultado.value = null;
  trayectoria.value = [];
  try {
    console.log('[sim] Descargando datos climáticos Open-Meteo...');
    progresoAnimacion.value = '🌍 Descargando clima...';

    // Descargar datos climáticos UNA SOLA VEZ para toda la sesión
    const rawData = await getWeatherData(params.value.clima.anioReferencia);
    const base = procesarOpenMeteo(rawData);
    const weather = aplicarClimateShift(base, {
      deltaT: params.value.clima.deltaT,
      factorRadiacionSolar: params.value.clima.factorRadiacionSolar,
      factorViento: params.value.clima.factorViento,
      sequiaExtrema: params.value.clima.sequiaExtrema,
      hidraulicidad: params.value.clima.hidraulicidad,
      olaCalorExtrema: params.value.clima.olaCalorExtrema,
    });

    // Guardar datos base para reusar en trayectoria
    datosBaseClima.value = base;

    // Ejecutar simulación del año objetivo
    progresoAnimacion.value = '⚡ Simulando...';
    resultado.value = await simular(params.value, weather);

    // Generar trayectoria 2026-2035
    await generarTrayectoria(base);

    progresoAnimacion.value = '';
    console.log(`[sim] Simulación completada: ${resultado.value.resumen.precioMedio} €/MWh`);

  } catch (error) {
    errorMsg.value = error instanceof Error
      ? error.message
      : 'Error inesperado en la simulación. Revisa la consola para más detalles.';
    console.error('[simulación] Error:', error);
    progresoAnimacion.value = '';
  } finally {
    cargando.value = false;
  }
}

async function generarTrayectoria(base: any) {
  if (!base) {
    console.warn('[trayectoria] Sin datos base de clima');
    return;
  }
  const anos: YearSummary[] = [];

  for (let anio = 2026; anio <= 2035; anio++) {
    const idx = anio - 2026;
    progresoAnimacion.value = `📈 Trayectoria: año ${idx + 1}/${totalAnosTrayectoria} (${anio})`;
    try {
      const p = {
        ...params.value,
        anioObjetivo: anio,
      };
      // Reutilizar datos base, solo aplicar climate shift diferente por año
      const weather = aplicarClimateShift(base, {
        deltaT: params.value.clima.deltaT * ((anio - 2025) / 10),
        factorRadiacionSolar: params.value.clima.factorRadiacionSolar,
        factorViento: params.value.clima.factorViento,
        sequiaExtrema: params.value.clima.sequiaExtrema,
        hidraulicidad: params.value.clima.hidraulicidad,
        olaCalorExtrema: params.value.clima.olaCalorExtrema,
      });
      const res = await simular(p, weather);
      anos.push({ anio, params: p, resumen: res.resumen });
    } catch (e) {
      console.error(`[trayectoria] Error año ${anio}:`, e);
    }
  }
  progresoAnimacion.value = '';
  trayectoria.value = anos;
  console.log(`[trayectoria] Completada: ${anos.length} años simulados`);
}

function removeEscenario(idx: number) {
  escenariosComparados.value.splice(idx, 1);
}
</script>

<style>
/* Global styles */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  background: #0b1120;
  color: #e2e8f0;
  min-height: 100vh;
}

::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: rgba(0,0,0,0); }
::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.3); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: rgba(148,163,184,0.5); }
</style>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.8rem 1.5rem;
  background: rgba(15, 23, 42, 0.8);
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  backdrop-filter: blur(12px);
}

.header-left h1 {
  font-size: 1.1rem;
  font-weight: 700;
  background: linear-gradient(135deg, #3b82f6, #f97316);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.version {
  font-size: 0.75rem;
  color: #64748b;
  margin-left: 0.5rem;
}

.status {
  font-size: 0.8rem;
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  background: rgba(30, 41, 59, 0.6);
}

.status.loading { color: #f59e0b; }
.status.ready { color: #22c55e; }
.status.idle { color: #64748b; }

.progreso {
  font-size: 0.8rem;
  color: #f59e0b;
  margin-right: 0.8rem;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

.error-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-left: 3px solid #ef4444;
  color: #fca5a5;
  padding: 0.6rem 1.5rem;
  font-size: 0.82rem;
  margin: 0 1rem;
  border-radius: 8px;
}

.btn-dismiss {
  background: none;
  border: none;
  color: #fca5a5;
  font-size: 1.3rem;
  cursor: pointer;
  padding: 0 0.3rem;
  opacity: 0.6;
}
.btn-dismiss:hover { opacity: 1; }

.main-layout {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  flex: 1;
  overflow: hidden;
}

.charts-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  min-width: 0;
}

.chart-tabs {
  display: flex;
  gap: 0.4rem;
}

.tab {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.1);
  background: rgba(15, 23, 42, 0.4);
  color: #94a3b8;
  cursor: pointer;
  font-size: 0.82rem;
  transition: all 0.2s;
}

.tab:hover { background: rgba(30, 41, 59, 0.6); color: #e2e8f0; }
.tab.active { background: rgba(37, 99, 235, 0.2); color: #3b82f6; border-color: rgba(37, 99, 235, 0.3); }

.tab-content {
  flex: 1;
  overflow-y: auto;
}

.info-tab {
  padding: 1rem;
}

.info-content h3 {
  font-size: 1rem;
  color: #e2e8f0;
  margin-bottom: 1rem;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 0.8rem;
}

.info-card {
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 10px;
  padding: 1rem;
}

.info-card h4 {
  font-size: 0.85rem;
  color: #e2e8f0;
  margin-bottom: 0.5rem;
}

.info-card p {
  font-size: 0.8rem;
  color: #94a3b8;
  line-height: 1.5;
  margin-bottom: 0.3rem;
}

.app-footer {
  display: flex;
  justify-content: space-between;
  padding: 0.6rem 1.5rem;
  font-size: 0.7rem;
  color: #475569;
  border-top: 1px solid rgba(148, 163, 184, 0.06);
}
</style>
