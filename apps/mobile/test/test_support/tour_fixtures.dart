import 'package:project_x_mobile/models/tour.dart';

Tour buildTour(String id) {
  return Tour(
    id: id,
    title: 'Planned Tour',
    clientName: 'Client',
    date: '2026-05-02',
    startTime: '09:00',
    defaultDurationMinutes: 30,
    defaultBufferMinutes: 10,
    stops: const [
      TourStop(
        id: 'stop-1',
        listingId: 'listing-1',
        order: 0,
        address: '1 Main Street',
        lat: 42.3314,
        lng: -83.0458,
      ),
    ],
  );
}
