import 'package:flutter/material.dart';
import '../../models/brand_config.dart';
import 'app_colors.dart';

/// Builds a Flutter ThemeData from brand configuration.
///
/// Maps BrandConfig.theme → ColorScheme + TextTheme + component themes.
class AppTheme {
  final BrandConfig brand;
  late final AppColors colors;

  AppTheme({required this.brand}) {
    colors = AppColors.fromBrandColors(brand.theme.colors);
  }

  /// Map font weight integer (100–900) to Flutter FontWeight.
  static FontWeight _fontWeight(int weight) {
    switch (weight) {
      case 100:
        return FontWeight.w100;
      case 200:
        return FontWeight.w200;
      case 300:
        return FontWeight.w300;
      case 400:
        return FontWeight.w400;
      case 500:
        return FontWeight.w500;
      case 600:
        return FontWeight.w600;
      case 700:
        return FontWeight.w700;
      case 800:
        return FontWeight.w800;
      case 900:
        return FontWeight.w900;
      default:
        return FontWeight.w400;
    }
  }

  /// Extract the primary font family name from the brand config font string.
  /// e.g. "Montserrat, system-ui, ..." → "Montserrat"
  String get _fontFamily {
    final families = brand.theme.typography.fontFamily.split(',');
    return families.first.trim();
  }

  ColorScheme get _colorScheme => ColorScheme(
        brightness: Brightness.light,
        primary: colors.primary,
        onPrimary: colors.primaryForeground,
        secondary: colors.primaryAccent,
        onSecondary: colors.primaryForeground,
        error: colors.danger,
        onError: Colors.white,
        surface: colors.surface,
        onSurface: colors.textMain,
      );

  TextTheme get _textTheme {
    final baseFontSize = brand.theme.typography.baseSizePx.toDouble();
    final headingWeight = _fontWeight(brand.theme.typography.headingWeight);
    final bodyWeight = _fontWeight(brand.theme.typography.bodyWeight);

    return TextTheme(
      displayLarge: TextStyle(
        fontFamily: _fontFamily,
        fontSize: baseFontSize * 2.25,
        fontWeight: headingWeight,
        color: colors.textMain,
      ),
      displayMedium: TextStyle(
        fontFamily: _fontFamily,
        fontSize: baseFontSize * 2.0,
        fontWeight: headingWeight,
        color: colors.textMain,
      ),
      displaySmall: TextStyle(
        fontFamily: _fontFamily,
        fontSize: baseFontSize * 1.75,
        fontWeight: headingWeight,
        color: colors.textMain,
      ),
      headlineLarge: TextStyle(
        fontFamily: _fontFamily,
        fontSize: baseFontSize * 1.5,
        fontWeight: headingWeight,
        color: colors.textMain,
      ),
      headlineMedium: TextStyle(
        fontFamily: _fontFamily,
        fontSize: baseFontSize * 1.25,
        fontWeight: headingWeight,
        color: colors.textMain,
      ),
      headlineSmall: TextStyle(
        fontFamily: _fontFamily,
        fontSize: baseFontSize * 1.125,
        fontWeight: headingWeight,
        color: colors.textMain,
      ),
      titleLarge: TextStyle(
        fontFamily: _fontFamily,
        fontSize: baseFontSize * 1.25,
        fontWeight: headingWeight,
        color: colors.textMain,
      ),
      titleMedium: TextStyle(
        fontFamily: _fontFamily,
        fontSize: baseFontSize,
        fontWeight: FontWeight.w500,
        color: colors.textMain,
      ),
      titleSmall: TextStyle(
        fontFamily: _fontFamily,
        fontSize: baseFontSize * 0.875,
        fontWeight: FontWeight.w500,
        color: colors.textMain,
      ),
      bodyLarge: TextStyle(
        fontFamily: _fontFamily,
        fontSize: baseFontSize,
        fontWeight: bodyWeight,
        color: colors.textMain,
      ),
      bodyMedium: TextStyle(
        fontFamily: _fontFamily,
        fontSize: baseFontSize * 0.875,
        fontWeight: bodyWeight,
        color: colors.textMain,
      ),
      bodySmall: TextStyle(
        fontFamily: _fontFamily,
        fontSize: baseFontSize * 0.75,
        fontWeight: bodyWeight,
        color: colors.textSecondary,
      ),
      labelLarge: TextStyle(
        fontFamily: _fontFamily,
        fontSize: baseFontSize * 0.875,
        fontWeight: FontWeight.w500,
        color: colors.textMain,
      ),
      labelMedium: TextStyle(
        fontFamily: _fontFamily,
        fontSize: baseFontSize * 0.75,
        fontWeight: FontWeight.w500,
        color: colors.textSecondary,
      ),
      labelSmall: TextStyle(
        fontFamily: _fontFamily,
        fontSize: baseFontSize * 0.6875,
        fontWeight: FontWeight.w500,
        color: colors.textMuted,
      ),
    );
  }

  /// Build the complete ThemeData from brand configuration.
  ThemeData build() {
    final colorScheme = _colorScheme;
    final textTheme = _textTheme;
    final cardRadius = brand.theme.radius.card.toDouble();
    final buttonRadius = brand.theme.radius.button.toDouble();
    final inputRadius = brand.theme.radius.input.toDouble();

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      textTheme: textTheme,
      scaffoldBackgroundColor: colors.background,
      appBarTheme: AppBarTheme(
        backgroundColor: colors.primary,
        foregroundColor: colors.primaryForeground,
        elevation: 0,
      ),
      cardTheme: CardThemeData(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(cardRadius),
        ),
        color: colors.surface,
        elevation: 1,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: colors.primary,
          foregroundColor: colors.primaryForeground,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(buttonRadius),
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: colors.primary,
          side: BorderSide(color: colors.border),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(buttonRadius),
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(inputRadius),
          borderSide: BorderSide(color: colors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(inputRadius),
          borderSide: BorderSide(color: colors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(inputRadius),
          borderSide: BorderSide(color: colors.primary, width: 2),
        ),
        filled: true,
        fillColor: colors.background,
      ),
      dividerColor: colors.border,
    );
  }
}
