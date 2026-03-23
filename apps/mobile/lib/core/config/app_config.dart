/// Central app configuration — API URL, Supabase config, tenant ID.
class AppConfig {
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3002',
  );

  static const String supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://bmkqwfiipbxktrihydxd.supabase.co',
  );

  static const String supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: '',
  );

  static const String tenantId = String.fromEnvironment(
    'TENANT_ID',
    defaultValue: '',
  );
}
