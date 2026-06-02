/**
 * ============================================================================
 *  RUTA: GET /api/weather/:year
 * ============================================================================
 *  Retorna datos climáticos procesados de Open-Meteo para un año.
 * ============================================================================
 */

import { Router } from 'express';
import { getWeatherData, procesarOpenMeteo, ANIOS_DISPONIBLES } from '../../engine/weather/open-meteo';

export const weatherRoute = Router();

/**
 * GET /api/weather/:year
 * Retorna datos climáticos procesados (CF solar, CF eólico, temperatura).
 */
weatherRoute.get('/weather/:year', async (req, res) => {
  try {
    const year = parseInt(req.params.year, 10);

    if (!ANIOS_DISPONIBLES.includes(year as any)) {
      return res.status(400).json({
        error: `Año ${year} no disponible`,
        disponibles: [...ANIOS_DISPONIBLES],
      });
    }

    const rawData = await getWeatherData(year);
    const processed = procesarOpenMeteo(rawData);

    // Retornar resumen + primeras 168 horas (1 semana) como preview
    res.json({
      year,
      summary: processed.summary,
      hours: processed.hours,
      preview: {
        solar: Array.from(processed.solar.slice(0, 168)),
        wind: Array.from(processed.wind.slice(0, 168)),
        temperature: Array.from(processed.temperature.slice(0, 168)),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/weather
 * Lista años disponibles.
 */
weatherRoute.get('/weather', (_req, res) => {
  res.json({
    disponibles: [...ANIOS_DISPONIBLES],
    notas: {
      '2024': 'Año completo con datos fiables',
      '2025': 'Parcial hasta junio',
      '2020-2023': 'Disponibles pero con menor resolución',
    },
  });
});
