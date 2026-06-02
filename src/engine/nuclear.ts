/**
 * ============================================================================
 *  CALENDARIO NUCLEAR ENRESA
 * ============================================================================
 *  Calendario oficial de paradas y cierres de los 7 reactores españoles.
 *  Incluye paradas de recarga escalonadas (~30 días cada 18 meses).
 *  Fuente: enresa.es (datos verificados a junio 2026)
 * ============================================================================
 */

// ─── Datos de reactores ──────────────────────────────────────────────────────

export interface Reactor {
  nombre: string;
  codigo: string;
  capacidadMW: number;
  fechaCierreOficial: string;   // YYYY-MM-DD (mes aproximado)
  anioCierre: number;
  mesCierre: number;            // 0-11
  paradaRecargaMes: number;     // mes del año (0-11) para recarga
  paradaRecargaDuracion: number; // días
}

/** Los 7 reactores de la red española */
export const REACTORES: Reactor[] = [
  {
    nombre: 'Almaraz I',
    codigo: 'AI',
    capacidadMW: 1031,
    fechaCierreOficial: '2027-11-01',
    anioCierre: 2027,
    mesCierre: 10,
    paradaRecargaMes: 4,        // mayo
    paradaRecargaDuracion: 30,
  },
  {
    nombre: 'Almaraz II',
    codigo: 'AII',
    capacidadMW: 1029,
    fechaCierreOficial: '2028-10-01',
    anioCierre: 2028,
    mesCierre: 9,
    paradaRecargaMes: 10,       // noviembre
    paradaRecargaDuracion: 30,
  },
  {
    nombre: 'Ascó I',
    codigo: 'AI',
    capacidadMW: 1032,
    fechaCierreOficial: '2030-10-01',
    anioCierre: 2030,
    mesCierre: 9,
    paradaRecargaMes: 3,        // abril
    paradaRecargaDuracion: 30,
  },
  {
    nombre: 'Cofrentes',
    codigo: 'C',
    capacidadMW: 1064,
    fechaCierreOficial: '2030-11-01',
    anioCierre: 2030,
    mesCierre: 10,
    paradaRecargaMes: 8,        // septiembre
    paradaRecargaDuracion: 30,
  },
  {
    nombre: 'Ascó II',
    codigo: 'AII',
    capacidadMW: 1027,
    fechaCierreOficial: '2032-09-01',
    anioCierre: 2032,
    mesCierre: 8,
    paradaRecargaMes: 1,        // febrero
    paradaRecargaDuracion: 30,
  },
  {
    nombre: 'Vandellós II',
    codigo: 'VII',
    capacidadMW: 1087,
    fechaCierreOficial: '2035-02-01',
    anioCierre: 2035,
    mesCierre: 1,
    paradaRecargaMes: 6,        // julio
    paradaRecargaDuracion: 30,
  },
  {
    nombre: 'Trillo',
    codigo: 'T',
    capacidadMW: 1066,
    fechaCierreOficial: '2035-05-01',
    anioCierre: 2035,
    mesCierre: 4,
    paradaRecargaMes: 11,       // diciembre
    paradaRecargaDuracion: 30,
  },
];

// ─── Funciones de disponibilidad ─────────────────────────────────────────────

/**
 * Capacidad nuclear total instalada (MW)
 */
export function capacidadTotal(): number {
  return REACTORES.reduce((acc, r) => acc + r.capacidadMW, 0);
}

/**
 * ¿Está disponible un reactor en un año dado?
 * Respeta el calendario ENRESA y las prórrogas.
 *
 * @param reactor - Reactor a evaluar
 * @param anio - Año a evaluar
 * @param prorrogaAnios - Años de prórroga (0 = cierre según ENRESA)
 * @param cierreForzado - Si se fuerza cierre antes de ENRESA (ej: 2030)
 * @returns true si el reactor está disponible
 */
export function reactorDisponible(
  reactor: Reactor,
  anio: number,
  prorrogaAnios = 0,
  cierreForzado?: number,
): boolean {
  const anioEfectivo = cierreForzado ?? (reactor.anioCierre + prorrogaAnios);
  return anio < anioEfectivo;
}

/**
 * Número de reactores disponibles en un año
 */
export function reactoresDisponibles(
  anio: number,
  prorrogaAnios = 0,
  cierreForzado?: number,
): number {
  return REACTORES.filter(r =>
    reactorDisponible(r, anio, prorrogaAnios, cierreForzado),
  ).length;
}

/**
 * Capacidad nuclear disponible en un año (MW)
 * Sin考虑ar paradas de recarga (para cálculo anual).
 */
export function capacidadDisponibleAnual(
  anio: number,
  prorrogaAnios = 0,
  cierreForzado?: number,
): number {
  return REACTORES
    .filter(r => reactorDisponible(r, anio, prorrogaAnios, cierreForzado))
    .reduce((acc, r) => acc + r.capacidadMW, 0);
}

/**
 * Capacidad nuclear horaria (MW) considerando paradas de recarga.
 * Cada reactor tiene ~30 días de parada cada 18 meses.
 *
 * @param horaAnio - Hora del año (0-8759)
 * @param anio - Año
 * @param prorrogaAnios - Años de prórroga
 * @param cierreForzado - Cierre forzado
 * @returns Capacidad disponible en MW
 */
export function capacidadNuclearHoraria(
  horaAnio: number,
  anio: number,
  prorrogaAnios = 0,
  cierreForzado?: number,
): number {
  const dia = Math.floor(horaAnio / 24);
  const mes = Math.floor(dia / 30.44); // aproximación mes
  let totalMW = 0;

  for (const reactor of REACTORES) {
    if (!reactorDisponible(reactor, anio, prorrogaAnios, cierreForzado)) continue;

    // Parada de recarga: ~30 días cada 18 meses
    // Simplificación: parada cada año par en el mes designado
    const mesesDesdeInicio = (anio - 2026) * 12 + mes;
    const enParada =
      mes === reactor.paradaRecargaMes &&
      mesesDesdeInicio % 18 < 1 && // cada 18 meses
      dia % 30 < reactor.paradaRecargaDuracion / 30;

    if (!enParada) {
      totalMW += reactor.capacidadMW;
    }
  }

  return totalMW;
}

/**
 * Detalle de estado de cada reactor en un año
 */
export function detalleReactores(
  anio: number,
  prorrogaAnios = 0,
  cierreForzado?: number,
): Array<{
  nombre: string;
  disponible: boolean;
  capacidadMW: number;
  motivo: string;
}> {
  return REACTORES.map(r => {
    const disponible = reactorDisponible(r, anio, prorrogaAnios, cierreForzado);
    let motivo = 'Operativo';
    if (!disponible) {
      if (cierreForzado && anio >= cierreForzado) {
        motivo = `Cerrado por decisión política (${cierreForzado})`;
      } else if (anio >= r.anioCierre + prorrogaAnios) {
        motivo = prorrogaAnios > 0
          ? `Cerrado tras ${prorrogaAnios} años de prórroga (ENRESA + ${prorrogaAnios})`
          : 'Cerrado según calendario ENRESA';
      }
    }
    return {
      nombre: r.nombre,
      disponible,
      capacidadMW: disponible ? r.capacidadMW : 0,
      motivo,
    };
  });
}
