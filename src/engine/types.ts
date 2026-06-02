/**
 * ============================================================================
 *  TIPOS DEL SISTEMA ELECTRICO FUTURO v2
 * ============================================================================
 */

export type Tecnologia =
  | 'nuclear' | 'solarFV' | 'eolicaOnshore' | 'eolicaOffshore'
  | 'hidroFluyente' | 'hidroEmbalse' | 'ccgt' | 'carbon'
  | 'baterias' | 'bombeo' | 'v2g' | 'importacion' | 'flexDown';

export const RENOVABLES: Tecnologia[] = [
  'solarFV', 'eolicaOnshore', 'eolicaOffshore', 'hidroFluyente', 'hidroEmbalse',
];

export const MUST_RUN: Tecnologia[] = ['nuclear'];

export const ORDEN_MERITO: Tecnologia[] = [
  'nuclear', 'solarFV', 'eolicaOnshore', 'eolicaOffshore',
  'hidroFluyente', 'hidroEmbalse', 'baterias', 'v2g',
  'bombeo', 'importacion', 'ccgt', 'carbon',
];

// ─── Pararametros de entrada (tipos flexibles para compatibilidad) ──────────

export type CapacidadInstalada = Record<string, any>;
export type Costes = Record<string, any>;
export type Demanda = Record<string, any>;
export type Almacenamiento = Record<string, any>;
export type Clima = Record<string, any>;
export type Politicas = Record<string, any>;
export type MonteCarloConfig = Record<string, any>;
export type ResumenClimatico = Record<string, any>;

export interface SimParams {
  [key: string]: any;
}

// ─── Constantes fisicas ─────────────────────────────────────────────────────

export const FISICA: Record<string, any> = {
  CALORIFICO_GAS: 10.55,
  DENSIDAD_GAS: 0.8,
  EMISION_GAS: 0.201,
  EMISION_CARBON: 0.95,
  HORA_ENERGIA: 1000,
  HORAS_ANIO: 8760,
  FC_NUCLEAR: 0.90,
  FC_SOLAR_REAL: 0.24,
  FC_EOLICO_REAL: 0.20,
  FC_EOLICO_OFFSHORE_REAL: 0.45,
  HEATRATE_CCGT: 1.75,
  FACTOR_CO2_GAS: 0.201,
  FACTOR_CO2_CARBON: 0.95,
  OM_CCGT: 3.2,
  OM_CARBON: 5.0,
  PERDIDAS_RED: 1.04,
  INERCIA_MIN_GW: 5.0,
  VOLL: 2000,
  RESERVA_RODANTE_PCT: 0.07,
  BASE_ANIO: 2020,
};

// ─── Datos de Open-Meteo ────────────────────────────────────────────────────

export type OpenMeteoData = Record<string, any>;

export type ProcessedWeather = Record<string, any>;
export type ClimaHorario = Record<string, any>;

// ─── Resultados ─────────────────────────────────────────────────────────────

export type GeneracionHoraria = Record<string, any>;
export type HourlyResult = Record<string, any>;
export type AnnualSummary = Record<string, any>;

export interface SimResult {
  [key: string]: any;
}

export type MetadataSimulacion = Record<string, any>;
export type YearSummary = Record<string, any>;
export type Escenario = Record<string, any>;

// ─── Colores ────────────────────────────────────────────────────────────────

export const COLORES: Record<string, any> = {
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
