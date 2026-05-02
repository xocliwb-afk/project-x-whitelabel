import type { NarrationPayload } from '@project-x/shared-types';
import { createHttpError } from '../utils/http-error';

const ALLOWED_NARRATION_TRIGGERS = new Set(['approaching', 'arrived', 'departed', 'manual']);
const PAYLOAD_FIELDS = new Set([
  'tourStopId',
  'listingId',
  'trigger',
  'narrationText',
  'listingSummary',
  'navigationContext',
]);
const LISTING_SUMMARY_FIELDS = new Set([
  'address',
  'price',
  'beds',
  'baths',
  'sqft',
  'highlights',
]);
const NAVIGATION_CONTEXT_FIELDS = new Set(['distanceMeters', 'durationSeconds', 'relation']);

type SanitizeOptions = {
  rejectUnknownFields: boolean;
  path: string;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function throwValidationError(message: string): never {
  throw createHttpError(400, message, 'VALIDATION_ERROR');
}

function rejectUnknownFields(
  value: Record<string, unknown>,
  allowedFields: Set<string>,
  path: string,
): void {
  for (const field of Object.keys(value)) {
    if (!allowedFields.has(field)) {
      throwValidationError(`${path}.${field} is not supported`);
    }
  }
}

function validateRequiredString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throwValidationError(`${path} must be a non-empty string`);
  }

  return value.trim();
}

function validateString(value: unknown, path: string): string {
  if (typeof value !== 'string') {
    throwValidationError(`${path} must be a string`);
  }

  return value;
}

function validateNullableNumber(value: unknown, path: string): number | null {
  if (value === null) {
    return null;
  }

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throwValidationError(`${path} must be a finite number or null`);
  }

  return value;
}

function validateOptionalStringArray(value: unknown, path: string): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throwValidationError(`${path} must be an array of strings`);
  }

  return value.slice();
}

function validateListingSummary(
  value: unknown,
  options: SanitizeOptions,
): NonNullable<NarrationPayload['listingSummary']> {
  if (!isPlainObject(value)) {
    throwValidationError(`${options.path}.listingSummary must be an object`);
  }

  if (options.rejectUnknownFields) {
    rejectUnknownFields(value, LISTING_SUMMARY_FIELDS, `${options.path}.listingSummary`);
  }

  const highlights = validateOptionalStringArray(
    value.highlights,
    `${options.path}.listingSummary.highlights`,
  );

  return {
    address: validateRequiredString(value.address, `${options.path}.listingSummary.address`),
    price: validateString(value.price, `${options.path}.listingSummary.price`),
    beds: validateNullableNumber(value.beds, `${options.path}.listingSummary.beds`),
    baths: validateNullableNumber(value.baths, `${options.path}.listingSummary.baths`),
    sqft: validateNullableNumber(value.sqft, `${options.path}.listingSummary.sqft`),
    ...(highlights !== undefined ? { highlights } : {}),
  };
}

function validateNonNegativeNumber(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throwValidationError(`${path} must be a non-negative finite number`);
  }

  return value;
}

function validateNavigationContext(
  value: unknown,
  options: SanitizeOptions,
): NonNullable<NarrationPayload['navigationContext']> | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isPlainObject(value)) {
    throwValidationError(`${options.path}.navigationContext must be an object`);
  }

  if (options.rejectUnknownFields) {
    rejectUnknownFields(value, NAVIGATION_CONTEXT_FIELDS, `${options.path}.navigationContext`);
  }

  if (value.relation !== 'next' && value.relation !== 'current') {
    throwValidationError(`${options.path}.navigationContext.relation must be next or current`);
  }

  return {
    distanceMeters: validateNonNegativeNumber(
      value.distanceMeters,
      `${options.path}.navigationContext.distanceMeters`,
    ),
    durationSeconds: validateNonNegativeNumber(
      value.durationSeconds,
      `${options.path}.navigationContext.durationSeconds`,
    ),
    relation: value.relation,
  };
}

export function sanitizeNarrationPayload(
  value: unknown,
  options: SanitizeOptions,
): NarrationPayload {
  if (!isPlainObject(value)) {
    throwValidationError(`${options.path} must be an object`);
  }

  if (options.rejectUnknownFields) {
    rejectUnknownFields(value, PAYLOAD_FIELDS, options.path);
  }

  const trigger = validateRequiredString(value.trigger, `${options.path}.trigger`);
  if (!ALLOWED_NARRATION_TRIGGERS.has(trigger)) {
    throwValidationError(`${options.path}.trigger must be an allowed narration trigger`);
  }

  return {
    tourStopId: validateRequiredString(value.tourStopId, `${options.path}.tourStopId`),
    listingId: validateRequiredString(value.listingId, `${options.path}.listingId`),
    trigger: trigger as NarrationPayload['trigger'],
    narrationText: validateRequiredString(value.narrationText, `${options.path}.narrationText`),
    listingSummary: validateListingSummary(value.listingSummary, options),
    ...(value.navigationContext !== undefined
      ? { navigationContext: validateNavigationContext(value.navigationContext, options) }
      : {}),
  };
}

export function parseNarrationPayloadsForWrite(value: unknown): NarrationPayload[] | null {
  if (value === null) {
    return null;
  }

  if (!Array.isArray(value)) {
    throwValidationError('narrationPayloads must be an array or null');
  }

  return value.map((payload, index) =>
    sanitizeNarrationPayload(payload, {
      rejectUnknownFields: true,
      path: `narrationPayloads[${index}]`,
    }),
  );
}

export function readPersistedNarrationPayloads(value: unknown): NarrationPayload[] | undefined {
  if (value == null) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((payload, index) => {
    try {
      return [
        sanitizeNarrationPayload(payload, {
          rejectUnknownFields: false,
          path: `narrationPayloads[${index}]`,
        }),
      ];
    } catch {
      return [];
    }
  });
}
