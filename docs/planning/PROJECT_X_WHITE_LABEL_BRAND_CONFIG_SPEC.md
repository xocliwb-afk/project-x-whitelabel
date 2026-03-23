# Project X White Label — Brand Config Spec

**Last Updated:** 2026-03-23

---

## 1. Current State

> **`config/brand.json` is the canonical brand config.** `config/theme.json` is legacy and will be superseded in Epic 1.

Brand identity is currently split across:

| Location | What's There | Problem |
|----------|-------------|---------|
| `config/theme.json` | Colors, typography, radius, logo, brandName | Good start but incomplete |
| `apps/web/app/layout.tsx` | Hardcoded "Brandon Wilcox Home Group" in metadata | Should come from config |
| `apps/web/components/Header.tsx` | Hardcoded brand name and logo alt text | Should come from config |
| `apps/web/components/Footer.tsx` | Hardcoded name, email, copyright | Should come from config |
| `apps/web/components/Navbar.tsx` | Hardcoded "Brandon Wilcox Home Group" | Should come from config |
| `apps/web/components/LeadForm.tsx` | `talk-to-brandon` intent | Should be generic |
| `apps/web/components/LeadModalContainer.tsx` | `talk-to-brandon` intent, "Talk to Brandon" label | Should come from config |
| `apps/web/stores/useLeadModalStore.ts` | `talk-to-brandon` type union | Should be generic |
| `apps/web/next.config.js` | Michigan neighborhood slugs | Should be config-driven |

## 2. Target Brand Config Model

### `config/brand.json` (New — replaces and extends theme.json)

```typescript
type BrandConfig = {
  // Identity
  brandName: string;           // "Acme Real Estate"
  brandTagline?: string;       // "Your Dream Home Awaits"
  agentName?: string;          // "Jane Smith" (primary contact name)

  // Contact
  contact: {
    email: string;             // "jane@acmerealty.com"
    phone?: string;            // "(555) 123-4567"
    address?: string;          // "123 Main St, Anytown, USA"
  };

  // Assets
  logo: {
    lightUrl: string;          // Logo for light backgrounds
    darkUrl?: string;          // Logo for dark backgrounds
    height: number;            // px
    alt: string;               // Alt text
  };
  favicon?: string;

  // Theme (colors, typography, radius)
  theme: {
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
  };

  // Search defaults
  search?: {
    defaultCenter?: { lat: number; lng: number };
    defaultZoom?: number;
    defaultBbox?: string;
    defaultStatus?: string[];
  };

  // Compliance / attribution
  compliance?: {
    mlsDisclaimer?: string;
    brokerLicense?: string;
    equalHousingLogo?: boolean;
  };

  // Feature flags
  features?: {
    tourEngine?: boolean;
    aiSearch?: boolean;
    contactForm?: boolean;
    scheduleShowing?: boolean;
  };
};
```

## 3. What Belongs Where

| Data | Location | Why |
|------|----------|-----|
| Brand name, colors, logo, fonts | `config/brand.json` | Public, safe, drives UI |
| API keys, tokens, passwords | `.env` / runtime secrets | Never in brand config |
| CRM provider selection | `.env` (`LEAD_PROVIDER`) | Operational, not brand |
| Data provider selection | `.env` (`DATA_PROVIDER`) | Operational, not brand |
| MLS credentials | `.env` | Secrets |
| Neighborhood/area slugs | Brand config or separate content config | Content, not hardcoded |
| Marketing page content | Static HTML or separate CMS | Not in brand config |

## 4. How Web Consumes Brand Config

1. `config/brand.json` is read at build time by `tailwind.config.ts` (already works for theme.json)
2. Brand identity fields exposed via a `BrandProvider` React context or direct import
3. Components read brand name, contact info, logo from provider — never hardcoded
4. `app/layout.tsx` metadata reads from brand config
5. Lead form intents use generic labels like "talk-to-agent" (not "talk-to-brandon")

## 5. How Mobile Consumes Brand Config

1. Brand config served via API endpoint (`GET /api/brand`) or bundled at build time
2. Flutter reads config and applies to `ThemeData` + brand display widgets
3. Same canonical `BrandConfig` type shared across surfaces

## 6. What Is Explicitly Out of Scope for V1

- Multi-tenant brand switching at runtime (V1 is single-tenant, file-based)
- Brand config admin UI
- Dynamic asset uploading
- Per-page content configuration (beyond feature flags)
- Marketing page CMS integration
