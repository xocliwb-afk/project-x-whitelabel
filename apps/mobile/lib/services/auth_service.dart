import 'package:supabase_flutter/supabase_flutter.dart';

/// Wraps supabase_flutter auth methods for the app.
///
/// Provides a clean interface over Supabase GoTrue so the rest of the app
/// doesn't depend on Supabase types directly.
class AuthService {
  final SupabaseClient _client;

  AuthService({SupabaseClient? client})
      : _client = client ?? Supabase.instance.client;

  /// Sign up with email + password.
  /// Returns the Supabase [AuthResponse].
  Future<AuthResponse> signUp({
    required String email,
    required String password,
    Map<String, dynamic>? data,
  }) async {
    return _client.auth.signUp(
      email: email,
      password: password,
      data: data,
    );
  }

  /// Sign in with email + password.
  Future<AuthResponse> signIn({
    required String email,
    required String password,
  }) async {
    return _client.auth.signInWithPassword(email: email, password: password);
  }

  /// Sign out the current user.
  Future<void> signOut() async {
    await _client.auth.signOut();
  }

  /// Current session (null if not authenticated).
  Session? get currentSession => _client.auth.currentSession;

  /// Current access token (null if no session).
  String? get currentAccessToken => currentSession?.accessToken;

  /// Refresh the current session and return the new access token.
  /// Returns null if refresh fails.
  Future<String?> refreshSession() async {
    try {
      final response = await _client.auth.refreshSession();
      return response.session?.accessToken;
    } catch (_) {
      return null;
    }
  }

  /// Stream of auth state changes.
  Stream<AuthState> get onAuthStateChange =>
      _client.auth.onAuthStateChange;
}
