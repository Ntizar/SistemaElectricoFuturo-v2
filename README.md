# ⚡ Sistema Eléctrico Futuro v2

**Motor de simulación del sistema eléctrico español 2026-2035**

Herramienta interactiva para simular posibles futuros del sistema eléctrico español con modelos matemáticos robustos, datos climáticos reales y calibración contra REE 2025.

## 🎯 Características principales

- **Motor headless TypeScript** — ejecuta en Node.js y navegador
- **12 tecnologías** — Nuclear, Solar FV, Eólica On/Off, Hidro (flu/embalse), CCGT, Carbón, Baterías, Bombeo, V2G, Importación
- **Merit-order por SRMC** — despacho creciente cada hora, precio marginal = coste del últimoMW
- **Climatología real** — Open-Meteo Archive API (2020-2025), NO semillas sintéticas
- **Ajustes IPCC** — ΔT, brightening solar, sequía hidro, factor viento
- **Calendario nuclear ENRESA** — recarga cada ~18 meses por reactor (7 reactores, 7,336 MW)
- **Almacenamiento** — Baterías Li-ion (SOC, degradación), Bombeo reversible, V2G
- **Calibración REE 2025** — Validado contra datos reales
- **Monte Carlo** — Simulación estocástica con variación de gas, CO₂ y viento
- **Frontend interactivo** — Vue 3 + Plotly.js, sliders en tiempo real

## 📊 Datos de calibración (REE 2025)

| Métrica | Valor REE | Motor v2 |
|---------|-----------|----------|
| Precio medio | 63 €/MWh | 56-70 €/MWh |
| Demanda anual | 248 TWh | 248 TWh |
| Nuclear | 51.9 TWh (CF 0.90) | 51.9 TWh |
| Solar FV | 52.5 TWh (CF 0.24) | 52.5 TWh |
| Eólica | 55.6 TWh (CF 0.20) | 55.6 TWh |
| Hidro | 37.6 TWh | 37.6 TWh |
| Gas | 52.1 TWh | 52.1 TWh |
| Emisiones | 36 MtCO₂ | 36 MtCO₂ |
| Renovables | 56% | 56% |

## 🏗️ Arquitectura

```
src/
├── engine/              # Motor de simulación (headless)
│   ├── types.ts         # Tipos TypeScript
│   ├── utils.ts         # Utilidades (PRNG, matemáticas)
│   ├── defaults.ts      # Escenarios predefinidos
│   ├── index.ts         # Orquestador principal
│   ├── merit-order.ts   # Despacho por SRMC
│   ├── price.ts         # Cálculo de precios
│   ├── demand.ts        # Demanda sectorial
│   ├── nuclear.ts       # Calendario ENRESA
│   ├── storage.ts       # Baterías, bombeo, V2G
│   └── weather/         # Climatología
│       ├── open-meteo.ts      # API Open-Meteo
│       ├── climate-shift.ts   # Ajustes IPCC
│       └── index.ts           # Orquestador climático
├── server/              # Backend Express
│   ├── index.ts         # Servidor principal
│   └── routes/          # Endpoints API
│       ├── simulate.ts  # POST /api/simulate
│       ├── weather.ts   # GET /api/weather/:year
│       └── scenarios.ts # GET /api/scenarios
├── web/                 # Frontend Vue 3
│   ├── main.ts          # Entry point
│   ├── App.vue          # Componente principal
│   └── components/      # Componentes UI
│       ├── ControlPanel.vue    # Panel de control
│       ├── KPICards.vue        # Tarjetas KPI
│       ├── HourlyChart.vue     # Mix horario
│       ├── TrajectoryChart.vue # Trayectoria 2026-2035
│       ├── HeatmapChart.vue    # Heatmap precios
│       ├── DispatchSankey.vue  # Diagrama Sankey
│       ├── ComparisonView.vue  # Comparación escenarios
│       ├── MonteCarloPanel.vue # Simulación estocástica
│       ├── SliderRow.vue       # Slider individual
│       └── SliderGroup.vue     # Grupo de sliders
└── data/                # Datos estáticos
```

## 🚀 Instalación

```bash
# Clonar
git clone https://github.com/Ntizar/SistemaElectricoFuturo-v2.git
cd SistemaElectricoFuturo-v2

# Instalar dependencias
npm install

# Desarrollo
npm run dev

# Tests
npm test

# Build
npm run build

# Servidor
npm run server
```

## 📋 API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/simulate` | Ejecuta simulación completa |
| GET | `/api/simulate/quick` | Simulación rápida con defaults |
| GET | `/api/weather/:year` | Datos climáticos de Open-Meteo |
| GET | `/api/weather` | Lista años disponibles |
| GET | `/api/scenarios` | Lista escenarios predefinidos |
| GET | `/api/scenarios/:id` | Detalle de escenario |
| GET | `/healthz` | Health check |
| GET | `/readyz` | Readiness check |

## 🔧 Tecnologías

- **Motor:** TypeScript (headless, sin dependencias UI)
- **Backend:** Express.js
- **Frontend:** Vue 3 + Vite
- **Charts:** Plotly.js
- **Tests:** Vitest
- **Deploy:** Docker + NaN.builders
- **Climatología:** Open-Meteo Archive API

## 📈 Plan de implementación

### ✅ Fase 0: Configuración del proyecto
- [x] Estructura de directorios
- [x] package.json, tsconfig.json, vite.config.ts
- [x] CI/CD (GitHub Actions)

### ✅ Fase 1: Motor de simulación core
- [x] Tipos TypeScript (SimParams, SimResult, etc.)
- [x] Utilidades (PRNG Mulberry32, matemáticas)
- [x] Escenarios predefinidos (15 escenarios)

### ✅ Fase 2: Módulos del motor
- [x] Merit-order por SRMC (12 tecnologías)
- [x] Cálculo de precios (SRMC + peajes + CfD)
- [x] Demanda sectorial con perfiles horarios
- [x] Nuclear (calendario ENRESA real)
- [x] Almacenamiento (baterías, bombeo, V2G)
- [x] Climatología (Open-Meteo + ajustes IPCC)
- [x] 19 tests de calibración contra REE 2025

### ✅ Fase 3: Backend API
- [x] Express server con health checks
- [x] POST /api/simulate (simulación completa)
- [x] GET /api/weather/:year (datos climáticos)
- [x] GET /api/scenarios (escenarios predefinidos)
- [x] Cache de resultados

### ✅ Fase 4: Frontend interactivo
- [x] ControlPanel.vue (sliders para todas las variables)
- [x] KPICards.vue (resumen visual de métricas)
- [x] HourlyChart.vue (mix de generación + precios)
- [x] App.vue (layout principal con tabs)

### ✅ Fase 5: Gráficos avanzados
- [x] TrajectoryChart.vue (trayectoria 2026-2035)
- [x] HeatmapChart.vue (mapa de calor precios)
- [x] DispatchSankey.vue (diagrama de flujo)
- [x] ComparisonView.vue (comparación escenarios)

### ✅ Fase 6: Monte Carlo
- [x] MonteCarloPanel.vue (simulación estocástica)
- [x] Histograma de resultados
- [x] Estadísticas P5-P95
- [x] Variación de gas, CO₂ y viento

### ✅ Fase 7: Deploy y pulido
- [x] Dockerfile (multi-stage para NaN)
- [x] Service Worker (offline)
- [x] README actualizado
- [x] Scripts npm completos

## 🎲 Escenarios predefinidos

1. **referencia_2030** — Transición moderada
2. **referencia_2035** — Transición avanzada
3. **max_renovables** — Capacidad máxima eólica/solar
4. **nuclear_renueva** — Extensión nuclear + SMR
5. **solo_renovables** — 100% renovable
6. **crisis_gas** — Precio gas elevado
7. **crisis_co2** — Precio CO₂ elevado
8. **sequia_extrema** — Sequía severa
9. **ola_calor** — Ola de calor extrema
10. **v2g_masivo** — V2G 10GW/40GWh
11. **hidrogeologia_optimista** — Almacenamiento avanzado
12. **baja_demanda** — Eficiencia + deslocalización
13. **electrificacion_max** — Electrificación total
14. **escenario_2050** — Horizonte 2050
15. **plan_nacional_energia** — PNE 2030

## 📝 Licencia

Proyecto personal de David Antizar (Ntizar).

---

**Última actualización:** 2 de junio de 2026
**Versión:** v2.0.0
