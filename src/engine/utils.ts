/**
 * ============================================================================
 *  UTILIDADES DEL MOTOR DE SIMULACIÓN
 * ============================================================================
 *  PRNG Mulberry32, helpers matemáticos, funciones de calendario.
 *  SIN dependencias externas — módulo puro.
 * ============================================================================
 */

// ─── PRNG: Mulberry32 ────────────────────────────────────────────────────────
// Mulberry32 es un PRNG de 32 bits, rápido y con buena distribución.
// Mismo seed = misma secuencia siempre (determinista).
// Referencia: https://gist.github.com/tommyettinger/46a874533244883189143505d203312c

export class Mulberry32 {
  private state: number;

  constructor(seed: number) {
    this.state = Number.isFinite(seed) ? seed | 0 : 42;
  }

  /** Siguiente número uniforme [0, 1) */
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6D2B79F5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    const u = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    // Evitar exactamente 0 y 1 (problemas con log en Box-Muller)
    return Math.max(1e-14, Math.min(1 - 1e-14, u));
  }

  /** Número gaussiano (Box-Muller) con media y desviación */
  gauss(mean = 0, sigma = 1): number {
    const u1 = this.next();
    const u2 = this.next();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + sigma * z;
  }

  /** Entero aleatorio en [min, max] (inclusivo) */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

// ─── Helpers matemáticos ─────────────────────────────────────────────────────

/** Clamp: limitar valor al rango [min, max] */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Lerp: interpolación lineal entre a y b por factor t */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Suma de un array de números */
export function sum(values: ArrayLike<number>): number {
  let total = 0;
  for (let i = 0; i < values.length; i++) total += values[i];
  return total;
}

/** Media de un array de números */
export function mean(values: ArrayLike<number>): number {
  return sum(values) / values.length;
}

/** Desviación estándar de un array */
export function stddev(values: ArrayLike<number>): number {
  const n = values.length;
  if (n < 2) return 0;
  const m = mean(values);
  let ss = 0;
  for (let i = 0; i < n; i++) {
    const d = values[i] - m;
    ss += d * d;
  }
  return Math.sqrt(ss / (n - 1));
}

/** Percentil de un array (requiere array ordenado o se ordena) */
export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/** Normalizar serie para que sume targetGWh (en GWh, serie en GW) */
export function normalizeSeries(
  series: Float64Array,
  targetGWh: number,
): Float64Array {
  const totalGW = sum(series);
  const factor = totalGW > 0 ? targetGWh / totalGW : 0;
  const out = new Float64Array(series.length);
  for (let i = 0; i < series.length; i++) out[i] = series[i] * factor;
  return out;
}

/** Redondear a 2 decimales */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// ─── Calendario ──────────────────────────────────────────────────────────────

/** Días acumulados por mes (año no bisiesto) */
const DIAS_ACUM = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];

/** Mes del año (0-11) a partir del día del año (0-364) */
export function mesDelDia(dia: number): number {
  for (let m = 0; m < 12; m++) {
    if (dia < DIAS_ACUM[m + 1]) return m;
  }
  return 11;
}

/** Día del año (0-364) a partir de mes (0-11) y día del mes (1-31) */
export function diaDelAnio(mes: number, diaDelMes: number): number {
  return DIAS_ACUM[mes] + (diaDelMes - 1);
}

/** ¿Es año bisiesto? */
export function esBisiesto(anio: number): boolean {
  return (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;
}

/** Horas en un año */
export function horasEnAnio(anio: number): number {
  return esBisiesto(anio) ? 8784 : 8760;
}

// ─── Constantes de meses ─────────────────────────────────────────────────────

export const MESES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
] as const;

export const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const;
