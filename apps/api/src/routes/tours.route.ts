import express from 'express';
import { PlanTourRequest, PlannedTour } from '@project-x/shared-types';
import { planTour } from '../services/tour.service';

const router = express.Router();

router.post('/', (req, res, next) => {
  try {
    const body = req.body as PlanTourRequest;

    if (
      !body ||
      !body.date ||
      !body.startTime ||
      typeof body.defaultDurationMinutes !== 'number' ||
      typeof body.defaultBufferMinutes !== 'number' ||
      !Array.isArray(body.stops) ||
      body.stops.length === 0
    ) {
      return res
        .status(400)
        .json({ error: true, message: 'Invalid tour planning request' });
    }

    const planned: PlannedTour = planTour(body);
    return res.status(200).json(planned);
  } catch (err) {
    return next(err);
  }
});

export default router;
