# Changelog

All notable changes to the Order Envy mobile app are documented here.

## [Unreleased]

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
