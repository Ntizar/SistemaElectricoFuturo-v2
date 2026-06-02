/**
 * ============================================================================
 *  CÁLCULO DE PRECIO CON PEAJES Y CfD
 * ============================================================================
 *  Transforma el precio marginal en precio final al consumidor.
 *
 *  Componentes del precio:
 *  1. Precio marginal (SRMC) — del merit-order
 *  2. Peajes de acceso — por tramos horarios (P1/P2/P3)
 *  3. Cargo del sistema — fijo por MWh
 *  4. CfD (Contrato por Diferencias) — ajuste bilateral
 *  5. Impuestos — IVA + impuesto eléctrico
 * ============================================================================
 */
import type { SimParams } from './types';
import { clamp } from './utils';

// ─── Peajes por tramo horario ────────────────────────────────────────────────

/**
 * Clasifica la hora en tramo de peaje.
 * P1 (punta): 10-14h, 18-22h (6h)
 * P2 (llano): 8-10h, 14-18h, 22-24h (8h)
 * P3 (valle): 0-8h (10h) — nocturno
 */
export function tramoPeaje(horaDelDia: number): 'P1' | 'P2' | 'P3' {
  if (horaDelDia >= 10 && horaDelDia < 14) return 'P1';
  if (horaDelDia >= 18 && horaDelDia < 22) return 'P1';
  if (horaDelDia >= 8 && horaDelDia < 10) return 'P2';
  if (horaDelDia >= 14 && horaDelDia < 18) return 'P2';
  if (horaDelDia >= 22 && horaDelDia < 24) return 'P2';
  return 'P3'; // 0-8h
}

/**
 * Precio del peaje para una hora dada.
 */
export function precioPeaje(
  horaDelDia: number,
  peajes: { peajeP1: number; peajeP2: number; peajeP3: number },
): number {
  const tramo = tramoPeaje(horaDelDia);
  switch (tramo) {
    case 'P1': return peajes.peajeP1;
    case 'P2': return peajes.peajeP2;
    case 'P3': return peajes.peajeP3;
  }
}

// ─── CfD: Contrato por Diferencias ───────────────────────────────────────────

/**
 * Calcula el ajuste del CfD de doble cara.
 *
 * El CfD funciona así:
 * - Si precio_spot < strike: productor cobra la diferencia (subsidio)
 * - Si precio_spot > strike: productor devuelve la diferencia (penalización)
 * - El resultado neto fija el precio para el productor en ~strike
 *
 * El CfD REDUCE la volatilidad del precio al consumidor porque
 * la parte subvencionada se socializa en los peajes.
 *
 * @param precioSpot - Precio marginal de mercado
 * @param strike - Precio strike del CfD
 * @returns Ajuste del CfD (positivo = subsidio, negativo = penalización)
 */
export function ajusteCfd(precioSpot: number, strike: number): number {
  // CfD de doble cara: productor siempre recibe 'strike'
  // Si spot < strike → diferença se paga (subsidio)
  // Si spot > strike → diferença se devuelve (penalización)
  return strike - precioSpot;
}

// ─── Precio final al consumidor ──────────────────────────────────────────────

export interface PrecioFinal {
  /** Precio marginal del mercado */
  mercado: number;
  /** Precio con peajes de acceso */
  conPeajes: number;
  /** Precio con cargo de sistema */
  conCargos: number;
  /** Precio con CfD (si activo) */
  conCfd: number;
  /** Tramo de peaje */
  tramo: 'P1' | 'P2' | 'P3';
}

/**
 * Calcula el precio final al consumidor para una hora.
 *
 * @param precioMarginal - Precio marginal SRMC
 * @param horaDelDia - Hora del día (0-23)
 * @param params - Parámetros con peajes y CfD
 * @returns Desglose del precio
 */
export function calcularPrecioFinal(
  precioMarginal: number,
  horaDelDia: number,
  params: SimParams,
): PrecioFinal {
  const p = params.politicas;

  // 1. Base: precio de mercado
  const mercado = precioMarginal;

  // 2. Peajes
  const peaje = p.peajesDinamicos
    ? precioPeaje(horaDelDia, { peajeP1: p.peajeP1, peajeP2: p.peajeP2, peajeP3: p.peajeP3 })
    : (p.peajeP1 + p.peajeP2 + p.peajeP3) / 3; // Peaje medio si no son dinámicos

  const conPeajes = mercado + peaje;

  // 3. Cargo del sistema (fijo)
  const conCargos = conPeajes + 10.5; // Cargo medio ~10.5 €/MWh

  // 4. CfD
  let ajusteCfdVal = 0;
  if (p.cfdActivo) {
    ajusteCfdVal = ajusteCfd(mercado, p.cfdStrike);
  }
  const conCfd = conCargos - ajusteCfdVal; // Restar porque el CfD se socializa

  // 5. Clamp (precio no puede ser absurdamente bajo o alto)
  const tramo = tramoPeaje(horaDelDia);

  return {
    mercado,
    conPeajes,
    conCargos,
    conCfd: clamp(conCfd, -20, 400),
    tramo,
  };
}

/**
 * Precio medio de los peajes a lo largo del año.
 */
export function precioMedioPeajes(
  params: SimParams,
): number {
  if (!params.politicas.peajesDinamicos) {
    return (params.politicas.peajeP1 + params.politicas.peajeP2 + params.politicas.peajeP3) / 3;
  }

  // Distribución horaria típica: P1=25%, P2=33%, P3=42%
  return (
    params.politicas.peajeP1 * 0.25 +
    params.politicas.peajeP2 * 0.33 +
    params.politicas.peajeP3 * 0.42
  );
}
