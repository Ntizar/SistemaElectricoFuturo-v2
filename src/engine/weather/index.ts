/**
 * ============================================================================
 *  ORQUESTADOR CLIMÁTICO
 * ============================================================================
 *  Coordina la carga de datos de Open-Meteo y la aplicación de ajustes
 *  climáticos. Punto de entrada principal para el motor de simulación.
 * ============================================================================
 */

import type { Clima, ProcessedWeather } from '../types';
import { getWeatherData, procesarOpenMeteo } from './open-meteo';
import {
  aplicarClimateShift,
  calcularDeltaTEsperado,
  calcularFactorSolar,
  type ClimateShiftParams,
} from './climate-shift';
import { FISICA } from '../types';

/**
 * Obtiene datos climáticos procesados para un año y configuración dados.
 *
 * Flujo:
 * 1. Descargar datos reales de Open-Meteo para el año de referencia
 * 2. Procesar: radiación→CF solar, viento→CF eólico
 * 3. Aplicar ajustes climáticos (ΔT, brightening, sequía, etc.)
 * 4. Retornar series horarias listas para el motor de simulación
 *
 * @param config - Configuración climática del usuario
 * @returns Datos climáticos procesados y ajustados
 */
export async function obtenerClima(
  config: Clima,
): Promise<ProcessedWeather> {
  // 1. Descargar datos reales
  console.log(`[clima] Descargando Open-Meteo ${config.anioReferencia}...`);
  const rawData = await getWeatherData(config.anioReferencia);

  // 2. Procesar datos crudos
  console.log(`[clima] Procesando ${rawData.hourly.time.length} horas...`);
  const base = procesarOpenMeteo(rawData);

  console.log(
    `[clima] Base: CF solar=${(base.summary.cfSolarMedio * 100).toFixed(1)}%, ` +
    `CF eólico=${(base.summary.cfEolicoMedio * 100).toFixed(1)}%, ` +
    `T media=${base.summary.temperaturaMedia.toFixed(1)}°C`,
  );

  // 3. Calcular ajustes si el año objetivo difiere del de referencia
  const deltaTReal = config.deltaT ||
    calcularDeltaTEsperado(FISICA.BASE_ANIO, config.anioReferencia);
  const factorSolarReal = config.factorRadiacionSolar ||
    calcularFactorSolar(FISICA.BASE_ANIO, config.anioReferencia);

  // 4. Aplicar ajustes climáticos
  const shiftParams: ClimateShiftParams = {
    deltaT: deltaTReal,
    factorRadiacionSolar: factorSolarReal,
    factorViento: config.factorViento,
    sequiaExtrema: config.sequiaExtrema,
    hidraulicidad: config.hidraulicidad,
    olaCalorExtrema: config.olaCalorExtrema,
  };

  const ajustado = aplicarClimateShift(base, shiftParams);

  console.log(
    `[clima] Ajustado: CF solar=${(ajustado.summary.cfSolarMedio * 100).toFixed(1)}%, ` +
    `CF eólico=${(ajustado.summary.cfEolicoMedio * 100).toFixed(1)}%, ` +
    `T media=${ajustado.summary.temperaturaMedia.toFixed(1)}°C, ` +
    `Horas >35°C=${ajustado.summary.horasOlaCalor}`,
  );

  return ajustado;
}

/**
 * Versión síncrona para testing y datos precargados.
 * NO descarga de Open-Meteo — usa datos mock o cache ya cargados.
 */
export function obtenerClimaSync(
  base: ProcessedWeather,
  config: Clima,
): ProcessedWeather {
  const deltaTReal = config.deltaT ||
    calcularDeltaTEsperado(FISICA.BASE_ANIO, config.anioReferencia);
  const factorSolarReal = config.factorRadiacionSolar ||
    calcularFactorSolar(FISICA.BASE_ANIO, config.anioReferencia);

  return aplicarClimateShift(base, {
    deltaT: deltaTReal,
    factorRadiacionSolar: factorSolarReal,
    factorViento: config.factorViento,
    sequiaExtrema: config.sequiaExtrema,
    hidraulicidad: config.hidraulicidad,
    olaCalorExtrema: config.olaCalorExtrema,
  });
}
