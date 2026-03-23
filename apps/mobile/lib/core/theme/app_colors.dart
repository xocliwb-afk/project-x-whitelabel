import 'package:flutter/material.dart';
import '../../models/brand_config.dart';

/// Parses a hex color string (e.g. "#14243B") to a Flutter Color.
Color hexToColor(String hex) {
  final buffer = StringBuffer();
  if (hex.length == 6 || hex.length == 7) buffer.write('ff');
  buffer.write(hex.replaceFirst('#', ''));
  return Color(int.parse(buffer.toString(), radix: 16));
}

/// Resolves brand theme colors into Flutter Color instances.
class AppColors {
  final Color primary;
  final Color primaryForeground;
  final Color primaryAccent;
  final Color background;
  final Color surface;
  final Color surfaceMuted;
  final Color surfaceAccent;
  final Color textMain;
  final Color textSecondary;
  final Color textMuted;
  final Color border;
  final Color danger;
  final Color success;

  const AppColors({
    required this.primary,
    required this.primaryForeground,
    required this.primaryAccent,
    required this.background,
    required this.surface,
    required this.surfaceMuted,
    required this.surfaceAccent,
    required this.textMain,
    required this.textSecondary,
    required this.textMuted,
    required this.border,
    required this.danger,
    required this.success,
  });

  /// Create AppColors from brand config theme colors.
  factory AppColors.fromBrandColors(ThemeColors colors) {
    return AppColors(
      primary: hexToColor(colors.primary),
      primaryForeground: hexToColor(colors.primaryForeground),
      primaryAccent: hexToColor(colors.primaryAccent),
      background: hexToColor(colors.background),
      surface: hexToColor(colors.surface),
      surfaceMuted: hexToColor(colors.surfaceMuted),
      surfaceAccent: hexToColor(colors.surfaceAccent),
      textMain: hexToColor(colors.textMain),
      textSecondary: hexToColor(colors.textSecondary),
      textMuted: hexToColor(colors.textMuted),
      border: hexToColor(colors.border),
      danger: hexToColor(colors.danger),
      success: hexToColor(colors.success),
    );
  }
}
