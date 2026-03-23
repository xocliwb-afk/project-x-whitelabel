import 'package:json_annotation/json_annotation.dart';

part 'brand_config.g.dart';

/// Mirrors BrandConfig from packages/shared-types/src/brand.ts.
/// Fetched from GET /api/brand at app startup.
@JsonSerializable()
class BrandConfig {
  final String brandName;
  final String? brandTagline;
  final String? agentName;
  final BrandContact contact;
  final BrandLogo logo;
  final String? favicon;
  final ThemeConfig theme;
  final List<NavItem>? navItems;
  final List<Neighborhood>? neighborhoods;
  final SearchConfig? search;
  final ComplianceConfig? compliance;
  final FeatureFlags? features;

  const BrandConfig({
    required this.brandName,
    this.brandTagline,
    this.agentName,
    required this.contact,
    required this.logo,
    this.favicon,
    required this.theme,
    this.navItems,
    this.neighborhoods,
    this.search,
    this.compliance,
    this.features,
  });

  factory BrandConfig.fromJson(Map<String, dynamic> json) =>
      _$BrandConfigFromJson(json);

  Map<String, dynamic> toJson() => _$BrandConfigToJson(this);
}

@JsonSerializable()
class BrandContact {
  final String email;
  final String? phone;
  final String? address;

  const BrandContact({
    required this.email,
    this.phone,
    this.address,
  });

  factory BrandContact.fromJson(Map<String, dynamic> json) =>
      _$BrandContactFromJson(json);

  Map<String, dynamic> toJson() => _$BrandContactToJson(this);
}

@JsonSerializable()
class BrandLogo {
  final String url;
  final String? darkUrl;
  final int height;
  final String alt;

  const BrandLogo({
    required this.url,
    this.darkUrl,
    required this.height,
    required this.alt,
  });

  factory BrandLogo.fromJson(Map<String, dynamic> json) =>
      _$BrandLogoFromJson(json);

  Map<String, dynamic> toJson() => _$BrandLogoToJson(this);
}

@JsonSerializable()
class ThemeConfig {
  final ThemeColors colors;
  final ThemeTypography typography;
  final ThemeRadius radius;

  const ThemeConfig({
    required this.colors,
    required this.typography,
    required this.radius,
  });

  factory ThemeConfig.fromJson(Map<String, dynamic> json) =>
      _$ThemeConfigFromJson(json);

  Map<String, dynamic> toJson() => _$ThemeConfigToJson(this);
}

@JsonSerializable()
class ThemeColors {
  final String primary;
  final String primaryForeground;
  final String primaryAccent;
  final String background;
  final String surface;
  final String surfaceMuted;
  final String surfaceAccent;
  final String textMain;
  final String textSecondary;
  final String textMuted;
  final String border;
  final String danger;
  final String success;

  const ThemeColors({
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

  factory ThemeColors.fromJson(Map<String, dynamic> json) =>
      _$ThemeColorsFromJson(json);

  Map<String, dynamic> toJson() => _$ThemeColorsToJson(this);
}

@JsonSerializable()
class ThemeTypography {
  final String fontFamily;
  final int baseSizePx;
  final int headingWeight;
  final int bodyWeight;

  const ThemeTypography({
    required this.fontFamily,
    required this.baseSizePx,
    required this.headingWeight,
    required this.bodyWeight,
  });

  factory ThemeTypography.fromJson(Map<String, dynamic> json) =>
      _$ThemeTypographyFromJson(json);

  Map<String, dynamic> toJson() => _$ThemeTypographyToJson(this);
}

@JsonSerializable()
class ThemeRadius {
  final int card;
  final int button;
  final int input;

  const ThemeRadius({
    required this.card,
    required this.button,
    required this.input,
  });

  factory ThemeRadius.fromJson(Map<String, dynamic> json) =>
      _$ThemeRadiusFromJson(json);

  Map<String, dynamic> toJson() => _$ThemeRadiusToJson(this);
}

@JsonSerializable()
class NavItem {
  final String label;
  final String href;

  const NavItem({required this.label, required this.href});

  factory NavItem.fromJson(Map<String, dynamic> json) =>
      _$NavItemFromJson(json);

  Map<String, dynamic> toJson() => _$NavItemToJson(this);
}

@JsonSerializable()
class Neighborhood {
  final String label;
  final String slug;

  const Neighborhood({
    required this.label,
    required this.slug,
  });

  factory Neighborhood.fromJson(Map<String, dynamic> json) =>
      _$NeighborhoodFromJson(json);

  Map<String, dynamic> toJson() => _$NeighborhoodToJson(this);
}

@JsonSerializable()
class SearchConfig {
  final LatLng? defaultCenter;
  final int? defaultZoom;
  final String? defaultBbox;
  final List<String>? defaultStatus;

  const SearchConfig({
    this.defaultCenter,
    this.defaultZoom,
    this.defaultBbox,
    this.defaultStatus,
  });

  factory SearchConfig.fromJson(Map<String, dynamic> json) =>
      _$SearchConfigFromJson(json);

  Map<String, dynamic> toJson() => _$SearchConfigToJson(this);
}

@JsonSerializable()
class LatLng {
  final double lat;
  final double lng;

  const LatLng({required this.lat, required this.lng});

  factory LatLng.fromJson(Map<String, dynamic> json) =>
      _$LatLngFromJson(json);

  Map<String, dynamic> toJson() => _$LatLngToJson(this);
}

@JsonSerializable()
class ComplianceConfig {
  final String? mlsDisclaimer;
  final String? brokerLicense;
  final String? brokerageName;
  final String? brokerageUrl;
  final String? brokerageEmail;
  final bool? equalHousingLogo;

  const ComplianceConfig({
    this.mlsDisclaimer,
    this.brokerLicense,
    this.brokerageName,
    this.brokerageUrl,
    this.brokerageEmail,
    this.equalHousingLogo,
  });

  factory ComplianceConfig.fromJson(Map<String, dynamic> json) =>
      _$ComplianceConfigFromJson(json);

  Map<String, dynamic> toJson() => _$ComplianceConfigToJson(this);
}

@JsonSerializable()
class FeatureFlags {
  final bool? tourEngine;
  final bool? aiSearch;
  final bool? contactForm;
  final bool? scheduleShowing;

  const FeatureFlags({
    this.tourEngine,
    this.aiSearch,
    this.contactForm,
    this.scheduleShowing,
  });

  factory FeatureFlags.fromJson(Map<String, dynamic> json) =>
      _$FeatureFlagsFromJson(json);

  Map<String, dynamic> toJson() => _$FeatureFlagsToJson(this);
}
