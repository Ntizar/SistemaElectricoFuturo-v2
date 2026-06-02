/**
 * ============================================================================
 *  ORDEN DE MÉRITO Y PRECIO MARGINAL SRMC
 * ============================================================================
 *  Implementa el despacho por orden de mérito (merit order) del sistema
 *  eléctrico español.
 *
 *  El precio marginal de cada hora es el SRMC (Short-Run Marginal Cost)
 *  de la última tecnología necesaria para cubrir la demanda.
 *
 *  Orden de mérito (de menor a mayor SRMC):
 *    1. Nuclear (must-run, SRMC ≈ 10 €/MWh)
 *    2. Solar FV (SRMC ≈ 0)
 *    3. Eólica onshore (SRMC ≈ 0)
 *    4. Eólica offshore (SRMC ≈ 0)
 *    5. Hidráulica fluyente (SRMC ≈ 5 €/MWh)
 *    6. Baterías (SRMC = precio reciente × 0.9)
 *    7. Bombeo (SRMC = precio reciente × 1.1)
 *    8. V2G (SRMC = precio reciente × 1.2)
 *    9. Hidráulica de embalse (SRMC = 45 + ajuste sequía)
 *   10. Importación (SRMC = precio frontera)
 *   11. Carbón (SRMC alto por emisiones)
 *   12. CCGT (SRMC = gas/η + CO₂·factor/η + O&M)
 *   13. Flexibilidad descendente (SRMC = VoLL)
 * ============================================================================
 */

import type { SimParams, Tecnologia } from './types';
import { FISICA, ORDEN_MERITO } from './types';

// ─── SRMC por tecnología ─────────────────────────────────────────────────────

export interface SRMCTecnologia {
  tecnologia: Tecnologia;
  srmc: number;    // €/MWh
  capacidad: number; // GW disponible
}

/**
 * Calcula el SRMC de cada tecnología para una hora dada.
 *
 * @param params - Parámetros de la simulación
 * @param generacion - Generación de cada tecnología (GW)
 * @param hidraulicidad - Factor de hidraulicidad horaria
 * @param srmcAlmacenamiento - SRMC del almacenamiento (del operador)
 * @returns Array ordenado por SRMC (menor a mayor)
 */
export function calcularSRMCOrden(
  params: SimParams,
  generacion: Record<Tecnologia, number>,
  hidraulicidad: number,
  srmcAlmacenamiento?: {
    bateria: number;
    bombeo: number;
    v2g: number;
  },
): SRMCTecnologia[] {
  const c = params.costes;
  const rendimiento = Math.max(0.45, params.costes.rendimientoCCGT);

  // SRMC del CCGT
  const costeGas = c.precioGas / rendimiento;
  const costeCO2 = (FISICA.FACTOR_CO2_GAS / rendimiento) * c.precioCO2;
  const srmcCCGT = costeGas + costeCO2 + c.omCCGT;

  // SRMC del carbón
  const srmcCarbon = c.precioGas * 0.8 / 0.38 + c.precioCO2 * 0.9 / 0.38 + c.omCarbon;

  // SRMC de la hidráulica de embalse (depende de hidraulicidad)
  const srmcHidroEmbalse = 45 + (1 - hidraulicidad) * 20;

  // SRMCs del almacenamiento (del operador o defaults)
  const srmcBat = srmcAlmacenamiento?.bateria ?? 30;
  const srmcBombeo = srmcAlmacenamiento?.bombeo ?? 35;
  const srmcV2G = srmcAlmacenamiento?.v2g ?? 40;

  // Construir array ordenado por SRMC
  const orden: SRMCTecnologia[] = [
    { tecnologia: 'nuclear',         srmc: 10,                    capacidad: generacion.nuclear },
    { tecnologia: 'solarFV',         srmc: 0,                     capacidad: generacion.solarFV },
    { tecnologia: 'eolicaOnshore',   srmc: 0,                     capacidad: generacion.eolicaOnshore },
    { tecnologia: 'eolicaOffshore',  srmc: 0,                     capacidad: generacion.eolicaOffshore },
    { tecnologia: 'hidroFluyente',   srmc: 5,                     capacidad: generacion.hidroFluyente },
    { tecnologia: 'baterias',        srmc: srmcBat,               capacidad: generacion.baterias },
    { tecnologia: 'bombeo',          srmc: srmcBombeo,            capacidad: generacion.bombeo },
    { tecnologia: 'v2g',             srmc: srmcV2G,               capacidad: generacion.v2g },
    { tecnologia: 'hidroEmbalse',    srmc: srmcHidroEmbalse,      capacidad: generacion.hidroEmbalse },
    { tecnologia: 'importacion',     srmc: c.precioImportFrancia, capacidad: generacion.importacion },
    { tecnologia: 'carbon',          srmc: srmcCarbon,            capacidad: generacion.carbon },
    { tecnologia: 'ccgt',            srmc: srmcCCGT,              capacidad: generacion.ccgt },
    { tecnologia: 'flexDown',        srmc: c.precioEscasez,       capacidad: generacion.flexDown },
  ];

  // Ordenar por SRMC (menor a mayor)
  orden.sort((a, b) => a.srmc - b.srmc);

  return orden;
}

// ─── Cálculo del precio marginal ─────────────────────────────────────────────

export interface ResultadoPrecio {
  precioMarginal: number;
  tecnologiaMarginal: Tecnologia;
  srmcMarginal: number;
  ratioRenovable: number;
  precioNegativo: boolean;
  precioEscasez: boolean;
  primas: {
    inercia: number;
    reserva: number;
  };
}

/**
 * Calcula el precio marginal horario.
 *
 * El precio es el SRMC de la última tecnología dispatchada.
 * Se aplican primas adicionales por:
 * - Estrés de inercia (si inercia síncrona < mínimo)
 * - Reserva rodante (si reserve margin < 4%)
 * - Precios negativos (si renovable + must-run > demanda × 1.2)
 * - Precio de escasez (si déficit > 0.3 GW)
 *
 * @param params - Parámetros
 * @param ordenMerito - Array ordenado por SRMC
 * @param demandaGW - Demanda de la hora
 * @param renovablesGW - Suma de generación renovable
 * @param mustRunGW - Suma de generación must-run
 * @param historialPrecios - Precios de las últimas 24h (para detectar tendencia)
 * @returns Resultado del cálculo de precio
 */
export function calcularPrecioMarginal(
  params: SimParams,
  ordenMerito: SRMCTecnologia[],
  demandaGW: number,
  renovablesGW: number,
  mustRunGW: number,
  historialPrecios: number[],
): ResultadoPrecio {
  // ─── Ratio renovable ───
  const ratioRenovable = demandaGW > 0 ? (renovablesGW + mustRunGW) / demandaGW : 0;

  // ─── Precio negativo ───
  // Cuando renovable + must-run > demanda × 1.2, precio se va a negativo
  if (ratioRenovable > 1.20) {
    const exceso = ratioRenovable - 1.20;
    const precioNeg = -50 * Math.min(exceso / 0.3, 1); // Máximo -50 €/MWh
    return {
      precioMarginal: precioNeg,
      tecnologiaMarginal: 'solarFV',
      srmcMarginal: 0,
      ratioRenovable,
      precioNegativo: true,
      precioEscasez: false,
      primas: { inercia: 0, reserva: 0 },
    };
  }

  // ─── Despacho por orden de mérito ───
  let demandaRestante = demandaGW;
  let precioMarginal = 0;
  let tecnologiaMarginal: Tecnologia = 'flexDown';

  for (const tech of ordenMerito) {
    if (tech.capacidad <= 0) continue;

    const dispatch = Math.min(tech.capacidad, demandaRestante);
    demandaRestante -= dispatch;

    if (dispatch > 0.01) { // Mínimo 10 MW para ser marginal
      precioMarginal = tech.srmc;
      tecnologiaMarginal = tech.tecnologia;
    }

    if (demandaRestante <= 0) break;
  }

  // ─── Déficit: si aún queda demanda sin cubrir ───
  const precioEscasez = demandaRestante > 0.3; // > 300 MW déficit

  if (precioEscasez) {
    // Precio escala con el déficit hasta VoLL
    const factorEscasez = Math.min(demandaRestante / 5, 1); // 5 GW = VoLL
    precioMarginal = 300 + (FISICA.VOLL - 300) * factorEscasez;
    tecnologiaMarginal = 'flexDown';
  }

  // ─── Primas adicionales ───
  let primaInercia = 0;
  let primaReserva = 0;

  // Prima por estrés de inercia (si nuclear baja, hay menos inercia)
  if (mustRunGW < FISICA.INERCIA_MIN_GW) {
    primaInercia = 25; // €/MWh adicional
  }

  // Prima por reserva rodante baja
  const margenReserva = (demandasGW: number) => {
    const disponibleTotal = ordenMerito.reduce((acc, t) => acc + t.capacidad, 0);
    return disponibleTotal > 0 ? (disponibleTotal - demandaGW) / demandaGW * 100 : 0;
  };
  if (margenReserva(demandaGW) < FISICA.RESERVA_RODANTE_PCT) {
    primaReserva = 18; // €/MWh adicional
  }

  // ─── Clamp final ───
  const precioFinal = Math.max(-50, Math.min(FISICA.VOLL,
    precioMarginal + primaInercia + primaReserva,
  ));

  return {
    precioMarginal: precioFinal,
    tecnologiaMarginal,
    srmcMarginal: precioMarginal,
    ratioRenovable,
    precioNegativo: precioFinal < 0,
    precioEscasez,
    primas: { inercia: primaInercia, reserva: primaReserva },
  };
}
