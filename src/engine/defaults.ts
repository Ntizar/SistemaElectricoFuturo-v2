/**
 * ============================================================================
 *  PARÁMETROS POR DEFECTO
 * ============================================================================
 *  Configuración base para una simulación del sistema eléctrico español.
 *  Basada en datos REE 2025 y objetivos PNIEC 2030.
 * ============================================================================
 */

import type { SimParams } from './types';

/**
 * Parámetros por defecto para un escenario "business as usual" 2030.
 * Cada campo es editable por el usuario en la UI.
 */
export const PARAMS_DEFAULT: SimParams = {
  // Identificación
  nombre: 'Escenario base 2030',
  descripcion: 'Simulación business-as-usual con cierre nuclear ENRESA y crecimiento renovable según PNIEC',

  // Temporal
  anioObjetivo: 2030,
  anioInicio: 2025,

  // Capacidad instalada (GW) — referencia REE 2025 + trajectories PNIEC
  capacidad: {
    nuclear: 7.0,               // GW — 7 reactores en 2025
    solarFV: 48.0,              // GW — 24.7 en 2025, creciendo a ~70 en 2030
    eolicaOnshore: 41.0,        // GW — 31.6 en 2025
    eolicaOffshore: 0.5,        // GW — 0 en 2025, primeros proyectos
    hidraulica: 17.0,           // GW — 17.1 en 2025
    ccgt: 24.0,                 // GW — 24.0 en 2025
    carbon: 0.0,                // GW — cerrado en 2025
    bateriasPotencia: 4.0,      // GW — en 2025
    bateriasHoras: 4,           // horas de autonomía
    bombeoPotencia: 3.5,        // GW
    bombeoCapacidad: 30,        // GWh (~8h a plena carga)
    v2gPotencia: 0.5,           // GW estimado
  },

  // Costes — referencia mercado 2025
  costes: {
    precioGas: 42,              // €/MWh TTF medio 2025
    precioCO2: 70,              // €/tCO₂ EU ETS
    rendimientoCCGT: 0.57,      // η CCGT moderno
    omCCGT: 3.2,               // €/MWh
    omCarbon: 5.0,             // €/MWh
    omNuclear: 3.0,            // €/MWh
    omRenovable: 1.5,          // €/MWh
    precioImportFrancia: 95,    // €/MWh
    precioImportPortugal: 88,   // €/MWh
    precioImportMarruecos: 80,  // €/MWh
    precioEscasez: 450,         // €/MWh (VoLL estimado)
    interconexionFrancia: 2.8,  // GW
    interconexionPortugal: 3.0, // GW
    interconexionMarruecos: 1.0,// GW
  },

  // Demanda
  demanda: {
    demandaAnual: 248,          // TWh/año (REE 2025)
    crecimientoDemanda: 0.9,    // %/año
    electrificacionTWh: 2.5,    // TWh/año adicional
    eficienciaDemanda: 0.92,    // factor eficiencia (inversión UE)
    autoconsumoFV: 8.0,         // GW (resta de demanda red)
  },

  // Almacenamiento
  almacenamiento: {
    bateriasEficiencia: 0.90,   // round-trip
    bateriasAutodescarga: 0.001,// %/hora
    bateriasDegradacion: 0.02,  // % por ciclo completo
    bombeoEficiencia: 0.75,     // round-trip
    v2gParticipacion: 0.06,     // 6% del parque movilizable
    smartCharging: 0.45,        // 45% con smart charging
  },

  // Modelo climático — Open-Meteo 2024 como referencia
  clima: {
    fuente: 'open-meteo',
    anioReferencia: 2024,       // datos reales 2024
    deltaT: 0.5,                // +0.5°C vs 2024 (2030 = 3 décadas desde 2020 × 0.2°C/década IPCC SSP2-4.5)
    factorRadiacionSolar: 1.0,  // sin cambio
    factorViento: 1.0,          // sin cambio
    sequiaExtrema: false,
    hidraulicidad: 1.0,         // año medio
    olaCalorExtrema: false,
  },

  // Políticas
  politicas: {
    aplicarPlanNuclear: true,
    cierreNuclear: 2035,        // año cierre total
    prorrogaNuclear: false,
    prorrogaAnios: 0,
    cfdActivo: true,
    cfdStrike: 58,              // €/MWh
    topeIbericoActivo: false,
    topeIbericoPrecio: 120,     // €/MWh
    peajesDinamicos: true,
    peajeP1: 17,                // €/MWh punta
    peajeP2: 11,                // €/MWh llano
    peajeP3: 6,                 // €/MWh valle
    mecanismoCapacidad: 12,     // €/kW/año
    leyCambioClimatico: true,
  },

  // Monte Carlo
  montecarlo: {
    semilla: 42,
    numSimulaciones: 9,         // semillas por defecto
    variabilidadClimatica: 8,   // % variación interanual
  },
};

/** Escenarios predefinidos del sistema eléctrico */
export const ESCENARIOS_PREDEFINIDOS = [
  {
    id: 'base-2030',
    nombre: 'Base 2030 (ENRESA)',
    descripcion: 'Cierre nuclear según calendario ENRESA, crecimiento PNIEC',
    categoria: 'nuclear' as const,
    params: {},
  },
  {
    id: 'prorroga-10',
    nombre: 'Prórroga nuclear 10 años',
    descripcion: 'Todos los reactores con prórroga de 10 años',
    categoria: 'nuclear' as const,
    params: {
      politicas: {
        prorrogaNuclear: true,
        prorrogaAnios: 10,
      },
    },
  },
  {
    id: 'prorroga-20',
    nombre: 'Prórroga nuclear 20 años',
    descripcion: 'Vida extendida a 60 años (20 años más)',
    categoria: 'nuclear' as const,
    params: {
      politicas: {
        prorrogaNuclear: true,
        prorrogaAnios: 20,
      },
    },
  },
  {
    id: 'cierre-2030',
    nombre: 'Cierre acelerado 2030',
    descripcion: 'Todos los reactores cerrados en 2030',
    categoria: 'nuclear' as const,
    params: {
      politicas: {
        cierreNuclear: 2030,
      },
    },
  },
  {
    id: 'pniec-2030',
    nombre: 'PNIEC estricto',
    descripcion: 'Objetivos PNIEC 2030 al 100%: 81 GW solar, 62 GW eólica',
    categoria: 'renovables' as const,
    params: {
      capacidad: {
        solarFV: 81,
        eolicaOnshore: 62,
        eolicaOffshore: 3,
        bateriasPotencia: 22,
      },
    },
  },
  {
    id: 'gas-caro',
    nombre: 'Gas encarecido',
    descripcion: 'TTF a 80 €/MWh y CO₂ a 120 €/t (crisis suministro)',
    categoria: 'costes' as const,
    params: {
      costes: {
        precioGas: 80,
        precioCO2: 120,
      },
    },
  },
  {
    id: 'gas-barato',
    nombre: 'Gas barato',
    descripcion: 'TTF a 25 €/MWh (abundancia LNG)',
    categoria: 'costes' as const,
    params: {
      costes: {
        precioGas: 25,
      },
    },
  },
  {
    id: 'demanda-alta',
    nombre: 'Demanda alta (electrificación acelerada)',
    descripcion: 'Electrificación +5 TWh/año, crecimiento 1.5%/año',
    categoria: 'demanda' as const,
    params: {
      demanda: {
        crecimientoDemanda: 1.5,
        electrificacionTWh: 5.0,
      },
    },
  },
  {
    id: 'sequia-extrema',
    nombre: 'Sequía extrema',
    descripcion: 'Hidráulica al 45% de media, olas de calor frecuentes',
    categoria: 'stress' as const,
    params: {
      clima: {
        sequiaExtrema: true,
        hidraulicidad: 0.55,
        olaCalorExtrema: true,
      },
    },
  },
  {
    id: 'apagon-repunte',
    nombre: 'Apagón (DANA + calma)',
    descripcion: 'Evento DANA en otoño + semana de calma térmica en verano',
    categoria: 'stress' as const,
    params: {
      capacidad: {
        eolicaOnshore: 35,
      },
    },
  },
  {
    id: 'sin-gas',
    nombre: 'Sin gas (crisis TTF)',
    descripcion: 'Gas a 150 €/MWh, CO₂ a 150 €/t — solo renovables y nuclear',
    categoria: 'stress' as const,
    params: {
      costes: {
        precioGas: 150,
        precioCO2: 150,
      },
    },
  },
  {
    id: 'futuro-verde',
    nombre: 'Futuro verde 2040',
    descripcion: 'Escenario optimista: 120 GW solar, 80 GW eólica, 50 GW baterías',
    categoria: 'renovables' as const,
    params: {
      anioObjetivo: 2040,
      capacidad: {
        solarFV: 120,
        eolicaOnshore: 65,
        eolicaOffshore: 15,
        bateriasPotencia: 50,
        bateriasHoras: 8,
        ccgt: 10,
      },
      politicas: {
        prorrogaNuclear: true,
        prorrogaAnios: 20,
      },
    },
  },
  {
    id: 'sin-nuclear',
    nombre: 'Sin nuclear',
    descripcion: 'Cierre nuclear inmediato, todo el gap por renovables + gas',
    categoria: 'nuclear' as const,
    params: {
      capacidad: {
        nuclear: 0,
      },
    },
  },
  {
    id: 'islas-verde',
    nombre: 'Balance cero 2035',
    descripcion: 'Balance neto cero: todas las emisiones compensadas',
    categoria: 'politica' as const,
    params: {
      anioObjetivo: 2035,
      capacidad: {
        solarFV: 100,
        eolicaOnshore: 70,
        eolicaOffshore: 10,
        bateriasPotencia: 40,
        bateriasHoras: 8,
        ccgt: 8,
      },
      politicas: {
        prorrogaNuclear: true,
        prorrogaAnios: 15,
        leyCambioClimatico: true,
      },
    },
  },
  {
    id: 'almacenamiento-masivo',
    nombre: 'Almacenamiento masivo',
    descripcion: '100 GWh de baterías + 60 GWh bombeo — revolución storage',
    categoria: 'renovables' as const,
    params: {
      capacidad: {
        bateriasPotencia: 25,
        bateriasHoras: 4,
        bombeoPotencia: 8,
        bombeoCapacidad: 60,
      },
    },
  },
];
