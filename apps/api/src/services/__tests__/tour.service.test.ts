import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
  findAll: vi.fn(),
  deleteById: vi.fn(),
  generateTourNarrations: vi.fn(),
}));

vi.mock('@project-x/database', () => ({
  Prisma: {},
  prisma: {
    $transaction: mocks.transaction,
  },
}));

vi.mock('../../repositories/tour.repository', () => ({
  create: mocks.create,
  findById: mocks.findById,
  findAll: mocks.findAll,
  update: mocks.update,
  deleteById: mocks.deleteById,
}));

vi.mock('../narration.service', () => ({
  generateTourNarrations: mocks.generateTourNarrations,
}));

describe('tour.service scheduling', () => {
  const originalTimeZone = process.env.TZ;

  afterEach(() => {
    process.env.TZ = originalTimeZone;
    vi.clearAllMocks();
  });

  const stops = [
    {
      listingId: 'listing-1',
      address: '1 Main St',
      lat: 42.3314,
      lng: -83.0458,
    },
    {
      listingId: 'listing-2',
      address: '2 Main St',
      lat: 42.332,
      lng: -83.046,
    },
  ];

  it('schedules a valid IANA timezone wall-clock time as UTC ISO stop times', async () => {
    const { scheduleStops } = await import('../tour.service');

    const scheduled = scheduleStops(stops, '2026-03-23', '09:00', 30, 10, 'America/Detroit');

    expect(scheduled.map((stop) => ({ startTime: stop.startTime, endTime: stop.endTime }))).toEqual([
      {
        startTime: '2026-03-23T13:00:00.000Z',
        endTime: '2026-03-23T13:30:00.000Z',
      },
      {
        startTime: '2026-03-23T13:40:00.000Z',
        endTime: '2026-03-23T14:10:00.000Z',
      },
    ]);
  });

  it('uses UTC when timeZone is omitted', async () => {
    const { scheduleStops } = await import('../tour.service');

    const scheduled = scheduleStops(stops, '2026-03-23', '09:00', 30, 10);

    expect(scheduled[0].startTime).toBe('2026-03-23T09:00:00.000Z');
    expect(scheduled[0].endTime).toBe('2026-03-23T09:30:00.000Z');
  });

  it('does not depend on the server-local timezone', async () => {
    const { scheduleStops } = await import('../tour.service');

    process.env.TZ = 'Pacific/Honolulu';
    const honoluluServerTimes = scheduleStops(
      stops,
      '2026-03-23',
      '09:00',
      30,
      10,
      'America/Detroit',
    );

    process.env.TZ = 'Asia/Tokyo';
    const tokyoServerTimes = scheduleStops(
      stops,
      '2026-03-23',
      '09:00',
      30,
      10,
      'America/Detroit',
    );

    expect(tokyoServerTimes).toEqual(honoluluServerTimes);
    expect(tokyoServerTimes[0].startTime).toBe('2026-03-23T13:00:00.000Z');
  });
});

describe('tour.service update scheduling contract', () => {
  const scope = {
    tenantId: 'tenant-1',
    userId: 'user-1',
    role: 'CONSUMER' as const,
  };

  function makeDbTour(overrides: Record<string, unknown> = {}) {
    return {
      id: 'tour-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      title: 'Planned Tour',
      clientName: '',
      date: '2026-03-23',
      startTime: '09:00',
      defaultDurationMinutes: 30,
      defaultBufferMinutes: 10,
      narrationPayloads: null,
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
      ...overrides,
    };
  }

  function makeTransactionClient() {
    return {
      tourStop: {
        deleteMany: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
      },
    };
  }

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('persists updated parent startTime and returns matching rescheduled stop times', async () => {
    const tx = makeTransactionClient();
    mocks.transaction.mockImplementation(async (callback) => callback(tx));
    mocks.generateTourNarrations.mockReturnValue([]);

    const existingTour = makeDbTour();
    const finalTour = makeDbTour({
      date: '2026-03-24',
      startTime: '10:15',
      stops: [
        {
          ...existingTour.stops[0],
          startTime: '2026-03-24T14:15:00.000Z',
          endTime: '2026-03-24T14:45:00.000Z',
        },
      ],
    });

    mocks.findById
      .mockResolvedValueOnce(existingTour)
      .mockResolvedValueOnce(finalTour);
    mocks.update
      .mockResolvedValueOnce({ ...existingTour, date: '2026-03-24', startTime: '10:15' })
      .mockResolvedValueOnce(finalTour);

    const { updateTour } = await import('../tour.service');

    const result = await updateTour('tour-1', scope, {
      date: '2026-03-24',
      startTime: '10:15',
      timeZone: 'America/Detroit',
    });

    expect(mocks.update).toHaveBeenNthCalledWith(1, 'tour-1', scope, {
      title: undefined,
      clientName: undefined,
      date: '2026-03-24',
      startTime: '10:15',
      defaultDurationMinutes: undefined,
      defaultBufferMinutes: undefined,
      narrationPayloads: undefined,
    }, tx);
    expect(tx.tourStop.update).toHaveBeenCalledWith({
      where: { id: 'stop-1' },
      data: expect.objectContaining({
        startTime: '2026-03-24T14:15:00.000Z',
        endTime: '2026-03-24T14:45:00.000Z',
      }),
    });
    expect(result?.startTime).toBe('10:15');
    expect(result?.stops[0].startTime).toBe('2026-03-24T14:15:00.000Z');
  });

  it('uses UTC fallback when an update reschedules without timeZone', async () => {
    const tx = makeTransactionClient();
    mocks.transaction.mockImplementation(async (callback) => callback(tx));
    mocks.generateTourNarrations.mockReturnValue([]);

    const existingTour = makeDbTour();
    const finalTour = makeDbTour({
      date: '2026-03-24',
      startTime: '10:15',
      stops: [
        {
          ...existingTour.stops[0],
          startTime: '2026-03-24T10:15:00.000Z',
          endTime: '2026-03-24T10:45:00.000Z',
        },
      ],
    });

    mocks.findById
      .mockResolvedValueOnce(existingTour)
      .mockResolvedValueOnce(finalTour);
    mocks.update
      .mockResolvedValueOnce({ ...existingTour, date: '2026-03-24', startTime: '10:15' })
      .mockResolvedValueOnce(finalTour);

    const { updateTour } = await import('../tour.service');

    const result = await updateTour('tour-1', scope, {
      date: '2026-03-24',
      startTime: '10:15',
    });

    expect(tx.tourStop.update).toHaveBeenCalledWith({
      where: { id: 'stop-1' },
      data: expect.objectContaining({
        startTime: '2026-03-24T10:15:00.000Z',
        endTime: '2026-03-24T10:45:00.000Z',
      }),
    });
    expect(result?.startTime).toBe('10:15');
    expect(result?.stops[0].startTime).toBe('2026-03-24T10:15:00.000Z');
  });
});
