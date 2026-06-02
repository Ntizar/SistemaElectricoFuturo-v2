<template>
  <div class="comparison" v-if="escenarios.length > 0">
    <h3>⚖️ Comparación de escenarios</h3>
    <div class="comparison-grid">
      <div class="scenario-col" v-for="(esc, i) in escenarios" :key="i">
        <div class="scenario-header" :style="{ borderColor: colores[i] }">
          <strong>{{ esc.nombre }}</strong>
          <button class="btn-remove" @click="$emit('remove', i)">×</button>
        </div>
        <div class="scenario-kpis">
          <div class="sc-kpi"><span>Precio</span><strong>{{ esc.resumen.precioMedio }} €/MWh</strong></div>
          <div class="sc-kpi"><span>Emisiones</span><strong>{{ esc.resumen.emisionesMtCO2 }} MtCO₂</strong></div>
          <div class="sc-kpi"><span>ENS</span><strong>{{ esc.resumen.ensTWh }} TWh</strong></div>
          <div class="sc-kpi"><span>Renovable</span><strong>{{ esc.resumen.renovablesPct }}%</strong></div>
          <div class="sc-kpi"><span>Nuclear</span><strong>{{ esc.resumen.nuclearPct }}%</strong></div>
          <div class="sc-kpi"><span>Gas</span><strong>{{ esc.resumen.gasPct }}%</strong></div>
          <div class="sc-kpi"><span>LOLE</span><strong>{{ esc.resumen.loleHoras }}h</strong></div>
          <div class="sc-kpi"><span>Vertidos</span><strong>{{ esc.resumen.vertidosTWh }} TWh</strong></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  escenarios: Array<{ nombre: string; resumen: any }>;
}>();

defineEmits<{ (e: 'remove', idx: number): void }>();

const colores = ['#3b82f6', '#f97316', '#22c55e', '#ef4444', '#8b5cf6', '#06b6d4'];
</script>

<style scoped>
.comparison {
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 12px;
  padding: 1rem;
}
h3 { font-size: 0.9rem; color: #e2e8f0; margin-bottom: 0.8rem; }
.comparison-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.8rem;
}
.scenario-col {
  background: rgba(30, 41, 59, 0.4);
  border-radius: 8px;
  overflow: hidden;
}
.scenario-header {
  padding: 0.5rem 0.8rem;
  border-left: 3px solid;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  color: #e2e8f0;
}
.btn-remove {
  background: none;
  border: none;
  color: #64748b;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0 0.3rem;
}
.btn-remove:hover { color: #ef4444; }
.scenario-kpis { padding: 0.5rem 0.8rem; }
.sc-kpi {
  display: flex;
  justify-content: space-between;
  padding: 0.25rem 0;
  border-bottom: 1px solid rgba(148,163,184,0.06);
  font-size: 0.8rem;
}
.sc-kpi span { color: #94a3b8; }
.sc-kpi strong { color: #e2e8f0; font-variant-numeric: tabular-nums; }
</style>
