PHASE 2 — BEFORE WEBSITE LAUNCH (MVP YOU ACTUALLY USE)
The goal of this phase:
Search live on your domain + lead capture + Go High Level + first SEO pages.

2.2 MapLens (Functional)
    • MapLens v3 working on Google Maps
    • Cluster → lens → list selection sync
    • No obvious visual glitches / scroll issues
(Deep visual polish can happen later; here it just needs to look and feel intentional.)
2.3 Core IDX Search
    • Map + list search
    • Filters (price, beds, baths, type, etc.)
    • Mobile-responsive layout
    • Listing cards rendered on your domain (no iframe)
2.4 Global “Set up a tour” CTA + Lead Form
    • PDP: “Schedule a tour”
    • (Later: tour panel hookup, but panel itself can be minimal or hidden at launch)
    • Header (no homes selected): “Plan a tour”
    • All use the same custom form UI (your design)
2.5 Leads API + Go High Level Integration
    • /api/leads:
        ◦ Accepts normalized LeadPayload (name, contact, source, listings, prefs)
        ◦ Saves the lead
        ◦ (Optionally) auto-creates a draft Tour record in the background for you
    • Server-side push of each lead into Go High Level:
        ◦ Correct fields & tags (source, area, listings)
    • Basic GHL workflows:
        ◦ Tag as ProjectX
        ◦ Drop into “Buyer – Project X” pipeline
        ◦ Initial text/email + follow-up sequence
2.6 Website Polish + Initial SEO Pages
    • Clean Home, About, “Work with me” pages
    • First batch of neighborhood pages:
        ◦ Real copy (schools, vibe, commute, etc.)
        ◦ Live listing cards pulled from your own API (no iframe)
    • Solid page titles, meta, and internal linking
2.7 LAUNCH
    • Project X is the live search on your domain
    • You use the site + custom forms with real buyers
    • All lead activity flows into Go High Level
