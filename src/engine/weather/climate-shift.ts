/**
 * ============================================================================
 *  MODELO DE CAMBIO CLIMÁTICO — AJUSTES SOBRE DATOS REALES
 * ============================================================================
 *  Aplica ajustes incrementales sobre datos climáticos reales de Open-Meteo.
 *  No genera clima sintético — perturba datos físicos existentes.
 *
 *  Fuentes:
 *  - IPCC AR6: +0.3°C/década para España (SSP2-4.5)
 *  - AEMET: Observaciones de brightening solar en España
 *  - IPCC WG1: Incertidumbre en viento ±2%/década
 * ============================================================================
 */

import type { ProcessedWeather } from './types';
import { clamp } from './utils';

// ─── Parámetros de ajuste climático ──────────────────────────────────────────

export interface ClimateShiftParams {
  /** ΔT adicional vs año de referencia (°C) */
  deltaT: number;
  /** Factor multiplicador radiación solar (1.0 = sin cambio) */
  factorRadiacionSolar: number;
  /** Factor multiplicador viento (1.0 = sin cambio) */
  factorViento: number;
  /** ¿Simular sequía hidrológica extrema? */
  sequiaExtrema: boolean;
  /** Factor hidráulica anual (0.45-1.35, default 1.0) */
  hidraulicidad: number;
  /** ¿Simular ola de calor extrema? */
  olaCalorExtrema: boolean;
}

/** Ajustes IPCC típicos por década (referencia) */
export const AJUSTES_IPCC_DECADA = {
  deltaT: 0.3,               // °C/década (SSP2-4.5, España)
  radiacionSolar: 0.005,     // +0.5%/año (brightening observado)
  viento: 0.0,               // ±2% por década (incertidumbre)
} as const;

/**
 * Calcula el ΔT esperado para un año objetivo basándose en IPCC.
 * ΔT = (añoObjetivo - añoReferencia) / 10 * 0.3°C
 */
export function calcularDeltaTEsperado(
  anioObjetivo: number,
  anioReferencia: number,
): number {
  const decadas = (anioObjetivo - anioReferencia) / 10;
  return decadas * AJUSTES_IPCC_DECADA.deltaT;
}

/**
 * Calcula el factor de radiación solar esperado para un año.
 * brightening: +0.5%/año aproximado
 */
export function calcularFactorSolar(
  anioObjetivo: number,
  anioReferencia: number,
): number {
  const anos = anioObjetivo - anioReferencia;
  return 1 + (anos * AJUSTES_IPCC_DECADA.radiacionSolar);
}

// ─── Aplicación de ajustes ───────────────────────────────────────────────────

/**
 * Aplica ajustes climáticos sobre datos procesados de Open-Meteo.
 *
 * IMPORTANTE: Los ajustes son PERTURBACIONES sobre datos reales,
 * no generación sintética. La coherencia física se preserva porque
 * los datos base ya tienen correlaciones reales (viento-nubosidad, etc.)
 *
 * @param base - Datos procesados de Open-Meteo
 * @param params - Parámetros de ajuste
 * @returns Datos ajustados (nueva copia, no muta el original)
 */
export function aplicarClimateShift(
  base: ProcessedWeather,
  params: ClimateShiftParams,
): ProcessedWeather {
  const n = base.hours;
  const solar = new Float64Array(n);
  const wind = new Float64Array(n);
  const temperature = new Float64Array(n);
  const humidity = new Float64Array(n);
  const cloudCover = new Float64Array(n);

  let sumSolar = 0;
  let sumWind = 0;
  let sumTemp = 0;
  let horasOlaCalor = 0;

  for (let h = 0; h < n; h++) {
    // ─── Temperatura: ΔT lineal ───
    temperature[h] = base.temperature[h] + params.deltaT;

    // ─── Ola de calor extrema: +8-12°C en verano (día 170-230) ───
    if (params.olaCalorExtrema) {
      const mes = Math.floor(h / 730); // mes aproximado
      if (mes >= 6 && mes <= 8) { // jul-sep
        // Añadir picos de calor (+8°C con variación horaria)
        const horaDelDia = h % 24;
        const factorDiurno = Math.max(0, Math.sin((horaDelDia - 6) * Math.PI / 12));
        temperature[h] += 8 * factorDiurno + Math.random() * 4;
      }
    }

    // ─── Radiación solar: factor multiplicativo ───
    solar[h] = clamp(base.solar[h] * params.factorRadiacionSolar, 0, 1);

    // ─── Sequía extrema: reducir radiación nubosa (cielos más despejados → más solar, menos lluvia) ───
    if (params.sequiaExtrema) {
      // En sequía: menos nubes → más solar, menos precipitación
      cloudCover[h] = base.cloudCover[h] * 0.7; // 30% menos nubes
      solar[h] = clamp(solar[h] * 1.15, 0, 1); // 15% más radiación
    } else {
      cloudCover[h] = base.cloudCover[h];
    }

    // ─── Viento: factor multiplicativo con variación estacional ───
    const mes = Math.floor(h / 730);
    const factorEstacional = 1 + 0.1 * Math.cos((mes - 0.5) * Math.PI / 6);
    wind[h] = clamp(base.wind[h] * params.factorViento * factorEstacional, 0, 1);

    // ─── Humedad: afectada por sequía y temperatura ───
    humidity[h] = params.sequiaExtrema
      ? clamp(base.humidity[h] * 0.8, 10, 100)
      : base.humidity[h];

    // Acumular para resumen
    sumSolar += solar[h];
    sumWind += wind[h];
    sumTemp += temperature[h];
    if (temperature[h] > 35) horasOlaCalor++;
  }

  return {
    year: base.year,
    hours: n,
    solar,
    wind,
    temperature,
    humidity,
    cloudCover,
    summary: {
      cfSolarMedio: sumSolar / n,
      cfEolicoMedio: sumWind / n,
      temperaturaMedia: sumTemp / n,
      horasOlaCalor,
    },
  };
}

// ─── Hidráulicidad ───────────────────────────────────────────────────────────

/**
 * Genera serie de hidraulicidad horaria basada en un factor anual.
 *
 * La hidraulicidad varía estacionalmente:
 * - Invierno (D-F): 0.9-1.1 (lluvias, embalses llenos)
 * - Primavera (M-M): 1.0-1.3 (deshielo, lluvias)
 * - Verano (J-A): 0.6-0.8 (sequía natural)
 * - Otoño (S-N): 0.8-1.0 (recuperación)
 *
 * @param factorAnual - Factor hidráulica anual (0.45-1.35)
 * @param horas - Número de horas (8760)
 * @returns Serie horaria de factor hidráulica
 */
export function generarSerieHidraulicidad(
  factorAnual: number,
  horas: number,
): Float64Array {
  const resultado = new Float64Array(horas);

  for (let h = 0; h < horas; h++) {
    const dia = Math.floor(h / 24);
    const mes = Math.floor(dia / 30.44);
    const horaDelDia = h % 24;

    // Factor estacional base (seno suave)
    const factorEstacional = 0.85 + 0.15 * Math.cos((mes - 3) * Math.PI / 6);

    // Variación diurna (más caudal de día, menos de noche)
    const factorDiurno = 0.95 + 0.05 * Math.sin((horaDelDia - 6) * Math.PI / 12);

    // Ruido suave (autocorrelación alta — la hidráulicidad no cambia rápido)
    const ruido = 0.95 + 0.05 * Math.sin(h * 0.01 + mes * 2.7);

    resultado[h] = clamp(
      factorAnual * factorEstacional * factorDiurno * ruido,
      0.3,
      1.5,
    );
  }

  return resultado;
}
