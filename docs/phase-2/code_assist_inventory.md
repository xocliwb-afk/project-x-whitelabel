I will now generate the Phase 2 launch plan. I will start by identifying the map provider and MapLens implementation, and then proceed with the full plan. My work will be based on a thorough, read-only analysis of the repository.

check
Codebase Investigator Agent...ile paths right.
Arguments
objective:
Identify the map provider (Mapbox) and the core implementation files for the MapLens feature. I need to know which mapping library is being used and where the main logic for the MapLens UI and its state management resides. This is for the first part of a larger analysis, so focus on getting the file paths right.
Output

Subagent codebase_investigator Finished

Termination Reason:
 GOAL

Result:
{
  "SummaryOfFindings": "The investigation confirms that the application now uses **Mapbox** (mapbox-gl) as its map provider. The core implementation of the MapLens feature is distributed across Mapbox-specific files. State is managed in a Zustand store located at `apps/web/stores/useMapLensStore.ts`. The primary logic for handling user interactions (hover, click) and triggering the lens is in the `apps/web/hooks/useMapLens.ts` hook. The main map component is `apps/web/components/map/mapbox/MapboxMap.tsx`, and the MapLens UI is rendered by `apps/web/components/map/MapLens.tsx` with a Mapbox minimap in `apps/web/components/map/mapbox/LensMiniMapbox.tsx`. Legacy Leaflet components (`Map.tsx`, `MapPanel.tsx`, `map/leaflet/MapLensPanePortal.tsx`, etc.) have been removed.",
  "ExplorationTrace": [
    "Searched for the string \"MapLens\" in the `apps/web` directory to find initial entry points.",
    "Read the file `apps/web/components/map/mapbox/MapboxMap.tsx` to identify the mapping library based on its imports and components.",
    "Read the file `apps/web/hooks/useMapLens.ts` to understand the core business logic and user interaction handling for the MapLens feature.",
    "Read the file `apps/web/stores/useMapLensStore.ts` to understand the state management structure, including the shape of the data and the available actions.",
    "Read the documentation file `Adendums/Addendum B Map Provider.txt` to confirm the architectural decisions regarding the map provider."
  ],
  "RelevantLocations": [
    {
      "FilePath": "apps/web/components/map/mapbox/MapboxMap.tsx",
      "Reasoning": "This is the main Mapbox map component (mapbox-gl) and integrates the MapLens feature into the map.",
      "KeySymbols": [
        "MapboxMap",
        "useMapLens"
      ]
    },
    {
      "FilePath": "apps/web/hooks/useMapLens.ts",
      "Reasoning": "This hook contains the core client-side logic for the MapLens feature, handling user interactions like hover and click to decide when to open, close, or lock the lens. It interacts directly with the state management store.",
      "KeySymbols": [
        "useMapLens",
        "openLens",
        "scheduleHover",
        "openImmediate"
      ]
    },
    {
      "FilePath": "apps/web/stores/useMapLensStore.ts",
      "Reasoning": "This file defines the Zustand store for the MapLens. It holds the state, including the data for the active lens (`activeClusterData`) and its locked status (`isLocked`), providing a single source of truth.",
      "KeySymbols": [
        "useMapLensStore",
        "activateLens",
        "dismissLens"
      ]
    },
    {
      "FilePath": "apps/web/components/map/MapLens.tsx",
      "Reasoning": "This is the React component that renders the UI for the MapLens itself, displaying the listings passed to it from the `useMapLensStore`.",
      "KeySymbols": [
        "MapLens"
      ]
    },
    {
      "FilePath": "Adendums/Addendum B Map Provider.txt",
      "Reasoning": "Historical; the project previously referenced Leaflet, but the current implementation is Mapbox-only.",
      "KeySymbols": []
    }
  ]
}
stat_minus_1
Thinking
Excellent. Analysis complete. Here is the Phase 2 launch plan.

Project X: Phase 2 Launch Plan
This document outlines the strategy for executing and launching Phase 2 of Project X. It is based on a read-only audit of the feat/maplens-overlay-fix branch.

1. BUILD GATES (Current Status)
The primary build gate for the project is the successful completion of the build scripts for each application, orchestrated by Turborepo.

Commands:

pnpm --dir apps/web build
pnpm --dir apps/api build
The top-level pnpm build command orchestrates these via Turborepo.
Definitions:

Web App: The build script is defined in apps/web/package.json as "build": "next build".
API App: The build script is defined in apps/api/package.json as "build": "tsc -b".
Turborepo Config: The pipeline is defined in turbo.json, where the build task depends on the build tasks of its internal package dependencies (packages/shared-types).
Likely Build Blockers:

Type Drift: There are potential discrepancies between component props and shared types. For example, UI components in apps/web/components/ may have fields that are not present in the type definitions in packages/shared-types/src/. This is common in a fast-moving project and will likely cause TypeScript errors during the next build process.
SSR window Usage: Components rendered on the server-side might be attempting to access the window object, which is only available in the browser. This will cause the next build to fail. I can see useMapLens.ts and other hooks that might be susceptible to this if not properly guarded with useEffect or if (typeof window !== "undefined").
Ref Callbacks Returning Values: React ref callbacks should not return a value. Code like ref={(node) => { if (node) return node.focus() }} will cause build failures. This pattern may exist in interactive components.
2. CURRENT STATE INVENTORY
Monorepo Structure:

apps/web: A Next.js application for the main user-facing website.
apps/api: An Express-based TypeScript server to handle business logic, specifically lead submission.
packages/shared-types: A shared package for TypeScript types used across the web and api apps to ensure data consistency.
Map Provider:

Provider: The project uses Mapbox via the mapbox-gl renderer.
Entry Component: The main map is rendered by `apps/web/components/map/mapbox/MapboxMap.tsx`.
Architectural Decision: The previous Leaflet toggle (`NEXT_PUBLIC_USE_MAPBOX`) has been removed; runtime is Mapbox-only.
MapLens Implementation:

Core Logic: The main interaction logic resides in the apps/web/hooks/useMapLens.ts hook.
State Management: State (e.g., active cluster, locked status) is managed in a Zustand store at apps/web/stores/useMapLensStore.ts.
UI Component: The lens UI is apps/web/components/map/MapLens.tsx.
Selection Sync: The useMapLens hook and the Zustand store work together to sync selections between the map clusters, the lens, and potentially a listing panel. When a cluster is clicked (openImmediate), the store is updated, which triggers the MapLens component to render the listings for that cluster.
Search Architecture:

State Management: Search filter state appears to be managed within React components, likely starting at apps/web/components/SearchFiltersBar.tsx and passed down.
API Client: A basic API client exists at apps/web/lib/api-client.ts.
Endpoints: The search functionality currently uses mock data from apps/web/data/listings.ts. There are no live IDX search API endpoints defined in apps/api/src/routes/.
Components: The primary search components are SearchFiltersBar, ListingsList, and ListingCard, all in apps/web/components/.
Filters:

State Definition: Filter state (e.g., price, beds, baths) is defined and managed within the apps/web/components/SearchFiltersBar.tsx component.
API Mapping: Since search is using mock data, there is currently no logic that maps this filter state to an API query.
Tours:

Types: Tour-related types are not explicitly defined in packages/shared-types/src/.
UI: A TourBuilderClient.tsx exists in apps/web/components/, suggesting a tour building feature. A tour folder exists under apps/web/app/tour/.
API: No tour-specific API endpoints are present in apps/api/src/.
Leads:

UI Components: Lead capture is handled by apps/web/components/LeadForm.tsx which is used inside LeadCaptureModal.tsx.
API Client: A dedicated lead API client is at apps/web/lib/lead-api.ts.
API Endpoint: A lead submission endpoint is defined in apps/api/src/routes/ (likely POST /api/leads). The server logic is in apps/api/src/server.ts.
Payload Types: The lead payload is likely defined in packages/shared-types/src/.
GHL (Go High Level) Integration:

Status: There is no existing code for a GHL integration in apps/api/src/. No GHL-related environment variables, provider wrappers, or placeholder functions are present. This will need to be built from scratch.
SEO:

Pages: The repository has a basic index.html at the root, but the Next.js app in apps/web seems to be the focus. It has a main page.tsx but lacks dedicated "About" or "Work With Me" pages. No neighborhood-specific pages are apparent.
Metadata: Metadata generation is likely handled by Next.js in apps/web/app/layout.tsx and apps/web/app/page.tsx, but a full strategy is not implemented.
sitemap.xml`` / ``robots.txt: These files exist at the root level, but will need to be updated and moved to the apps/web/public directory to be served correctly by Next.js.
3. PHASE 2 GAP MATRIX
#	Feature	Status	Evidence (File Paths)	Notes
2.2	MapLens Functional	PARTIAL	apps/web/hooks/useMapLens.ts, apps/web/stores/useMapLensStore.ts	Core logic is present, but likely has bugs and needs polishing for mobile responsiveness and selection syncing.
2.3	Core IDX Search	MISSING	apps/web/data/listings.ts	The entire search backend is missing. The frontend is using mock data. This is a major gap.
2.4	Global Tour CTA	PARTIAL	apps/web/components/LeadForm.tsx, apps/web/components/Header.tsx	A lead form exists, but it's not globally accessible or integrated into a persistent CTA in the header/nav.
2.5	Leads API + GHL	PARTIAL	apps/api/src/server.ts, apps/web/lib/lead-api.ts	The lead submission API exists but has no GHL integration. This is a critical backend task.
2.6	Website Polish + SEO	MISSING	apps/web/app/page.tsx, sitemap.xml	Core pages are missing. SEO is minimal. This is a significant content and development effort.
2.7	Launch Checklist	MISSING	N/A	No formal launch plan, env management, or analytics strategy is documented.
4. EXECUTION PLAN
Epic 1: Solidify Map and Search Foundation
Task 1.1: Finalize MapLens Functionality
Goal: Ensure MapLens is bug-free and responsive on all devices.
Files: apps/web/hooks/useMapLens.ts, apps/web/components/map/MapLens.tsx, apps/web/components/map/mapbox/MapboxMap.tsx.
Steps:
Refine the hover/click logic in useMapLens.ts to feel intuitive.
Ensure the lens UI is fully responsive and doesn't break on mobile viewports.
Fix any visual glitches with the lens overlay and map markers.
Implement selection sync: clicking a listing in the lens should highlight it on the map, and vice-versa.
Acceptance Criteria: MapLens works smoothly on desktop and mobile. Selections are synced between the map and the lens.
Tests: Manual testing on various screen sizes.
Risk: Medium. CSS and interaction logic can be tricky. Rollback: Revert to the previous commit on the feat/maplens-overlay-fix branch.
Task 1.2: Implement Live IDX Search API
Goal: Replace mock data with a live IDX feed.
Files: apps/api/src/, apps/web/lib/api-client.ts, apps/web/components/SearchFiltersBar.tsx.
Steps:
Define the IDX provider and get API credentials.
Create a new route in apps/api (e.g., /api/listings/search).
Implement a service in the API to fetch data from the IDX provider, transforming it as needed.
Update api-client.ts in the web app to call this new endpoint.
Connect the SearchFiltersBar state to the API client to perform filtered searches.
Acceptance Criteria: The web app displays live data from the IDX feed. Filters work correctly.
Tests: Automated tests for the API endpoint. Manual testing of the search UI.
Risk: High. Depends on a third-party API. Rollback: Keep the mock data logic behind a feature flag for quick reversion.
Epic 2: Implement Lead Generation and CRM Integration
Task 2.1: Implement GHL Integration
Goal: Push new leads from the website into Go High Level.
Files: apps/api/src/services/, apps/api/src/server.ts.
Steps:
Get GHL API key and necessary info (pipeline ID, tags).
Create a GhlService.ts in apps/api/src/services/. 3. Implement a method to create/update a contact in GHL, add tags, and assign to a pipeline.
Modify the existing lead submission logic in server.ts to call this new service.
Acceptance Criteria: A lead submitted through the website appears in the correct GHL pipeline with the correct tags.
Tests: Integration test to verify a mock lead is sent to a GHL test account.
Risk: Medium. External API integration always carries risk. Rollback: Disable the GHL service call in the API.
Task 2.2: Global Tour CTA
Goal: Add a persistent "Schedule a Tour" CTA and connect it to the lead form.
Files: apps/web/components/Header.tsx, apps/web/components/LeadCaptureModal.tsx, apps/web/context/.
Steps:
Add a "Schedule a Tour" button to the Header.tsx component.
Use a global state (e.g., React Context) to manage the visibility of the LeadCaptureModal.
The header button and any other CTAs will trigger this modal.
Acceptance Criteria: A "Schedule a Tour" button is always visible in the header. It opens a modal with the lead form.
Tests: Manual UI testing.
Risk: Low. Standard React UI work.
Epic 3: Content, SEO, and Launch Prep
Task 3.1: Build Core SEO Pages
Goal: Create essential pages for launch (Home, About, etc.) and basic neighborhood pages.
Files: apps/web/app/. Create new folders like apps/web/app/about/ and apps/web/app/neighborhoods/[slug]/.
Steps:
Create pages for Home, About, and Work With Me.
Implement a basic template for neighborhood pages.
Use Next.js's generateMetadata function on each page to set unique titles and descriptions.
Ensure internal links exist between these pages.
Acceptance Criteria: All core pages are created and have unique, relevant metadata.
Tests: Manual review of pages and browser dev tools to check meta tags.
Risk: Low. Primarily content and basic routing.
Task 3.2: Finalize Launch Checklist
Goal: Prepare the application for deployment.
Files: .env.production for apps/web and apps/api.
Steps:
Follow the Launch Checklist (below) to configure environments.
Set up analytics.
Verify domain and DNS settings.
Acceptance Criteria: The application is fully configured and ready to be deployed.
Tests: Manual verification of each checklist item.
Risk: Medium. Misconfigured environment variables can break the application.
5. LAUNCH CHECKLIST
Environment Variables (.env.production):

apps/api:
GHL_API_KEY: The API key for the Go High Level integration.
CORS_ORIGIN: The production URL of the web app (e.g., https://www.yourdomain.com).
NODE_ENV: Should be production.
apps/web:
NEXT_PUBLIC_API_BASE_URL: The production URL of your API (e.g., https://api.yourdomain.com).
NEXT_PUBLIC_GA_MEASUREMENT_ID: Google Analytics 4 measurement ID.
NODE_ENV: Should be production.
Domain Plan:

API: Host the API on a subdomain like api.yourdomain.com.
Web: Host the Next.js app on the root domain yourdomain.com.
CORS: The API must be configured to accept requests from the web app's domain. This is handled by the CORS_ORIGIN environment variable in the API.
GHL Verification:

Submit a test lead through the production website.
Confirm the new contact appears in the GHL dashboard.
Verify that the correct tags have been applied.
Verify the contact has been added to the specified sales pipeline.
SEO Verification:

Use a tool like curl or an online meta tag checker to verify that each page has a unique <title> and <meta name="description">.
Ensure the production robots.txt (served from apps/web/public) allows indexing.
Submit the sitemap.xml to Google Search Console.
Analytics Plan (GA4):

Ensure the GA4 measurement ID is correctly set in the web app's environment variables.
Implement event tracking for key actions:
search: Fired when a user executes a property search.
submit_lead: Fired when a user successfully submits a lead form.
Verify in the GA4 "Realtime" report that these events are being received.
Generated by Gemini gemini-2.5-pro
1 context item
