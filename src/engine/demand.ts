/**
 * ============================================================================
 *  DEMANDA SECTORIAL
 * ============================================================================
 *  Calcula la demanda eléctrica horaria desglosada por sectores:
 *  - Residencial (calefacción, climatización, iluminación)
 *  - Servicios (oficinas, comercio, hostelería)
 *  - Industria (procesos, motores)
 *  - Transporte eléctrico (VE, tren)
 *  - Bombas de calor (si no incluido en residencial)
 *  - Hidrógeno (electrólisis flexible)
 *  - Autoconsumo FV (resta de demanda de red)
 *
 *  La demanda depende de la temperatura horaria (grados-día) y del patrón
 *  semanal (laborable vs festivo).
 * ============================================================================
 */
import type { SimParams, ProcessedWeather } from './types';
import { FISICA } from './types';
import { mesDelDia, clamp } from './utils';

// ─── Perfiles horarios por sector ────────────────────────────────────────────

/**
 * Perfil horario normalizado de demanda residencial (24 valores).
 * Pico por la mañana (8-10h) y por la tarde (18-22h).
 */
const PERFIL_RESIDENCIAL = [
  0.55, 0.50, 0.48, 0.45, 0.45, 0.50, 0.60, 0.75, // 00-07
  0.85, 0.80, 0.75, 0.72, 0.70, 0.68, 0.70, 0.75, // 08-15
  0.82, 0.90, 1.00, 1.00, 0.95, 0.85, 0.72, 0.62, // 16-23
];

/**
 * Perfil horario normalizado de demanda de servicios (24 valores).
 * Pico durante horario laboral (9-18h).
 */
const PERFIL_SERVICIOS = [
  0.40, 0.38, 0.35, 0.35, 0.35, 0.38, 0.50, 0.65, // 00-07
  0.80, 0.90, 0.95, 0.95, 0.92, 0.92, 0.95, 0.95, // 08-15
  0.90, 0.85, 0.75, 0.65, 0.55, 0.48, 0.44, 0.42, // 16-23
];

/**
 * Perfil horario normalizado de demanda industrial (24 valores).
 * Producción constante con turnos (más bajo domingos).
 */
const PERFIL_INDUSTRIA = [
  0.60, 0.58, 0.58, 0.58, 0.58, 0.60, 0.70, 0.85, // 00-07
  0.95, 1.00, 1.00, 1.00, 0.95, 0.95, 1.00, 1.00, // 08-15
  0.98, 0.95, 0.90, 0.80, 0.72, 0.65, 0.62, 0.60, // 16-23
];

/**
 * Perfil horario de carga de vehículos eléctricos.
 * Pico nocturno (22-06h) cuando los coches están enchufados.
 */
const PERFIL_VE = [
  0.80, 0.90, 0.95, 0.90, 0.80, 0.60, 0.30, 0.10, // 00-07
  0.05, 0.03, 0.02, 0.02, 0.02, 0.02, 0.03, 0.05, // 08-15
  0.10, 0.20, 0.40, 0.60, 0.80, 0.90, 0.85, 0.82, // 16-23
];

// ─── Funciones de demanda ────────────────────────────────────────────────────

/**
 * Demanda residencial dependiente de temperatura.
 *
 * Modelo de grados-día simplificado:
 * - Base: 100 TWh/año (aproximado España peninsular)
 * - Calefacción: demanda crece cuando T < 17°C
 * - Climatización: demanda crece cuando T > 24°C
 *
 * @param temp - Temperatura horaria (°C)
 * @returns Factor de demanda residencial (1.0 = media anual)
 */
function factorResidencial(temp: number): number {
  const T_BASE = 17; // °C (comodidad térmica invierno)
  const T_VERANO = 24; // °C (comodidad térmico verano)

  let factor = 1.0;
  if (temp < T_BASE) {
    // Calefacción: +2% por cada °C bajo T_BASE
    factor += (T_BASE - temp) * 0.02;
  } else if (temp > T_VERANO) {
    // Climatización: +1.5% por cada °C sobre T_VERANO
    factor += (temp - T_VERANO) * 0.015;
  }
  return clamp(factor, 0.6, 1.8);
}

/**
 * Demanda de servicios ligeramente dependiente de temperatura.
 */
function factorServicios(temp: number): number {
  const factor = temp > 26 ? 1 + (temp - 26) * 0.01 : 1.0;
  return clamp(factor, 0.85, 1.3);
}

/**
 * Demanda industrial casi constante (poca dependencia climática).
 */
function factorIndustria(_temp: number): number {
  return 1.0;
}

/**
 * Demanda de bombas de calor dependiente de temperatura.
 *
 * COP (Coefficient of Performance) varía con T exterior:
 * - A T=5°C: COP≈2.5 (más electricidad por kWh de calor)
 * - A T=15°C: COP≈4.0 (más eficiente)
 * - A T=-5°C: COP≈1.8 (muy ineficiente, backup gas)
 */
function factorBombaCalor(temp: number): number {
  const COP = clamp(2.0 + (temp + 5) * 0.15, 1.5, 5.0);
  // Más demanda cuando hace frío (COP bajo = más electricidad)
  const demandaRelativa = temp < 17 ? (17 - temp) / 12 : 0;
  return clamp(demandaRelativa / COP * 3, 0, 1.5);
}

// ─── Cálculo principal ───────────────────────────────────────────────────────

/**
 * Calcula la demanda horaria del sistema eléctrico.
 *
 * @param params - Parámetros de la simulación
 * @param weather - Datos climáticos procesados
 * @returns Array de demanda horaria en GW
 */
export function calcularDemandaHoraria(
  params: SimParams,
  weather: ProcessedWeather,
): Float64Array {
  const horas = FISICA.HORAS_ANIO;
  const demanda = new Float64Array(horas);

  // Demanda base anual (TWh → GW media)
  const demandaBaseGW = params.demanda.demandaAnual * 1000 / horas; // TWh → GW

  // Crecimiento desde año base
  const anos = params.anioObjetivo - params.anioInicio;
  const crecimiento = Math.pow(1 + params.demanda.crecimientoDemanda / 100, anos);
  const electrificacion = params.demanda.electrificacionTWh * anos / 1000 * 1000 / horas;
  const factorEficiencia = Math.max(0.82, params.demanda.eficienciaDemanda);

  const demandaTotalGW = (demandaBaseGW * crecimiento + electrificacion) * factorEficiencia;

  // Autoconsumo FV (resta de demanda de red)
  const autoconsumoGW = params.demanda.autoconsumoFV * 0.24; // CF medio 24%

  for (let h = 0; h < horas; h++) {
    const temp = weather.temperature[h];
    const dia = Math.floor(h / 24);
    const horaDelDia = h % 24;
    const mes = mesDelDia(dia);

    // ¿Es fin de semana? (día 5 y 6 de la semana)
    const diaSemana = dia % 7;
    const esFinDeSemana = diaSemana >= 5;

    // Factores por sector
    const fResidencial = PERFIL_RESIDENCIAL[horaDelDia] * factorResidencial(temp);
    const fServicios = PERFIL_SERVICIOS[horaDelDia] * factorServicios(temp) *
      (esFinDeSemana ? 0.6 : 1.0); // servicios baja fines de semana
    const fIndustria = PERFIL_INDUSTRIA[horaDelDia] * factorIndustria(temp) *
      (esFinDeSemana ? 0.3 : 1.0); // industria baja fines de semana

    // Pesos sectoriales (aproximación España 2025)
    const pesoResidencial = 0.30;
    const pesoServicios = 0.35;
    const pesoIndustria = 0.35;

    const factorSectorial =
      fResidencial * pesoResidencial +
      fServicios * pesoServicios +
      fIndustria * pesoIndustria;

    // Demanda total de la hora
    demanda[h] = clamp(
      demandaTotalGW * factorSectorial,
      demandaTotalGW * 0.4,  // mínimo absoluto
      demandaTotalGW * 1.6,  // máximo absoluto
    );
  }

  return demanda;
}

/**
 * Desglose de demanda por sectores (para visualización).
 */
export interface DesgloseDemanda {
  residencial: Float64Array;
  servicios: Float64Array;
  industria: Float64Array;
  ve: Float64Array;
  bombaCalor: Float64Array;
  total: Float64Array;
}

export function calcularDesgloseDemanda(
  params: SimParams,
  weather: ProcessedWeather,
): DesgloseDemanda {
  const horas = FISICA.HORAS_ANIO;
  const total = new Float64Array(horas);
  const residencial = new Float64Array(horas);
  const servicios = new Float64Array(horas);
  const industria = new Float64Array(horas);
  const ve = new Float64Array(horas);
  const bombaCalor = new Float64Array(horas);

  const demanda = calcularDemandaHoraria(params, weather);

  for (let h = 0; h < horas; h++) {
    const temp = weather.temperature[h];
    const horaDelDia = h % 24;
    const dia = Math.floor(h / 24);
    const diaSemana = dia % 7;
    const esFinDeSemana = diaSemana >= 5;

    residencial[h] = demanda[h] * PERFIL_RESIDENCIAL[horaDelDia] * factorResidencial(temp) * 0.30;
    servicios[h] = demanda[h] * PERFIL_SERVICIOS[horaDelDia] * factorServicios(temp) *
      (esFinDeSemana ? 0.6 : 1.0) * 0.35;
    industria[h] = demanda[h] * PERFIL_INDUSTRIA[horaDelDia] * factorIndustria(temp) *
      (esFinDeSemana ? 0.3 : 1.0) * 0.35;
    ve[h] = demanda[h] * PERFIL_VE[horaDelDia] * 0.08; // ~8% de la demanda total
    bombaCalor[h] = demanda[h] * factorBombaCalor(temp) * 0.10;

    total[h] = residencial[h] + servicios[h] + industria[h] + ve[h] + bombaCalor[h];
  }

  return { residencial, servicios, industria, ve, bombaCalor, total };
}
