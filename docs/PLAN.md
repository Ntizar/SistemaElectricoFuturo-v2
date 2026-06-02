# ⚡ Plan de Mejora — Sistema Eléctrico Futuro v2

> **Proyecto:** `Ntizar/SistemaElectricoFuturo-v2`
> **Versión actual:** v2.0.0
> **Última actualización:** 2 junio 2026
> **Estrategia:** Frontend-only — el motor headless corre en browser, Open-Meteo via CORS

---

## Estado actual

✅ Motor de simulación completo (12 tecnologías, SRMC, clima real, Monte Carlo)
✅ 19 tests de calibración contra REE 2025
✅ Frontend Vue 3 con Plotly.js (6 componentes gráficos)
✅ CI/CD con GitHub Actions
❌ **En producción:** backend no desplegado (solo estáticos), 3 componentes sin cablear, SW roto

---

## Fases de mejora

| Fase | Tarea | Prioridad | Estado | Notas |
|------|-------|-----------|--------|-------|
| **0** | **HACER QUE FUNCIONE** | 🔴 | | |
| 0.1 | Service Worker dinámico (sin nombres fijos) | 🔴 | ✅ | Cache names dinámicos, network-first Open-Meteo |
| 0.2 | Cablear MonteCarloPanel | 🔴 | ✅ | Nueva tab "Monte Carlo" 🎲 |
| 0.3 | Cablear HeatmapChart | 🔴 | ✅ | Nueva tab "Heatmap" 🗺️ |
| 0.4 | Cablear DispatchSankey | 🔴 | ✅ | Nueva tab "Flujo Anual" 🔀 |
| 0.5 | Arquitectura frontend-only | 🔴 | ✅ | Docker solo sirve estáticos; engine en browser |
| **1** | **SEGURIDAD Y UX** | 🟠 | | |
| 1.1 | sourcemap: false en producción | 🟠 | ✅ | v2.0.1 |
| 1.2 | Manejo de errores visible en UI | 🟠 | ✅ | Error banner con dismiss |
| 1.3 | Progreso en trayectoria (año X/10) | 🟠 | ✅ | Indicador animado |
| 1.4 | Reutilizar datos Open-Meteo en trayectoria | 🟠 | ✅ | 1 fetch → 10 años |
| **2** | **CALIDAD DE CÓDIGO** | 🟡 | | |
| 2.1 | Unificar cálculo de demanda (eliminar duplicado) | 🟡 | ✅ | -41 líneas de duplicado |
| 2.2 | Añadir .env.example | 🟡 | ✅ | |
| 2.3 | Añadir .nvmrc | 🟡 | ✅ | |
| 2.4 | PLAN.md vivo | 🟡 | ✅ | Este archivo |
| **3** | **MEJORAS AVANZADAS** | 🟢 | | |
| 3.1 | Tests de integración para rutas API | 🟢 | ⬜ | |
| 3.2 | Helmet + seguridad backend | 🟢 | ⬜ | |
| 3.3 | Rate limiting en POST /api/simulate | 🟢 | ⬜ | |
| 3.4 | Cache con TTL en servidor | 🟢 | ⬜ | |

---

## Historial de versiones

| Versión | Fecha | Cambios |
|---------|-------|---------|
| v2.0.1 | 2026-06-02 | ✅ Fases 0-2 completadas: SW dinámico, 3 componentes cableados, frontend-only, error banner, progreso trayectoria, demanda unificada, sourcemaps off, .env.example, .nvmrc, PLAN.md |

---

## Decisiones clave

| Decisión | Razón |
|----------|-------|
| **Frontend-only** | El motor es isomórfico; Open-Meteo permite CORS; elimina dependencia backend; offline-ready |
| **Cache dinámico en SW** | Vite genera hashes únicos. Cachear por URL real (cached || fetch) en vez de nombres fijos |
| **Demanda pre-calculada** | `calcularDemandaHoraria()` en demand.ts es la versión completa/sectorial. La versión inline en index.ts era un subconjunto con perfil fijo |

---

## Próximos pasos (priorizados)

1. ⬜ Test de integración servidor (supertest + Express)
2. ⬜ Helmet middleware + CSP headers
3. ⬜ Rate limiting en POST /api/simulate
4. ⬜ Cache con TTL en servidor

---

## Notas técnicas

- **Typecheck:** `npx vue-tsc --noEmit` — siempre antes de commit
- **Tests:** `npx vitest run` — 19 tests de calibración
- **Build:** `npx vite build`
- **Deploy:** NaN.builders auto-deploy con push a main
- **Verificar deploy:** `curl -s https://sistemaelectricofuturo-v2-ntizar-ntizar.apps.nan.builders/ | head -5`