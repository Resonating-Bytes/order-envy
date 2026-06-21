---
name: pre-commit
description: >-
  Run Order Envy pre-commit pre-flight before a mobile release commit.
  Bumps app semver, updates CHANGELOG, runs backend + mobile tests and
  version checks, then always ends with a commit message for all local
  changes. Use when the user says run pre-commit, pre-commit, pre-flight,
  ship check, release prep, or before merge checklist.
disable-model-invocation: true
---

# Pre-commit pre-flight (Order Envy)

**Scope:** Project-only — `.cursor/skills/pre-commit/` in this repo. Not global.
For all repos, copy to `~/.cursor/skills/pre-commit/` (personal skill).

Execute when the user asks to run pre-commit, pre-flight, ship check, or release prep.

**Always end the workflow** with a commit message for **all current local changes**
(uncommitted + staged). User does not need to ask separately.

**Do not run `git commit` unless the user's message contains the exact phrase `create a git commit`.**

## Trigger phrases

- `run pre-commit` ← primary; enough on its own
- `pre-commit`
- `pre-flight`
- `run pre-commit checklist`
- `ship check`
- `release prep`

If the skill does not attach, reference it with `@pre-commit` or `@.cursor/skills/pre-commit/SKILL.md`.

User may pass optional hints: target version (`1.0.4`), release theme, or "checks only".

## Workflow

Copy this checklist and mark items as you go:

```
Pre-flight progress:
- [ ] 1. Inspect changes
- [ ] 2. Bump version + CHANGELOG (if mobile app changed)
- [ ] 3. Backend sanity (if API changed)
- [ ] 4. Run tests
- [ ] 5. Run version checks
- [ ] 6. Report + commit message (required final step)
```

### 1. Inspect changes

Run in parallel:

- `git status --short`
- `git diff --stat HEAD`
- `git log -3 --oneline`

Note mobile vs backend vs docs-only changes.

**Path guide:**

| Area | Typical paths |
|------|----------------|
| Mobile app | `mobile/src/**`, `mobile/app.json`, `mobile/package.json` |
| Mobile tests only | `mobile/tests/**` (exempt from version bump) |
| Backend API | `routes/**`, `models/**`, `lib/**`, `services/**`, `api/**`, `app.js` |
| CI / version | `scripts/**`, `.github/workflows/**` |

### 2. Version + CHANGELOG (mobile app changes)

When `mobile/**` changed (excluding `mobile/tests/**` only):

1. Read current version from `mobile/app.json` (`expo.version`).
2. Bump **patch** by default unless the user specified otherwise.
3. **One semver bump per branch** from `main` — if already bumped on this branch, verify and do not bump again unless the user asks.
4. Set the **same** version in `mobile/app.json` and `mobile/package.json`.
5. Add `## [x.y.z] - YYYY-MM-DD` to `CHANGELOG.md` (repo root, after `## [Unreleased]`).
6. Use Keep a Changelog sections: `### Added`, `### Changed`, `### Fixed` (omit empty sections).
7. Bullets must be `- ` prefixed (CI validates format).

If the user already bumped version/changelog, verify they match and only fix gaps.

Optional: tick or update items in `TODO.md` when the release completes a listed feature.

Skip this step when only backend, docs, or `mobile/tests/**` changed.

### 3. Backend sanity (only if API/backend changed)

When `routes/**`, `models/**`, `lib/**`, `services/**`, `api/**`, or `app.js` changed:

- [ ] Breaking API changes reflected in mobile compatibility if needed (`mobile/src/lib/compatibility.js`, `mobile/src/config/compatibility.js`)
- [ ] New env vars documented in `.env.example` (root and/or `mobile/.env.example`) — never commit secrets

Skip when no backend changes.

### 4. Run tests

Run what changed; run both if unsure:

**Backend** (from repo root):

```bash
npm test
```

**Mobile** (from `mobile/`):

```bash
cd mobile && npm test
```

Fix failures before continuing. Common gotchas:

- Offline/sync changes → `mobile/tests/lib/offlineWrites.test.js`, `outboxSync.test.js`
- Compatibility changes → `mobile/tests/lib/compatibility.test.js`, `tests/unit/compatibility.test.js`
- Version script changes → `tests/unit/check-app-version-paths.test.js`

### 5. Run version checks

From repo root (when mobile app paths changed on the branch):

```bash
node scripts/check-version-bump.js --base origin/main --head HEAD
```

This verifies:

- `mobile/app.json` `expo.version` was bumped vs `main`
- `mobile/package.json` `version` matches `expo.version`
- `CHANGELOG.md` includes `## [x.y.z]` and was updated in the diff

Skip when no mobile app paths changed (backend-only PR).

### 6. Report + commit message (always last)

Summarize:

- Version bumped to `x.y.z` (or "already at x.y.z" / "not required")
- Backend test count / pass-fail
- Mobile test count / pass-fail
- Version script pass-fail (or skipped)
- Any skipped steps (docs-only, checks-only, etc.)

Then **always** provide a commit message covering **every file in the current working tree**
(`git status` / full diff). Do not wait for the user to ask.

**Commit message format** (one fenced code block, summary line + `-` bullets):

```
Short summary including version (x.y.z) when applicable
- Detail from CHANGELOG or diff
- Detail
```

Do not commit unless the user said `create a git commit`.

## CI checks this mirrors

Required GitHub checks on PRs to `main`:

| Check name | Workflow |
|------------|----------|
| Backend test | `.github/workflows/test.yml` |
| Mobile test | `.github/workflows/mobile-tests.yml` |
| App version | `.github/workflows/version-checks.yml` |

## Checks this workflow does NOT cover

Post-merge operator steps (Vercel deploy, EAS build, TestFlight, manual Expo Go QA) are outside pre-commit.

Remind the user to run manual offline QA in Expo Go when the change is mobile UI/sync-heavy and they have not tested yet.

## Split modes

| User says | Do |
|-----------|-----|
| `pre-commit` (default) | Full workflow |
| `pre-commit checks only` | Steps 4–5 only |
| `pre-commit changelog` | Steps 1–2 + commit message draft |
| `pre-commit with 1.0.4` | Use specified semver in step 2 |
