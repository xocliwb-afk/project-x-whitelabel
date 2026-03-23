import '../models/narration.dart';
import 'api_client.dart';

/// Service for fetching and consuming tour narrations.
///
/// Fetches narration payloads from the API and provides a TTS interface
/// for speaking them aloud during a tour drive.
class NarrationService {
  final ApiClient _apiClient;

  NarrationService({required ApiClient apiClient}) : _apiClient = apiClient;

  /// Fetch narration payloads for a tour from GET /api/tours/:id/narrations.
  /// Call this before starting a tour drive.
  Future<List<NarrationPayload>> fetchTourNarrations(String tourId) async {
    final response = await _apiClient.getTourNarrations(tourId);
    return response;
  }
}

/// Placeholder TTS wrapper — defines the interface for text-to-speech.
///
/// Actual TTS integration (flutter_tts plugin) is deferred to a later epic.
/// This class defines the contract so that narration consumers can be
/// built and tested against this interface now.
abstract class TtsEngine {
  /// Speak the narration text aloud.
  Future<void> speak(NarrationPayload payload);

  /// Stop any currently playing narration.
  Future<void> stop();

  /// Whether the engine is currently speaking.
  bool get isSpeaking;
}

/// No-op TTS implementation for development and testing.
/// Logs narration text instead of speaking it.
class NoOpTtsEngine implements TtsEngine {
  bool _speaking = false;

  @override
  Future<void> speak(NarrationPayload payload) async {
    _speaking = true;
    // In development, this would log the narration text.
    // In production, this will be replaced with flutter_tts.
    await Future.delayed(const Duration(milliseconds: 100));
    _speaking = false;
  }

  @override
  Future<void> stop() async {
    _speaking = false;
  }

  @override
  bool get isSpeaking => _speaking;
}
