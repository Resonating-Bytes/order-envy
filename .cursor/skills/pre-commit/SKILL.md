---
name: pre-commit
description: >-
  Run Order Envy pre-commit pre-flight before opening a PR. Bumps app semver,
  updates CHANGELOG, runs backend + mobile tests and version checks, then always
  ends with a commit message for all local changes. Use when the user says run
  pre-commit, pre-commit, pre-flight, or ship check. Not for post-harden wrap-up
  — see post-review skill.
disable-model-invocation: true
---

# Pre-commit pre-flight (Order Envy)

**Scope:** Project-only — `.cursor/skills/pre-commit/` in this repo. Not global.
For all repos, copy to `~/.cursor/skills/pre-commit/` (personal skill).

Execute when the user asks to run pre-commit, pre-flight, or ship check — **before**
commit, push, and opening the PR.

**Always end the workflow** with a commit message for **all current local changes**
(uncommitted + staged). User does not need to ask separately.

## PR lifecycle (where this skill fits)

```
make changes
→ pre-commit          ← you are here (semver, CHANGELOG, tests)
→ commit, push, open PR
→ self-review / harden (review loop + summarize + post-review)
→ post-review
→ final commit/push   (only if harden/post-review changed files)
→ merge after CI
```

This skill runs **once per feature branch**, before the PR. **Post-review** runs
after harden on the open PR — do **not** suggest pre-commit as the default next
step after post-review. Re-run pre-commit only if harden/post-review introduced
**new mobile app changes** that need another semver bump (unusual).

## Git policy (mandatory)

**No git commands unless the user explicitly asks** — including branch
creation, checkout/switch, add, commit, push, fetch, merge, or rebase.

The only exception: **read-only** inspection (`git status`, `git diff`,
`git log`, `git rev-parse`, `git show`) when the user invoked **this**
pre-commit skill (that invocation counts as explicit permission for those
reads only). Never run read-only git for other tasks unless asked.

- **Never** create or switch branches for the user. If they are on `main`,
  **stop** and ask them to create or switch to a feature branch themselves.
- **Never** run `git commit` unless the user's message contains the exact
  phrase `create a git commit`.
- **Never** run `git fetch` unless the user explicitly asks. Use the
  existing `origin/main` ref; if it may be stale, say so and ask the user
  to fetch.

References:

- [`scripts/check-app-version.js`](../../scripts/check-app-version.js) — bump path rules and CI logic
- [`CHANGELOG.md`](../../CHANGELOG.md) — Keep a Changelog format
- [`.github/workflows/version-checks.yml`](../../.github/workflows/version-checks.yml) — CI gate
- [post-review skill](../post-review/SKILL.md) — merge audit after harden

## Trigger phrases

- `run pre-commit` ← primary; enough on its own
- `pre-commit`
- `pre-flight`
- `run pre-commit checklist`
- `ship check`
- `release prep`

Do **not** treat `before merge`, `pre-merge review`, or post-review wrap-up as
pre-commit triggers — merge readiness after harden is
[post-review](../post-review/SKILL.md).

If the skill does not attach, reference it with `@pre-commit` or `@.cursor/skills/pre-commit/SKILL.md`.

User may pass optional hints: target version (`1.0.5`), bump level (patch/minor/major), theme for changelog, or "checks only".

## Workflow

Copy this checklist and mark items as you go:

```
Pre-flight progress:
- [ ] 0. Confirm branch (not `main` — ask user to branch if needed)
- [ ] 1. Inspect changes
- [ ] 2. Bump version + CHANGELOG (if required)
- [ ] 3. Backend sanity (if API changed)
- [ ] 4. Run tests
- [ ] 5. Run version check
- [ ] 6. Report + commit message (required final step)
```

### 0. Confirm branch (not `main`)

Read-only check (permitted under this skill):

```bash
git rev-parse --abbrev-ref HEAD
```

- If the result is `main`, **stop the pre-commit workflow** and **ask the
  user** to create or switch to a feature branch (they choose the name and
  run `git checkout -b …` or equivalent). Do **not** create or switch
  branches yourself. Do not bump version, run release checks, or draft a
  ship message while still on `main`.
- If already on a feature branch, continue.

**All version decisions use `origin/main` as the baseline** — not the parent
commit, not the previous commit on this branch. Do not `git fetch` unless
the user explicitly asked; note if `origin/main` may be stale.

### 1. Inspect changes (vs `origin/main`)

Run in parallel:

- `git status --short`
- `git diff --stat origin/main` — working tree vs main (includes uncommitted)
- `git diff --name-only origin/main` — file list for bump decision
- `git log origin/main..HEAD --oneline`
- `git show origin/main:mobile/app.json` — read `expo.version` on main

Note mobile vs backend vs docs-only changes.

**Path guide:**

| Area | Typical paths | Version bump? |
|------|----------------|---------------|
| Mobile app | `mobile/**` (except tests) | **Yes** when changed |
| Mobile tests only | `mobile/tests/**` | No (exempt) |
| Backend API | `routes/**`, `models/**`, `lib/**`, `services/**`, `api/**`, `app.js` | No mobile bump |
| Docs / CI only | `docs/**`, `.github/**`, `*.md` (except CHANGELOG when bumping) | No mobile bump |

### 2. Version + CHANGELOG (mobile app changes vs `origin/main`)

Rules mirror [`scripts/check-app-version.js`](../../scripts/check-app-version.js).

**Exempt (no mobile bump):** changes only under `mobile/tests/**`, `docs/**`, `.github/**`, other non-`mobile/` paths, or other `*.md` files (see `scripts/check-app-version.js`). **Mixed PRs** that also touch non-exempt `mobile/**` paths still require a bump.

**Required:** any change under `mobile/**` except `mobile/tests/**` (includes `mobile/app.json`, `mobile/package.json`, `mobile/src/**`, assets, etc.).

### Bump decision table

When bumping, pick the level from what the diff touches (default **patch** if unsure). If multiple levels apply, bump the highest.

| Change touches… | Bump |
| --- | --- |
| Breaking API contract / raised minimum app version (`mobile/src/lib/compatibility.js`, `mobile/src/config/compatibility.js`) | MAJOR |
| New user-visible screen, flow, or capability | MINOR |
| Bug fix, offline/sync improvement, refactor, styling, backend paired with mobile release | PATCH |

### Bump rule (matches CI)

1. Collect paths from `git diff --name-only origin/main` (working tree vs main).
2. If **no** non-exempt `mobile/**` paths → skip bump.
3. If **yes** non-exempt `mobile/**` paths:
   - `main_version` = `expo.version` from `git show origin/main:mobile/app.json`
   - `head_version` = `expo.version` from [`mobile/app.json`](../../mobile/app.json) on disk
   - If `head_version == main_version` → **must bump** (use bump table above; default PATCH). Add a **new** `## [X.Y.Z] - YYYY-MM-DD` section at the top of CHANGELOG (after `## [Unreleased]`, above all existing version entries) — do **not** only extend an older section.
   - If `head_version` is already **greater than** `main_version` → **one bump per branch**: do not bump again; ensure top CHANGELOG heading matches `head_version` and bullets cover this branch's changes.
4. `expo.version` in `mobile/app.json` must match `version` in `mobile/package.json` and the top `## [X.Y.Z]` heading in CHANGELOG.

**Changelog bullets:** use `### Added`, `### Changed`, `### Fixed`, `### Removed`, or `### Security` (omit empty sections). Bullets must be `- ` prefixed. **Keep bullets brief — one short line each.** Name the user-visible change; don't paste implementation detail (that belongs in the commit message).

**Why this matters:** CI runs `check-app-version.js --base origin/main` (or the PR merge base). It fails when mobile app paths changed but `expo.version` still equals the base. Extending an existing changelog section without bumping `expo.version` does **not** pass CI.

If the user already bumped version/changelog, verify against `origin/main` and only fix gaps.

Optional: tick or update items in `TODO.md` when the release completes a listed feature.

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

### 5. Run version check (same as CI)

```bash
node scripts/check-app-version.js --base origin/main --head HEAD
```

Run only after the user has committed on a feature branch (otherwise CI
check is skipped or meaningless). Do not fetch for them.

This compares **committed** branch changes vs `origin/main` but reads
`mobile/app.json` / `mobile/package.json` from the **working tree** — so step 2
must update those files (and CHANGELOG) before this command.

If it fails, fix step 2 and re-run. Do not finish pre-commit with a failing version check.

The script passes automatically when no non-exempt `mobile/**` paths changed (backend-only or test-only PR).

Optional: `npm test -- tests/unit/check-app-version-paths.test.js`

### 6. Report + commit message (always last)

Summarize:

- `origin/main` `expo.version` vs branch version (bumped to `x.y.z`, already ahead of main, or exempt)
- Backend test count / pass-fail
- Mobile test count / pass-fail
- `check-app-version.js --base origin/main` pass-fail
- Any skipped steps (checks-only, docs-only, etc.)

Then **always** provide a commit message covering **every file in the current working tree**
(`git status` / full diff). Do not wait for the user to ask.

**Commit message format** (one fenced code block, summary line + `-` bullets — one-click copy):

- **Do not** put the semver in the commit message — version lives in `mobile/app.json`, `CHANGELOG.md`, and the pre-flight report only.
- Summary line: short thematic description (no `1.0.x`, no "Release x.y.z").
- Bullets: details from CHANGELOG or diff.

```
Short thematic summary of the change

- what changed
- what changed
```

- Bullets describe **what** was done, not why. As brief as possible.
- Large changes (5+ areas): summary line naming the main theme, then bullets.
- **Do not** duplicate bullets outside the code block.

Do not commit unless the user said `create a git commit`.

## What this workflow does NOT cover

- Post-harden / post-review merge audit — [post-review](../post-review/SKILL.md)
- Post-merge operator steps (Vercel deploy, EAS build, TestFlight, manual Expo Go QA) — remind user when the change is mobile UI/sync-heavy and they have not tested yet
- Branch creation, `git fetch`, push, PR open — user handles all git writes and remotes

## CI checks this mirrors

Required GitHub checks on PRs to `main`:

| Check name | Workflow |
|------------|----------|
| Backend test | `.github/workflows/test.yml` |
| Mobile test | `.github/workflows/mobile-tests.yml` |
| App version | `.github/workflows/version-checks.yml` |

## Split modes

| User says | Do |
|-----------|-----|
| `pre-commit` (default) | Full workflow |
| `pre-commit checks only` | Steps 4–5 only |
| `pre-commit changelog` | Steps 1–2 + commit message draft |
| `pre-commit with 1.0.5` | Use specified semver in step 2 |
| `pre-commit exempt` | Steps 1, 4–6 only (confirm docs/tests-only diff) |
