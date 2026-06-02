<template>
  <div class="chart-container">
    <div class="chart-header">
      <h3>📊 Mix de generación y precios horarios</h3>
      <div class="chart-controls">
        <select v-model.number="diasVisibles" class="select-dias">
          <option :value="1">1 día</option>
          <option :value="7">7 días</option>
          <option :value="30">30 días</option>
          <option :value="365">Año completo</option>
        </select>
      </div>
    </div>
    <div ref="chartRef" class="chart-plotly"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
import Plotly from 'plotly.js-dist-min';
import type { HourlyResult } from '../../engine/types';

const props = defineProps<{ hourly: HourlyResult[] }>();

const chartRef = ref<HTMLDivElement>();
const diasVisibles = ref(7);

const COLORES: Record<string, { fill: string; line: string }> = {
  nuclear: { fill: 'rgba(34, 197, 94, 0.4)', line: '#22c55e' },
  solarFV: { fill: 'rgba(234, 179, 8, 0.4)', line: '#eab308' },
  eolicaOnshore: { fill: 'rgba(59, 130, 246, 0.4)', line: '#3b82f6' },
  eolicaOffshore: { fill: 'rgba(56, 189, 248, 0.4)', line: '#38bdf8' },
  hidroFluyente: { fill: 'rgba(6, 182, 212, 0.4)', line: '#06b6d4' },
  hidroEmbalse: { fill: 'rgba(20, 184, 166, 0.4)', line: '#14b8a6' },
  ccgt: { fill: 'rgba(249, 115, 22, 0.4)', line: '#f97316' },
  carbon: { fill: 'rgba(120, 113, 108, 0.4)', line: '#78716c' },
  baterias: { fill: 'rgba(139, 92, 246, 0.4)', line: '#8b5cf6' },
  bombeo: { fill: 'rgba(34, 197, 94, 0.3)', line: '#22c55e' },
  v2g: { fill: 'rgba(168, 85, 247, 0.4)', line: '#a855f7' },
  importacion: { fill: 'rgba(100, 116, 139, 0.3)', line: '#64748b' },
};

const TECH_LABELS: Record<string, string> = {
  nuclear: 'Nuclear', solarFV: 'Solar FV', eolicaOnshore: 'Eólica',
  eolicaOffshore: 'Offshore', hidroFluyente: 'Hidro flu.', hidroEmbalse: 'Hidro emb.',
  ccgt: 'CCGT', carbon: 'Carbón', baterias: 'Baterías', bombeo: 'Bombeo',
  v2g: 'V2G', importacion: 'Importación',
};

const TECH_ORDER = [
  'nuclear', 'solarFV', 'eolicaOnshore', 'eolicaOffshore',
  'hidroFluyente', 'hidroEmbalse', 'ccgt', 'carbon',
  'baterias', 'bombeo', 'v2g', 'importacion',
];

function renderChart() {
  if (!chartRef.value || !props.hourly.length) return;

  const hInicio = 0;
  const hFin = Math.min(diasVisibles.value * 24, props.hourly.length);
  const datos = props.hourly.slice(hInicio, hFin);
  const horas = datos.map((_, i) => `H${i}`);

  const traces: any[] = [];

  for (const tech of TECH_ORDER) {
    const valores = datos.map(h => (h.generacion as any)[tech] || 0);
    const color = COLORES[tech];

    traces.push({
      x: horas,
      y: valores,
      name: TECH_LABELS[tech] || tech,
      type: 'scatter',
      mode: 'lines',
      stackgroup: 'one',
      fillcolor: color?.fill || 'rgba(128,128,128,0.3)',
      line: { color: color?.line || '#888', width: 0.5 },
    });
  }

  traces.push({
    x: horas,
    y: datos.map(h => h.demandaGW),
    name: 'Demanda',
    type: 'scatter',
    mode: 'lines',
    line: { color: '#f8fafc', width: 2, dash: 'dot' },
  });

  traces.push({
    x: horas,
    y: datos.map(h => h.precioConCfd),
    name: 'Precio (€/MWh)',
    type: 'scatter',
    mode: 'lines',
    line: { color: '#f97316', width: 1.5 },
    yaxis: 'y2',
    opacity: 0.8,
  });

  const layout: any = {
    height: 400,
    margin: { t: 10, r: 60, b: 40, l: 50 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { family: 'Inter, system-ui', color: '#94a3b8', size: 11 },
    legend: { orientation: 'h', y: -0.15, bgcolor: 'rgba(0,0,0,0)', font: { size: 10 } },
    xaxis: { gridcolor: 'rgba(148,163,184,0.08)', title: { text: 'Hora', font: { size: 11 } } },
    yaxis: { title: { text: 'GW', font: { size: 11 } }, gridcolor: 'rgba(148,163,184,0.08)' },
    yaxis2: {
      title: { text: '€/MWh', font: { size: 11, color: '#f97316' } },
      overlaying: 'y',
      side: 'right',
      gridcolor: 'rgba(0,0,0,0)',
    },
    hovermode: 'x unified',
    hoverlabel: { bgcolor: 'rgba(15,23,42,0.95)', bordercolor: 'rgba(148,163,184,0.2)', font: { size: 11, color: '#f8fafc' } },
  };

  Plotly.react(chartRef.value, traces, layout, { responsive: true, displayModeBar: false });
}

onMounted(() => nextTick(renderChart));
watch([() => props.hourly, diasVisibles], () => nextTick(renderChart), { deep: true });
</script>

<style scoped>
.chart-container {
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 12px;
  padding: 1rem;
}
.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}
.chart-header h3 { font-size: 0.9rem; color: #e2e8f0; font-weight: 600; }
.chart-controls { display: flex; gap: 0.5rem; }
.select-dias {
  background: rgba(30, 41, 59, 0.8);
  color: #e2e8f0;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 6px;
  padding: 0.3rem 0.5rem;
  font-size: 0.8rem;
}
.chart-plotly { width: 100%; min-height: 400px; }
</style>
