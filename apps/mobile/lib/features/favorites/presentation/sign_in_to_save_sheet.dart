import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

Future<void> showSignInToSaveSheet(BuildContext context) {
  return showModalBottomSheet<void>(
    context: context,
    builder: (context) => const SignInToSaveSheet(),
  );
}

class SignInToSaveSheet extends StatelessWidget {
  const SignInToSaveSheet({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SafeArea(
      child: Padding(
        key: const ValueKey('sign-in-to-save-sheet'),
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Log in to save this home.',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Create or use an account to keep favorites synced.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 20),
            FilledButton(
              key: const ValueKey('sign-in-to-save-login'),
              onPressed: () {
                final router = GoRouter.of(context);
                Navigator.of(context).pop();
                router.go('/login');
              },
              child: const Text('Log in'),
            ),
            TextButton(
              key: const ValueKey('sign-in-to-save-cancel'),
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Not now'),
            ),
          ],
        ),
      ),
    );
  }
}
