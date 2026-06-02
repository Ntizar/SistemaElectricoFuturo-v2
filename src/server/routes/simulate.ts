/**
 * ============================================================================
 *  RUTA: POST /api/simulate
 * ============================================================================
 *  Ejecuta una simulación completa del sistema eléctrico.
 *  Acepta parámetros personalizados o usa defaults.
 *  Cachea resultados para misma configuración.
 * ============================================================================
 */

import { Router } from 'express';
import { simular } from '../../engine/index';
import { PARAMS_DEFAULT } from '../../engine/defaults';
import { getWeatherData, procesarOpenMeteo } from '../../engine/weather/open-meteo';
import { aplicarClimateShift } from '../../engine/weather/climate-shift';
import type { SimParams } from '../../engine/types';

export const simulateRoute = Router();

// Cache de resultados (misma config = mismo resultado)
const cache = new Map<string, any>();
const CACHE_MAX = 50;

/**
 * POST /api/simulate
 *
 * Body: { params?: Partial<SimParams> }
 *
 * Si no se pasan params, usa PARAMS_DEFAULT.
 * Si se pasan parámetros parciales, los merge con defaults.
 */
simulateRoute.post('/simulate', async (req, res) => {
  try {
    const inicio = performance.now();

    // Merge params
    const userParams = req.body?.params || {};
    const params: SimParams = {
      ...PARAMS_DEFAULT,
      ...userParams,
      capacidad: { ...PARAMS_DEFAULT.capacidad, ...userParams.capacidad },
      costes: { ...PARAMS_DEFAULT.costes, ...userParams.costes },
      demanda: { ...PARAMS_DEFAULT.demanda, ...userParams.demanda },
      almacenamiento: { ...PARAMS_DEFAULT.almacenamiento, ...userParams.almacenamiento },
      clima: { ...PARAMS_DEFAULT.clima, ...userParams.clima },
      politicas: { ...PARAMS_DEFAULT.politicas, ...userParams.politicas },
      montecarlo: { ...PARAMS_DEFAULT.montecarlo, ...userParams.montecarlo },
    };

    // Cache key (simplificada: params serializados)
    const cacheKey = JSON.stringify(params);

    if (cache.has(cacheKey)) {
      console.log(`[simulate] Cache hit`);
      const cached = cache.get(cacheKey);
      (cached as any).metadata = { ...(cached as any).metadata, fromCache: true };
      return res.json(cached);
    }

    // Descargar y procesar datos climáticos
    console.log(`[simulate] Descargando Open-Meteo ${params.clima.anioReferencia}...`);
    const rawData = await getWeatherData(params.clima.anioReferencia);
    const base = procesarOpenMeteo(rawData);
    const weather = aplicarClimateShift(base, {
      deltaT: params.clima.deltaT,
      factorRadiacionSolar: params.clima.factorRadiacionSolar,
      factorViento: params.clima.factorViento,
      sequiaExtrema: params.clima.sequiaExtrema,
      hidraulicidad: params.clima.hidraulicidad,
      olaCalorExtrema: params.clima.olaCalorExtrema,
    });

    // Ejecutar simulación
    const resultado = await simular(params, weather);
    resultado.metadata.fromCache = false;

    // Guardar en cache (LRU simplificado)
    if (cache.size >= CACHE_MAX) {
      const firstKey = cache.keys().next().value;
      if (firstKey) cache.delete(firstKey);
    }
    cache.set(cacheKey, resultado);

    const duracion = performance.now() - inicio;
    console.log(`[simulate] Completada en ${duracion.toFixed(0)}ms`);

    res.json(resultado);
  } catch (error: any) {
    console.error('[simulate] Error:', error.message);
    res.status(500).json({
      error: 'Error en simulación',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/simulate/quick
 *
 * Ejecución rápida con defaults para preview.
 * Retorna solo resumen (sin hourly).
 */
simulateRoute.get('/simulate/quick', async (_req, res) => {
  try {
    const params = { ...PARAMS_DEFAULT };
    const rawData = await getWeatherData(params.clima.anioReferencia);
    const base = procesarOpenMeteo(rawData);
    const weather = aplicarClimateShift(base, {
      deltaT: params.clima.deltaT,
      factorRadiacionSolar: params.clima.factorRadiacionSolar,
      factorViento: params.clima.factorViento,
      sequiaExtrema: params.clima.sequiaExtrema,
      hidraulicidad: params.clima.hidraulicidad,
      olaCalorExtrema: params.clima.olaCalorExtrema,
    });

    const resultado = await simular(params, weather);

    // Solo retornar resumen (no hourly — es grande)
    res.json({
      resumen: resultado.resumen,
      metadata: resultado.metadata,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
