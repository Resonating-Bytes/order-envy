# Changelog

All notable changes to the Order Envy mobile app are documented here.

## [Unreleased]

## [1.0.3] - 2026-06-20

### Added
- Offline phase 2: queue writes on network failure, detail cache updates, post-sync id remap
- Pending sync badges, auto-refresh after sync, offline check-in for local restaurants
- Clear offline cache/outbox on logout
- Rename CI test jobs to `backend-test` and `mobile-test` for distinct required checks
- Outbox sync worker (BFR-inspired): single-flight flush, exponential backoff, AppState foreground replay, compatibility-triggered flush
- Separate offline vs blocked-sync messaging; screen refresh via `useOutboxSyncRefresh` when pending count drops

### Fixed
- Offline banner renders below header (not over status bar); header collapse height stays consistent
- Settings warns before discarding unsaved profile changes
- Offline check-in falls back to cached restaurant detail; rating icons work offline
- Cache rating PNGs locally via expo-asset so faces render offline in Expo Go dev (Metro URLs fail without Wi‑Fi)
- Offline-created restaurants appear in list; list refreshes on focus and after sync
- Keyboard avoidance on form screens; restaurant name/address auto-capitalization
- Settings discard prompt no longer appears twice on back navigation
- Faster reconnect detection: poll every 5s while offline, refresh on app foreground, health probe when NetInfo is stale
- Offline check-in rating faces normalize to bundled assets; description field scrolls above keyboard

## [1.0.2] - 2026-06-20

### Added
- Offline read cache for restaurant data with banner when showing saved data
- Offline write queue for restaurants, menu items, check-ins, and recommendations with auto-sync on reconnect
- Offline & sync status in Settings
- Mobile Jest test suite (compatibility, offline sync helpers, sort/form/distance utils)
- CI mobile-tests workflow with doc-only PR skip pattern

## [1.0.1] - 2026-06-20

### Added
- App/server compatibility checks with Settings status and blocked remote saves when mismatched
- CI app version bump checks and CHANGELOG enforcement

## [1.0.0] - 2026-06-20

### Added
- Initial mobile app with restaurant list, detail, check-in, and CRUD flows
- Google Sign-In, friends, recommendations, and settings screen
