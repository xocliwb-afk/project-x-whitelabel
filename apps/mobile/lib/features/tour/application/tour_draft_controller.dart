import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../models/tour.dart';
import '../../../providers/auth_provider.dart';
import '../data/tour_repository.dart';

const _noChange = Object();

class TourPersistenceAuthRequired implements Exception {
  final String code = 'AUTH_REQUIRED';
  final String message = 'Sign in to save tours.';

  const TourPersistenceAuthRequired();

  @override
  String toString() => message;
}

class TourDraftStop {
  final String listingId;
  final String address;
  final double lat;
  final double lng;
  final String? thumbnailUrl;

  const TourDraftStop({
    required this.listingId,
    required this.address,
    required this.lat,
    required this.lng,
    this.thumbnailUrl,
  });

  TourStopInput toInput() {
    return TourStopInput(
      listingId: listingId,
      address: address,
      lat: lat,
      lng: lng,
    );
  }
}

class TourDraftState {
  final List<TourDraftStop> stops;
  final List<Tour> persistedTours;
  final Tour? currentTour;
  final String? clientName;
  final String date;
  final String startTime;
  final int defaultDurationMinutes;
  final int defaultBufferMinutes;
  final String? timeZone;
  final bool isLoading;
  final bool isPersisting;
  final String? error;

  const TourDraftState({
    this.stops = const [],
    this.persistedTours = const [],
    this.currentTour,
    this.clientName,
    this.date = '',
    this.startTime = '09:00',
    this.defaultDurationMinutes = 30,
    this.defaultBufferMinutes = 10,
    this.timeZone,
    this.isLoading = false,
    this.isPersisting = false,
    this.error,
  });

  bool get canPersist => stops.isNotEmpty && date.isNotEmpty;

  TourDraftState copyWith({
    List<TourDraftStop>? stops,
    List<Tour>? persistedTours,
    Object? currentTour = _noChange,
    Object? clientName = _noChange,
    String? date,
    String? startTime,
    int? defaultDurationMinutes,
    int? defaultBufferMinutes,
    Object? timeZone = _noChange,
    bool? isLoading,
    bool? isPersisting,
    Object? error = _noChange,
  }) {
    return TourDraftState(
      stops: stops ?? this.stops,
      persistedTours: persistedTours ?? this.persistedTours,
      currentTour: identical(currentTour, _noChange)
          ? this.currentTour
          : currentTour as Tour?,
      clientName: identical(clientName, _noChange)
          ? this.clientName
          : clientName as String?,
      date: date ?? this.date,
      startTime: startTime ?? this.startTime,
      defaultDurationMinutes:
          defaultDurationMinutes ?? this.defaultDurationMinutes,
      defaultBufferMinutes: defaultBufferMinutes ?? this.defaultBufferMinutes,
      timeZone:
          identical(timeZone, _noChange) ? this.timeZone : timeZone as String?,
      isLoading: isLoading ?? this.isLoading,
      isPersisting: isPersisting ?? this.isPersisting,
      error: identical(error, _noChange) ? this.error : error as String?,
    );
  }
}

class TourDraftController extends StateNotifier<TourDraftState> {
  final TourRepository _repository;

  TourDraftController(this._repository) : super(const TourDraftState());

  void setSchedule({
    String? date,
    String? startTime,
    int? defaultDurationMinutes,
    int? defaultBufferMinutes,
    String? clientName,
    String? timeZone,
  }) {
    state = state.copyWith(
      date: date,
      startTime: startTime,
      defaultDurationMinutes: defaultDurationMinutes,
      defaultBufferMinutes: defaultBufferMinutes,
      clientName: clientName,
      timeZone: timeZone,
      error: null,
    );
  }

  void addStop(TourDraftStop stop) {
    state = state.copyWith(
      stops: [...state.stops, stop],
      error: null,
    );
  }

  void removeStopAt(int index) {
    if (index < 0 || index >= state.stops.length) {
      return;
    }

    final nextStops = [...state.stops]..removeAt(index);
    state = state.copyWith(stops: nextStops, error: null);
  }

  void removeStopByListingId(String listingId) {
    state = state.copyWith(
      stops: state.stops
          .where((stop) => stop.listingId != listingId)
          .toList(growable: false),
      error: null,
    );
  }

  void reorderStop(int oldIndex, int newIndex) {
    if (oldIndex < 0 ||
        oldIndex >= state.stops.length ||
        newIndex < 0 ||
        newIndex > state.stops.length) {
      return;
    }

    final nextStops = [...state.stops];
    final stop = nextStops.removeAt(oldIndex);
    final adjustedNewIndex = newIndex > oldIndex ? newIndex - 1 : newIndex;
    nextStops.insert(adjustedNewIndex, stop);
    state = state.copyWith(stops: nextStops, error: null);
  }

  Future<void> loadTours({required bool isAuthenticated}) async {
    if (!isAuthenticated) {
      state =
          state.copyWith(error: const TourPersistenceAuthRequired().message);
      return;
    }

    state = state.copyWith(isLoading: true, error: null);

    try {
      final tours = await _repository.listTours();
      state = state.copyWith(
        persistedTours: tours,
        isLoading: false,
        error: null,
      );
    } catch (error) {
      state = state.copyWith(
        isLoading: false,
        error: _describeError(error),
      );
    }
  }

  Future<void> loadTourById(
    String id, {
    required bool isAuthenticated,
  }) async {
    if (!isAuthenticated) {
      state =
          state.copyWith(error: const TourPersistenceAuthRequired().message);
      return;
    }

    state = state.copyWith(isLoading: true, error: null);

    try {
      final tour = await _repository.getTourById(id);
      state = state.copyWith(
        currentTour: tour,
        isLoading: false,
        error: null,
      );
    } catch (error) {
      state = state.copyWith(
        isLoading: false,
        error: _describeError(error),
      );
    }
  }

  Future<Tour?> persistDraft({required bool isAuthenticated}) async {
    if (!isAuthenticated) {
      state =
          state.copyWith(error: const TourPersistenceAuthRequired().message);
      return null;
    }

    state = state.copyWith(isPersisting: true, error: null);

    try {
      final request = PlanTourRequest(
        date: state.date,
        clientName: state.clientName,
        stops: state.stops.map((stop) => stop.toInput()).toList(),
        startTime: state.startTime,
        defaultDurationMinutes: state.defaultDurationMinutes,
        defaultBufferMinutes: state.defaultBufferMinutes,
        timeZone: state.timeZone,
      );
      final tour = await _repository.planTour(request);
      state = state.copyWith(
        currentTour: tour,
        isPersisting: false,
        error: null,
      );
      return tour;
    } catch (error) {
      state = state.copyWith(
        isPersisting: false,
        error: _describeError(error),
      );
      return null;
    }
  }

  Future<Tour?> updatePersistedTour({
    required bool isAuthenticated,
    required String id,
    String? title,
    String? clientName,
    String? date,
    String? startTime,
    int? defaultDurationMinutes,
    int? defaultBufferMinutes,
    List<TourStop>? stops,
  }) async {
    if (!isAuthenticated) {
      state =
          state.copyWith(error: const TourPersistenceAuthRequired().message);
      return null;
    }

    state = state.copyWith(isPersisting: true, error: null);

    try {
      final tour = await _repository.updateTour(
        id,
        title: title,
        clientName: clientName,
        date: date,
        startTime: startTime,
        defaultDurationMinutes: defaultDurationMinutes,
        defaultBufferMinutes: defaultBufferMinutes,
        stops: stops,
      );
      state = state.copyWith(
        currentTour: tour,
        isPersisting: false,
        error: null,
      );
      return tour;
    } catch (error) {
      state = state.copyWith(
        isPersisting: false,
        error: _describeError(error),
      );
      return null;
    }
  }

  Future<void> deletePersistedTour({
    required bool isAuthenticated,
    required String id,
  }) async {
    if (!isAuthenticated) {
      state =
          state.copyWith(error: const TourPersistenceAuthRequired().message);
      return;
    }

    state = state.copyWith(isPersisting: true, error: null);

    try {
      await _repository.deleteTour(id);
      final nextState = state.copyWith(
        isPersisting: false,
        error: null,
      );
      state = state.currentTour?.id == id
          ? nextState.copyWith(currentTour: null)
          : nextState;
    } catch (error) {
      state = state.copyWith(
        isPersisting: false,
        error: _describeError(error),
      );
    }
  }

  void reset() {
    state = const TourDraftState();
  }

  String _describeError(Object error) => error.toString();
}

final tourDraftControllerProvider =
    StateNotifierProvider<TourDraftController, TourDraftState>((ref) {
  final controller = TourDraftController(ref.watch(tourRepositoryProvider));

  ref.listen<AuthState>(authProvider, (previous, next) {
    final previousUser = previous?.user;
    final nextUser = next.user;
    final signedOut = previousUser != null && nextUser == null;
    final userChanged = previousUser != null &&
        nextUser != null &&
        (previousUser.id != nextUser.id ||
            previousUser.tenantId != nextUser.tenantId);

    if (signedOut || userChanged) {
      controller.reset();
    }
  });

  return controller;
});
