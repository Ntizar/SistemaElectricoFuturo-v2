/**
 * ============================================================================
 *  TIPOS DEL SISTEMA ELÉCTRICO FUTURO v2
 * ============================================================================
 *  Tipos TypeScript para el motor de simulación headless.
 *  Cada tipo refleja un concepto físico del sistema eléctrico español.
 * ============================================================================
 */

// ─── Tecnologías de generación ───────────────────────────────────────────────

/** Tecnologías del mix eléctrico español */
export type Tecnologia =
  | 'nuclear'
  | 'solarFV'
  | 'eolicaOnshore'
  | 'eolicaOffshore'
  | 'hidroFluyente'
  | 'hidroEmbalse'
  | 'ccgt'
  | 'carbon'
  | 'baterias'
  | 'bombeo'
  | 'v2g'
  | 'importacion'
  | 'flexDown';

/** Tecnologías renovables (para cálculo de % renovable) */
export const RENOVABLES: Tecnologia[] = [
  'solarFV', 'eolicaOnshore', 'eolicaOffshore',
  'hidroFluyente', 'hidroEmbalse',
];

/** Tecnologías must-run (no dispatchable) */
export const MUST_RUN: Tecnologia[] = ['nuclear'];

/** Orden de mérito por SRMC (de menor a mayor coste) */
export const ORDEN_MERITO: Tecnologia[] = [
  'nuclear',        // SRMC ≈ 10 €/MWh
  'solarFV',        // SRMC ≈ 0
  'eolicaOnshore',  // SRMC ≈ 0
  'eolicaOffshore', // SRMC ≈ 0
  'hidroFluyente',  // SRMC ≈ 5
  'baterias',       // SRMC ≈ 30
  'bombeo',         // SRMC ≈ 35
  'v2g',            // SRMC ≈ 40
  'hidroEmbalse',   // SRMC ≈ 45+
  'importacion',    // SRMC = precio frontera
  'carbon',         // SRMC alto (emisiones)
  'ccgt',           // SRMC = f(gas, CO₂, η)
  'flexDown',       // SRMC = precioEscasez (VoLL)
];

// ─── Parámetros de entrada ───────────────────────────────────────────────────

/** Parámetros de capacidad instalada (GW) */
export interface CapacidadInstalada {
  nuclear: number;           // GW
  solarFV: number;           // GW
  eolicaOnshore: number;     // GW
  eolicaOffshore: number;    // GW
  hidraulica: number;        // GW (total: fluyente + embalse)
  ccgt: number;              // GW
  carbon: number;            // GW (carbón encore, si aplica)
  bateriasPotencia: number;  // GW
  bateriasHoras: number;     // horas de autonomía
  bombeoPotencia: number;    // GW
  bombeoCapacidad: number;   // GWh
  v2gPotencia: number;       // GW (vehicles-to-grid)
}

/** Parámetros de costes del sistema */
export interface Costes {
  precioGas: number;           // €/MWh (TTF)
  precioCO2: number;           // €/tCO₂ (EU ETS)
  rendimientoCCGT: number;     // η (0.45-0.60)
  omCCGT: number;              // €/MWh (O&M CCGT)
  omCarbon: number;            // €/MWh (O&M carbón)
  omNuclear: number;           // €/MWh
  omRenovable: number;         // €/MWh
  precioImportFrancia: number; // €/MWh
  precioImportPortugal: number;// €/MWh
  precioImportMarruecos: number;// €/MWh
  precioEscasez: number;       // €/MWh (VoLL)
  interconexionFrancia: number;// GW (capacidad máxima)
  interconexionPortugal: number;// GW
  interconexionMarruecos: number;// GW
}

/** Parámetros de demanda */
export interface Demanda {
  demandaAnual: number;        // TWh/año
  crecimientoDemanda: number;  // %/año respecto base
  electrificacionTWh: number;  // TWh/año adicional (VE, HPC, H₂)
  eficienciaDemanda: number;   // factor (0.82-1.0)
  autoconsumoFV: number;       // GW instalados (resta de demanda red)
}

/** Parámetros de almacenamiento */
export interface Almacenamiento {
  bateriasEficiencia: number;  // round-trip efficiency (0.85-0.92)
  bateriasAutodescarga: number;// %/hora (0.05-0.2%)
  bateriasDegradacion: number; // % por ciclo completo
  bombeoEficiencia: number;    // round-trip (0.70-0.80)
  v2gParticipacion: number;    // % del parque movilizable
  smartCharging: number;       // % de VE con smart charging
}

/** Parámetros del modelo climático */
export interface Clima {
  fuente: 'open-meteo' | 'synthetic';
  anioReferencia: number;      // Año de datos Open-Meteo (2020-2025)
  deltaT: number;              // ΔT adicional °C (calentamiento futuro)
  factorRadiacionSolar: number;// multiplicador (1.0 = sin cambio)
  factorViento: number;        // multiplicador (1.0 = sin cambio)
  sequiaExtrema: boolean;      // simulación de sequía hidrológica extrema
  hidraulicidad: number;       // factor hidráulica anual (0.45-1.35)
  olaCalorExtrema: boolean;    // evento de ola de calor
}

/** Parámetros de políticas energéticas */
export interface Politicas {
  aplicarPlanNuclear: boolean;
  cierreNuclear: number;        // año de cierre total
  prorrogaNuclear: boolean;
  prorrogaAnios: number;        // años de prórroga
  cfdActivo: boolean;
  cfdStrike: number;            // €/MWh (strike CfD)
  topeIbericoActivo: boolean;
  topeIbericoPrecio: number;    // €/MWh
  peajesDinamicos: boolean;
  peajeP1: number;              // €/MWh (punta)
  peajeP2: number;              // €/MWh (llano)
  peajeP3: number;              // €/MWh (valle)
  mecanismoCapacidad: number;   // €/kW/año
  leyCambioClimatico: boolean;  // tope emisiones progresivo
}

/** Parámetros de Monte Carlo */
export interface MonteCarloConfig {
  semilla: number;              // PRNG seed
  numSimulaciones: number;      // número de corridas (100-10000)
  variabilidadClimatica: number;// % de variación interanual
}

/** Todos los parámetros de entrada de una simulación */
export interface SimParams {
  // Identificación
  nombre: string;
  descripcion: string;

  // Temporal
  anioObjetivo: number;         // 2026-2050
  anioInicio: number;           // año de partida (default: 2025)

  // Componentes
  capacidad: CapacidadInstalada;
  costes: Costes;
  demanda: Demanda;
  almacenamiento: Almacenamiento;
  clima: Clima;
  politicas: Politicas;
  montecarlo: MonteCarloConfig;
}

// ─── Resultados ──────────────────────────────────────────────────────────────

/** Resultado horario de una simulación */
export interface HourlyResult {
  hora: number;                 // 0-8759
  dia: number;                  // 0-364
  mes: number;                  // 0-11
  horaDelDia: number;           // 0-23

  // Generación por tecnología (GW)
  generacion: Record<Tecnologia, number>;

  // Demand
  demandaGW: number;            // demanda bruta
  demandaRed: number;           // demanda - autoconsumo
  perdidasRed: number;          // pérdidas de red

  // Balance
  renovablesGW: number;
  mustRunGW: number;
  excedenteGW: number;          // generación > demanda
  deficitGW: number;            // demanda > generación
  vertidosGW: number;           // renovable vertida

  // Almacenamiento
  cargaBaterias: number;        // GW (positivo = carga)
  descargaBaterias: number;     // GW (positivo = descarga)
  socBaterias: number;          // % state of charge
  cargaBombeo: number;
  descargaBombeo: number;
  nivelEmbalse: number;         // GWh

  // Interconexiones
  importFrancia: number;        // GW
  importPortugal: number;
  importMarruecos: number;
  exportTotal: number;

  // Precio
  precioMarginal: number;       // €/MWh
  precioConPeajes: number;      // €/MWh (con peajes si activos)
  precioConCfd: number;         // €/MWh (con CfD si activo)

  // KPIs
  emisionesCO2: number;         // tCO₂/h
  ensGW: number;                // Energía No Suministrada (GW)
  inerciaGW: number;            // inercia síncrona disponible
  factorRenovable: number;      // % renovable instantáneo
}

/** Resumen anual de una simulación */
export interface AnnualSummary {
  precioMedio: number;          // €/MWh
  precioP5: number;
  precioP25: number;
  precioP50: number;
  precioP75: number;
  precioP95: number;
  horasPrecioNegativo: number;
  horasPrecioAlto: number;      // > 150 €/MWh

  demandaAnualTWh: number;
  generacionPorTecnologia: Record<Tecnologia, number>; // TWh
  renovablesPct: number;        // %
  nuclearPct: number;
  gasPct: number;

  emisionesMtCO2: number;
  intensidadCO2: number;        // kgCO₂/MWh

  ensTWh: number;               // Energía No Suministrada
  loleHoras: number;            // Loss of Load Expectation (horas/año)
  maxDeficitGW: number;
  horasInerciaCritica: number;

  vertidosTWh: number;
  capacidadRenovableInstalada: number; // GW
  factorCapacidadSolar: number;
  factorCapacidadEolico: number;
}

/** Resultado completo de una simulación */
export interface SimResult {
  params: SimParams;
  metadata: {
    timestamp: string;
    duracionMs: number;
    horasSimuladas: number;
    datosClimaticos: string;
    version: string;
  };
  resumen: AnnualSummary;
  hourly: HourlyResult[];
  trajectory?: YearSummary[];   // si simula trayectoria multianual
}

/** Resumen de un año para trayectoria */
export interface YearSummary {
  anio: number;
  resumen: AnnualSummary;
}

// ─── Escenarios predefinidos ─────────────────────────────────────────────────

export interface Escenario {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: 'nuclear' | 'renovables' | 'costes' | 'demanda' | 'politica' | 'stress';
  params: Partial<SimParams>;
}

// ─── Datos climáticos ────────────────────────────────────────────────────────

/** Datos horarios de Open-Meteo para un año completo */
export interface OpenMeteoData {
  year: number;
  latitude: number;
  longitude: number;
  timezone: string;
  hourly: {
    time: string[];            // ISO datetime strings
    temperature_2m: number[];  // °C
    shortwave_radiation: number[]; // W/m²
    wind_speed_10m: number[];  // m/s
    cloud_cover: number[];     // %
    relative_humidity_2m: number[]; // %
  };
}

/** Datos procesados para el motor de simulación */
export interface ProcessedWeather {
  year: number;
  hours: number;               // 8760
  solar: Float64Array;         // capacity factor 0-1
  wind: Float64Array;          // capacity factor 0-1
  temperature: Float64Array;   // °C
  humidity: Float64Array;      // %
  cloudCover: Float64Array;    // %
  summary: {
    cfSolarMedio: number;
    cfEolicoMedio: number;
    temperaturaMedia: number;
    horasOlaCalor: number;     // horas > 35°C
  };
}

// ─── Constantes del sistema ──────────────────────────────────────────────────

/** Datos de referencia REE 2025 */
export const DATOS_2025 = Object.freeze({
  nuclear: { capacidad: 7.0, generacion: 51.9 },     // GW, TWh
  solar: { capacidad: 24.7, generacion: 52.5 },
  eolica: { capacidad: 31.6, generacion: 55.6 },
  offshore: { capacidad: 0.0, generacion: 0.0 },
  hidraulica: { capacidad: 17.1, generacion: 37.6 },
  gas: { capacidad: 24.0, generacion: 52.1 },
  demanda: { anual: 248 },                            // TWh
  precioMedio: 63,                                    // €/MWh
  emisiones: 36,                                      // MtCO₂
  renovablesPct: 56,                                  // %
  autoconsumoFV: 8.2,                                 // GW
}) as const;

/** Datos PNIEC 2030 */
export const PNIEC_2030 = Object.freeze({
  renovablesGeneracion: 81,    // %
  emisionesMax: 20,            // MtCO₂
  solarGW: 81,
  eolicaGW: 62,
  offshoreGW: 3,
  almacenamientoGW: 22,
  demandaTWh: 295,
  interconexionPct: 15,        // %
}) as const;

/** Constantes físicas del modelo */
export const FISICA = Object.freeze({
  HORAS_ANIO: 8760,
  BASE_ANIO: 2026,
  LATITUD_ESPANA: 40.4,
  FACTOR_CO2_GAS: 0.202,       // tCO₂/MWh_el (CCGT η≈0.57)
  FC_NUCLEAR: 0.90,
  FC_SOLAR_REAL: 0.24,         // CF real REE 2025
  FC_EOLICO_REAL: 0.20,        // CF real REE 2025
  FC_OFFSHORE: 0.43,
  FC_HIDRO: 0.20,              // año medio (varía con sequía)
  EFICIENCIA_BAT: 0.90,
  EFICIENCIA_BOMBEO: 0.75,
  AUTODESCARGA_BAT: 0.001,     // %/hora
  RAMPA_CCGT: 0.15,            // GW/min
  MIN_ESTABLE_CCGT: 0.40,      // % carga mínima
  INERCIA_MIN_GW: 3.0,         // GW inercia síncrona mínima
  RESERVA_RODANTE_PCT: 4.0,    // %
  VOLL: 3000,                  // Value of Lost Load €/MWh
  TWH_POR_MT_H2: 52,           // conversión H₂
  PERDIDAS_RED: 0.045,         // 4.5%
}) as const;

/** Datos de referencia del sistema eléctrico */
export const REFERENCIAS = Object.freeze({
  preciosRef: {
    nuclear: 42,
    solarFV: 31,
    eolica: 36,
    offshore: 62,
    hidro: 44,
    ccgt: 92,
    baterias: 68,
    bombeo: 52,
    importacion: 90,
  },
  tempMensual: [6.3, 7.9, 11.2, 13.7, 17.6, 23.4, 27.0, 26.4, 21.8, 15.8, 10.1, 6.9],
  meses: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
}) as const;

// ─── Colores del gráfico ─────────────────────────────────────────────────────

export const COLORES = Object.freeze({
  nuclear:      { fill: 'rgba(239, 68, 68, 0.76)',  line: '#dc2626', label: '#ef4444' },
  solarFV:      { fill: 'rgba(245, 158, 11, 0.76)', line: '#f59e0b', label: '#f59e0b' },
  eolicaOnshore:{ fill: 'rgba(34, 197, 94, 0.72)',  line: '#16a34a', label: '#16a34a' },
  eolicaOffshore:{ fill: 'rgba(20, 184, 166, 0.68)',line: '#0f766e', label: '#14b8a6' },
  hidroFluyente:{ fill: 'rgba(37, 99, 235, 0.72)',  line: '#2563eb', label: '#2563eb' },
  hidroEmbalse: { fill: 'rgba(59, 130, 246, 0.52)', line: '#3b82f6', label: '#60a5fa' },
  ccgt:         { fill: 'rgba(100, 116, 139, 0.72)',line: '#475569', label: '#64748b' },
  carbon:       { fill: 'rgba(87, 83, 78, 0.72)',   line: '#57534e', label: '#78716c' },
  baterias:     { fill: 'rgba(124, 58, 237, 0.70)', line: '#7c3aed', label: '#8b5cf6' },
  bombeo:       { fill: 'rgba(59, 130, 246, 0.32)', line: '#3b82f6', label: '#60a5fa' },
  v2g:          { fill: 'rgba(168, 85, 247, 0.50)', line: '#a855f7', label: '#c084fc' },
  importacion:  { fill: 'rgba(6, 182, 212, 0.64)',  line: '#0891b2', label: '#06b6d4' },
  flexDown:     { fill: 'rgba(239, 68, 68, 0.18)',  line: '#ef4444', label: '#ef4444' },
  vertidos:     { fill: 'rgba(251, 146, 60, 0.42)', line: '#f97316', label: '#fb923c' },
  deficit:      { fill: 'rgba(239, 68, 68, 0.18)',  line: '#ef4444', label: '#ef4444' },
  precio:       { fill: 'rgba(37, 99, 235, 0.12)',  line: '#2563eb', label: '#2563eb' },
}) as const;
