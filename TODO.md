# Order Envy — TODO

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
- [ ] Offline mode — local persistence, offline reads/writes, and sync strategy for reconnect *(in progress: read cache, write queue, auto-sync)*
- [x] Settings screen — replace main-header logout with a gear icon; move log out (and account/profile actions) into settings
- [ ] Friend activity feed on friend profile
- [ ] Edit permissions for restaurants / menu items
