# Epic Implementation Guardrails

## Purpose
This document defines the operating rules for planning, implementing, validating, and merging work in this repo. The goal is to keep epics controlled, reviewable, and provable across API, web, mobile, shared packages, and CI.

These rules are not optional. If a proposed change conflicts with them, stop and surface the conflict explicitly.

---

## Non-Negotiable Rules

1. **Never work directly on `main`.**
   - Start every meaningful effort on a feature branch.
   - First commands:
     ```bash
     git branch --show-current
     git status --short
     git diff --stat
     ```
   - If already on `main`, create a branch before changing code.

2. **Current repo state is the source of truth.**
   - Do not trust prior summaries, old audits, or earlier plans over the live code.
   - Read the relevant files before proposing or applying changes.

3. **No cross-surface implementation without a frozen contract.**
   - Before touching API, web, and mobile together, write down:
     - request/response shapes
     - status codes
     - machine-readable error codes
     - tenant/auth rules
     - ownership/authorization rules
     - validation commands

4. **Do not branch client behavior on message text.**
   - If clients depend on a server condition, use a stable machine-readable code.
   - Example: `USER_NOT_PROVISIONED`, `TENANT_MISMATCH`.

5. **First-party clients must fail loudly on missing critical context.**
   - Missing tenant context should not silently fall back in first-party authenticated flows.
   - Missing auth context should not silently degrade protected actions.

6. **Run real validation.**
   - “Looks right” does not count.
   - If a required tool is unavailable, say so plainly and do not claim that surface is validated.

7. **Keep diffs reviewable.**
   - No broad refactors during feature stabilization.
   - No style churn.
   - No unrelated cleanup mixed into feature work.

8. **Generated files and local artifacts must be governed.**
   - Regenerate only when needed.
   - Verify generated-file drift explicitly.
   - Ignore local build artifacts.
   - Do not commit junk.

9. **CI mismatches must be surfaced explicitly.**
   - Local green is not enough.
   - If CI behavior differs from local behavior, call it out as a separate issue.

10. **If a design decision is unresolved, stop instead of guessing.**
    - Present the smallest set of concrete options.
    - Do not improvise architecture in the middle of implementation.

---

## Standard Workflow for Every Epic

### 1. Planning Pass
Purpose: understand the repo and define the scope before writing code.

Required steps:
- show branch / status / diff stat / recent commits
- read all relevant source files
- read relevant tests
- read relevant CI workflow files
- read any `AGENTS.md` in scope
- identify existing behavior and constraints

Output required:
- exact contract table
- exact files that must change
- exact validations to run
- top risks
- explicit out-of-scope list

### 2. Contract Pass
Freeze the implementation contract before cross-surface edits.

Must define:
- endpoint names and request/response DTOs
- status codes
- machine-readable error codes
- tenant resolution rules
- auth ownership rules
- authorization scope rules
- migration/compatibility notes

No implementation until this is clear.

### 3. Implementation Pass
Implement one vertical slice at a time.

Preferred order:
1. API contract and backend logic
2. backend tests
3. web adaptation
4. mobile adaptation
5. generated/codegen updates if needed
6. validation

Do not change all layers at once without finishing the slice.

### 4. Stabilization Pass
Review the actual diff for drift.

Check specifically for:
- accidental contract drift
- inconsistent status/error handling
- tenant/auth regressions
- generated-file churn
- duplicated logic
- missing validation
- work done on the wrong branch

### 5. Validation Pass
Run the full agreed gate.

At minimum, use the repo’s actual scripts. For cross-surface work this generally means:
```bash
pnpm --filter @project-x/api typecheck
pnpm --filter @project-x/api build
pnpm --filter @project-x/api test
pnpm --filter web build
pnpm --filter web lint
```

If mobile changed, also run:
```bash
cd apps/mobile
flutter pub get
flutter analyze
flutter test
flutter pub run build_runner build --delete-conflicting-outputs
```

If there is no Flutter test suite, say that plainly.

### 6. PR Pass
Before opening or merging a PR:
- ensure the working tree is clean
- ensure local build artifacts are ignored
- verify the branch name is correct
- verify the PR title/body are honest about what was and was not validated
- verify CI status and call out unrelated failing checks separately

---

## Required Evidence Standard
Any important claim must include proof.

Acceptable proof:
- file path + code snippet
- command + raw output
- test name + raw output
- PR/check URL + raw status

Unacceptable:
- “should be fixed”
- “looks good”
- “probably” without proof
- summaries with no file or output evidence

---

## Validation Rules

### API / TypeScript
- Typecheck must pass with the actual repo config.
- Tests must run from the repo’s configured test discovery paths.
- If new tests are added, confirm the test runner actually discovers them.

### Web
- Build must pass.
- Lint must pass if lint is part of normal repo workflow.
- Cross-surface auth flows must match the backend contract.

### Mobile
- `flutter analyze` is required if mobile code changes.
- `flutter test` must run if a test suite exists.
- If there is no test suite, state that directly.
- If codegen is involved, regenerate and verify drift.

### CI
- Compare local validation commands to CI commands.
- If CI fails for a pre-existing reason, separate that from epic-specific regressions.
- Do not hide unrelated CI failures.

---

## Auth / Tenant Best Practices

1. **Provisioning and authentication are different concerns.**
   - A verified token route is not the same as a fully provisioned local-user route.
   - Do not force “local user must exist” on a provisioning endpoint.

2. **Use machine-readable error codes everywhere clients branch.**
   - Keep codes consistent across API, web, and mobile.

3. **Tenant scoping must happen before role expansion.**
   - Admin/agent privileges do not cross tenant boundaries.

4. **Protected persisted resources must not depend on optional auth.**
   - If it is persisted and user-specific, require auth.

5. **First-party clients should not silently choose a tenant.**
   - Missing tenant context in authenticated/provisioning flows should fail loudly unless an explicit temporary fallback is part of the agreed contract.

---

## Generated Files / Local Artifact Rules

1. If generated files change, explain why.
2. Regenerate them with the correct tool, then verify drift.
3. Add or update ignore rules for local-only artifacts.
4. Do not commit:
   - local caches
   - `.dart_tool/`
   - transient plugin files
   - other environment-specific junk

---

## Stop Conditions
Stop and escalate if any of these are true:
- auth model is ambiguous
- tenant model is ambiguous
- the required validation tool is unavailable and the changed surface cannot be responsibly verified
- CI is failing for reasons that may be caused by the current epic and you cannot isolate them
- the change requires architectural decisions not already approved

When stopping, provide:
- exact blocker
- exact files involved
- exact command output or code snippet proving it
- smallest viable options to proceed

---

## PR Checklist
Before requesting merge:
- [ ] work is on a feature branch
- [ ] working tree is clean
- [ ] only intended files are in the diff
- [ ] generated files were intentionally updated
- [ ] local artifacts are ignored
- [ ] API validation passed
- [ ] web validation passed
- [ ] mobile validation passed or is explicitly unavailable
- [ ] new tests are actually discovered and passing
- [ ] PR body states what was validated and what was not
- [ ] unrelated CI failures are called out separately

---

## Copy-Paste Kickoff Template
Use this at the start of every new epic:

```text
Before writing code, do this in order:

1. Show:
- current branch
- git status --short
- git diff --stat
- recent commits

2. Read:
- relevant source files
- relevant tests
- relevant CI workflow files
- any AGENTS.md in scope

3. Produce:
- exact contract table for this epic
- exact files that must change
- exact validations to run
- top 5 risks
- what is explicitly out of scope

4. Do not implement until the contract and validation plan are clear.
```

---

## Preferred Tool Roles

### Claude Code
Best for:
- repo analysis
- contract definition
- architectural review
- stabilization review
- PR closeout review
- identifying drift and risk

### Codex
Best for:
- surgical implementation
- strict code edits
- targeted cleanup
- validation-driven fixes
- PR hygiene tasks

Recommended pattern:
1. Claude plans
2. Codex implements
3. Claude reviews/stabilizes
4. Codex validates/pushes
5. Claude final review

---

## Final Principle
The repo should leave every epic in a better state than it found it:
- cleaner branch discipline
- tighter contracts
- stronger validation
- less hidden drift
- more trustworthy PRs
