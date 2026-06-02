/**
 * ============================================================================
 *  RUTA: GET /api/scenarios
 * ============================================================================
 *  Retorna la lista de escenarios predefinidos.
 * ============================================================================
 */

import { Router } from 'express';
import { ESCENARIOS_PREDEFINIDOS } from '../../engine/defaults';

export const scenariosRoute = Router();

/**
 * GET /api/scenarios
 * Lista de escenarios predefinidos con sus parámetros.
 */
scenariosRoute.get('/scenarios', (_req, res) => {
  res.json({
    total: ESCENARIOS_PREDEFINIDOS.length,
    escenarios: ESCENARIOS_PREDEFINIDOS,
    categorias: [...new Set(ESCENARIOS_PREDEFINIDOS.map(e => e.categoria))],
  });
});

/**
 * GET /api/scenarios/:id
 * Detalle de un escenario específico.
 */
scenariosRoute.get('/scenarios/:id', (req, res) => {
  const escenario = ESCENARIOS_PREDEFINIDOS.find(e => e.id === req.params.id);
  if (!escenario) {
    return res.status(404).json({
      error: `Escenario '${req.params.id}' no encontrado`,
      disponibles: ESCENARIOS_PREDEFINIDOS.map(e => e.id),
    });
  }
  res.json(escenario);
});
