/**
 * ============================================================================
 *  FETCH DE DATOS CLIMÁTICOS — OPEN-METEO ARCHIVE API
 * ============================================================================
 *  Descarga datos meteorológicos reales horarios para España peninsular.
 *  API gratuita sin key: https://open-meteo.com/
 *
 *  Datos obtenidos por hora:
 *  - Temperatura (°C)
 *  - Radiación solar de onda corta (W/m²)
 *  - Velocidad del viento a 10m (m/s)
 *  - Cobertura nubosa (%)
 *  - Humedad relativa (%)
 *
 *  IMPORTANTE: shortwave_radiation (NO solar_radiation — este último no existe
 *  en la API archive).
 * ============================================================================
 */

import type { OpenMeteoData, ProcessedWeather } from './types';
import { FISICA } from './types';
import { clamp, mesDelDia } from './utils';

// ─── Configuración ───────────────────────────────────────────────────────────

/** Coordenadas de referencia España peninsular (Madrid) */
const LATITUD = 40.4165;
const LONGITUD = -3.7026;
const TIMEZONE = 'Europe/Madrid';

/** URL base de Open-Meteo Archive */
const BASE_URL = 'https://archive-api.open-meteo.com/v1/archive';

/** Variables horarias a solicitar */
const HOURLY_VARS = [
  'temperature_2m',
  'shortwave_radiation',
  'wind_speed_10m',
  'cloud_cover',
  'relative_humidity_2m',
].join(',');

// ─── Fetch de datos ──────────────────────────────────────────────────────────

/**
 * Descarga datos climáticos horarios de Open-Meteo para un año completo.
 *
 * @param year - Año (2020-2025, datos disponibles desde 1940)
 * @returns Datos horarios completos (8760 o 8784 horas)
 */
export async function fetchOpenMeteo(year: number): Promise<OpenMeteoData> {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const url = new URL(BASE_URL);
  url.searchParams.set('latitude', LATITUD.toString());
  url.searchParams.set('longitude', LONGITUD.toString());
  url.searchParams.set('start_date', startDate);
  url.searchParams.set('end_date', endDate);
  url.searchParams.set('hourly', HOURLY_VARS);
  url.searchParams.set('timezone', TIMEZONE);

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(
      `Open-Meteo API error: ${response.status} ${response.statusText} — ` +
      `URL: ${url.toString()}`,
    );
  }

  const data = await response.json();

  if (!data?.hourly?.time) {
    throw new Error('Open-Meteo: respuesta sin datos horarios');
  }

  return {
    year,
    latitude: LATITUD,
    longitude: LONGITUD,
    timezone: TIMEZONE,
    hourly: {
      time: data.hourly.time,
      temperature_2m: data.hourly.temperature_2m,
      shortwave_radiation: data.hourly.shortwave_radiation,
      wind_speed_10m: data.hourly.wind_speed_10m,
      cloud_cover: data.hourly.cloud_cover,
      relative_humidity_2m: data.hourly.relative_humidity_2m,
    },
  };
}

// ─── Procesamiento ───────────────────────────────────────────────────────────

/**
 * Convierte radiación solar (W/m²) en capacity factor horario.
 *
 * El modelo es simplificado pero físicamente razonable:
 * - Factor de capacidad = radiación / irradiancia_pico_teorica
 * - Irradiancia pico ≈ 1000 W/m² (condiciones STC)
 * - Se aplica corrección por eficiencia del módulo (~20%)
 *
 * Para un panel FV en España peninsular con orientación sur y inclinación 30°:
 * - Radiación pico ≈ 800 W/m² (con pérdidas por orientación)
 * - CF = radiación / 800 (clamp 0-1)
 */
function radiacionACapacityFactor(radiacionWm2: number): number {
  // Irradiancia efectiva pico para panel inclinado 30° sur en Madrid
  const IRRADIANCIA_PICO = 800; // W/m²
  return clamp(radiacionWm2 / IRRADIANCIA_PICO, 0, 1);
}

/**
 * Convierte velocidad del viento (m/s) en capacity factor.
 *
 * Modelo simplificado de turbina eólica:
 * - Cut-in: 3 m/s (empieza a generar)
 * - Rated: 12 m/s (genera potencia nominal)
 * - Cut-out: 25 m/s (se apaga por seguridad)
 * - Potencia ∝ v³ entre cut-in y rated
 *
 * CF = (v³ - v_cutin³) / (v_rated³ - v_cutin³) para 3 ≤ v ≤ 12
 * CF = 1 para 12 ≤ v ≤ 25
 * CF = 0 para v < 3 o v > 25
 */
function vientoACapacityFactor(vientoMs: number): number {
  const CUT_IN = 3;    // m/s
  const RATED = 12;    // m/s
  const CUT_OUT = 25;  // m/s

  if (vientoMs < CUT_IN || vientoMs > CUT_OUT) return 0;
  if (vientoMs >= RATED) return 1;

  // Modelo cúbico simplificado
  const v3 = vientoMs ** 3;
  const cutIn3 = CUT_IN ** 3;
  const rated3 = RATED ** 3;
  return clamp((v3 - cutIn3) / (rated3 - cutIn3), 0, 1);
}

/**
 * Procesa datos crudos de Open-Meteo en series listas para el motor.
 *
 * Transformaciones:
 * 1. Radiación → CF solar (con corrección por orientación)
 * 2. Velocidad viento → CF eólico (modelo de turbina)
 * 3. Temperatura directa (para demanda)
 * 4. Resumen estadístico
 */
export function procesarOpenMeteo(data: OpenMeteoData): ProcessedWeather {
  const n = data.hourly.time.length;
  const horasEsperadas = FISICA.HORAS_ANIO; // 8760

  if (n < horasEsperadas - 24) {
    throw new Error(
      `Open-Meteo: solo ${n} horas recibidas, se esperaban ${horasEsperadas}`,
    );
  }

  const solar = new Float64Array(horasEsperadas);
  const wind = new Float64Array(horasEsperadas);
  const temperature = new Float64Array(horasEsperadas);
  const humidity = new Float64Array(horasEsperadas);
  const cloudCover = new Float64Array(horasEsperadas);

  let sumSolar = 0;
  let sumWind = 0;
  let sumTemp = 0;
  let horasOlaCalor = 0;

  for (let h = 0; h < horasEsperadas; h++) {
    const rad = data.hourly.shortwave_radiation[h] ?? 0;
    const temp = data.hourly.temperature_2m[h] ?? 20;
    const windSpeed = data.hourly.wind_speed_10m[h] ?? 0;
    const hum = data.hourly.relative_humidity_2m[h] ?? 50;
    const cloud = data.hourly.cloud_cover[h] ?? 50;

    solar[h] = radiacionACapacityFactor(rad);
    wind[h] = vientoACapacityFactor(windSpeed);
    temperature[h] = temp;
    humidity[h] = hum;
    cloudCover[h] = cloud;

    sumSolar += solar[h];
    sumWind += wind[h];
    sumTemp += temp;
    if (temp > 35) horasOlaCalor++;
  }

  return {
    year: data.year,
    hours: horasEsperadas,
    solar,
    wind,
    temperature,
    humidity,
    cloudCover,
    summary: {
      cfSolarMedio: sumSolar / horasEsperadas,
      cfEolicoMedio: sumWind / horasEsperadas,
      temperaturaMedia: sumTemp / horasEsperadas,
      horasOlaCalor,
    },
  };
}

// ─── Cache local ─────────────────────────────────────────────────────────────

/** Cache en memoria para no repetir fetches */
const cache = new Map<number, OpenMeteoData>();

/**
 * Obtiene datos climáticos con cache.
 * Primera llamada fetch a Open-Meteo, siguientes desde cache.
 */
export async function getWeatherData(year: number): Promise<OpenMeteoData> {
  if (cache.has(year)) {
    return cache.get(year)!;
  }

  const data = await fetchOpenMeteo(year);
  cache.set(year, data);
  return data;
}

/**
 * Limpia la cache (para liberar memoria)
 */
export function clearWeatherCache(): void {
  cache.clear();
}

/**
 * Lista de años disponibles en Open-Meteo Archive
 */
export const ANIOS_DISPONIBLES = [2020, 2021, 2022, 2023, 2024, 2025] as const;
