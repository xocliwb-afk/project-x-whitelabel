import { describe, expect, it } from 'vitest';
import { toApiTour } from '../tour.mapper';

function makeDbTour(narrationPayloads: unknown) {
  return {
    id: 'tour-1',
    tenantId: 'tenant-1',
    userId: 'user-1',
    title: 'Tour',
    clientName: '',
    date: '2026-03-23',
    startTime: '09:00',
    defaultDurationMinutes: 30,
    defaultBufferMinutes: 10,
    narrationPayloads,
    createdAt: new Date('2026-03-20T00:00:00.000Z'),
    updatedAt: new Date('2026-03-20T00:00:00.000Z'),
    stops: [
      {
        id: 'stop-1',
        tourId: 'tour-1',
        listingId: 'listing-1',
        order: 0,
        address: '1 Main St',
        lat: 42.3314,
        lng: -83.0458,
        thumbnailUrl: null,
        startTime: '2026-03-23T13:00:00.000Z',
        endTime: '2026-03-23T13:30:00.000Z',
      },
    ],
  };
}

function validPersistedPayload(overrides: Record<string, unknown> = {}) {
  return {
    tourStopId: 'stop-1',
    listingId: 'listing-1',
    trigger: 'approaching',
    narrationText: 'Approaching 1 Main St.',
    listingSummary: {
      address: '1 Main St',
      price: '$250,000',
      beds: 3,
      baths: 2,
      sqft: 1500,
      highlights: ['large lot'],
      ignoredNestedField: true,
    },
    navigationContext: {
      distanceMeters: 100,
      durationSeconds: 30,
      relation: 'next',
      ignoredNestedField: true,
    },
    ignoredField: true,
    ...overrides,
  };
}

describe('tour.mapper narration payload hardening', () => {
  it('sanitizes valid persisted narration payloads and strips unknown fields', () => {
    const tour = toApiTour(makeDbTour([validPersistedPayload()]) as any);

    expect(tour.narrationPayloads).toEqual([
      {
        tourStopId: 'stop-1',
        listingId: 'listing-1',
        trigger: 'approaching',
        narrationText: 'Approaching 1 Main St.',
        listingSummary: {
          address: '1 Main St',
          price: '$250,000',
          beds: 3,
          baths: 2,
          sqft: 1500,
          highlights: ['large lot'],
        },
        navigationContext: {
          distanceMeters: 100,
          durationSeconds: 30,
          relation: 'next',
        },
      },
    ]);
  });

  it('filters malformed persisted narration payload array items without crashing', () => {
    const tour = toApiTour(
      makeDbTour([
        validPersistedPayload(),
        validPersistedPayload({ trigger: 'nearby' }),
        validPersistedPayload({ listingId: '' }),
        { bad: true },
      ]) as any,
    );

    expect(tour.narrationPayloads).toHaveLength(1);
    expect(tour.narrationPayloads?.[0]).toMatchObject({
      tourStopId: 'stop-1',
      listingId: 'listing-1',
      trigger: 'approaching',
    });
  });

  it('normalizes non-array malformed persisted narration payloads to an empty array', () => {
    const tour = toApiTour(makeDbTour({ bad: true }) as any);

    expect(tour.narrationPayloads).toEqual([]);
  });

  it('keeps null persisted narration payloads omitted for the existing optional response shape', () => {
    const tour = toApiTour(makeDbTour(null) as any);

    expect(tour.narrationPayloads).toBeUndefined();
  });
});
