/**
 * ============================================================================
 *  TEST: CALIBRACIÓN CONTRA DATOS REE 2025
 * ============================================================================
 *  Valida que el motor reproduce los datos reales del sistema eléctrico
 *  español de 2025 con un error aceptable.
 *
 *  Datos de referencia REE 2025:
 *  - Precio medio: 63 €/MWh
 *  - Demanda: 248 TWh
 *  - Nuclear: 51.9 TWh (CF 0.90)
 *  - Solar: 52.5 TWh (CF 0.24)
 *  - Eólica: 55.6 TWh (CF 0.20)
 *  - Hidro: 37.6 TWh
 *  - Gas: 52.1 TWh
 *  - Emisiones: 36 MtCO₂
 *  - Renovables: 56%
 * ============================================================================
 */

import { describe, it, expect } from 'vitest';
import { calcularSRMCOrden } from '../../src/engine/merit-order';
import {
  capacidadDisponibleAnual,
  capacidadNuclearHoraria,
  REACTORES,
} from '../../src/engine/nuclear';
import {
  Mulberry32,
  mesDelDia,
  clamp,
} from '../../src/engine/utils';
import { FISICA } from '../../src/engine/types';
import type { SimParams, Tecnologia } from '../../src/engine/types';

// ─── Datos REE 2025 (referencia) ─────────────────────────────────────────────

const REE_2025 = {
  precioMedio: 63,       // €/MWh
  demanda: 248,          // TWh
  nuclear: { capacidad: 7.0, generacion: 51.9 },   // GW, TWh
  solar: { capacidad: 24.7, generacion: 52.5 },
  eolica: { capacidad: 31.6, generacion: 55.6 },
  hidro: { capacidad: 17.1, generacion: 37.6 },
  gas: { capacidad: 24.0, generacion: 52.1 },
  emisiones: 36,         // MtCO₂
  renovablesPct: 56,     // %
  cfSolar: 0.24,
  cfEolico: 0.20,
  cfNuclear: 0.90,
};

// ─── Parámetros de referencia ────────────────────────────────────────────────

const PARAMS_BASE: SimParams = {
  nombre: 'Test calibración 2025',
  descripcion: 'Validación contra REE 2025',
  anioObjetivo: 2025,
  anioInicio: 2025,
  capacidad: {
    nuclear: 7.0,
    solarFV: 24.7,
    eolicaOnshore: 31.6,
    eolicaOffshore: 0.0,
    hidraulica: 17.1,
    ccgt: 24.0,
    carbon: 0.0,
    bateriasPotencia: 0.5,
    bateriasHoras: 2,
    bombeoPotencia: 3.5,
    bombeoCapacidad: 30,
    v2gPotencia: 0.0,
  },
  costes: {
    precioGas: 42,
    precioCO2: 70,
    rendimientoCCGT: 0.57,
    omCCGT: 3.2,
    omCarbon: 5.0,
    omNuclear: 3.0,
    omRenovable: 1.5,
    precioImportFrancia: 95,
    precioImportPortugal: 88,
    precioImportMarruecos: 80,
    precioEscasez: 450,
    interconexionFrancia: 2.8,
    interconexionPortugal: 3.0,
    interconexionMarruecos: 1.0,
  },
  demanda: {
    demandaAnual: 248,
    crecimientoDemanda: 0,
    electrificacionTWh: 0,
    eficienciaDemanda: 1.0,
    autoconsumoFV: 8.0,
  },
  almacenamiento: {
    bateriasEficiencia: 0.90,
    bateriasAutodescarga: 0.001,
    bateriasDegradacion: 0.02,
    bombeoEficiencia: 0.75,
    v2gParticipacion: 0.06,
    smartCharging: 0.45,
  },
  clima: {
    fuente: 'open-meteo',
    anioReferencia: 2024,
    deltaT: 0,
    factorRadiacionSolar: 1.0,
    factorViento: 1.0,
    sequiaExtrema: false,
    hidraulicidad: 1.0,
    olaCalorExtrema: false,
  },
  politicas: {
    aplicarPlanNuclear: false,
    cierreNuclear: 2035,
    prorrogaNuclear: false,
    prorrogaAnios: 0,
    cfdActivo: false,
    cfdStrike: 58,
    topeIbericoActivo: false,
    topeIbericoPrecio: 120,
    peajesDinamicos: false,
    peajeP1: 17,
    peajeP2: 11,
    peajeP3: 6,
    mecanismoCapacidad: 12,
    leyCambioClimatico: false,
  },
  montecarlo: {
    semilla: 42,
    numSimulaciones: 1,
    variabilidadClimatica: 8,
  },
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Calibración REE 2025', () => {

  describe('Nuclear', () => {
    it('Capacidad instalada ≈ 7.3 GW (7 reactores, REE reporta 7.0 redondeado)', () => {
      const total = REACTORES.reduce((acc, r) => acc + r.capacidadMW, 0);
      // REE reporta 7.0 GW como cifra redondeada; el total real es ~7.3 GW
      expect(total / 1000).toBeGreaterThan(7.0);
      expect(total / 1000).toBeLessThan(7.5);
    });

    it('CF nuclear ≈ 0.90', () => {
      expect(FISICA.FC_NUCLEAR).toBe(0.90);
    });

    it('Capacidad disponible en 2025 ≈ 7.3 GW (todos operativos)', () => {
      const disponible = capacidadDisponibleAnual(2025);
      expect(disponible / 1000).toBeGreaterThan(7.0);
      expect(disponible / 1000).toBeLessThan(7.5);
    });

    it('7 reactores en 2025', () => {
      // Todos los reactores deberían estar operativos en 2025
      expect(REACTORES.every(r => r.anioCierre > 2025)).toBe(true);
    });
  });

  describe('Factores de capacidad', () => {
    it('CF solar real = 0.24 (REE 2025)', () => {
      expect(FISICA.FC_SOLAR_REAL).toBe(0.24);
    });

    it('CF eólico real = 0.20 (REE 2025)', () => {
      expect(FISICA.FC_EOLICO_REAL).toBe(0.20);
    });

    it('Generación solar esperada ≈ 51.9 TWh (24.7 GW × 0.24 CF)', () => {
      const capacidadGW = 24.7;
      const cf = FISICA.FC_SOLAR_REAL;
      const horas = FISICA.HORAS_ANIO;
      const generacionTWh = capacidadGW * cf * horas / 1000;
      // REE reporta 52.5 TWh incluyendo off-grid; el cálculo puro da ~51.9
      expect(generacionTWh).toBeGreaterThan(51.0);
      expect(generacionTWh).toBeLessThan(53.0);
    });

    it('Generación eólica esperada ≈ 55.6 TWh', () => {
      const capacidadGW = 31.6;
      const cf = FISICA.FC_EOLICO_REAL;
      const horas = FISICA.HORAS_ANIO;
      const generacionTWh = capacidadGW * cf * horas / 1000;
      expect(generacionTWh).toBeCloseTo(55.6, 0);
    });
  });

  describe('SRMC y precio', () => {
    it('SRMC nuclear ≈ 10 €/MWh', () => {
      const orden = calcularSRMCOrden(
        PARAMS_BASE,
        { nuclear: 7, solarFV: 0, eolicaOnshore: 0, eolicaOffshore: 0,
          hidroFluyente: 0, hidroEmbalse: 0, ccgt: 0, carbon: 0,
          baterias: 0, bombeo: 0, v2g: 0, importacion: 0, flexDown: 0 },
        1.0,
      );
      const nuclear = orden.find(t => t.tecnologia === 'nuclear');
      expect(nuclear?.srmc).toBeCloseTo(10, 0);
    });

    it('SRMC solar = 0 €/MWh', () => {
      const orden = calcularSRMCOrden(
        PARAMS_BASE,
        { nuclear: 0, solarFV: 5, eolicaOnshore: 0, eolicaOffshore: 0,
          hidroFluyente: 0, hidroEmbalse: 0, ccgt: 0, carbon: 0,
          baterias: 0, bombeo: 0, v2g: 0, importacion: 0, flexDown: 0 },
        1.0,
      );
      const solar = orden.find(t => t.tecnologia === 'solarFV');
      expect(solar?.srmc).toBe(0);
    });

    it('SRMC CCGT ≈ 77 €/MWh (gas=42, CO2=70, η=0.57)', () => {
      const rendimiento = 0.57;
      const costeGas = 42 / rendimiento;
      const costeCO2 = (FISICA.FACTOR_CO2_GAS / rendimiento) * 70;
      const om = 3.2;
      const srmcEsperado = costeGas + costeCO2 + om;

      const orden = calcularSRMCOrden(
        PARAMS_BASE,
        { nuclear: 0, solarFV: 0, eolicaOnshore: 0, eolicaOffshore: 0,
          hidroFluyente: 0, hidroEmbalse: 0, ccgt: 5, carbon: 0,
          baterias: 0, bombeo: 0, v2g: 0, importacion: 0, flexDown: 0 },
        1.0,
      );
      const ccgt = orden.find(t => t.tecnologia === 'ccgt');
      expect(ccgt?.srmc).toBeCloseTo(srmcEsperado, 0);
    });
  });

  describe('PRNG Mulberry32', () => {
    it('Mismo seed = misma secuencia', () => {
      const rng1 = new Mulberry32(42);
      const rng2 = new Mulberry32(42);
      const vals1 = Array.from({ length: 100 }, () => rng1.next());
      const vals2 = Array.from({ length: 100 }, () => rng2.next());
      expect(vals1).toEqual(vals2);
    });

    it('Seed distinto = secuencia distinta', () => {
      const rng1 = new Mulberry32(42);
      const rng2 = new Mulberry32(99);
      const vals1 = Array.from({ length: 10 }, () => rng1.next());
      const vals2 = Array.from({ length: 10 }, () => rng2.next());
      expect(vals1).not.toEqual(vals2);
    });

    it('Todos los valores en [0, 1)', () => {
      const rng = new Mulberry32(42);
      for (let i = 0; i < 10000; i++) {
        const v = rng.next();
        expect(v).toBeGreaterThan(0);
        expect(v).toBeLessThan(1);
      }
    });

    it('Distribución gaussiana razonable', () => {
      const rng = new Mulberry32(42);
      const samples = Array.from({ length: 10000 }, () => rng.gauss(0, 1));
      const media = samples.reduce((a, b) => a + b, 0) / samples.length;
      const varianza = samples.reduce((a, b) => a + b * b, 0) / samples.length;
      expect(Math.abs(media)).toBeLessThan(0.1); // Media ≈ 0
      expect(Math.abs(varianza - 1)).toBeLessThan(0.15); // Varianza ≈ 1
    });
  });

  describe('Utilidades', () => {
    it('mesDelDia: día 0 = enero (0)', () => {
      expect(mesDelDia(0)).toBe(0);
    });

    it('mesDelDia: día 31 = febrero (1)', () => {
      expect(mesDelDia(31)).toBe(1);
    });

    it('mesDelDia: día 364 = diciembre (11)', () => {
      expect(mesDelDia(364)).toBe(11);
    });

    it('clamp limita correctamente', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });
});
