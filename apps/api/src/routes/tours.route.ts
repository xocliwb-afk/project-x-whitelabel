import express from 'express';
import { PlanTourRequest, PlannedTour, NormalizedListing } from '@project-x/shared-types';
import { planTour, getTourById, updateTour, deleteTour, listTours } from '../services/tour.service';
import { generateTourNarrations } from '../services/narration.service';
import { getListingProvider } from '../utils/provider.factory';
import { resolveTenant } from '../middleware/tenant';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../utils/async-handler';

const router = express.Router();

function isPlanTourRequest(body: unknown): body is PlanTourRequest {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return false;
  }

  const value = body as Record<string, unknown>;
  return (
    typeof value.date === 'string' &&
    typeof value.startTime === 'string' &&
    typeof value.defaultDurationMinutes === 'number' &&
    typeof value.defaultBufferMinutes === 'number' &&
    Array.isArray(value.stops) &&
    value.stops.length > 0
  );
}

// Apply tenant + required auth to all persisted tour routes.
router.use(resolveTenant);
router.use(requireAuth);

/**
 * GET /api/tours
 * List tours for the current tenant.
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const tours = await listTours({
      tenantId: req.tenantId!,
      userId: req.user!.id,
      role: req.user!.role,
    });
    return res.status(200).json({ tours });
  }),
);

/**
 * POST /api/tours
 * Plan a new tour with scheduled stop times.
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    if (!isPlanTourRequest(req.body)) {
      return res
        .status(400)
        .json({ error: true, message: 'Invalid tour planning request' });
    }

    const planned: PlannedTour = await planTour(req.body, {
      tenantId: req.tenantId!,
      userId: req.user!.id,
      role: req.user!.role,
    });
    return res.status(200).json(planned);
  }),
);

/**
 * GET /api/tours/:id/narrations
 * Returns narration payloads for a tour, enriched with listing data.
 */
router.get(
  '/:id/narrations',
  asyncHandler(async (req, res) => {
    const tour = await getTourById(req.params.id, {
      tenantId: req.tenantId!,
      userId: req.user!.id,
      role: req.user!.role,
    });
    if (!tour) {
      return res.status(404).json({ error: true, message: 'Tour not found' });
    }

    // Attempt to fetch listing data for richer narrations
    const listings = new Map<string, NormalizedListing>();
    try {
      const provider = getListingProvider();
      const results = await Promise.allSettled(
        tour.stops.map((stop) => provider.getById(stop.listingId)),
      );
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          listings.set(result.value.id, result.value);
        }
      });
    } catch {
      // If listing fetch fails, generate narrations without listing data
    }

    const narrations = generateTourNarrations(tour, listings);
    return res.status(200).json({ tourId: tour.id, narrations });
  }),
);

/**
 * GET /api/tours/:id
 * Get a single tour by ID.
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const tour = await getTourById(req.params.id, {
      tenantId: req.tenantId!,
      userId: req.user!.id,
      role: req.user!.role,
    });
    if (!tour) {
      return res.status(404).json({ error: true, message: 'Tour not found' });
    }
    return res.status(200).json(tour);
  }),
);

/**
 * PUT /api/tours/:id
 * Update an existing tour (reorder stops, change times, add/remove stops).
 */
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const updated = await updateTour(req.params.id, {
      tenantId: req.tenantId!,
      userId: req.user!.id,
      role: req.user!.role,
    }, req.body);
    if (!updated) {
      return res.status(404).json({ error: true, message: 'Tour not found' });
    }
    return res.status(200).json(updated);
  }),
);

/**
 * DELETE /api/tours/:id
 * Delete a tour.
 */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const deleted = await deleteTour(req.params.id, {
      tenantId: req.tenantId!,
      userId: req.user!.id,
      role: req.user!.role,
    });
    if (!deleted) {
      return res.status(404).json({ error: true, message: 'Tour not found' });
    }
    return res.status(204).send();
  }),
);

export default router;
