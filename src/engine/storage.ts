/**
 * ============================================================================
 *  ALMACENAMIENTO: BATERÍAS + BOMBEO + V2G
 * ============================================================================
 *  Modelo de almacenamiento horario para el sistema eléctrico.
 *
 *  Baterías (Li-ion):
 *  - Estado de carga (SOC) tracking con eficiencia round-trip
 *  - Degradación por ciclos
 *  - Autodescarga (~0.1%/hora)
 *  - Descarga máxima = min(capacidad, potencia)
 *
 *  Bombeo hidroeléctrico:
 *  - Gestión estacional (embalse como batería gigante)
 *  - Eficiencia round-trip ~75%
 *  - Capacidad en GWh (no en horas)
 *
 *  V2G (Vehicle-to-Grid):
 *  - Participación del parque de VE movilizable
 *  - SRMC alto (el usuario paga una prima por la degradación)
 *  - Disponible solo de noche (coches enchufados)
 * ============================================================================
 */
import type { Almacenamiento as AlmacenamientoParams } from './types';
import { FISICA } from './types';
import { clamp } from './utils';

// ─── Estado del almacenamiento ───────────────────────────────────────────────

export interface EstadoBaterias {
  /** State of charge en GWh */
  soc: number;
  /** Capacidad máxima en GWh */
  capacidadMax: number;
  /** Potencia máxima de carga/descarga en GW */
  potenciaMax: number;
  /** Eficiencia round-trip (0-1) */
  eficiencia: number;
  /** Autodescarga por hora (0-1) */
  autodescarga: number;
  /** Ciclos acumulados (para degradación) */
  ciclosAcumulados: number;
}

export interface EstadoBombeo {
  /** Nivel del embalse superior en GWh */
  nivel: number;
  /** Capacidad máxima del embalse en GWh */
  capacidadMax: number;
  /** Potencia de bombeo (carga) en GW */
  potenciaBombeo: number;
  /** Potencia de turbina (descarga) en GW */
  potenciaTurbina: number;
  /** Eficiencia round-trip */
  eficiencia: number;
}

export interface EstadoV2G {
  /** Potencia máxima disponible (GW) */
  potenciaMax: number;
  /** Participación del parque */
  participacion: number;
}

export interface EstadoAlmacenamiento {
  baterias: EstadoBaterias;
  bombeo: EstadoBombeo;
  v2g: EstadoV2G;
}

// ─── Inicialización ──────────────────────────────────────────────────────────

/**
 * Inicializa el estado del almacenamiento.
 */
export function inicializarAlmacenamiento(
  params: AlmacenamientoParams,
  capacidad: {
    bateriasPotencia: number;
    bateriasHoras: number;
    bombeoPotencia: number;
    bombeoCapacidad: number;
    v2gPotencia: number;
  },
): EstadoAlmacenamiento {
  const bateriasCapGWh = capacidad.bateriasPotencia * capacidad.bateriasHoras;

  return {
    baterias: {
      soc: bateriasCapGWh * 0.5, // Empezar al 50%
      capacidadMax: bateriasCapGWh,
      potenciaMax: capacidad.bateriasPotencia,
      eficiencia: params.bateriasEficiencia,
      autodescarga: params.bateriasAutodescarga,
      ciclosAcumulados: 0,
    },
    bombeo: {
      nivel: capacidad.bombeoCapacidad * 0.6, // 60% lleno
      capacidadMax: capacidad.bombeoCapacidad,
      potenciaBombeo: capacidad.bombeoPotencia,
      potenciaTurbina: capacidad.bombeoPotencia * 0.9, // Turbina ligeramente menor
      eficiencia: params.bombeoEficiencia,
    },
    v2g: {
      potenciaMax: capacidad.v2gPotencia,
      participacion: params.v2gParticipacion,
    },
  };
}

// ─── Operación horaria ───────────────────────────────────────────────────────

export interface ResultadoAlmacenamiento {
  /** GW cargados en baterías */
  cargaBaterias: number;
  /** GW descargados de baterías */
  descargaBaterias: number;
  /** GW cargados en bombeo */
  cargaBombeo: number;
  /** GW descargados de bombeo */
  descargaBombeo: number;
  /** GW de V2G al sistema */
  v2g: number;
  /** SOC baterías (%) */
  socBaterias: number;
  /** Nivel embalse (GWh) */
  nivelEmbalse: number;
  /** SRMC del almacenamiento para precio marginal */
  srmcBateria: number;
  srmcBombeo: number;
  srmcV2G: number;
}

/**
 * Opera el almacenamiento una hora.
 *
 * @param estado - Estado actual (mutado in-place)
 * @param excedente - GW de excedente (renovable > demanda)
 * @param deficit - GW de déficit (demanda > generación)
 * @param precioReciente - Precio marginal de las últimas horas (para VoLL)
 * @returns Resultado de la operación
 */
export function operarAlmacenamiento(
  estado: EstadoAlmacenamiento,
  excedente: number,
  deficit: number,
  precioReciente: number,
  horaDelDia?: number,
): ResultadoAlmacenamiento {
  const b = estado.baterias;
  const p = estado.bombeo;
  const v = estado.v2g;

  let cargaBaterias = 0;
  let descargaBaterias = 0;
  let cargaBombeo = 0;
  let descargaBombeo = 0;
  let v2gOut = 0;

  // ─── Baterías ───
  if (excedente > 0) {
    // Cargar baterías con excedente
    const espacioLibre = b.capacidadMax - b.soc;
    const cargaMax = Math.min(b.potenciaMax, espacioLibre);
    cargaBaterias = Math.min(excedente, cargaMax);
    b.soc += cargaBaterias * b.eficiencia; // Eficiencia de carga
  } else if (deficit > 0) {
    // Descargar baterías para cubrir déficit
    const descargaMax = Math.min(b.potenciaMax, b.soc);
    descargaBaterias = Math.min(deficit, descargaMax);
    b.soc -= descargaBaterias;
    b.ciclosAcumulados += descargaBaterias / b.capacidadMax;
  }

  // Autodescarga (siempre, aunque pequeño)
  b.soc *= (1 - b.autodescarga);

  // Degradación incremental por ciclos (no exponencial)
  // 2% de pérdida de capacidad por ciclo completo equivalente
  const degradacionHora = b.ciclosAcumulados * 0.02 / FISICA.HORAS_ANIO;
  b.capacidadMax = Math.max(
    b.capacidadMax * 0.8, // mínimo 80% de capacidad original
    b.capacidadMax * (1 - degradacionHora),
  );

  // ─── Bombeo ───
  if (excedente > 0) {
    // Bombear agua al embalse superior
    const espacioLibre = p.capacidadMax - p.nivel;
    const cargaMax = Math.min(p.potenciaBombeo, espacioLibre);
    cargaBombeo = Math.min(excedente - cargaBaterias, Math.max(0, cargaMax));
    p.nivel += cargaBombeo * p.eficiencia;
  } else if (deficit > 0) {
    // Generar desde embalse
    const descargaMax = Math.min(p.potenciaTurbina, p.nivel);
    descargaBombeo = Math.min(deficit - descargaBaterias, Math.max(0, descargaMax));
    p.nivel -= descargaBombeo;
  }

  // ─── V2G (solo nocturno 22h-06h, coches enchufados) ───
  if (horaDelDia !== undefined && deficit > 0 && v.potenciaMax > 0) {
    const esNocturno = horaDelDia >= 22 || horaDelDia <= 6;
    if (esNocturno) {
      const disponible = v.potenciaMax * v.participacion;
      v2gOut = Math.min(deficit - descargaBaterias - descargaBombeo, Math.max(0, disponible));
    }
  }

  // ─── SRMC para precio marginal ───
  // El SRMC del almacenamiento = precio medio reciente (coste de oportunidad)
  const srmcBateria = clamp(precioReciente * 0.9, 20, 200); // 90% del precio reciente
  const srmcBombeo = clamp(precioReciente * 1.1, 25, 250);  // 110% del precio reciente
  const srmcV2G = clamp(precioReciente * 1.2, 30, 300);      // 120% + prima degradación

  return {
    cargaBaterias,
    descargaBaterias,
    cargaBombeo,
    descargaBombeo,
    v2g: v2gOut,
    socBaterias: b.soc / b.capacidadMax,
    nivelEmbalse: p.nivel,
    srmcBateria,
    srmcBombeo,
    srmcV2G,
  };
}

/**
 * Resetea el estado del almacenamiento para una nueva simulación.
 */
export function resetearAlmacenamiento(
  params: AlmacenamientoParams,
  capacidad: {
    bateriasPotencia: number;
    bateriasHoras: number;
    bombeoPotencia: number;
    bombeoCapacidad: number;
    v2gPotencia: number;
  },
): EstadoAlmacenamiento {
  return inicializarAlmacenamiento(params, capacidad);
}
