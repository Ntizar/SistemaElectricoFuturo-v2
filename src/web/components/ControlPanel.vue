<template>
  <div class="control-panel">
    <div class="panel-section">
      <h3>⚡ Capacidad Instalada (GW)</h3>
      <SliderGroup>
        <SliderRow label="Nuclear" v-model="cap.nuclear" :min="0" :max="10" :step="0.5" unit="GW" />
        <SliderRow label="Solar FV" v-model="cap.solarFV" :min="0" :max="150" :step="1" unit="GW" />
        <SliderRow label="Eólica Onshore" v-model="cap.eolicaOnshore" :min="0" :max="100" :step="1" unit="GW" />
        <SliderRow label="Eólica Offshore" v-model="cap.eolicaOffshore" :min="0" :max="30" :step="0.5" unit="GW" />
        <SliderRow label="CCGT" v-model="cap.ccgt" :min="0" :max="40" :step="0.5" unit="GW" />
        <SliderRow label="Baterías" v-model="cap.bateriasPotencia" :min="0" :max="25" :step="0.5" unit="GW" />
        <SliderRow label="Baterías (horas)" v-model="cap.bateriasHoras" :min="1" :max="12" :step="1" unit="h" />
        <SliderRow label="Bombeo" v-model="cap.bombeoPotencia" :min="0" :max="15" :step="0.5" unit="GW" />
      </SliderGroup>
    </div>

    <div class="panel-section">
      <h3>💰 Costes</h3>
      <SliderGroup>
        <SliderRow label="Gas (TTF)" v-model="costes.precioGas" :min="10" :max="200" :step="1" unit="€/MWh" />
        <SliderRow label="CO₂ (EU ETS)" v-model="costes.precioCO2" :min="10" :max="200" :step="1" unit="€/t" />
      </SliderGroup>
    </div>

    <div class="panel-section">
      <h3>📈 Demanda</h3>
      <SliderGroup>
        <SliderRow label="Demanda base" v-model="demanda.demandaAnual" :min="180" :max="400" :step="1" unit="TWh" />
        <SliderRow label="Crecimiento" v-model="demanda.crecimientoDemanda" :min="0" :max="3" :step="0.1" unit="%/año" />
        <SliderRow label="Electrificación" v-model="demanda.electrificacionTWh" :min="0" :max="10" :step="0.5" unit="TWh/año" />
      </SliderGroup>
    </div>

    <div class="panel-section">
      <h3>🌍 Clima</h3>
      <div class="select-row">
        <label>Año referencia</label>
        <select v-model.number="clima.anioReferencia">
          <option v-for="y in [2020,2021,2022,2023,2024]" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>
      <SliderGroup>
        <SliderRow label="ΔT" v-model="clima.deltaT" :min="0" :max="3" :step="0.1" unit="°C" />
        <SliderRow label="Hidráulica" v-model="clima.hidraulicidad" :min="0.3" :max="1.5" :step="0.05" unit="x" />
      </SliderGroup>
      <div class="checkbox-row">
        <label><input type="checkbox" v-model="clima.sequiaExtrema" /> Sequía extrema</label>
        <label><input type="checkbox" v-model="clima.olaCalorExtrema" /> Ola de calor extrema</label>
      </div>
    </div>

    <div class="panel-section">
      <h3>📋 Escenarios</h3>
      <select class="escenario-select" v-model="escenarioSeleccionado" @change="aplicarEscenario">
        <option value="">— Personalizado —</option>
        <option v-for="e in escenarios" :key="e.id" :value="e.id">{{ e.nombre }}</option>
      </select>
    </div>

    <button class="btn-simular" @click="$emit('simular')" :disabled="cargando">
      {{ cargando ? '⏳ Simulando...' : '▶ Ejecutar Simulación' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import SliderRow from './SliderRow.vue';
import SliderGroup from './SliderGroup.vue';
import type { SimParams, CapacidadInstalada, Costes, Demanda, Clima } from '../../engine/types';
import { PARAMS_DEFAULT, ESCENARIOS_PREDEFINIDOS } from '../../engine/defaults';

const emit = defineEmits<{
  (e: 'simular'): void;
  (e: 'params-change', params: SimParams): void;
}>();

defineProps<{ cargando: boolean }>();

const cap = reactive<CapacidadInstalada>({ ...PARAMS_DEFAULT.capacidad });
const costes = reactive<Costes>({ ...PARAMS_DEFAULT.costes });
const demanda = reactive<Demanda>({ ...PARAMS_DEFAULT.demanda });
const clima = reactive<Clima>({ ...PARAMS_DEFAULT.clima });
const escenarioSeleccionado = ref('');
const escenarios = ESCENARIOS_PREDEFINIDOS;

function aplicarEscenario() {
  if (!escenarioSeleccionado.value) return;
  const esc = escenarios.find(e => e.id === escenarioSeleccionado.value);
  if (!esc) return;

  // Merge escenario con defaults
  const p = { ...PARAMS_DEFAULT, ...esc.params } as SimParams;
  if (esc.params.capacidad) Object.assign(cap, { ...PARAMS_DEFAULT.capacidad, ...esc.params.capacidad });
  if (esc.params.costes) Object.assign(costes, { ...PARAMS_DEFAULT.costes, ...esc.params.costes });
  if (esc.params.demanda) Object.assign(demanda, { ...PARAMS_DEFAULT.demanda, ...esc.params.demanda });
  if (esc.params.clima) Object.assign(clima, { ...PARAMS_DEFAULT.clima, ...esc.params.clima });
}

// Emitir params cada vez que cambien
watch([cap, costes, demanda, clima], () => {
  emit('params-change', construirParams());
}, { deep: true });

function construirParams(): SimParams {
  return {
    ...PARAMS_DEFAULT,
    capacidad: { ...cap },
    costes: { ...costes },
    demanda: { ...demanda },
    clima: { ...clima },
  };
}
</script>

<style scoped>
.control-panel {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 12px;
  padding: 1rem;
  width: 320px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  backdrop-filter: blur(12px);
}

.panel-section {
  margin-bottom: 1.2rem;
}

.panel-section h3 {
  font-size: 0.85rem;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.6rem;
  padding-bottom: 0.3rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
}

.select-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.select-row label {
  font-size: 0.85rem;
  color: #cbd5e1;
}

.select-row select {
  background: rgba(30, 41, 59, 0.8);
  color: #e2e8f0;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 6px;
  padding: 0.3rem 0.5rem;
  font-size: 0.85rem;
}

.checkbox-row {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
}

.checkbox-row label {
  font-size: 0.8rem;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  cursor: pointer;
}

.escenario-select {
  width: 100%;
  background: rgba(30, 41, 59, 0.8);
  color: #e2e8f0;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 8px;
  padding: 0.5rem;
  font-size: 0.85rem;
}

.btn-simular {
  width: 100%;
  padding: 0.8rem;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 0.5rem;
}

.btn-simular:hover:not(:disabled) {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
}

.btn-simular:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
