# Order Envy — TODO

## Next up
- [x] **Restaurant ownership & menu edit permissions** — shipped in 1.0.4 (verified claim deferred; see Business / restaurants)

## Auth
- [x] Sign in with Google — OAuth login and account creation (mobile + API)
- [ ] Sign in with Apple — OAuth login and account creation (mobile + API)

## Mobile (planned)
- [x] Merge/deploy list `userAverageRating` API (sort by rating without N+1 detail fetches)
- [x] Add / edit restaurant
- [x] Add / edit menu item
- [x] Open restaurant address in Maps / GPS (share or deep link to Apple Maps, Google Maps, etc.)
- [x] Friends and recommendations — requests, recommend flows, list + detail recs, friend recommendations on restaurant list (matches web)

## Mobile (future)
- [x] App versioning — minimum version checks, CI gates, block saves when client/API mismatch (see BoundForTheRoad)
- [x] Offline mode — read cache, write queue, auto-sync, cache repair on sync, logout cleanup *(phase 2: conflict handling / friends offline writes deferred)*
- [x] Settings screen — replace main-header logout with a gear icon; move log out (and account/profile actions) into settings
- [ ] Friend activity feed on friend profile
- [x] **Incremental sync (local-first refresh)** — shipped in 1.0.5

## Web (future)
- [ ] **Desktop / full-screen web usability pass** — layouts and typography were tuned for narrow mobile form factor; editor management, friends, and other pages render with oversized text and stretched controls on desktop. Add responsive breakpoints, sensible max-width containers, and scale headings/buttons for full-screen browser use.

## Business / restaurants (future)
- [ ] **Authenticated ownership claim** — replace interim “anyone can claim” with verified claim flow before setting `restaurant.owner` (business/tax ID check, lightweight verification, paid subscription as deterrent). Required before owner messaging and franchise features.
- [ ] **Franchise support** — higher-level entity above a single restaurant. Franchise provides a template menu; each location under the franchise can customize from that template. Franchise owners have edit access across all associated restaurants, including delegating menu-edit access per location. Depends on restaurant ownership & permissions model.
- [ ] **Owner messaging & offers** — restaurant owners can message users who have checked in at their location. Targeting by time window (e.g. recent visitors, lapsed visitors). Use cases: events, coupons, promos. Support custom text and images. **Opt-out:** each message includes a per-restaurant opt-out; users can opt back in via global settings and/or the restaurant detail page. Requires ownership verification and likely subscription; consider push/email channel separately.

## Superseded
- ~~Edit permissions for restaurants / menu items~~ — covered by **Restaurant ownership & menu edit permissions** (Next up)
