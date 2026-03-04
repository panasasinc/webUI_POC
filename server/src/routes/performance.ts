import { Router } from 'express';
import type { IPerformanceService } from '../services/types.js';

export function performanceRoutes(service: IPerformanceService): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const interval = Number(req.query.interval) || undefined;
    const data = await service.getSummary(interval);
    res.json({ data, timestamp: new Date().toISOString() });
  });

  return router;
}
