import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart' hide AuthState;
import '../models/auth_user.dart';
import '../services/auth_service.dart';
import '../core/config/app_config.dart';

/// Auth state exposed to the UI.
class AuthState {
  final AuthUser? user;
  final bool isLoading;
  final String? error;

  const AuthState({this.user, this.isLoading = false, this.error});

  AuthState copyWith({AuthUser? user, bool? isLoading, String? error}) {
    return AuthState(
      user: user ?? this.user,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }

  bool get isAuthenticated => user != null;
}

/// StateNotifier that manages auth lifecycle.
class AuthNotifier extends StateNotifier<AuthState> {
  final AuthService _authService;
  StreamSubscription? _authSub;

  AuthNotifier(this._authService) : super(const AuthState());

  /// Initialize: check existing session, hydrate user from API, listen for changes.
  Future<void> initialize() async {
    state = state.copyWith(isLoading: true);

    try {
      final session = _authService.currentSession;
      if (session != null) {
        final user = await _fetchMe(session.accessToken);
        state = AuthState(user: user);
      } else {
        state = const AuthState();
      }
    } catch (e) {
      state = AuthState(error: e.toString());
    }

    // Listen for Supabase auth state changes.
    _authSub = _authService.onAuthStateChange.listen((event) async {
      if (event.event == AuthChangeEvent.signedOut ||
          event.event == AuthChangeEvent.tokenRefreshed && event.session == null) {
        state = const AuthState();
      } else if (event.session != null) {
        try {
          final user = await _fetchMe(event.session!.accessToken);
          state = AuthState(user: user);
        } catch (_) {
          // keep current state on transient errors
        }
      }
    });
  }

  /// Sign in with email + password.
  Future<void> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final response = await _authService.signIn(
        email: email,
        password: password,
      );
      final token = response.session?.accessToken;
      if (token == null) throw Exception('No session returned');
      final user = await _fetchMe(token);
      state = AuthState(user: user);
    } catch (e) {
      state = AuthState(error: _friendlyError(e));
    }
  }

  /// Register a new account.
  Future<void> register({
    required String email,
    required String password,
    String? displayName,
    String? phone,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final response = await _authService.signUp(
        email: email,
        password: password,
      );
      final token = response.session?.accessToken;
      if (token == null) throw Exception('No session returned');

      // Register with our API to create the DB user record.
      await _apiPost('/api/auth/register', token, {
        'email': email,
        if (displayName != null) 'displayName': displayName,
        if (phone != null) 'phone': phone,
      });

      final user = await _fetchMe(token);
      state = AuthState(user: user);
    } catch (e) {
      state = AuthState(error: _friendlyError(e));
    }
  }

  /// Sign out.
  Future<void> logout() async {
    try {
      await _authService.signOut();
    } catch (_) {}
    state = const AuthState();
  }

  /// Fetch the current user profile from our API.
  Future<AuthUser?> _fetchMe(String token) async {
    final dio = Dio(BaseOptions(
      baseUrl: AppConfig.apiBaseUrl,
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    ));
    final response = await dio.get('/api/auth/me');
    final data = response.data as Map<String, dynamic>;
    return AuthUser.fromJson(data['user'] as Map<String, dynamic>);
  }

  /// POST helper for API calls during auth flow.
  Future<void> _apiPost(
      String path, String token, Map<String, dynamic> body) async {
    final dio = Dio(BaseOptions(
      baseUrl: AppConfig.apiBaseUrl,
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    ));
    await dio.post(path, data: body);
  }

  String _friendlyError(Object e) {
    if (e is AuthException) return e.message;
    if (e is DioException) {
      final data = e.response?.data;
      if (data is Map<String, dynamic> && data['message'] != null) {
        return data['message'] as String;
      }
      return e.message ?? 'Network error';
    }
    return e.toString();
  }

  @override
  void dispose() {
    _authSub?.cancel();
    super.dispose();
  }
}

/// Global auth provider.
final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final authService = AuthService();
  return AuthNotifier(authService);
});
