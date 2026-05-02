import express from 'express';
import { PlanTourRequest, PlannedTour, NormalizedListing } from '@project-x/shared-types';
import type { TourUpdateRequest } from '../services/tour.service';
import {
  planTour,
  getTourById,
  updateTour,
  deleteTour,
  listTours,
} from '../services/tour.service';
import { generateTourNarrations } from '../services/narration.service';
import { getListingProvider } from '../utils/provider.factory';
import { resolveRequiredTenant } from '../middleware/tenant';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../utils/async-handler';
import { createHttpError } from '../utils/http-error';

const router = express.Router();

const MAX_TOUR_STOPS = 50;
const MIN_DURATION_MINUTES = 1;
const MAX_DURATION_MINUTES = 480;
const MIN_BUFFER_MINUTES = 0;
const MAX_BUFFER_MINUTES = 240;

type ParsedUpdateStop = NonNullable<TourUpdateRequest['stops']>[number];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function throwValidationError(message: string): never {
  throw createHttpError(400, message, 'VALIDATION_ERROR');
}

function rejectUnsupportedFields(body: Record<string, unknown>, allowedFields: Set<string>): void {
  for (const key of Object.keys(body)) {
    if (!allowedFields.has(key)) {
      throwValidationError(`Unsupported field: ${key}`);
    }
  }
}

function validateDate(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throwValidationError('date must be YYYY-MM-DD');
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throwValidationError('date must be YYYY-MM-DD');
  }

  return value;
}

function validateStartTime(value: unknown): string {
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throwValidationError('startTime must be HH:mm');
  }

  return value;
}

function validateOptionalString(
  value: unknown,
  field: string,
  options: { allowNull?: boolean } = {},
): string | undefined {
  if (value === undefined || (value === null && options.allowNull)) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throwValidationError(`${field} must be a string`);
  }

  return value;
}

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function validateOptionalTimeZone(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'string' || value.trim() === '') {
    throwValidationError('timeZone must be a valid IANA timezone');
  }

  const timeZone = value.trim();
  if (!isValidTimeZone(timeZone)) {
    throwValidationError('timeZone must be a valid IANA timezone');
  }

  return timeZone;
}

function validateDurationMinutes(value: unknown): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value < MIN_DURATION_MINUTES ||
    value > MAX_DURATION_MINUTES
  ) {
    throwValidationError(
      `defaultDurationMinutes must be an integer from ${MIN_DURATION_MINUTES} through ${MAX_DURATION_MINUTES}`,
    );
  }

  return value;
}

function validateBufferMinutes(value: unknown): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value < MIN_BUFFER_MINUTES ||
    value > MAX_BUFFER_MINUTES
  ) {
    throwValidationError(
      `defaultBufferMinutes must be an integer from ${MIN_BUFFER_MINUTES} through ${MAX_BUFFER_MINUTES}`,
    );
  }

  return value;
}

function validateRequiredNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throwValidationError(`${field} must be a non-empty string`);
  }

  return value;
}

function validateLatitude(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < -90 || value > 90) {
    throwValidationError('lat must be a finite number from -90 through 90');
  }

  return value;
}

function validateLongitude(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < -180 || value > 180) {
    throwValidationError('lng must be a finite number from -180 through 180');
  }

  return value;
}

function validateStops(
  value: unknown,
  options: { allowUpdateFields: boolean },
): PlanTourRequest['stops'] | TourUpdateRequest['stops'] {
  if (!Array.isArray(value)) {
    throwValidationError('stops must be an array');
  }

  if (value.length === 0) {
    throwValidationError('stops must contain at least one stop');
  }

  if (value.length > MAX_TOUR_STOPS) {
    throwValidationError(`stops must contain ${MAX_TOUR_STOPS} stops or fewer`);
  }

  const allowedCreateFields = new Set(['listingId', 'address', 'lat', 'lng']);
  const allowedUpdateFields = new Set([
    'id',
    'listingId',
    'address',
    'lat',
    'lng',
    'thumbnailUrl',
    'order',
    'startTime',
    'endTime',
  ]);

  return value.map((stop, index) => {
    if (!isPlainObject(stop)) {
      throwValidationError(`stops[${index}] must be an object`);
    }

    rejectUnsupportedFields(
      stop,
      options.allowUpdateFields ? allowedUpdateFields : allowedCreateFields,
    );

    const parsedStop: ParsedUpdateStop = {
      listingId: validateRequiredNonEmptyString(stop.listingId, `stops[${index}].listingId`),
      address: validateRequiredNonEmptyString(stop.address, `stops[${index}].address`),
      lat: validateLatitude(stop.lat),
      lng: validateLongitude(stop.lng),
    };

    if (options.allowUpdateFields) {
      if (stop.id !== undefined) {
        parsedStop.id = validateRequiredNonEmptyString(stop.id, `stops[${index}].id`);
      }

      if (stop.thumbnailUrl !== undefined) {
        if (stop.thumbnailUrl !== null && typeof stop.thumbnailUrl !== 'string') {
          throwValidationError(`stops[${index}].thumbnailUrl must be a string or null`);
        }
        parsedStop.thumbnailUrl = stop.thumbnailUrl;
      }

      if (stop.order !== undefined) {
        if (
          typeof stop.order !== 'number' ||
          !Number.isFinite(stop.order) ||
          !Number.isInteger(stop.order) ||
          stop.order < 0
        ) {
          throwValidationError(`stops[${index}].order must be a non-negative integer`);
        }
        parsedStop.order = stop.order;
      }

      if (stop.startTime !== undefined) {
        parsedStop.startTime = validateRequiredNonEmptyString(
          stop.startTime,
          `stops[${index}].startTime`,
        );
      }

      if (stop.endTime !== undefined) {
        parsedStop.endTime = validateRequiredNonEmptyString(
          stop.endTime,
          `stops[${index}].endTime`,
        );
      }
    }

    return parsedStop;
  });
}

function parsePlanTourRequest(body: unknown): PlanTourRequest {
  if (!isPlainObject(body)) {
    throwValidationError('Invalid tour planning request');
  }

  rejectUnsupportedFields(
    body,
    new Set([
      'date',
      'clientName',
      'stops',
      'startTime',
      'defaultDurationMinutes',
      'defaultBufferMinutes',
      'timeZone',
    ]),
  );

  const timeZone = validateOptionalTimeZone(body.timeZone);

  return {
    date: validateDate(body.date),
    clientName: validateOptionalString(body.clientName, 'clientName', { allowNull: true }),
    stops: validateStops(body.stops, { allowUpdateFields: false }) as PlanTourRequest['stops'],
    startTime: validateStartTime(body.startTime),
    defaultDurationMinutes: validateDurationMinutes(body.defaultDurationMinutes),
    defaultBufferMinutes: validateBufferMinutes(body.defaultBufferMinutes),
    ...(timeZone !== undefined ? { timeZone } : {}),
  };
}

function parseUpdateTourRequest(body: unknown): TourUpdateRequest {
  if (!isPlainObject(body)) {
    throwValidationError('Invalid tour update request');
  }

  rejectUnsupportedFields(
    body,
    new Set([
      'title',
      'clientName',
      'date',
      'startTime',
      'timeZone',
      'defaultDurationMinutes',
      'defaultBufferMinutes',
      'stops',
      'narrationPayloads',
    ]),
  );

  const updates: TourUpdateRequest = {};

  if (body.title !== undefined) {
    updates.title = validateOptionalString(body.title, 'title') as string;
  }

  if (body.clientName !== undefined) {
    updates.clientName = validateOptionalString(body.clientName, 'clientName') as string;
  }

  if (body.date !== undefined) {
    updates.date = validateDate(body.date);
  }

  if (body.startTime !== undefined) {
    updates.startTime = validateStartTime(body.startTime);
  }

  if (body.timeZone !== undefined) {
    const timeZone = validateOptionalTimeZone(body.timeZone);
    if (timeZone !== undefined) {
      updates.timeZone = timeZone;
    }
  }

  if (body.defaultDurationMinutes !== undefined) {
    updates.defaultDurationMinutes = validateDurationMinutes(body.defaultDurationMinutes);
  }

  if (body.defaultBufferMinutes !== undefined) {
    updates.defaultBufferMinutes = validateBufferMinutes(body.defaultBufferMinutes);
  }

  if (body.stops !== undefined) {
    updates.stops = validateStops(body.stops, { allowUpdateFields: true }) as TourUpdateRequest['stops'];
  }

  if (body.narrationPayloads !== undefined) {
    if (body.narrationPayloads !== null && !Array.isArray(body.narrationPayloads)) {
      throwValidationError('narrationPayloads must be an array or null');
    }
    updates.narrationPayloads = body.narrationPayloads as TourUpdateRequest['narrationPayloads'];
  }

  return updates;
}

// Apply tenant + required auth to all persisted tour routes.
router.use(resolveRequiredTenant);
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
    const planned: PlannedTour = await planTour(parsePlanTourRequest(req.body), {
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
      throw createHttpError(404, 'Tour not found', 'TOUR_NOT_FOUND');
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
      throw createHttpError(404, 'Tour not found', 'TOUR_NOT_FOUND');
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
    const updates = parseUpdateTourRequest(req.body);
    const updated = await updateTour(req.params.id, {
      tenantId: req.tenantId!,
      userId: req.user!.id,
      role: req.user!.role,
    }, updates);
    if (!updated) {
      throw createHttpError(404, 'Tour not found', 'TOUR_NOT_FOUND');
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
      throw createHttpError(404, 'Tour not found', 'TOUR_NOT_FOUND');
    }
    return res.status(204).send();
  }),
);

export default router;
