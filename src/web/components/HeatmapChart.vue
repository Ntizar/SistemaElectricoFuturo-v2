<template>
  <div class="chart-container">
    <h3>🌡️ Heatmap precios horarios</h3>
    <div ref="chartRef" class="chart-plotly"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
import Plotly from 'plotly.js-dist-min';
import type { HourlyResult } from '../../engine/types';

const props = defineProps<{ hourly: HourlyResult[] }>();
const chartRef = ref<HTMLDivElement>();

function renderChart() {
  if (!chartRef.value || !props.hourly.length) return;

  // Organizar: filas = hora del día (0-23), columnas = día del año
  const horasDelDia = 24;
  const diasDelAnio = Math.floor(props.hourly.length / 24);

  const z: number[][] = [];
  for (let h = 0; h < horasDelDia; h++) {
    z[h] = [];
    for (let d = 0; d < diasDelAnio; d++) {
      const idx = d * 24 + h;
      z[h][idx] = props.hourly[idx]?.precioConCfd || 0;
    }
  }

  const trace = {
    z,
    type: 'heatmap' as const,
    colorscale: [
      [0, '#22c55e'],
      [0.25, '#84cc16'],
      [0.5, '#f59e0b'],
      [0.75, '#ef4444'],
      [1, '#9333ea'],
    ],
    colorbar: {
      title: { text: '€/MWh', side: 'right', font: { size: 11, color: '#94a3b8' } },
      tickfont: { color: '#94a3b8', size: 10 },
    },
    hovertemplate: 'Hora: %{x}<br>Día: %{y}<br>Precio: %{z:.1f} €/MWh<extra></extra>',
  };

  const layout = {
    height: 350,
    margin: { t: 10, r: 80, b: 40, l: 50 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { family: 'Inter', color: '#94a3b8', size: 11 },
    xaxis: { title: 'Hora del día', gridcolor: 'rgba(148,163,184,0.08)' },
    yaxis: { title: 'Día del año', gridcolor: 'rgba(148,163,184,0.08)' },
  };

  Plotly.react(chartRef.value, [trace], layout, { responsive: true, displayModeBar: false });
}

onMounted(() => nextTick(renderChart));
watch(() => props.hourly, () => nextTick(renderChart), { deep: true });
</script>

<style scoped>
.chart-container {
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 12px;
  padding: 1rem;
}
h3 { font-size: 0.9rem; color: #e2e8f0; margin-bottom: 0.5rem; }
.chart-plotly { width: 100%; min-height: 350px; }
</style>
