import 'package:project_x_mobile/models/auth_user.dart';

AuthUser buildAuthUser({
  String id = 'user-1',
  String email = 'tester@example.com',
}) {
  return AuthUser(
    id: id,
    supabaseId: 'supabase-$id',
    tenantId: 'tenant-1',
    email: email,
    displayName: 'Test User',
    role: 'client',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  );
}
