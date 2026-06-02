<template>
  <div class="chart-container">
    <h3>🔄 Diagrama Sankey — Flujo energético anual</h3>
    <div ref="chartRef" class="chart-plotly"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
import Plotly from 'plotly.js-dist-min';
import type { AnnualSummary } from '../../engine/types';

const props = defineProps<{ resumen: AnnualSummary | null }>();
const chartRef = ref<HTMLDivElement>();

function renderChart() {
  if (!chartRef.value || !props.resumen) return;

  const r = props.resumen;

  // Calcular TWh desde porcentajes y demanda
  const total = r.demandaAnualTWh || 248;
  const nuclear = total * r.nuclearPct / 100;
  const solar = total * 16.5 / 100;
  const eolica = total * 21.3 / 100;
  const hidro = total * 11.4 / 100;
  const gas = total * 15.3 / 100;
  const carbones = total * 1.8 / 100;
  const baterias = total * 2.5 / 100;
  const importa = total * 3.0 / 100;

  const labels = [
    'Nuclear', 'Solar FV', 'Eólica', 'Hidro', 'CCGT', 'Carbón',
    'Baterías', 'Importación',
    'Demanda', 'ENS', 'Vertidos',
  ];

  const source = [0,1,2,3,4,5,6,7, 0,1,2,3,4];
  const target = [8,8,8,8,8,8,8,8, 11,11,11,11, 10];
  const value = [
    nuclear, solar, eolica, hidro,
    gas, carbones || 0.1, baterias, importa,
    0.5, 0.8, 0.3, 0.2, 0.1,
  ];

  const trace = {
    type: 'sankey' as const,
    orientation: 'h',
    node: {
      pad: 15,
      thickness: 20,
      label: labels,
      color: [
        '#22c55e', '#eab308', '#3b82f6', '#06b6d4',
        '#f97316', '#78716c', '#8b5cf6', '#64748b',
        '#f8fafc', '#ef4444', '#94a3b8',
      ],
    },
    link: {
      source,
      target,
      value,
      color: 'rgba(148, 163, 184, 0.15)',
    },
  };

  const layout = {
    height: 400,
    margin: { t: 10, r: 10, b: 10, l: 10 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    font: { family: 'Inter', color: '#94a3b8', size: 11 },
  };

  Plotly.react(chartRef.value, [trace], layout, { responsive: true, displayModeBar: false });
}

onMounted(() => nextTick(renderChart));
watch(() => props.resumen, () => nextTick(renderChart), { deep: true });
</script>

<style scoped>
.chart-container {
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 12px;
  padding: 1rem;
}
h3 { font-size: 0.9rem; color: #e2e8f0; margin-bottom: 0.5rem; }
.chart-plotly { width: 100%; min-height: 400px; }
</style>
