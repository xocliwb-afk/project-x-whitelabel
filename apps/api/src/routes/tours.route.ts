import express from 'express';
import { PlanTourRequest, PlannedTour } from '@project-x/shared-types';
import { planTour, getTourById, updateTour, deleteTour, listTours } from '../services/tour.service';

const router = express.Router();

/**
 * GET /api/tours
 * List all tours in the in-memory store.
 */
router.get('/', (_req, res) => {
  const tours = listTours();
  return res.status(200).json({ tours });
});

/**
 * POST /api/tours
 * Plan a new tour with scheduled stop times.
 */
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

/**
 * GET /api/tours/:id
 * Get a single tour by ID.
 */
router.get('/:id', (req, res) => {
  const tour = getTourById(req.params.id);
  if (!tour) {
    return res.status(404).json({ error: true, message: 'Tour not found' });
  }
  return res.status(200).json(tour);
});

/**
 * PUT /api/tours/:id
 * Update an existing tour (reorder stops, change times, add/remove stops).
 */
router.put('/:id', (req, res) => {
  const updated = updateTour(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: true, message: 'Tour not found' });
  }
  return res.status(200).json(updated);
});

/**
 * DELETE /api/tours/:id
 * Delete a tour.
 */
router.delete('/:id', (req, res) => {
  const deleted = deleteTour(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: true, message: 'Tour not found' });
  }
  return res.status(204).send();
});

export default router;
