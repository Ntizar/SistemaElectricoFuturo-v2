<template>
  <div class="kpi-cards" v-if="resumen">
    <div class="kpi-card precio">
      <div class="kpi-icon">💰</div>
      <div class="kpi-data">
        <div class="kpi-value">{{ resumen.precioMedio }} <span class="kpi-unit">€/MWh</span></div>
        <div class="kpi-label">Precio medio</div>
        <div class="kpi-range">P5: {{ resumen.precioP5 }} — P95: {{ resumen.precioP95 }}</div>
      </div>
    </div>

    <div class="kpi-card demanda">
      <div class="kpi-icon">⚡</div>
      <div class="kpi-data">
        <div class="kpi-value">{{ resumen.demandaAnualTWh }} <span class="kpi-unit">TWh</span></div>
        <div class="kpi-label">Demanda anual</div>
        <div class="kpi-range">{{ resumen.renovablesPct }}% renovable</div>
      </div>
    </div>

    <div class="kpi-card emisiones" :class="emisionesClass">
      <div class="kpi-icon">🏭</div>
      <div class="kpi-data">
        <div class="kpi-value">{{ resumen.emisionesMtCO2 }} <span class="kpi-unit">MtCO₂</span></div>
        <div class="kpi-label">Emisiones</div>
        <div class="kpi-range">{{ resumen.intensidadCO2 }} kgCO₂/MWh</div>
      </div>
    </div>

    <div class="kpi-card ens" :class="ensClass">
      <div class="kpi-icon">⚠️</div>
      <div class="kpi-data">
        <div class="kpi-value">{{ resumen.ensTWh }} <span class="kpi-unit">TWh</span></div>
        <div class="kpi-label">ENS (No Suministrada)</div>
        <div class="kpi-range">LOLE: {{ resumen.loleHoras }}h/año</div>
      </div>
    </div>

    <div class="kpi-card vertidos">
      <div class="kpi-icon">🌊</div>
      <div class="kpi-data">
        <div class="kpi-value">{{ resumen.vertidosTWh }} <span class="kpi-unit">TWh</span></div>
        <div class="kpi-label">Vertidos renovable</div>
        <div class="kpi-range">{{ resumen.horasPrecioNegativo }}h precio negativo</div>
      </div>
    </div>

    <div class="kpi-card nuclear">
      <div class="kpi-icon">☢️</div>
      <div class="kpi-data">
        <div class="kpi-value">{{ resumen.nuclearPct }} <span class="kpi-unit">%</span></div>
        <div class="kpi-label">Nuclear</div>
        <div class="kpi-range">Gas: {{ resumen.gasPct }}%</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { AnnualSummary } from '../../engine/types';

const props = defineProps<{ resumen: AnnualSummary | null }>();

const emisionesClass = computed(() => {
  if (!props.resumen) return '';
  if (props.resumen.emisionesMtCO2 < 15) return 'good';
  if (props.resumen.emisionesMtCO2 < 30) return 'warning';
  return 'bad';
});

const ensClass = computed(() => {
  if (!props.resumen) return '';
  if (props.resumen.ensTWh < 0.1) return 'good';
  if (props.resumen.ensTWh < 1) return 'warning';
  return 'bad';
});
</script>

<style scoped>
.kpi-cards {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.8rem;
  padding: 0.8rem 1rem;
}

@media (max-width: 1200px) {
  .kpi-cards { grid-template-columns: repeat(3, 1fr); }
}

@media (max-width: 768px) {
  .kpi-cards { grid-template-columns: repeat(2, 1fr); }
}

.kpi-card {
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 10px;
  padding: 0.8rem;
  display: flex;
  gap: 0.6rem;
  align-items: center;
  backdrop-filter: blur(8px);
  transition: border-color 0.2s;
}

.kpi-card:hover {
  border-color: rgba(148, 163, 184, 0.2);
}

.kpi-card.good { border-left: 3px solid #22c55e; }
.kpi-card.warning { border-left: 3px solid #f59e0b; }
.kpi-card.bad { border-left: 3px solid #ef4444; }

.kpi-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.kpi-data {
  min-width: 0;
}

.kpi-value {
  font-size: 1.3rem;
  font-weight: 700;
  color: #f8fafc;
  line-height: 1.1;
}

.kpi-unit {
  font-size: 0.7rem;
  font-weight: 400;
  color: #94a3b8;
}

.kpi-label {
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 0.1rem;
}

.kpi-range {
  font-size: 0.7rem;
  color: #475569;
  margin-top: 0.15rem;
}

.precio .kpi-value { color: #3b82f6; }
.emisiones.good .kpi-value { color: #22c55e; }
.emisiones.warning .kpi-value { color: #f59e0b; }
.emisiones.bad .kpi-value { color: #ef4444; }
.ens.good .kpi-value { color: #22c55e; }
.ens.warning .kpi-value { color: #f59e0b; }
.ens.bad .kpi-value { color: #ef4444; }
</style>
