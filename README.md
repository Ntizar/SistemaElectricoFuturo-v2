# Sistema Eléctrico Futuro v2

> ⚡ Simulador interactivo del sistema eléctrico español 2026-2050
> **Motor headless + Frontend Vue 3 + Datos climáticos reales (Open-Meteo)**

## ¿Qué es?

Una herramienta de simulación que permite jugar con las variables del sistema eléctrico español y ver cómo evoluciona el precio, la seguridad de suministro y las emisiones. A diferencia de la v1, esta versión usa **datos climáticos reales** de Open-Meteo en vez de semillas sintéticas.

## Stack

| Componente | Tecnología | Por qué |
|------------|------------|---------|
| Motor | TypeScript | Tipos para lógica matemática compleja |
| Frontend | Vue 3 + Vite | Reactivo, HMR, moderno |
| Gráficos | Plotly.js | Mejor librería de gráficos científicos |
| CSS | Aurora Ntizar | Design system propio (azul + naranja + liquid glass) |
| Tests | Vitest | Rápido, compatible Vite |
| Backend | Node.js + Express | API para datos pesados y cache |
| CI | GitHub Actions | Tests + lint + build automático |
| Deploy | NaN.builders | Docker, auto-deploy |

## Modelo Climático — La gran novedad

### v1 (semillas) ❌
```
seed × 11 → nubosidad pseudoaleatoria
seed × 7  → viento pseudoaleatorio
// Sin correlaciones reales, sin eventos climáticos, no validable
```

### v2 (datos reales) ✅
```
Open-Meteo Archive API → 8760 horas de temperatura, radiación, viento real
Climate Shift → ΔT IPCC, brightening solar, variación viento
// Correlaciones físicas reales, validable contra历史
```

## Estructura

```
src/
├── engine/                    # Motor de simulación (headless, sin UI)
│   ├── types.ts               # Tipos TypeScript (columna vertebral)
│   ├── utils.ts               # PRNG Mulberry32, helpers, calendario
│   ├── defaults.ts            # Parámetros por defecto, escenarios
│   ├── index.ts               # Orquestador principal
│   ├── merit-order.ts         # Despacho SRMC + precio marginal
│   ├── price.ts               # Peajes + CfD + precio final
│   ├── demand.ts              # Demanda sectorial (residencial, servicios, industria)
│   ├── nuclear.ts             # Calendario ENRESA + paradas recarga
│   ├── storage.ts             # Baterías + bombeo + V2G
│   └── weather/               # Modelo climático
│       ├── index.ts           # Orquestador
│       ├── open-meteo.ts      # Fetch datos reales
│       └── climate-shift.ts   # Ajustes IPCC (ΔT, brightening, sequía)
├── data/                      # Datos de referencia
│   └── ree/                   # Datos REE 2025
├── server/                    # Backend Node.js
│   └── routes/                # API endpoints
└── web/                       # Frontend Vue 3
    ├── App.vue
    └── components/            # Componentes UI
```

## Desarrollo

```bash
# Instalar dependencias
npm install

# Desarrollo
npm run dev

# Tests
npm test

# Build
npm run build

# Backend
npm run server:dev
```

## Tests

```bash
npm test              # Ejecutar una vez
npm run test:watch    # Modo observación
npm run test:coverage # Con cobertura
```

## Parámetros configurables

El usuario puede ajustar:

- **Capacidad instalada**: nuclear, solar, eólica, gas, baterías, bombeo
- **Costes**: precio gas (TTF), CO₂ (EU ETS), rendimiento CCGT
- **Demanda**: crecimiento, electrificación, autoconsumo
- **Clima**: año de referencia, ΔT, sequía, olas de calor
- **Políticas**: CfD, peajes, cierre nuclear, mecanismo de capacidad
- **Monte Carlo**: semilla, número de simulaciones

## Escenarios predefinidos

| ID | Nombre | Categoría |
|----|--------|-----------|
| base-2030 | Base 2030 (ENRESA) | nuclear |
| prorroga-10 | Prórroga nuclear 10 años | nuclear |
| prorroga-20 | Prórroga nuclear 20 años | nuclear |
| cierre-2030 | Cierre acelerado 2030 | nuclear |
| pniec-2030 | PNIEC estricto | renovables |
| gas-caro | Gas encarecido (TTF 80) | costes |
| gas-barato | Gas barato (TTF 25) | costes |
| demanda-alta | Electrificación acelerada | demanda |
| sequia-extrema | Sequía extrema | stress |
| apagon-repunte | DANA + calma térmica | stress |
| sin-gas | Crisis TTF (150 €/MWh) | stress |
| futuro-verde | Futuro verde 2040 | renovables |
| sin-nuclear | Sin nuclear | nuclear |
| balance-cero | Balance neto 2035 | politica |
| almacenamiento-masivo | 100 GWh baterías | renovables |

## Fuentes de datos

- **ESIOS/REE**: Indicadores del sistema eléctrico español
- **Open-Meteo Archive**: Datos climáticos históricos horarios (gratis, sin API key)
- **ENRESA**: Calendario de cierre de reactores
- **IPCC AR6**: Parámetros de cambio climático (SSP2-4.5)
- **PNIEC**: Plan Nacional Integrado de Energía y Clima

## Licencia

MIT — Proyecto personal de David Antizar (Ntizar)
