<template>
  <div class="nz" data-nz-skin="aurora" data-nz-theme="dark">
    <header class="app-header">
      <h1>⚡ Sistema Eléctrico Futuro</h1>
      <p class="subtitle">Simulador interactivo del sistema eléctrico español 2026-2050</p>
    </header>

    <main class="app-main">
      <div class="placeholder">
        <h2>🔧 En construcción</h2>
        <p>Motor de simulación headless implementado. Frontend próximo.</p>
        <div class="status">
          <div class="status-item done">✅ Tipos TypeScript</div>
          <div class="status-item done">✅ Motor headless (merit-order, demand, nuclear, storage)</div>
          <div class="status-item done">✅ Modelo climático Open-Meteo</div>
          <div class="status-item done">✅ Tests de calibración</div>
          <div class="status-item pending">⏳ Backend API</div>
          <div class="status-item pending">⏳ Frontend interactivo</div>
          <div class="status-item pending">⏳ Deploy NaN</div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
// App principal — placeholder hasta el frontend completo
</script>

<style>
@import url('https://cdn.jsdelivr.net/gh/Ntizar/Ntizar-Aurora@master/ntizar.css');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', system-ui, sans-serif;
  background: #0f172a;
  color: #e2e8f0;
  min-height: 100vh;
}

.app-header {
  text-align: center;
  padding: 2rem;
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(249, 115, 22, 0.1));
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
}

.app-header h1 {
  font-size: 2rem;
  background: linear-gradient(135deg, #2563eb, #f97316);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  color: #94a3b8;
  margin-top: 0.5rem;
}

.app-main {
  max-width: 800px;
  margin: 2rem auto;
  padding: 0 1rem;
}

.placeholder {
  text-align: center;
  padding: 3rem;
  background: rgba(30, 41, 59, 0.5);
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.1);
}

.placeholder h2 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: #f8fafc;
}

.placeholder p {
  color: #94a3b8;
  margin-bottom: 2rem;
}

.status {
  text-align: left;
  max-width: 400px;
  margin: 0 auto;
}

.status-item {
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(148, 163, 184, 0.08);
  font-size: 0.9rem;
}

.status-item.done {
  color: #22c55e;
}

.status-item.pending {
  color: #f59e0b;
}
</style>
