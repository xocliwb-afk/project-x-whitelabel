import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_tts/flutter_tts.dart';

import '../models/narration.dart';
import '../providers/api_provider.dart';
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

final narrationServiceProvider = Provider<NarrationService>((ref) {
  return NarrationService(apiClient: ref.watch(apiClientProvider));
});

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

class TtsEngineException implements Exception {
  final String message;

  const TtsEngineException(this.message);

  @override
  String toString() => message;
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

class FlutterTtsEngine implements TtsEngine {
  final FlutterTts _flutterTts;
  bool _speaking = false;

  FlutterTtsEngine({FlutterTts? flutterTts})
      : _flutterTts = flutterTts ?? FlutterTts() {
    _flutterTts.setStartHandler(() {
      _speaking = true;
    });
    _flutterTts.setCompletionHandler(() {
      _speaking = false;
    });
    _flutterTts.setCancelHandler(() {
      _speaking = false;
    });
    _flutterTts.setErrorHandler((_) {
      _speaking = false;
    });
  }

  @override
  Future<void> speak(NarrationPayload payload) async {
    final text = payload.narrationText.trim();
    if (text.isEmpty) {
      return;
    }

    try {
      await _flutterTts.awaitSpeakCompletion(true);
      await _flutterTts.stop();
      _speaking = false;

      final result = await _flutterTts.speak(text);
      if (result != 1 && result != true) {
        _speaking = false;
        throw const TtsEngineException(
          'Text-to-speech playback did not start.',
        );
      }
    } on TtsEngineException {
      rethrow;
    } catch (_) {
      _speaking = false;
      throw const TtsEngineException(
        'Unable to start text-to-speech playback.',
      );
    }
  }

  @override
  Future<void> stop() async {
    try {
      await _flutterTts.stop();
      _speaking = false;
    } catch (_) {
      _speaking = false;
      throw const TtsEngineException(
        'Unable to stop text-to-speech playback.',
      );
    }
  }

  @override
  bool get isSpeaking => _speaking;
}

final flutterTtsEngineProvider = Provider<TtsEngine>((ref) {
  return FlutterTtsEngine();
});

final ttsEngineProvider = Provider<TtsEngine>((ref) {
  return NoOpTtsEngine();
});
