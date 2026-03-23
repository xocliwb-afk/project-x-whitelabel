// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'brand_config.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

BrandConfig _$BrandConfigFromJson(Map<String, dynamic> json) => BrandConfig(
      brandName: json['brandName'] as String,
      brandTagline: json['brandTagline'] as String?,
      agentName: json['agentName'] as String?,
      contact:
          BrandContact.fromJson(json['contact'] as Map<String, dynamic>),
      logo: BrandLogo.fromJson(json['logo'] as Map<String, dynamic>),
      favicon: json['favicon'] as String?,
      theme: ThemeConfig.fromJson(json['theme'] as Map<String, dynamic>),
      navItems: (json['navItems'] as List<dynamic>?)
          ?.map((e) => NavItem.fromJson(e as Map<String, dynamic>))
          .toList(),
      neighborhoods: (json['neighborhoods'] as List<dynamic>?)
          ?.map((e) => Neighborhood.fromJson(e as Map<String, dynamic>))
          .toList(),
      search: json['search'] == null
          ? null
          : SearchConfig.fromJson(json['search'] as Map<String, dynamic>),
      compliance: json['compliance'] == null
          ? null
          : ComplianceConfig.fromJson(
              json['compliance'] as Map<String, dynamic>),
      features: json['features'] == null
          ? null
          : FeatureFlags.fromJson(json['features'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$BrandConfigToJson(BrandConfig instance) =>
    <String, dynamic>{
      'brandName': instance.brandName,
      'brandTagline': instance.brandTagline,
      'agentName': instance.agentName,
      'contact': instance.contact.toJson(),
      'logo': instance.logo.toJson(),
      'favicon': instance.favicon,
      'theme': instance.theme.toJson(),
      'navItems': instance.navItems?.map((e) => e.toJson()).toList(),
      'neighborhoods': instance.neighborhoods?.map((e) => e.toJson()).toList(),
      'search': instance.search?.toJson(),
      'compliance': instance.compliance?.toJson(),
      'features': instance.features?.toJson(),
    };

BrandContact _$BrandContactFromJson(Map<String, dynamic> json) =>
    BrandContact(
      email: json['email'] as String,
      phone: json['phone'] as String?,
      address: json['address'] as String?,
    );

Map<String, dynamic> _$BrandContactToJson(BrandContact instance) =>
    <String, dynamic>{
      'email': instance.email,
      'phone': instance.phone,
      'address': instance.address,
    };

BrandLogo _$BrandLogoFromJson(Map<String, dynamic> json) => BrandLogo(
      url: json['url'] as String,
      darkUrl: json['darkUrl'] as String?,
      height: (json['height'] as num).toInt(),
      alt: json['alt'] as String,
    );

Map<String, dynamic> _$BrandLogoToJson(BrandLogo instance) =>
    <String, dynamic>{
      'url': instance.url,
      'darkUrl': instance.darkUrl,
      'height': instance.height,
      'alt': instance.alt,
    };

ThemeConfig _$ThemeConfigFromJson(Map<String, dynamic> json) => ThemeConfig(
      colors:
          ThemeColors.fromJson(json['colors'] as Map<String, dynamic>),
      typography: ThemeTypography.fromJson(
          json['typography'] as Map<String, dynamic>),
      radius:
          ThemeRadius.fromJson(json['radius'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$ThemeConfigToJson(ThemeConfig instance) =>
    <String, dynamic>{
      'colors': instance.colors.toJson(),
      'typography': instance.typography.toJson(),
      'radius': instance.radius.toJson(),
    };

ThemeColors _$ThemeColorsFromJson(Map<String, dynamic> json) => ThemeColors(
      primary: json['primary'] as String,
      primaryForeground: json['primaryForeground'] as String,
      primaryAccent: json['primaryAccent'] as String,
      background: json['background'] as String,
      surface: json['surface'] as String,
      surfaceMuted: json['surfaceMuted'] as String,
      surfaceAccent: json['surfaceAccent'] as String,
      textMain: json['textMain'] as String,
      textSecondary: json['textSecondary'] as String,
      textMuted: json['textMuted'] as String,
      border: json['border'] as String,
      danger: json['danger'] as String,
      success: json['success'] as String,
    );

Map<String, dynamic> _$ThemeColorsToJson(ThemeColors instance) =>
    <String, dynamic>{
      'primary': instance.primary,
      'primaryForeground': instance.primaryForeground,
      'primaryAccent': instance.primaryAccent,
      'background': instance.background,
      'surface': instance.surface,
      'surfaceMuted': instance.surfaceMuted,
      'surfaceAccent': instance.surfaceAccent,
      'textMain': instance.textMain,
      'textSecondary': instance.textSecondary,
      'textMuted': instance.textMuted,
      'border': instance.border,
      'danger': instance.danger,
      'success': instance.success,
    };

ThemeTypography _$ThemeTypographyFromJson(Map<String, dynamic> json) =>
    ThemeTypography(
      fontFamily: json['fontFamily'] as String,
      baseSizePx: (json['baseSizePx'] as num).toInt(),
      headingWeight: (json['headingWeight'] as num).toInt(),
      bodyWeight: (json['bodyWeight'] as num).toInt(),
    );

Map<String, dynamic> _$ThemeTypographyToJson(ThemeTypography instance) =>
    <String, dynamic>{
      'fontFamily': instance.fontFamily,
      'baseSizePx': instance.baseSizePx,
      'headingWeight': instance.headingWeight,
      'bodyWeight': instance.bodyWeight,
    };

ThemeRadius _$ThemeRadiusFromJson(Map<String, dynamic> json) => ThemeRadius(
      card: (json['card'] as num).toInt(),
      button: (json['button'] as num).toInt(),
      input: (json['input'] as num).toInt(),
    );

Map<String, dynamic> _$ThemeRadiusToJson(ThemeRadius instance) =>
    <String, dynamic>{
      'card': instance.card,
      'button': instance.button,
      'input': instance.input,
    };

NavItem _$NavItemFromJson(Map<String, dynamic> json) => NavItem(
      label: json['label'] as String,
      href: json['href'] as String,
    );

Map<String, dynamic> _$NavItemToJson(NavItem instance) => <String, dynamic>{
      'label': instance.label,
      'href': instance.href,
    };

Neighborhood _$NeighborhoodFromJson(Map<String, dynamic> json) =>
    Neighborhood(
      label: json['label'] as String,
      slug: json['slug'] as String,
    );

Map<String, dynamic> _$NeighborhoodToJson(Neighborhood instance) =>
    <String, dynamic>{
      'label': instance.label,
      'slug': instance.slug,
    };

SearchConfig _$SearchConfigFromJson(Map<String, dynamic> json) =>
    SearchConfig(
      defaultCenter: json['defaultCenter'] == null
          ? null
          : LatLng.fromJson(json['defaultCenter'] as Map<String, dynamic>),
      defaultZoom: (json['defaultZoom'] as num?)?.toInt(),
      defaultBbox: json['defaultBbox'] as String?,
      defaultStatus: (json['defaultStatus'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList(),
    );

Map<String, dynamic> _$SearchConfigToJson(SearchConfig instance) =>
    <String, dynamic>{
      'defaultCenter': instance.defaultCenter?.toJson(),
      'defaultZoom': instance.defaultZoom,
      'defaultBbox': instance.defaultBbox,
      'defaultStatus': instance.defaultStatus,
    };

LatLng _$LatLngFromJson(Map<String, dynamic> json) => LatLng(
      lat: (json['lat'] as num).toDouble(),
      lng: (json['lng'] as num).toDouble(),
    );

Map<String, dynamic> _$LatLngToJson(LatLng instance) => <String, dynamic>{
      'lat': instance.lat,
      'lng': instance.lng,
    };

ComplianceConfig _$ComplianceConfigFromJson(Map<String, dynamic> json) =>
    ComplianceConfig(
      mlsDisclaimer: json['mlsDisclaimer'] as String?,
      brokerLicense: json['brokerLicense'] as String?,
      brokerageName: json['brokerageName'] as String?,
      brokerageUrl: json['brokerageUrl'] as String?,
      brokerageEmail: json['brokerageEmail'] as String?,
      equalHousingLogo: json['equalHousingLogo'] as bool?,
    );

Map<String, dynamic> _$ComplianceConfigToJson(ComplianceConfig instance) =>
    <String, dynamic>{
      'mlsDisclaimer': instance.mlsDisclaimer,
      'brokerLicense': instance.brokerLicense,
      'brokerageName': instance.brokerageName,
      'brokerageUrl': instance.brokerageUrl,
      'brokerageEmail': instance.brokerageEmail,
      'equalHousingLogo': instance.equalHousingLogo,
    };

FeatureFlags _$FeatureFlagsFromJson(Map<String, dynamic> json) =>
    FeatureFlags(
      tourEngine: json['tourEngine'] as bool?,
      aiSearch: json['aiSearch'] as bool?,
      contactForm: json['contactForm'] as bool?,
      scheduleShowing: json['scheduleShowing'] as bool?,
    );

Map<String, dynamic> _$FeatureFlagsToJson(FeatureFlags instance) =>
    <String, dynamic>{
      'tourEngine': instance.tourEngine,
      'aiSearch': instance.aiSearch,
      'contactForm': instance.contactForm,
      'scheduleShowing': instance.scheduleShowing,
    };
