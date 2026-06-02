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
  'hidroFluyente',  // SRMC ≈ 0
  'hidroEmbalse',   // SRMC ≈ 2-5 €/MWh (coste oportunidad)
  'baterias',       // SRMC ≈ 15-25 €/MWh
  'v2g',            // SRMC ≈ 20-30 €/MWh
  'bombeo',         // SRMC ≈ 30-40 €/MWh
  'importacion',    // SRMC ≈ 40-80 €/MWh
  'ccgt',           // SRMC ≈ 45-120 €/MWh (variable con gas)
  'carbon',         // SRMC ≈ 60-150 €/MWh
];

// ─── Parámetros de entrada ──────────────────────────────────────────────────

/** Capacidad instalada por tecnología (GW) */
export interface CapacidadInstalada {
  nuclear: number;
  solarFV: number;
  eolicaOnshore: number;
  eolicaOffshore: number;
  ccgt: number;
  carbon: number;
  hidroFluyente: number;
  hidroEmbalse: number;
  bateriasPotencia: number;
  bateriasEnergia: number;
  bombeoPotencia: number;
  bombeoEnergia: number;
  v2gPotencia: number;
  v2gEnergia: number;
  importacionMax: number;
}

/** Costes de combustible */
export interface Costes {
  precioGas: number;      // €/MWh (TTF)
  precioCO2: number;      // €/tCO₂ (EU ETS)
  precioCarbon: number;   // €/tCO₂ (mercado)
  heatrate: number;       // MWh_gas/MWh_elec (eficiencia CCGT)
}

/** Demanda del sistema */
export interface Demanda {
  demandaAnual: number;       // TWh/año
  crecimientoDemanda: number; // %/año
  electrificacionTWh: number; // TWh/año adicionales
  perfilResidencial: number;  // % de la demanda
  perfilIndustrial: number;
  perfilServicios: number;
  perfilTransporte: number;
}

/** Almacenamiento */
export interface Almacenamiento {
  bateriasEficiencia: number;   // roundtrip
  bateriasDegrada: number;      // % degradación/año
  bombeoEficiencia: number;
  bombeoTiempoLlenado: number;  // horas
  v2gEficiencia: number;
  v2gParticipacion: number;     // % de flota que participa
}

/** Parámetros climáticos */
export interface Clima {
  anioReferencia: number;
  deltaT: number;                 // °C de calentamiento
  factorRadiacionSolar: number;   // brightening/dimming
  factorViento: number;           // variación viento
  sequiaExtrema: boolean;
  hidraulicidad: number;          // factor de reducción hidro
  olaCalorExtrema: boolean;
}

/** Políticas y regulación */
export interface Politicas {
  cfdActivo: boolean;
  cfdPrecioTope: number;     // €/MWh
  cargoCapacidad: number;    // €/MW/año
  peajeP1: number;           // €/MWh
  peajeP2: number;
  peajeP3: number;
  vertidosMax: number;       // TWh/año
  ensMax: number;            // TWh/año
}

/** Monte Carlo */
export interface MonteCarloConfig {
  semillas: number;
  variacionGas: number;   // ±%
  variacionCO2: number;   // ±%
  variacionViento: number; // ±%
}

/** Parámetros completos de simulación */
export interface SimParams {
  anio: number;
  horasSimulacion: number;  // 8760 o menos
  capacidad: CapacidadInstalada;
  costes: Costes;
  demanda: Demanda;
  almacenamiento: Almacenamiento;
  clima: Clima;
  politicas: Politicas;
  montecarlo: MonteCarloConfig;
}

// ─── Datos climáticos procesados ────────────────────────────────────────────

/** Datos climáticos horarios procesados */
export interface ClimaHorario {
  hours: number;
  solar: Float64Array;      // CF solar [0-1]
  wind: Float64Array;       // CF eólico [0-1]
  temperature: Float64Array; // °C
  humidity: Float64Array;   // % relativa
  precipitation: Float64Array; // mm
  radiation: Float64Array;  // W/m²
  summary: ResumenClimatico;
}

/** Resumen climático anual */
export interface ResumenClimatico {
  mediaTemperatura: number;
  maxTemperatura: number;
  minTemperatura: number;
  cfSolarMedio: number;
  cfEolicoMedio: number;
  lluviaAnual: number;
  horasSol: number;
}

// ─── Resultados ─────────────────────────────────────────────────────────────

/** Generación por tecnología en una hora */
export interface GeneracionHoraria {
  nuclear: number;
  solarFV: number;
  eolicaOnshore: number;
  eolicaOffshore: number;
  hidroFluyente: number;
  hidroEmbalse: number;
  ccgt: number;
  carbon: number;
  baterias: number;
  bombeo: number;
  v2g: number;
  importacion: number;
}

/** Resultado horario */
export interface HourlyResult {
  hora: number;
  demandaGW: number;
  generacion: GeneracionHoraria;
  precioSrmc: number;
  precioConCfd: number;
  ordenMerito: Tecnologia[];
  capacidadUtilizada: number;
  vertidos: number;
  ens: number;
  exportacion: number;
  almacenamientoCarga: number;
  almacenamientoDescarga: number;
}

/** Resumen anual */
export interface AnnualSummary {
  demandaAnualTWh: number;
  precioMedio: number;
  precioP5: number;
  precioP95: number;
  precioMin: number;
  precioMax: number;
  nuclearPct: number;
  solarPct: number;
  eolicaPct: number;
  hidroPct: number;
  gasPct: number;
  carbonPct: number;
  renovablesPct: number;
  emisionesMtCO2: number;
  intensidadCO2: number;
  ensTWh: number;
  ensPorcentaje: number;
  loleHoras: number;
  vertidosTWh: number;
  horasPrecioNegativo: number;
  horasPrecio100: number;
  horasPrecio200: number;
}

/** Resultado completo de simulación */
export interface SimResult {
  params: SimParams;
  hourly: HourlyResult[];
  resumen: AnnualSummary;
  metadata: MetadataSimulacion;
}

/** Metadata de la simulación */
export interface MetadataSimulacion {
  timestamp: string;
  duracionMs: number;
  horasSimuladas: number;
  datosClimaticos: string;
  version: string;
  fromCache?: boolean;
}

/** Resultado de trayectoria multi-año */
export interface YearSummary {
  anio: number;
  params?: SimParams;
  resumen: AnnualSummary;
}

// ─── Escenarios predefinidos ────────────────────────────────────────────────

/** Un escenario predefinido */
export interface Escenario {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: 'transicion' | 'energia' | 'clima' | 'politica' | 'tecnologia';
  params: Partial<SimParams>;
}

// ─── Constantes físicas ──────────────────────────────────────────────────

export const FISICA = {
  CALORIFICO_GAS: 10.55,    // kWh/m³
  DENSIDAD_GAS: 0.8,        // kg/m³
  EMISION_GAS: 0.201,       // tCO₂/MWh_gas
  EMISION_CARBON: 0.95,     // tCO₂/MWh_carbon
  HORA_ENERGIA: 1000,       // kWh/MWh
  HORAS_ANIO: 8760,         // horas/año
  FC_NUCLEAR: 0.90,         // factor de capacidad nuclear
  FC_SOLAR_REAL: 0.24,      // factor de capacidad solar real España
  FC_EOLICO_REAL: 0.20,     // factor de capacidad eólico real España
  HEATRATE_CCGT: 1.75,
  FACTOR_CO2_GAS: 0.201,    // tCO₂/MWh_gas
  FACTOR_CO2_CARBON: 0.95,  // tCO₂/MWh_carbon
  OM_CCGT: 3.2,             // €/MWh (O&M)
  OM_CARBON: 5.0,           // €/MWh      // MWh_gas/MWh_elec (rendimiento ~57%)
};

// ─── Datos procesados del clima ─────────────────────────────────────────────

export interface ProcessedWeather {
  temperature: Float64Array;
  solar: Float64Array;
  wind: Float64Array;
  humidity: Float64Array;
  radiation: Float64Array;
  precipitation: Float64Array;
  hours: number;
}

// ─── Colores de tecnologías ─────────────────────────────────────────────────

/** Colores para cada tecnología en gráficos */
export const COLORES: Record<Tecnologia, { fill: string; line: string }> = {
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
  flexDown: { fill: 'rgba(239, 68, 68, 0.3)', line: '#ef4444' },
};
