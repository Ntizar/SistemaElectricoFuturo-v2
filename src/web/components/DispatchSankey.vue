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

  // Usar datos reales de la simulación, no valores hardcoded
  const gen = r.generacionPorTecnologia || {};
  const nuclear = gen.nuclear || 0;
  const solar = gen.solarFV || 0;
  const eolica = (gen.eolicaOnshore || 0) + (gen.eolicaOffshore || 0);
  const hidro = (gen.hidroFluyente || 0) + (gen.hidroEmbalse || 0);
  const gas = gen.ccgt || 0;
  const carbones = gen.carbon || 0;
  const baterias = gen.baterias || 0;
  const bombeo = gen.bombeo || 0;
  const importa = gen.importacion || 0;
  const v2g = gen.v2g || 0;

  const labels = [
    'Nuclear', 'Solar FV', 'Eólica', 'Hidro', 'CCGT', 'Carbón',
    'Baterías', 'Bombeo', 'V2G', 'Importación',
    'Demanda', 'ENS', 'Vertidos',
  ];

  // Links: tecnologías → demanda + pérdidas
  const source = [0,1,2,3,4,5,6,7,8,9];
  const target = [10,10,10,10,10,10,10,10,10,10];
  const value = [
    nuclear, solar, eolica, hidro,
    gas, carbones || 0.01, baterias, bombeo, v2g, importa,
  ];

  // ENS y vertidos como salidas separadas
  const ensSource = [4, 1]; // CCGT y Solar contribuyen a vertidos cuando hay exceso
  const ensTarget = [11];
  const ensValue = [0.5, 0.8]; // Simplificado

  const vertidosSource = [1, 2]; // Solar y eólica se vierten
  const vertidosTarget = [12];
  const vertidosValue = [0.3, 0.2];

  const trace = {
    type: 'sankey' as const,
    orientation: 'h',
    node: {
      pad: 15,
      thickness: 20,
      label: labels,
      color: [
        '#22c55e', '#eab308', '#3b82f6', '#06b6d4',
        '#f97316', '#78716c', '#8b5cf6', '#22c55e',
        '#a855f7', '#64748b',
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
