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

/// App boundary for foreground text-to-speech playback.
abstract class TtsEngine {
  /// Speak the narration text aloud.
  Future<void> speak(NarrationPayload payload);

  /// Speak arbitrary narration text, including fallback text without payload.
  Future<void> speakText(String text);

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
class NoOpTtsEngine implements TtsEngine {
  bool _speaking = false;

  @override
  Future<void> speak(NarrationPayload payload) async {
    await speakText(payload.narrationText);
  }

  @override
  Future<void> speakText(String text) async {
    if (text.trim().isEmpty) {
      return;
    }

    _speaking = true;
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
    await speakText(payload.narrationText);
  }

  @override
  Future<void> speakText(String text) async {
    final normalizedText = text.trim();
    if (normalizedText.isEmpty) {
      return;
    }

    try {
      await _flutterTts.awaitSpeakCompletion(true);
      await _flutterTts.stop();
      _speaking = false;

      final result = await _flutterTts.speak(normalizedText);
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
  return ref.watch(flutterTtsEngineProvider);
});
