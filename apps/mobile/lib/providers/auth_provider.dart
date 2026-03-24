import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart' hide AuthState, AuthUser;

import '../core/config/app_config.dart';
import '../models/auth_user.dart';
import '../services/auth_service.dart';

const _noChange = Object();
const _userNotProvisionedCode = 'USER_NOT_PROVISIONED';

/// Auth state exposed to the UI.
class AuthState {
  final AuthUser? user;
  final bool isLoading;
  final bool isInitialized;
  final bool pendingVerification;
  final String? error;

  const AuthState({
    this.user,
    this.isLoading = false,
    this.isInitialized = false,
    this.pendingVerification = false,
    this.error,
  });

  AuthState copyWith({
    AuthUser? user,
    bool clearUser = false,
    bool? isLoading,
    bool? isInitialized,
    bool? pendingVerification,
    Object? error = _noChange,
  }) {
    return AuthState(
      user: clearUser ? null : user ?? this.user,
      isLoading: isLoading ?? this.isLoading,
      isInitialized: isInitialized ?? this.isInitialized,
      pendingVerification: pendingVerification ?? this.pendingVerification,
      error: identical(error, _noChange) ? this.error : error as String?,
    );
  }

  bool get isAuthenticated => user != null;
}

class _ApiError implements Exception {
  final String message;
  final int? statusCode;
  final String? code;

  const _ApiError(this.message, {this.statusCode, this.code});

  @override
  String toString() => message;
}

class _PendingProfile {
  final String? displayName;
  final String? phone;

  const _PendingProfile({this.displayName, this.phone});

  Map<String, dynamic> toJson() => {
        if (displayName != null && displayName!.isNotEmpty) 'displayName': displayName,
        if (phone != null && phone!.isNotEmpty) 'phone': phone,
      };
}

/// StateNotifier that manages auth lifecycle.
class AuthNotifier extends StateNotifier<AuthState> {
  final AuthService _authService;
  StreamSubscription? _authSub;
  Future<void>? _initializeFuture;
  Future<AuthUser?>? _sessionSyncFuture;
  _PendingProfile? _pendingProfile;

  AuthNotifier(this._authService) : super(const AuthState());

  Dio _authDio(String token) {
    return Dio(
      BaseOptions(
        baseUrl: AppConfig.apiBaseUrl,
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
          'x-tenant-id': AppConfig.tenantId,
        },
      ),
    );
  }

  _ApiError _toApiError(DioException error) {
    final data = error.response?.data;
    if (data is Map<String, dynamic>) {
      return _ApiError(
        data['message'] as String? ?? error.message ?? 'Request failed',
        statusCode: error.response?.statusCode,
        code: data['code'] as String?,
      );
    }

    return _ApiError(
      error.message ?? 'Request failed',
      statusCode: error.response?.statusCode,
    );
  }

  _PendingProfile _profileFromSession(Session session) {
    final metadata = session.user.userMetadata;
    final displayName = metadata?['displayName'] is String
        ? (metadata!['displayName'] as String).trim()
        : metadata?['display_name'] is String
            ? (metadata!['display_name'] as String).trim()
            : null;
    final phone = metadata?['phone'] is String
        ? (metadata!['phone'] as String).trim()
        : null;

    return _PendingProfile(
      displayName: displayName == null || displayName.isEmpty ? null : displayName,
      phone: phone == null || phone.isEmpty ? null : phone,
    );
  }

  Future<AuthUser?> _syncSession(
    Session session, {
    _PendingProfile? fallbackProfile,
  }) async {
    if (_sessionSyncFuture != null) {
      return _sessionSyncFuture!;
    }

    _sessionSyncFuture = (() async {
      try {
        final user = await _fetchMe(session.accessToken);
        _pendingProfile = null;
        state = state.copyWith(
          user: user,
          pendingVerification: false,
          error: null,
        );
        return user;
      } on _ApiError catch (error) {
        if (error.statusCode == 401 && error.code == _userNotProvisionedCode) {
          final profile = fallbackProfile ?? _pendingProfile ?? _profileFromSession(session);
          final result = await _registerLocalUser(session.accessToken, profile);
          _pendingProfile = null;
          state = state.copyWith(
            user: result,
            pendingVerification: false,
            error: null,
          );
          return result;
        }

        if (error.statusCode == 401) {
          state = state.copyWith(
            clearUser: true,
            pendingVerification: false,
            error: null,
          );
          return null;
        }

        rethrow;
      } finally {
        _sessionSyncFuture = null;
      }
    })();

    return _sessionSyncFuture!;
  }

  Future<AuthUser?> _fetchMe(String token) async {
    try {
      final response = await _authDio(token).get('/api/auth/me');
      return AuthUser.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (error) {
      throw _toApiError(error);
    }
  }

  Future<AuthUser> _registerLocalUser(
    String token,
    _PendingProfile profile,
  ) async {
    try {
      final response = await _authDio(token).post(
        '/api/auth/register',
        data: profile.toJson(),
      );
      final data = response.data as Map<String, dynamic>;
      return AuthUser.fromJson(data['user'] as Map<String, dynamic>);
    } on DioException catch (error) {
      throw _toApiError(error);
    }
  }

  void _listenToAuthChanges() {
    _authSub?.cancel();
    _authSub = _authService.onAuthStateChange.listen((event) {
      if (event.session?.accessToken == null ||
          event.event == AuthChangeEvent.signedOut) {
        _pendingProfile = null;
        state = state.copyWith(
          clearUser: true,
          isLoading: false,
          isInitialized: true,
          pendingVerification: false,
          error: null,
        );
        return;
      }

      unawaited(() async {
        try {
          await _syncSession(event.session!);
        } catch (error) {
          state = state.copyWith(
            error: _friendlyError(error),
            isInitialized: true,
          );
        }
      }());
    });
  }

  /// Initialize: check existing session, hydrate user from API, listen for changes.
  Future<void> initialize() {
    if (_initializeFuture != null) {
      return _initializeFuture!;
    }
    if (state.isInitialized) {
      return Future.value();
    }

    _initializeFuture = (() async {
      state = state.copyWith(isLoading: true, error: null);

      try {
        final session = _authService.currentSession;
        _listenToAuthChanges();

        if (session != null) {
          await _syncSession(session);
        } else {
          state = state.copyWith(
            clearUser: true,
            pendingVerification: false,
            error: null,
          );
        }
      } catch (error) {
        state = state.copyWith(
          clearUser: true,
          error: _friendlyError(error),
        );
      } finally {
        state = state.copyWith(isLoading: false, isInitialized: true);
        _initializeFuture = null;
      }
    })();

    return _initializeFuture!;
  }

  /// Sign in with email + password.
  Future<void> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final response = await _authService.signIn(
        email: email,
        password: password,
      );
      final session = response.session;
      if (session == null) throw Exception('No session returned');

      await _syncSession(session);
      state = state.copyWith(
        isLoading: false,
        isInitialized: true,
        pendingVerification: false,
        error: null,
      );
    } catch (error) {
      state = state.copyWith(
        clearUser: true,
        isLoading: false,
        isInitialized: true,
        pendingVerification: false,
        error: _friendlyError(error),
      );
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
    final profile = _PendingProfile(
      displayName: displayName?.trim().isEmpty == true ? null : displayName?.trim(),
      phone: phone?.trim().isEmpty == true ? null : phone?.trim(),
    );

    try {
      final response = await _authService.signUp(
        email: email,
        password: password,
        data: profile.toJson(),
      );

      _pendingProfile = profile;

      if (response.session != null) {
        await _syncSession(response.session!, fallbackProfile: profile);
        state = state.copyWith(
          isLoading: false,
          isInitialized: true,
          pendingVerification: false,
          error: null,
        );
        return;
      }

      if (response.user != null) {
        state = state.copyWith(
          clearUser: true,
          isLoading: false,
          isInitialized: true,
          pendingVerification: true,
          error: null,
        );
        return;
      }

      throw Exception('Registration did not return a user');
    } catch (error) {
      state = state.copyWith(
        clearUser: true,
        isLoading: false,
        isInitialized: true,
        error: _friendlyError(error),
      );
    }
  }

  /// Sign out.
  Future<void> logout() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      _pendingProfile = null;
      await _authService.signOut();
    } catch (_) {
      // Client-side Supabase auth remains the source of truth for logout state.
    } finally {
      state = const AuthState(isInitialized: true);
    }
  }

  String _friendlyError(Object error) {
    if (error is AuthException) return error.message;
    if (error is _ApiError) return error.message;
    if (error is DioException) return _toApiError(error).message;
    return error.toString();
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
