/**
 * ============================================================================
 *  AJUSTES CLIMÁTICOS IPCC — Clima-Shift
 * ============================================================================
 *  Ajusta datos base de Open-Meteo según escenarios IPCC.
 *  Aplica ΔT global, brightening solar, sequía hidro, factor viento.
 * ============================================================================
 */

import type { ClimaHorario } from '../types';

export interface ClimateShiftParams {
  deltaT: number;
  factorRadiacionSolar: number;
  factorViento: number;
  sequiaExtrema: boolean;
  hidraulicidad: number;
  olaCalorExtrema: boolean;
}

/**
 * Aplica ajustes IPCC a datos climáticos base.
 *
 * @param base - Datos base de Open-Meteo
 * @param params - Parámetros de ajuste
 * @returns Datos climáticos ajustados
 */
export function aplicarClimateShift(
  base: ClimaHorario,
  params: ClimateShiftParams
): ClimaHorario {
  const horas = base.hours;
  const solar = new Float64Array(horas);
  const wind = new Float64Array(horas);
  const temperature = new Float64Array(horas);
  const humidity = new Float64Array(horas);
  const precipitation = new Float64Array(horas);
  const radiation = new Float64Array(horas);

  for (let h = 0; h < horas; h++) {
    // Temperatura: +ΔT (más en verano, menos en invierno)
    const mes = Math.floor((h % 8760) / 730); // 0-11
    const factorEstacional = mes >= 5 && mes <= 8 ? 1.3 : 0.8; // Verano más, invierno menos
    temperature[h] = base.temperature[h] + params.deltaT * factorEstacional;

    // Radiación solar: brightening/dimming
    radiation[h] = base.radiation[h] * params.factorRadiacionSolar;
    solar[h] = Math.min(1, base.solar[h] * params.factorRadiacionSolar);

    // Viento: variación anual
    wind[h] = Math.max(0, Math.min(1, base.wind[h] * params.factorViento));

    // Humedad: afectada por ΔT y sequía
    const factorSequia = params.sequiaExtrema ? 0.7 : 1.0;
    humidity[h] = Math.max(0, Math.min(100, base.humidity[h] * factorSequia));

    // Precipitación: reducida en sequía
    precipitation[h] = base.precipitation[h] * params.hidraulicidad;

    // Ola de calor: amplifica temperatura
    if (params.olaCalorExtrema && temperature[h] > 30) {
      temperature[h] = temperature[h] * 1.15;
    }
  }

  // Calcular resumen
  const summary: ClimaHorario['summary'] = {
    mediaTemperatura: mean(temperature),
    maxTemperatura: max(temperature),
    minTemperatura: min(temperature),
    cfSolarMedio: mean(solar),
    cfEolicoMedio: mean(wind),
    lluviaAnual: sum(precipitation),
    horasSol: countPositive(radiation),
  };

  return {
    hours: horas,
    solar,
    wind,
    temperature,
    humidity,
    precipitation,
    radiation,
    summary,
  };
}

// ─── Utilidades ─────────────────────────────────────────────────────────────

function mean(arr: Float64Array): number {
  let sum = 0;
  for (let i = 0; i < arr.length; i++) sum += arr[i];
  return sum / arr.length;
}

function max(arr: Float64Array): number {
  let m = -Infinity;
  for (let i = 0; i < arr.length; i++) if (arr[i] > m) m = arr[i];
  return m;
}

function min(arr: Float64Array): number {
  let m = Infinity;
  for (let i = 0; i < arr.length; i++) if (arr[i] < m) m = arr[i];
  return m;
}

function sum(arr: Float64Array): number {
  let s = 0;
  for (let i = 0; i < arr.length; i++) s += arr[i];
  return s;
}

function countPositive(arr: Float64Array): number {
  let c = 0;
  for (let i = 0; i < arr.length; i++) if (arr[i] > 0) c++;
  return c;
}

// ─── Funciones de cálculo climático ─────────────────────────────────────────

/**
 * Calcula el deltaT esperado entre dos años (IPCC SSP2-4.5 ≈ 0.2°C/década)
 */
export function calcularDeltaTEsperado(anioBase: number, anioObjetivo: number): number {
  const decadas = (anioObjetivo - anioBase) / 10;
  return decadas * 0.2; // SSP2-4.5: ~0.2°C por década
}

/**
 * Calcula el factor de ajuste solar (brightening/dimming)
 */
export function calcularFactorSolar(anioBase: number, anioObjetivo: number): number {
  const anos = anioObjetivo - anioBase;
  return 1.0 + (anos * 0.001); // Brightening: +0.1% por año
}
