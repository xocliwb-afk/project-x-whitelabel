/// Central app configuration — API URL, Supabase config, tenant ID.
class AppConfig {
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3002',
  );

  static const String _supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: '',
  );

  static const String _supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: '',
  );

  static const String _tenantId = String.fromEnvironment(
    'TENANT_ID',
    defaultValue: '',
  );

  static const String _mapboxAccessToken = String.fromEnvironment(
    'MAPBOX_ACCESS_TOKEN',
    defaultValue: '',
  );

  static String get supabaseUrl {
    if (_supabaseUrl.isEmpty) {
      throw StateError('Missing required SUPABASE_URL configuration');
    }
    return _supabaseUrl;
  }

  static String get supabaseAnonKey {
    if (_supabaseAnonKey.isEmpty) {
      throw StateError('Missing required SUPABASE_ANON_KEY configuration');
    }
    return _supabaseAnonKey;
  }

  static String get tenantId {
    if (_tenantId.isEmpty) {
      throw StateError('Missing required TENANT_ID configuration');
    }
    return _tenantId;
  }

  static String? get mapboxAccessToken {
    final token = _mapboxAccessToken.trim();
    return token.isEmpty ? null : token;
  }
}
