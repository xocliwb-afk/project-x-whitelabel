Project X: Phase 2 Comprehensive Launch Plan and Technical Architecture Report
1. Executive Charter and Strategic Alignment
1.1 Project Definition and Strategic Mandate
This document serves as the definitive architectural blueprint and execution roadmap for Phase 2 of Project X. Following a rigorous, read-only audit of the existing codebase—specifically focusing on the feat/maplens-overlay-fix branch and the associated documentation—this report synthesizes the strategic requirements into a cohesive technical plan. The overarching mandate for Phase 2 is the transition from a functional prototype to a production-grade "Minimum Viable Product You Actually Use" (MVP-YAU). This distinction is critical; it necessitates a departure from mock data and temporary libraries toward robust, scalable, and user-centric engineering solutions that support real-world real estate transactions.   

The current state of the application, characterized by a Next.js frontend utilizing Mapbox (mapbox-gl) for mapping and mock JSON data for listings, has served its purpose as a proof of concept. However, to meet the business objectives of live lead generation and market validity, a fundamental re-platforming of key subsystems is required. This report outlines the strategy to achieve four primary business outcomes: high-fidelity geospatial interaction via Mapbox, verified data integrity through live IDX integration, automated operational efficiency via Go High Level (GHL) connectivity, and organic market visibility through programmatic SEO.   

1.2 The "MVP You Actually Use" Philosophy
The concept of "MVP You Actually Use" drives every technical decision in this plan. Unlike a traditional MVP, which often sacrifices user experience for speed, an MVP-YAU for a consumer-facing real estate platform must deliver a level of polish and utility that rivals established competitors immediately upon launch. Users in this domain have high expectations established by market leaders; therefore, "visual glitches," "scroll issues," or "iframe-based data loading" are not merely bugs—they are existential threats to adoption.   

Consequently, this plan prioritizes "Deep Visual Polish" in specific high-value areas, particularly the "MapLens" feature. While some aesthetic refinements can be deferred, the core interaction loop—hovering over a map cluster, seeing a synchronized preview, and clicking through to a listing—must be frictionless and intuitive across both desktop and mobile devices. This requires a deterministic approach to state management and UI rendering, which is now centered on the Mapbox implementation.   

1.3 Strategic Technical Pillars
The execution of Phase 2 relies on four foundational technical pillars, each addressing a specific gap identified in the audit:

Geospatial Fidelity (Mapbox Renderer): The audit confirms the current use of Mapbox (mapbox-gl). The previous Leaflet implementation has been removed in favor of Mapbox-only rendering, eliminating the `NEXT_PUBLIC_USE_MAPBOX` toggle. Future changes would require a full migration to another provider rather than a flag flip.   

Data Sovereignty (The "No Iframe" Mandate): Relying on iframes for IDX data is a common shortcut that severs the link between content and SEO authority. Phase 2 mandates a server-side integration where listing data is fetched, normalized, and rendered directly into the DOM. This ensures that Project X owns the search traffic and provides a seamless, fast-loading experience.   

Operational Automation (The GHL Pipeline): Lead generation is futile without effective capture and routing. The current generic webhook implementation is insufficient. The new architecture must implement a strictly typed, schema-compliant integration with Go High Level, ensuring every lead is tagged, piped, and engaged within seconds of submission.   

Search Engine Authority (Programmatic SEO): To compete for organic traffic, the platform cannot be a "black box" of dynamic JavaScript. It must expose its inventory to search crawlers via server-generated metadata, sitemaps, and landing pages for neighborhoods, leveraging the Next.js App Router's capabilities.   

2. Comprehensive Technical Audit (Current State)
2.1 Monorepo Architecture and Build Systems
The project is correctly structured as a modern monorepo managed by Turborepo, providing a solid foundation for code sharing and build orchestration. The directory structure includes apps/web (Next.js 14), apps/api (Express), and packages/shared-types.   

Analysis of Build Integrity: The audit of Code assist output.txt and Codex code review.txt reveals a fragility in the current build process. The primary build gate is the successful execution of pnpm build, which triggers next build for the web app and tsc for the API. However, the reliance on a shared types package (packages/shared-types) introduces a risk of "Type Drift." This occurs when the frontend components evolve to require props that are not yet reflected in the shared interfaces, or vice versa. The audit explicitly notes potential discrepancies in tour-related types between the web store and the API payload definitions.   

Furthermore, the current codebase previously had client-side specific code paths (e.g., window references in map components) that could leak into Server-Side Rendering (SSR) contexts. With Mapbox-only rendering, any remaining browser-only paths must be guarded with useEffect or dynamic imports to keep builds stable. This is a critical blocker that must be resolved before any deployment pipeline can be established.   

2.2 Frontend Application Analysis (apps/web)
The frontend is the most complex component of Project X, housing the map logic, search interface, and state management.

The Geospatial Engine (Mapbox): The current implementation relies on Mapbox (mapbox-gl). The core logic resides in apps/web/hooks/useMapLens.ts, which orchestrates the interaction between the map and the lens overlay. Map rendering and clustering are handled by Mapbox components (`apps/web/components/map/mapbox/MapboxMap.tsx` and `apps/web/components/map/mapbox/LensMiniMapbox.tsx`). Legacy Leaflet portals and components have been removed.   

State Management Dissonance: A critical architectural flaw identified in the audit is the existence of two disparate stores managing "Tour" state.

Legacy Store: Located at src/stores/useTourStore.ts, this store handles a simple planner page logic but posts to an endpoint (/api/v1/tours/plan) with a payload shape that diverges from the shared type definitions.   

MapLens Store: Located at apps/web/stores/useMapLensStore.ts, this store manages the geospatial selection and "locking" of clusters but also attempts to handle tour-related actions. This duplication creates a "split brain" scenario where a user might add a home to a tour in the map view, but that selection is not reflected in the main tour planner. Consolidating this into a single source of truth is a priority for Phase 2.   

Search Infrastructure: The search experience is currently a facade. The SearchLayoutClient and SearchFiltersBar components exist and manage URL state correctly, but they feed into a data fetching layer (lib/api-client.ts) that returns static mock data from apps/web/data/listings.ts. There is no connection to a live backend for search queries, meaning the filters for price, beds, and baths are functional only in the UI but do not actually query a database.   

2.3 Backend Application Analysis (apps/api)
The backend is an Express-based server intended to handle business logic.

Lead Service Limitations: The LeadService is currently configured with a WebhookCrmProvider that is generic and "stubbed." It supports sending a basic JSON payload to a URL but lacks the specific field mapping, authentication headers, and error handling required for a robust Go High Level integration. The leads.route.ts simply passes data through without the rigorous validation or normalization necessary to prevent "garbage in" from polluting the CRM.   

Missing IDX Proxy: The most glaring gap in the backend is the complete absence of an IDX/MLS proxy service. To support the "No Iframe" requirement, the API must act as a gateway, securely holding the IDX API credentials, receiving search parameters from the frontend, querying the IDX provider, normalizing the messy third-party data, and returning clean JSON to the client. This infrastructure does not currently exist in apps/api.   

2.4 The Gap Matrix
The following table synthesizes the findings of the audit into a clear gap analysis, defining the delta between the current codebase and the Phase 2 requirements.

Feature Domain	Current State (Phase 1)	Target State (Phase 2)	Technical Gap & Remediation Strategy
Map Provider	Mapbox (mapbox-gl) with Mapbox-only runtime.	Stable Mapbox renderer with continued performance tuning.	Medium: Maintain Mapbox components, tighten cluster-to-lens sync, and remove remaining legacy assumptions.
MapLens UX	Functional prototype. Poor mobile touch support. Loose state sync.	"MapLens v3" with tight cluster-to-list sync and native mobile gesture handling.	High: Implementation of Mapbox-specific cluster renderers and bi-directional state observers for map pins and list cards.
Search Data	Static Mock JSON (listings.ts).	Live IDX/MLS Feed via API Proxy.	Critical: Construction of ListingService in API. Refactoring frontend api-client to fetch from live endpoints. Implementation of caching.
CRM Integration	Generic Webhook / Null Provider.	Go High Level (GHL) specific integration with custom field mapping.	Medium: Development of GhlCrmProvider. Implementation of GhlPayload schema. Error handling and retry logic.
Tour Logic	Two conflicting stores. Divergent payload types.	Single useTourSessionStore. Unified PlanTourRequest type.	Medium: Deprecate legacy store. Refactor TourBuilderClient and map actions to use the unified store.
SEO	Basic metadata. No dynamic generation.	Dynamic OpenGraph tags. Programmatic Neighborhood pages.	Medium: Implementation of Next.js generateMetadata. Creation of new route handlers for neighborhood slugs.
3. Epic 1: Geospatial Foundation on Mapbox
Objective: Solidify the Mapbox-based mapping engine. This is not a provider migration but continued hardening of the Mapbox implementation to meet performance, density, and UX goals.

3.1 Architectural Trade-offs and Library Selection
Mapbox-gl is already integrated and avoids the prior Leaflet/Google split-brain. It provides performant clustering and familiar interaction patterns without additional provider toggles. Continued work should focus on Mapbox-specific optimizations rather than provider swaps.   

3.2 Execution: Dependency and Component Overhaul
Leaflet, react-leaflet, and markercluster have been removed. Mapbox components (`apps/web/components/map/mapbox/MapboxMap.tsx` and `apps/web/components/map/mapbox/LensMiniMapbox.tsx`) are the single renderer path. Future work centers on Mapbox cluster rendering, touch handling, and performance tuning.

3.3 Refactoring useMapLens: The Core Interaction Engine
The useMapLens hook is the "brain" of the map experience. It now speaks Mapbox (mapbox-gl) and uses Mapbox bounds/cluster data to drive the lens.

Geometry and Bounds Logic: Mapbox provides bounds via `map.getBounds()` returning LngLatBounds-like tuples. We serialize to `swLng,swLat,neLng,neLat` for backend requests.

Transformation: The backend API expects a bounding box in the format `swLng,swLat,neLng,neLat`. We will ensure Mapbox bounds are converted precisely so listings on the edge of the viewport are correctly included or excluded.

The Cluster Interaction Loop: The "MapLens" feature relies on the user hovering over a cluster to see a preview.

Event Listeners: We will attach a mouseover listener to the cluster renderer.

Data Extraction: When triggered, the listener receives a Cluster object. We must extract the underlying markers (listings) from this cluster.

State Update: The extracted data is pushed to the useMapLensStore, setting the activeClusterData.

UI Reaction: The MapLens component, observing the store, renders the overlay. This flow must be optimized to occur within a single React render cycle to prevent the "flicker" or "lag" noted in the Phase 1 audit.   

3.4 Mobile Responsiveness and Gesture Handling
Mobile users present a unique challenge: the conflict between scrolling the page and panning the map.

Gesture Handling: We will explicitly configure the map with gestureHandling: 'cooperative'. This setting requires users to use two fingers to pan the map, allowing single-finger swipes to scroll the page. This prevents the "scroll trap" where a user gets stuck inside the map component while trying to scroll down to the listing details.   

Touch Events: The hover interaction does not exist on touch devices. The useMapLens logic must detect the device capabilities. On touch devices, a "tap" on a cluster should trigger the lens "lock" mode immediately, bypassing the hover state. This ensures the lens is accessible without requiring a mouse.   

3.5 Synchronization: Map, Lens, and List
The "Holy Grail" of this UI is the synchronization between the map markers, the lens overlay, and the side list of cards.   

Mechanism: We will use the Global Store (useMapLensStore) as the central message bus.

Map -> List: Clicking a pin updates selectedListingId. The List component uses a ref map to find the corresponding DOM element and calls scrollIntoView({ behavior: 'smooth' }).

List -> Map: Hovering a card updates hoveredListingId. The Map component listens for this change and triggers a specific animation (e.g., scale up or color change) on the matching marker.

Lens -> Global: Clicking a mini-card in the Lens behaves exactly like clicking a map pin, triggering the full selection flow.

4. Epic 2: Data Architecture and IDX Search Integration
Objective: The goal of this epic is to dismantle the mock data infrastructure and replace it with a robust, secure, and SEO-friendly data pipeline that fetches real-time real estate data without relying on iframes.

4.1 The "No Iframe" Imperative and SEO
The requirement to render listing cards "on your domain (no iframe)" is strategically vital. Iframes hide content from search engines and create a disjointed user experience where navigation state is lost. By fetching raw data and rendering it via React Server Components (RSC) or client-side fetches, Project X retains full control over the DOM. This allows Google to index listing prices, addresses, and descriptions, directly contributing to the domain's SEO authority.   

4.2 API Layer Design: The Backend for Frontend (BFF)
We will architect the apps/api Express application as a secure proxy and transformation layer.

Endpoint Definition: GET /api/listings/search.

Security: The API will hold the IDX_API_KEY and IDX_VENDOR_ID in server-side environment variables. These credentials never leave the server. The frontend simply requests /api/listings/search, and the Express server signs and forwards the request to the upstream IDX provider.   

Data Normalization: IDX feeds are notoriously inconsistent. The ListingService in the API will implement a "sanitization adapter." This adapter maps the vendor-specific fields (e.g., ListPrice, UnparsedAddress) to the clean Listing interface defined in packages/shared-types. This decoupling ensures that if we switch IDX providers in the future, the frontend code remains untouched; only the backend adapter changes.   

4.3 Search State Management
The search experience involves complex state: bounds, filters (price, beds), and sorting.

URL as Source of Truth: We will adopt a URL-driven architecture. The state of the application is defined by the URL query parameters (e.g., ?minPrice=500k&beds=3).

Flow:

User adjusts the price slider in SearchFiltersBar.

The component pushes the new query to the URL via router.push().

The page.tsx (Server Component) or useSWR (Client Hook) detects the URL change.

A request is dispatched to /api/listings/search with the new parameters.

Results are updated. This approach enables users to share search results simply by copying the URL, a critical feature for collaborative home buying.   

4.4 Performance Optimization: Caching Strategy
Real-time search must be fast (<200ms). Fetching from an external IDX provider on every request introduces latency.

Caching Layer: We will implement a short-lived cache (e.g., node-cache or Redis) within the API.

Key Generation: The cache key will be a hash of the query parameters.

TTL: A Time-To-Live of 5-10 minutes is acceptable for real estate data, which doesn't change second-by-second.

Benefit: This protects the IDX provider from rate limits and provides instant responses for popular searches (e.g., default searches for a major city).   

5. Epic 3: Operational Automation (CRM and Lead Engineering)
Objective: To implement a "set it and forget it" lead pipeline that captures user interest and immediately injects it into the Go High Level (GHL) ecosystem for automated nurturing.

5.1 Deep Dive: Go High Level Integration Strategy
Go High Level is not just a database; it's a workflow engine. Our integration must trigger these workflows precisely. The audit reveals that the current "generic webhook" approach is insufficient because it fails to leverage GHL's ability to segment contacts based on tags and custom fields.   

The GHL Payload Schema: We must construct a strictly typed JSON payload that aligns with GHL's inbound webhook expectations.

JSON
{
  "contact": {
    "first_name": "string",
    "last_name": "string",
    "email": "string",
    "phone": "string",
    "tags": ["project-x-lead", "source:website"]
  },
  "customData": {
    "listingId": "string",
    "listingAddress": "string",
    "leadType": "string",
    "message": "string"
  }
}
Separation of Concerns: The contact object maps to GHL's core contact record. The customData object maps to "Custom Fields" we must define in GHL (e.g., Inquired_Property_Address). This separation allows the GHL workflow to say "Thanks for inquiring about {{custom_values.Inquired_Property_Address}}" in an automated SMS.   

5.2 Server-Side Processing and Security
Leads are sensitive data. They must never be posted directly from the browser to GHL.

The Pipeline:

Ingest: The frontend posts to apps/api/leads.

Validate: The API validates the body against the LeadPayload Zod schema. Invalid requests are rejected with 400 Bad Request.

Transform: The GhlCrmProvider transforms the data into the GhlPayload format.

Transmit: The provider POSTs to the secure GHL_WEBHOOK_URL.

Resilience: If GHL returns a 500 error or times out, the API logs the error to a persistent file or monitoring service (e.g., Sentry) but returns a "202 Accepted" to the frontend. This ensures the user sees a "Success" message even if the CRM is momentarily down, preventing user frustration. The failed lead is logged for manual retry.   

5.3 The Unified "Tour" CTA Workflow
Requirement 2.4 calls for a ubiquitous "Schedule a Tour" call to action.

Context Awareness: The LeadCaptureModal must be context-aware.

Global Mode: Triggered from the header. The form simply asks for contact info and preferred times. Payload leadType: "General Tour".

Listing Mode: Triggered from a listing card. The form pre-fills the address. Payload leadType: "Listing Tour", listingAddress: "123 Main St".

Implementation: We will create a TourCtaButton component that accepts an optional listing prop. If present, it hydrates the modal state with that listing's details. This unifies the code paths, reducing maintenance burden.   

6. Epic 4: Unified Tour Scheduling System
Objective: To resolve the technical debt of conflicting state management stores and create a seamless, persistent tour planning experience for the user.

6.1 Resolving the "Two Stores" Conflict
The audit identified a legacy store (src/stores/useTourStore.ts) and a MapLens store (apps/web/stores/useMapLensStore.ts) both attempting to manage tour data. This is a recipe for bugs.

Consolidation: We will deprecate the legacy store entirely.

New Architecture: We will introduce apps/web/stores/useTourSessionStore.ts. This store will be the Single Source of Truth for the user's "Tour Cart."

Persistence: Utilizing zustand/middleware/persist, we will save the tourItems array to the browser's localStorage. This is crucial UX: if a user selects three homes on their phone, closes the tab, and comes back later, those homes should still be in their tour cart.

6.2 The Tour Builder UI Integration
Visual Cues: The ListingCard component will gain an "Add to Tour" toggle button. This button observes useTourSessionStore. If the listing ID exists in the store, the button is active.

Header Integration: The site header will display a dynamic badge on the "Plan a Tour" link, showing the number of saved homes (e.g., "Plan a Tour (3)"). This constant visual reminder encourages the user to complete the conversion action.   

7. Epic 5: SEO and Content Engineering
Objective: To generate indexable, high-quality content that captures long-tail search traffic, moving beyond a simple "app" to a content-rich "platform."

7.1 Next.js Metadata API and OpenGraph
Modern SEO requires more than just meta tags; it requires rich social previews.

Dynamic Generation: In apps/web/app/listing/[id]/page.tsx, we will export the generateMetadata function.

Logic: This function runs on the server. It fetches the listing details (using the same ListingService logic) and returns a metadata object.

Title: {Address} - {City} Real Estate | Project X

OpenGraph: We will set the og:image to the listing's primary photo URL. This ensures that when a link is shared on iMessage, Slack, or Facebook, it unfurls into a beautiful card with the home's photo and price, significantly increasing click-through rates.   

7.2 Programmatic Neighborhood Pages
To capture searches like "Homes for sale in [Neighborhood]", we cannot rely on the generic search page. We need dedicated landing pages.

Architecture: We will create a dynamic route: apps/web/app/neighborhoods/[slug]/page.tsx.

Content Injection: We will create a simple configuration file neighborhoods.json mapping slugs to "Vibe," "Schools," and "Commute" copy.

Pre-filtered Search: The page will render the ListingsList component, but we will pass it a prop to pre-filter the API query by the neighborhood's polygon or zip code. This creates a highly relevant, content-rich landing page that Google loves to index.   

7.3 Sitemap and Robots Strategy
Sitemap Generation: We will implement next-sitemap. This tool scans the app directory to generate entries for static pages. Crucially, we will configure it to also query our API for all active listing IDs and generate dynamic entries (/listing/123). This gives Google a roadmap to crawl our entire inventory, not just the homepage.

Robots.txt: We will configure robots.txt to Allow: / but Disallow: /api/ and Disallow: /_next/. This focuses the crawler's budget on content pages rather than backend routes or build artifacts.   

8. Epic 6: Infrastructure, Deployment, and Launch Protocol
Objective: To establish a secure, performant, and cost-effective hosting environment that supports the technical requirements of a Next.js/Express monorepo.

8.1 Hosting Strategy: The Hybrid Vercel/Railway Model
The snippets and industry best practices suggest that a monolithic hosting approach is suboptimal for this stack.   

Frontend (Vercel): We will deploy apps/web to Vercel.

Reasoning: Vercel offers unrivaled optimization for Next.js, including automatic image optimization, edge caching for static assets, and seamless ISR support. It handles the "frontend" concerns perfectly.   

Backend (Railway): We will deploy apps/api to Railway.

Reasoning: The Express API requires a long-running Node.js process to handle database connections (future-proofing) and consistent memory state. Vercel's serverless functions have timeout limits (10s-60s) that can be risky for complex external API calls. Railway provides a containerized environment where the Express app can run continuously, offering better performance consistency and no "cold starts" for the API.   

8.2 CI/CD Pipeline Configuration
We will utilize the turbo.json configuration to orchestrate builds.

Vercel Pipeline: Connected to the GitHub repo.

Command: cd apps/web && pnpm build. Vercel automatically detects the Next.js app.

Environment: Production keys for Google Maps and GA4.

Railway Pipeline: Connected to the same GitHub repo.

Command: pnpm build --filter=api.

Start Command: node apps/api/dist/server.js.

Environment: Production keys for IDX, GHL Webhook, and CORS settings.

8.3 The "Smoke Test" Launch Protocol
To ensure a successful launch, we define a rigorous post-deployment verification procedure.

The "Lead Flow" Verification:

Action: Visit the production URL. Click "Plan a Tour". Submit the form with the email test+launch@project-x.com.

Success Condition: The user receives a UI success message. Within 5 seconds, the contact appears in the Go High Level dashboard with the tag ProjectX and is assigned to the correct pipeline stage.   

The "MapLens" Verification:

Action: On a mobile device, search for a zip code. Tap a cluster.

Success Condition: The Lens overlay appears immediately. Tapping a listing in the lens navigates to the listing detail page. No "scroll trapping" occurs.

The "SEO" Verification:

Action: Paste a listing URL into the "Facebook Sharing Debugger" or "Slack".

Success Condition: The preview card renders with the correct listing photo and price, confirming the OpenGraph metadata is working.   

9. Conclusion
This comprehensive plan addresses every gap identified in the Phase 1 audit. By aggressively migrating to Google Maps, we ensure the "MapLens" feature meets the "MVP You Actually Use" standard. By re-architecting the data layer to avoid iframes, we secure our SEO future. And by implementing a robust, schema-driven GHL integration, we transform the platform from a simple website into a lead-generating engine. The hybrid hosting strategy ensures we leverage the best of breed infrastructure for both frontend speed and backend stability. Phase 2 is not just an update; it is the maturation of Project X into a viable commercial product.

Prepared By: Senior Technical Lead & Product Architect For: Project X Stakeholders Date: Phase 2 Execution Kickoff



PHASE 2 OUTLINE.txt


Gemini 3.0 Phase 2 plan.txt

help.gohighlevel.com
Workflow Action - Custom webhook - HighLevel Support Portal
Opens in a new window


Codex code review.txt

dev.to
How to Build a Monorepo with Next.js - DEV Community
Opens in a new window

content.red-badger.com
The key advantages of using a monorepo
Opens in a new window

wisp.blog
Best Places to Host Next.js Apps in 2025: A Comprehensive Guide - Wisp CMS
Opens in a new window

serveravatar.com
Top 7 Node.js Hosting Platforms to Use in 2025 - ServerAvatar
Opens in a new window

marketplace.gohighlevel.com
Webhook Integration Guide | HighLevel API - GoHighLevel Marketplace
Opens in a new window

render.com
Render vs Vercel
Opens in a new window

northflank.com
Render vs Vercel (2025): Which platform suits your app architecture better? | Blog
Opens in a new window

docs.railway.com
Railway vs. Vercel | Railway Docs
