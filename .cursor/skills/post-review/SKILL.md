---
name: post-review
description: >-
  Run Order Envy post-review after harden (self-review loop) on an existing PR.
  Audits branch commits, CHANGELOG coverage, and deferred review items; suggests
  fixes or documents deferrals. App version was already bumped by pre-commit before
  the PR. Use when the user says run post-review, post-review, or pre-merge review.
disable-model-invocation: true
---

# Post-review (Order Envy)

**Scope:** Project-only — `.cursor/skills/post-review/` in this repo. Not global.
For all repos, copy to `~/.cursor/skills/post-review/` (personal skill).

Execute on an **existing PR**, after **harden** (the self-review loop). **Pre-commit
already ran** before the PR was opened — `mobile/app.json` and `CHANGELOG` were bumped then.

## PR lifecycle (where this skill fits)

```
make changes
→ pre-commit          (semver, CHANGELOG, tests — see pre-commit skill)
→ commit, push, open PR
→ harden              (self-review loop + summarize + this skill)
→ post-review         ← you are here
→ final commit/push   (only if this pass or harden changed files)
→ merge after CI
```

**Not** the order: post-review → pre-commit. Do **not** tell the user to run
pre-commit at the end of post-review unless this pass made **new mobile app
changes** that need a version bump (unusual — say so explicitly if true).

**Related:** [pre-commit](../pre-commit/SKILL.md) runs **before** the PR; post-review
is qualitative merge readiness **after** harden.

**Do not run `git commit` unless the user's message contains the exact phrase `create a git commit`.**

## Git policy (mandatory)

**No git commands unless the user explicitly asks** — including branch
creation, checkout/switch, add, commit, push, fetch, merge, or rebase.

The only exception: **read-only** inspection (`git status`, `git diff`,
`git log`, `git rev-parse`, `git show`) when the user invoked **this**
post-review skill (that invocation counts as explicit permission for those
reads only). Never run read-only git for other tasks unless asked.

- **Never** create or switch branches for the user.
- **Never** run `git fetch` unless the user explicitly asks. Use the
  existing `origin/main` ref; if it may be stale, say so and ask the user
  to fetch.

References:

- [`CHANGELOG.md`](../../CHANGELOG.md) — release section for the branch
- [`TODO.md`](../../TODO.md) — deferred features and backlog
- [`scripts/check-app-version.js`](../../scripts/check-app-version.js) — exempt path rules
- [pre-commit skill](../pre-commit/SKILL.md) — version bump (already ran before PR)

## Trigger phrases

- `run post-review` ← primary; enough on its own
- `post-review`
- `run post-review checklist`
- `pre-merge review` (alias)

A **harden** pass (self-review loop) typically ends by invoking this skill — do
not treat `harden` as a synonym for post-review when documenting next steps.

If the skill does not attach, reference it with `@post-review` or `@.cursor/skills/post-review/SKILL.md`.

User may pass optional hints: number of self-review rounds completed, known open items, or "commits only".

## Workflow

Copy this checklist and mark items as you go:

```
Post-review progress:
- [ ] 0. Confirm branch (not `main` — ask user to branch if needed)
- [ ] 1. Inspect branch commits
- [ ] 2. Verify CHANGELOG vs branch diff
- [ ] 3. Triage deferred review items
- [ ] 4. Run tests (if fixes made)
- [ ] 5. Report + next steps (required final step)
```

**Use `origin/main` as the baseline** for changelog and diff coverage.

### 0. Confirm branch (not `main`)

Read-only check (permitted under this skill):

```bash
git rev-parse --abbrev-ref HEAD
```

- If the result is `main`, **stop the post-review workflow** and **ask the
  user** to create or switch to a feature branch (they choose the name and
  run `git checkout -b …` or equivalent). Do **not** create or switch
  branches yourself.
- If already on a feature branch, continue.

### 1. Inspect branch commits

Check the contents of all local commits to make sure they are solid and worth keeping.

Run in parallel:

```bash
git log origin/main..HEAD --oneline
git log origin/main..HEAD --format="%h %s%n%b---"
git status --short
```

For each commit, note:

- Message quality (summary line, bullets, no stray markdown artifacts)
- Whether it should be **kept**, **reworded**, or **squashed** into a neighbor
- Whether dev-only changes (e.g. `.cursor/skills/**`) belong in the same PR or a separate commit

Suggest squash groupings when many small hardening commits tell one story, but do not rewrite history unless the user asks.

### 2. Verify CHANGELOG vs branch diff

Make sure the changelog covers all changes made in this branch (or that exempt
paths are intentionally omitted).

Run:

```bash
git diff --name-only origin/main
git diff --stat origin/main
git show origin/main:mobile/app.json
```

Read the top `## [X.Y.Z] - YYYY-MM-DD` section in `CHANGELOG.md` (for the branch's version if bumped).

Check:

- Every **user-facing** change under `mobile/src/**`, `mobile/App.js`, `routes/**`, `views/**`, `services/**`, and `models/**` has a bullet (or is intentionally omitted with reason)
- Release date is **not earlier** than the section below it (newer versions should have same or later date)
- Top `CHANGELOG.md` heading matches `expo.version` in `mobile/app.json` when the branch bumps app version
- Dev-only changes (`.cursor/**`, `docs/**`, `mobile/tests/**`, `.github/**`) usually **do not** need CHANGELOG bullets — see `scripts/check-app-version.js` exempt paths

Fix gaps in `CHANGELOG.md` when obvious; otherwise list missing bullets for the user.

**Version / bump:** By the time post-review runs, **pre-commit already bumped
`expo.version`** and added the top `CHANGELOG` section before the PR. Verify coverage
and consistency — do **not** bump version or add a new changelog section unless
this pass introduces **new mobile app changes** not covered by the existing section
(rare). If harden commits added bullets-worthy fixes, extend the **existing** top
section; only re-run pre-commit if a semver bump is actually required.

### 3. Triage deferred review items

For each open item from the self-review (or a list the user provides), classify:

| Verdict | Meaning |
|---------|---------|
| **Fix now** | Small, low-risk, blocks merge confidence |
| **Defer** | Edge case, larger refactor, or acceptable known limitation |
| **Document** | Defer code but add a line to `TODO.md`, PR description, or a short comment |

Default posture: fix hygiene (missing tests, changelog, broken commit messages); defer edge-case UX unless the user says otherwise.

If the user supplied a numbered optional list, respond with the same numbers and a one-line verdict each.

### 4. Run tests (if fixes made)

Only when step 2 or 3 changed code. Run what changed; run both if unsure:

**Backend** (from repo root):

```bash
npm test
```

**Mobile** (from `mobile/`):

```bash
cd mobile && npm test
```

Skip if this pass was audit-only.

### 5. Report + next steps (always last)

Summarize:

- Commit audit (count, keep/squash/reword recommendations)
- CHANGELOG coverage (complete / gaps fixed / gaps remaining)
- Deferred items table (fix now vs defer vs document)
- Test result if step 4 ran

If this pass changed any files, **always** end with a commit message (one fenced code block, summary line + `-` bullets) covering **only those local changes**. Do not wait for the user to ask.

- **Do not** put the semver in the commit message — version lives in `mobile/app.json`, `CHANGELOG.md`, and the pre-flight report only.
- Bullets describe **what** was done, not why. As brief as possible.

Otherwise, when the PR looks merge-ready:

- **Push** if harden/post-review commits are local-only
- **Wait for CI**, then merge
- Do **not** suggest running pre-commit (already done before the PR)
- Only mention re-running pre-commit if this pass added mobile app changes that need a semver bump

Do **not** duplicate pre-commit's version bump rules. Do **not** tell the user to open a PR — post-review assumes one already exists.

## What this workflow does NOT cover

- Initial app semver bump before the PR — **pre-commit** (already ran)
- `check-app-version.js` — **pre-commit** (re-run only if this pass needs a new bump)
- Commit message for the entire branch / all uncommitted work — post-review only drafts a message for files changed during this pass
- Post-merge operator steps (Vercel deploy, EAS build, TestFlight, manual Expo Go QA)
- Merging or push — user handles

## Split modes

| User says | Do |
|-----------|-----|
| `post-review` (default) | Full workflow |
| `post-review commits only` | Steps 0–1 + report |
| `post-review changelog` | Steps 0–2 + report |
| `post-review triage` | Steps 0–1, 3 + report (user supplies open items) |
