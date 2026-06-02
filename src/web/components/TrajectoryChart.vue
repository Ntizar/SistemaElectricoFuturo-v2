<template>
  <div class="chart-container">
    <h3>📈 Trayectoria 2026-2035</h3>
    <div ref="chartRef" class="chart-plotly"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
import Plotly from 'plotly.js-dist-min';
import type { YearSummary } from '../../engine/types';

const props = defineProps<{ trajectory: YearSummary[] }>();
const chartRef = ref<HTMLDivElement>();

function renderChart() {
  if (!chartRef.value || !props.trajectory?.length) return;

  const anos = props.trajectory.map(t => t.anio);
  const precios = props.trajectory.map(t => t.resumen.precioMedio);
  const emisiones = props.trajectory.map(t => t.resumen.emisionesMtCO2);
  const renovables = props.trajectory.map(t => t.resumen.renovablesPct);
  const ens = props.trajectory.map(t => t.resumen.ensTWh);

  const traces: any[] = [
    { x: anos, y: precios, name: 'Precio medio (€/MWh)', type: 'scatter', mode: 'lines+markers', line: { color: '#3b82f6', width: 2.5 }, yaxis: 'y' },
    { x: anos, y: emisiones, name: 'Emisiones (MtCO₂)', type: 'scatter', mode: 'lines+markers', line: { color: '#ef4444', width: 2 }, yaxis: 'y2' },
    { x: anos, y: renovables, name: '% Renovable', type: 'scatter', mode: 'lines+markers', line: { color: '#22c55e', width: 2 }, yaxis: 'y3' },
    { x: anos, y: ens, name: 'ENS (TWh)', type: 'bar', marker: { color: 'rgba(249,115,22,0.4)' }, yaxis: 'y' },
  ];

  const layout: any = {
    height: 350,
    margin: { t: 10, r: 60, b: 40, l: 50 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { family: 'Inter', color: '#94a3b8', size: 11 },
    legend: { orientation: 'h', y: -0.15, bgcolor: 'rgba(0,0,0,0)', font: { size: 10 } },
    xaxis: { gridcolor: 'rgba(148,163,184,0.08)', dtick: 1 },
    yaxis: { title: '€/MWh', gridcolor: 'rgba(148,163,184,0.08)' },
    yaxis2: { title: 'MtCO₂', overlaying: 'y', side: 'right', gridcolor: 'rgba(0,0,0,0)' },
    yaxis3: { title: '%', overlaying: 'y', side: 'right', position: 0.95, gridcolor: 'rgba(0,0,0,0)' },
    hovermode: 'x unified',
    hoverlabel: { bgcolor: 'rgba(15,23,42,0.95)', font: { size: 11, color: '#f8fafc' } },
  };

  Plotly.react(chartRef.value, traces, layout, { responsive: true, displayModeBar: false });
}

onMounted(() => nextTick(renderChart));
watch(() => props.trajectory, () => nextTick(renderChart), { deep: true });
</script>

<style scoped>
.chart-container {
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 12px;
  padding: 1rem;
}
h3 {
  font-size: 0.9rem;
  color: #e2e8f0;
  margin-bottom: 0.5rem;
}
.chart-plotly { width: 100%; min-height: 350px; }
</style>
