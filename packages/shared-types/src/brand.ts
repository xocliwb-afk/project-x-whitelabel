/**
 * Theme configuration — colors, typography, and border radii.
 * Consumed by Tailwind (web) and ThemeData (Flutter).
 */
export interface ThemeConfig {
  colors: {
    primary: string;
    primaryForeground: string;
    primaryAccent: string;
    background: string;
    surface: string;
    surfaceMuted: string;
    surfaceAccent: string;
    textMain: string;
    textSecondary: string;
    textMuted: string;
    border: string;
    danger: string;
    success: string;
  };
  typography: {
    fontFamily: string;
    baseSizePx: number;
    headingWeight: number;
    bodyWeight: number;
  };
  radius: {
    card: number;
    button: number;
    input: number;
  };
}

/**
 * Full brand configuration for a white-label tenant.
 * Drives identity, theming, contact info, and feature flags
 * across web, mobile, and API surfaces.
 */
export interface BrandConfig {
  /** Display name of the brand/team */
  brandName: string;
  /** Optional tagline */
  brandTagline?: string;
  /** Primary agent/contact name */
  agentName?: string;

  /** Contact information */
  contact: {
    email: string;
    phone?: string;
    address?: string;
  };

  /** Logo configuration */
  logo: {
    /** Logo for light backgrounds */
    url: string;
    /** Logo for dark backgrounds */
    darkUrl?: string;
    /** Logo height in px */
    height: number;
    /** Alt text for accessibility */
    alt: string;
  };

  /** Favicon path */
  favicon?: string;

  /** Visual theme */
  theme: ThemeConfig;

  /** Primary navigation items (label + href, rendered in header) */
  navItems?: Array<{ label: string; href: string }>;

  /** Neighborhood pages (label + slug used for nav and routing) */
  neighborhoods?: Array<{ label: string; slug: string }>;

  /** Default search viewport */
  search?: {
    defaultCenter?: { lat: number; lng: number };
    defaultZoom?: number;
    defaultBbox?: string;
    defaultStatus?: string[];
  };

  /** Compliance and attribution */
  compliance?: {
    mlsDisclaimer?: string;
    brokerLicense?: string;
    brokerageName?: string;
    brokerageUrl?: string;
    brokerageEmail?: string;
    equalHousingLogo?: boolean;
  };

  /** Feature toggles */
  features?: {
    tourEngine?: boolean;
    aiSearch?: boolean;
    contactForm?: boolean;
    scheduleShowing?: boolean;
  };
}
