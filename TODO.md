# Order Envy — TODO

## Next up
- [ ] **Restaurant ownership & menu edit permissions** — closes the open design hole where any logged-in user can edit any restaurant/menu (see `middleware/restaurant.js` `canEditRestaurant`). Add an `owner` (and delegated editors) on restaurants. When an owner is set, only the owner or people they designate can add/edit menu items (and likely restaurant metadata — scope TBD). When no owner is set, keep current behavior: any user can add/edit menu items. **Ownership verification:** need a trustworthy claim flow (e.g. tax ID / business verification) so random users cannot claim restaurants they do not own; paid subscription tied to ownership is the likely deterrent even if verification is lightweight. **Platform scope:** implement on web first if mobile ownership UX or verification is too heavy; API rules must enforce permissions regardless of client. **Delegation:** owner can grant menu-edit access to specific users per restaurant.

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
- [ ] **Incremental sync (local-first refresh)** — strengthen local-first without blocking UI. **List:** on load, show restaurants from local storage immediately; in background, call backend with last-sync timestamp; backend returns restaurant IDs (or full records if payload is acceptable) added/updated since then; app fetches any missing detail and merges into local store, then updates the visible list. **Detail:** same pattern for menu items when opening a restaurant — render cached data first, refresh menu in background when online. Builds on existing AsyncStorage cache/outbox; may evolve toward a structured local DB if needed.

## Business / restaurants (future)
- [ ] **Franchise support** — higher-level entity above a single restaurant. Franchise provides a template menu; each location under the franchise can customize from that template. Franchise owners have edit access across all associated restaurants, including delegating menu-edit access per location. Depends on restaurant ownership & permissions model.
- [ ] **Owner messaging & offers** — restaurant owners can message users who have checked in at their location. Targeting by time window (e.g. recent visitors, lapsed visitors). Use cases: events, coupons, promos. Support custom text and images. **Opt-out:** each message includes a per-restaurant opt-out; users can opt back in via global settings and/or the restaurant detail page. Requires ownership verification and likely subscription; consider push/email channel separately.

## Superseded
- ~~Edit permissions for restaurants / menu items~~ — covered by **Restaurant ownership & menu edit permissions** (Next up)
