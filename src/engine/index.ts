/**
 * ============================================================================
 *  MOTOR DE SIMULACIÓN — ORQUESTADOR PRINCIPAL
 * ============================================================================
 *  Punto de entrada del motor de simulación headless.
 *  Coordina: clima → demanda → generación → merit-order → precio → KPIs
 *
 *  Ejecución:
 *    import { simular } from '@engine';
 *    const resultado = await simular(params);
 *
 *  Ejecutable en:
 *    - Node.js (backend, CLI)
 *    - Browser (Web Worker)
 *    - Tests (Vitest)
 * ============================================================================
 */

import type {
  SimParams, SimResult, HourlyResult, AnnualSummary,
  Tecnologia, ProcessedWeather,
} from './types';
import { FISICA, ORDEN_MERITO, RENOVABLES, MUST_RUN } from './types';
import { clamp, mesDelDia, round2, Mulberry32 } from './utils';
import {
  capacidadNuclearHoraria, capacidadDisponibleAnual,
} from './nuclear';
import { calcularSRMCOrden, calcularPrecioMarginal } from './merit-order';
import { calcularPrecioFinal, precioPeaje } from './price';
import { calcularDemandaHoraria } from './demand';
import {
  inicializarAlmacenamiento, operarAlmacenamiento,
  type EstadoAlmacenamiento,
} from './storage';

// ─── Generación horaria ──────────────────────────────────────────────────────

/**
 * Calcula la generación base de cada tecnología para una hora.
 *
 * Generación = capacidad × factor de capacidad × (calibración si aplica)
 *
 * Calibración: los factores de capacidad del clima se ajustan para que
 * el CF anual coincida con los valores reales REE 2025.
 */
function calcularGeneracionBase(
  params: SimParams,
  weather: ProcessedWeather,
  hora: number,
  cfSolarMedio: number,
  cfEolicoMedio: number,
): Record<Tecnologia, number> {
  const cap = params.capacidad;

  // CF calibrados para que el total anual coincida con REE 2025
  const cfSolarCalibrado = FISICA.FC_SOLAR_REAL / Math.max(0.01, cfSolarMedio);
  const cfEolicoCalibrado = FISICA.FC_EOLICO_REAL / Math.max(0.01, cfEolicoMedio);

  // Generación por tecnología (GW)
  const solar = cap.solarFV * weather.solar[hora] * cfSolarCalibrado;
  const eolica = cap.eolicaOnshore * weather.wind[hora] * cfEolicoCalibrado;

  // Offshore: correlación parcial 0.6 con onshore + perfil independiente
  // Offshore tiene CF ~45% vs onshore ~30%, y viento más estable
  const cfOffshoreCalibrado = FISICA.FC_EOLICO_OFFSHORE_REAL / Math.max(0.01, cfEolicoMedio);
  const eolicaOff = cap.eolicaOffshore * clamp(
    0.6 * weather.wind[hora] * cfEolicoCalibrado +
    0.4 * weather.wind[hora] * 1.15,
    0, cap.eolicaOffshore
  ) * (cfOffshoreCalibrado / cfEolicoCalibrado);

  return {
    nuclear: 0,             // Se calcula aparte (calendario ENRESA)
    solarFV: clamp(solar, 0, cap.solarFV),
    eolicaOnshore: clamp(eolica, 0, cap.eolicaOnshore),
    eolicaOffshore: clamp(eolicaOff, 0, cap.eolicaOffshore),
    hidroFluyente: 0,       // Se calcula aparte (hidráulica)
    hidroEmbalse: 0,
    ccgt: 0,                // Se calcula aparte (merit order)
    carbon: 0,
    baterias: 0,
    bombeo: 0,
    v2g: 0,
    importacion: 0,
    flexDown: 0,
  };
}

// ─── Simulación principal ────────────────────────────────────────────────────

/**
 * Ejecuta una simulación completa del sistema eléctrico para un año.
 *
 * @param params - Parámetros de entrada
 * @param weather - Datos climáticos procesados
 * @param weatherCache - Caché de datos climáticos
 * @returns Resultado completo con hourly + resumen + KPIs
 */
export async function simular(
  params: SimParams,
  weather: ProcessedWeather,
): Promise<SimResult> {
  const inicio = performance.now();
  const horas = FISICA.HORAS_ANIO;

  console.log(`[sim] Iniciando simulación: ${params.nombre} (${params.anioObjetivo})`);

  // ─── Inicializar almacenamiento ───
  const estadoAlmacenamiento = inicializarAlmacenamiento(
    params.almacenamiento,
    params.capacidad,
  );

  // ─── Arrays de resultado ───
  const hourlyResults: HourlyResult[] = [];
  const preciosHistorial: number[] = []; // Últimas 24h de precios

  // ─── Acumuladores para resumen ───
  const generacionAcum: Record<Tecnologia, number> = {} as Record<Tecnologia, number>;
  for (const tech of ORDEN_MERITO) generacionAcum[tech] = 0;

  let demandaTotalTWh = 0;
  let emisionesTotal = 0;
  let ensTotal = 0;
  let vertidosTotal = 0;
  let horasDeficit = 0;
  let horasPrecioNegativo = 0;
  let horasPrecioAlto = 0;
  let maxDeficit = 0;
  let horasInerciaCritica = 0;
  let sumPrecio = 0;
  const preciosArray: number[] = [];

  // ─── Pre-calcular demanda horaria (usando módulo unificado) ───
  const demandaHoraria = calcularDemandaHoraria(params, weather);

  // ─── Loop principal: 8760 horas ───
  for (let h = 0; h < horas; h++) {
    const dia = Math.floor(h / 24);
    const horaDelDia = h % 24;
    const mes = mesDelDia(dia);

    // ── 1. Generación base (renovables + nuclear) ──
    const generacion = calcularGeneracionBase(
      params, weather, h,
      weather.summary.cfSolarMedio,
      weather.summary.cfEolicoMedio,
    );

    // Nuclear (calendario ENRESA)
    const nuclearMW = capacidadNuclearHoraria(
      h,
      params.anioObjetivo,
      params.politicas.prorrogaNuclear ? params.politicas.prorrogaAnios : 0,
      params.politicas.aplicarPlanNuclear ? params.politicas.cierreNuclear : undefined,
    );
    generacion.nuclear = nuclearMW / 1000 * FISICA.FC_NUCLEAR;

    // Hidráulica fluyente (sin límite anual, ~38% del total hidro)
    // Basada en precipitación horaria + factor estacional + hidraulicidad
    const precipRelativa = weather.precipitation[h] > 0
      ? Math.min(weather.precipitation[h] / 5, 1)  // normalizar precipitación
      : 0.3;  // caudal base mínimo
    const factorEstacionalHidro = [0.7, 0.6, 0.7, 0.9, 1.0, 0.8, 0.5, 0.5, 0.7, 0.9, 1.0, 0.8][mes]; // más lluvia en otoño/invierno
    generacion.hidroFluyente = params.capacidad.hidraulica * 0.38 *
      clamp(precipRelativa * factorEstacionalHidro * params.clima.hidraulicidad, 0.3, 1.0);

    // ── 2. Demanda ──
    const demandaGW = demandaHoraria[h];
    const demandaRed = demandaGW * FISICA.PERDIDAS_RED; // Pérdidas de red

    // ── 3. Balance preliminar ──
    // Inercia síncrona = generación sincrónica (nuclear + hidroembalse + CCGT cuando corre)
    // hidroFluyente NO es sincrónica (es fluyente, toma el precio)
    const mustRunGW = generacion.nuclear + generacion.hidroEmbalse;
    const renovablesGW = generacion.solarFV + generacion.eolicaOnshore +
      generacion.eolicaOffshore + generacion.hidroFluyente;

    let excedente = (mustRunGW + renovablesGW) - demandaRed;
    let deficit = 0;

    // ── 4. Almacenamiento ──
    const precioReciente = preciosHistorial.length > 0
      ? preciosHistorial[preciosHistorial.length - 1]
      : 50;

    const resultadoAlm = operarAlmacenamiento(
      estadoAlmacenamiento,
      Math.max(0, excedente),
      0, // deficit se calcula después
      precioReciente,
      horaDelDia,
    );

    generacion.baterias = resultadoAlm.descargaBaterias;
    generacion.bombeo = resultadoAlm.descargaBombeo;
    generacion.v2g = resultadoAlm.v2g;

    // Actualizar excedente/deficit post-almacenamiento
    excedente = Math.max(0, excedente - resultadoAlm.cargaBaterias - resultadoAlm.cargaBombeo);
    deficit = Math.max(0, -(
      (mustRunGW + renovablesGW + resultadoAlm.descargaBaterias +
        resultadoAlm.descargaBombeo + resultadoAlm.v2g) - demandaRed
    ));

    // ── 5. Interconexiones ──
    const interMax = params.costes.interconexionFrancia + params.costes.interconexionPortugal;
    if (deficit > 0) {
      generacion.importacion = Math.min(deficit, interMax);
      deficit = Math.max(0, deficit - generacion.importacion);
    } else if (excedente > 0) {
      // Exportación (simplificada: mitad del excedente)
      const exportMax = interMax * 0.5;
      const exportReal = Math.min(excedente, exportMax);
      excedente -= exportReal;
    }

    // ── 6. CCGT y carbón (merit order) ──
    if (deficit > 0) {
      const srmcCCGT = calcularSRMCCGT(params);
      const srmcCarbon = calcularSRMCCarbon(params);

      // CCGT: rampa limitada
      const ccgtMax = params.capacidad.ccgt;
      generacion.ccgt = Math.min(deficit, ccgtMax);
      deficit = Math.max(0, deficit - generacion.ccgt);

      // Carbón si aún hay déficit (caro, solo backup)
      if (deficit > 0 && params.capacidad.carbon > 0) {
        generacion.carbon = Math.min(deficit, params.capacidad.carbon);
        deficit = Math.max(0, deficit - generacion.carbon);
      }
    }

    // ── 7. Flexibilidad descendente (último recurso) ──
    if (deficit > 0.3) {
      generacion.flexDown = deficit;
      deficit = 0;
    }

    // ── 8. Vertidos ──
    const vertidos = excedente;

    // ── 9. Precio marginal ──
    const ordenSRMC = calcularSRMCOrden(
      params, generacion,
      1.0, // hidraulicidad (simplificado)
      { bateria: resultadoAlm.srmcBateria, bombeo: resultadoAlm.srmcBombeo, v2g: resultadoAlm.srmcV2G },
    );

    const resultadoPrecio = calcularPrecioMarginal(
      params, ordenSRMC, demandaRed, renovablesGW, mustRunGW,
      preciosHistorial,
    );

    const precioFinal = calcularPrecioFinal(
      resultadoPrecio.precioMarginal, horaDelDia, params,
    );

    // ── 10. Emisiones ──
    const emisionesHora = (
      generacion.ccgt * FISICA.FACTOR_CO2_GAS * 1000 +  // tCO₂/h
      generacion.carbon * 0.9 * 1000  // Carbón: ~0.9 tCO₂/MWh
    );

    // ── 11. KPIs ──
    ensTotal += deficit;
    vertidosTotal += vertidos;
    horasDeficit += deficit > 0.3 ? 1 : 0;
    horasPrecioNegativo += resultadoPrecio.precioNegativo ? 1 : 0;
    horasPrecioAlto += precioFinal.conCfd > 150 ? 1 : 0;
    maxDeficit = Math.max(maxDeficit, deficit);
    if (mustRunGW < FISICA.INERCIA_MIN_GW) horasInerciaCritica++;
    sumPrecio += precioFinal.conCfd;
    preciosArray.push(precioFinal.conCfd);

    emisionesTotal += emisionesHora;
    demandaTotalTWh += demandaRed / 1000; // GW → TWh (÷ 1000 × 1h)

    // Acumular generación por tecnología
    for (const tech of ORDEN_MERITO) {
      generacionAcum[tech] += generacion[tech] / 1000; // GW → TWh
    }

    // Historial de precios (últimas 24h)
    preciosHistorial.push(resultadoPrecio.precioMarginal);
    if (preciosHistorial.length > 24) preciosHistorial.shift();

    // Construir HourlyResult
    hourlyResults.push({
      hora: h,
      dia,
      mes,
      horaDelDia,
      generacion: { ...generacion },
      demandaGW: demandaRed,
      demandaRed,
      perdidasRed: demandaRed - demandaGW,
      renovablesGW,
      mustRunGW,
      excedenteGW: excedente,
      deficitGW: deficit,
      vertidosGW: vertidos,
      cargaBaterias: resultadoAlm.cargaBaterias,
      descargaBaterias: resultadoAlm.descargaBaterias,
      socBaterias: resultadoAlm.socBaterias,
      cargaBombeo: resultadoAlm.cargaBombeo,
      descargaBombeo: resultadoAlm.descargaBombeo,
      nivelEmbalse: resultadoAlm.nivelEmbalse,
      importFrancia: Math.min(generacion.importacion, params.costes.interconexionFrancia),
      importPortugal: Math.max(0, generacion.importacion - params.costes.interconexionFrancia),
      importMarruecos: 0,
      exportTotal: 0,
      precioMarginal: resultadoPrecio.precioMarginal,
      precioConPeajes: precioFinal.conPeajes,
      precioConCfd: precioFinal.conCfd,
      emisionesCO2: emisionesHora,
      ensGW: deficit,
      inerciaGW: mustRunGW,
      factorRenovable: demandaRed > 0 ? (renovablesGW / demandaRed) * 100 : 0,
    });
  }

  // ─── Resumen anual ───
  const precioOrdenado = [...preciosArray].sort((a, b) => a - b);
  const generacionTotalTWh = Object.values(generacionAcum).reduce((a, b) => a + b, 0);

  const resumen: AnnualSummary = {
    precioMedio: round2(sumPrecio / horas),
    precioP5: round2(precioOrdenado[Math.floor(horas * 0.05)]),
    precioP25: round2(precioOrdenado[Math.floor(horas * 0.25)]),
    precioP50: round2(precioOrdenado[Math.floor(horas * 0.50)]),
    precioP75: round2(precioOrdenado[Math.floor(horas * 0.75)]),
    precioP95: round2(precioOrdenado[Math.floor(horas * 0.95)]),
    horasPrecioNegativo,
    horasPrecioAlto,
    demandaAnualTWh: round2(demandaTotalTWh),
    generacionPorTecnologia: Object.fromEntries(
      Object.entries(generacionAcum).map(([k, v]) => [k, round2(v)]),
    ) as Record<Tecnologia, number>,
    renovablesPct: round2(
      (generacionAcum.solarFV + generacionAcum.eolicaOnshore +
        generacionAcum.eolicaOffshore + generacionAcum.hidroFluyente +
        generacionAcum.hidroEmbalse) / generacionTotalTWh * 100,
    ),
    nuclearPct: round2(generacionAcum.nuclear / generacionTotalTWh * 100),
    gasPct: round2(generacionAcum.ccgt / generacionTotalTWh * 100),
    emisionesMtCO2: round2(emisionesTotal / 1e6),
    intensidadCO2: round2(emisionesTotal / (demandaTotalTWh * 1e6) * 1000),
    ensTWh: round2(ensTotal / 1000),
    loleHoras: horasDeficit,
    maxDeficitGW: round2(maxDeficit),
    horasInerciaCritica,
    vertidosTWh: round2(vertidosTotal / 1000),
    capacidadRenovableInstalada: round2(
      params.capacidad.solarFV + params.capacidad.eolicaOnshore +
      params.capacidad.eolicaOffshore,
    ),
    factorCapacidadSolar: round2(
      generacionAcum.solarFV / (params.capacidad.solarFV * horas / 1000) * 100,
    ),
    factorCapacidadEolico: round2(
      (generacionAcum.eolicaOnshore + generacionAcum.eolicaOffshore) /
      ((params.capacidad.eolicaOnshore + params.capacidad.eolicaOffshore) * horas / 1000) * 100,
    ),
  };

  const duracionMs = performance.now() - inicio;
  console.log(`[sim] Completada en ${duracionMs.toFixed(0)}ms`);
  console.log(`[sim] Precio medio: ${resumen.precioMedio} €/MWh, ENS: ${resumen.ensTWh} TWh, LOLE: ${resumen.loleHoras}h`);

  return {
    params,
    metadata: {
      timestamp: new Date().toISOString(),
      duracionMs: Math.round(duracionMs),
      horasSimuladas: horas,
      datosClimaticos: `Open-Meteo ${params.clima.anioReferencia}` +
        (params.clima.deltaT > 0 ? ` + ΔT${params.clima.deltaT}°C` : ''),
      version: '2.0.0',
    },
    resumen,
    hourly: hourlyResults,
  };
}

// ─── Funciones auxiliares privadas ────────────────────────────────────────────

function calcularSRMCCGT(params: SimParams): number {
  const rendimiento = Math.max(0.45, params.costes.rendimientoCCGT);
  return params.costes.precioGas / rendimiento +
    (FISICA.FACTOR_CO2_GAS / rendimiento) * params.costes.precioCO2 +
    params.costes.omCCGT;
}

function calcularSRMCCarbon(params: SimParams): number {
  return params.costes.precioGas * 0.8 / 0.38 +
    params.costes.precioCO2 * 0.9 / 0.38 +
    params.costes.omCarbon;
}
