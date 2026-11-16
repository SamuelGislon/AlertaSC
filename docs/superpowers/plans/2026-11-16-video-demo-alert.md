# Single Alert Video Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make one deterministic synthetic Rio Índios flood alert travel from operator review to a focused public preview and the approved poster.

**Architecture:** Keep the existing authenticated alert workflow and use its loaded `AlertView` as the source for a minimal public projection in the same browser session. Add a focused public-preview screen and return path; do not create a public API endpoint or connect an external source.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS 4, NestJS, Vitest, React Testing Library, Playwright, PostgreSQL integration fixtures.

**Spec:** `docs/superpowers/specs/2026-11-16-video-demo-alert-design.md`

## Global Constraints

- Use one synthetic rain/flood case for Rio Índios.
- Show an unequivocal demonstration label; values do not represent real meteorological observations.
- The API remains the authority for operator authorization, state transitions, and audit.
- The preview is inside the authenticated local demonstration; do not add a public production endpoint.
- Do not call the municipal API, other sources, messaging services, or social networks.
- Display the brand “Clima em Alerta”; technical package and database names may remain AlertaSC.
- Do not use real citizen data or expose audit/source internals in the public projection.

## Review Focus

- An unapproved, rejected, or otherwise non-approved alert must never appear in the public preview; test the projection filter.
- An expired alert must not appear even if preview navigation was opened earlier; test expiry at render time.
- A missing or stale selected alert must show an explanatory empty state rather than a different alert; test the selected-ID lookup.
- Logout must clear the preview snapshot; test that returning to the public visitor view does not expose operator data.
- Internal source, audit, and related-reading metadata must not leak into the public projection; test the exact projected shape.

---

### Task 1: Seed one canonical synthetic flood scenario

**Files:**
- Modify: `apps/api/src/testing/fixtures.ts`
- Test: `apps/api/test/app.integration.spec.ts`

**Interfaces:**
- `seedSyntheticFixtures(database)` and `ensureSyntheticReviewAlert(database)` continue returning their existing types.
- The seeded alert and its related readings use existing `AlertView`/database fields; no business state or threshold logic changes.

- [ ] **Step 1: Write the failing integration test**

Add a test asserting the local demo alert title is `Atenção para cheias — Rio Índios`, area names Rio Índios/Presidente Getúlio, the summary is explicitly synthetic, and a related reading records the approved Rio Índios attention level of `4.5 m`. Cover both a fresh seed and upgrading an existing unclaimed synthetic seed. Assert that re-running the seed does not duplicate the actionable alert, reading, or audit event.

- [ ] **Step 2: Run only that integration test and verify it fails**

Run: `pnpm --filter @alertasc/api exec vitest run --config vitest.integration.config.ts -t "canonical synthetic flood scenario"`

Expected: FAIL because the current fixture says generic synthetic rain and only stores precipitation evidence.

- [ ] **Step 3: Update the synthetic fixture**

In `fixtures.ts`, make both fresh test setup and the local `ensureSyntheticReviewAlert` use the same synthetic Rio Índios scenario. Include a `4.5 m` river-level observation as the attention-level example and retain its synthetic provenance. If an existing synthetic fixture is still awaiting triage, update its demo description and append missing evidence plus an audit event; never rewrite or delete existing audit events. If the canonical evidence already exists, do not duplicate it.

- [ ] **Step 4: Run the focused integration test and verify it passes**

Run: `pnpm --filter @alertasc/api exec vitest run --config vitest.integration.config.ts -t "canonical synthetic flood scenario"`

Expected: PASS; a repeated seed leaves one actionable alert and one canonical river reading.

### Task 2: Project the approved alert into a focused public view

**Files:**
- Create: `apps/web/src/lib/public-alert.ts`
- Test: `apps/web/src/lib/public-alert.spec.ts`
- Modify: `apps/web/src/components/PublicDashboard.tsx`
- Test: `apps/web/src/components/PublicDashboard.spec.tsx`

**Interfaces:**
- `toPublicAlert(alert: AlertView): PublicAlert` exposes only `id`, `title`, `summary`, `area`, `status`, `generatedAt`, `expiresAt`, and synthetic display readings (`metric`, normalized `value`, `unit`, `observedAt`).
- `PublicDashboard` accepts optional `focusAlertId?: string` and `onBackToOperator?: () => void`; existing public entry behavior remains the default.

- [ ] **Step 1: Write failing projection tests**

Test the exact public projection shape and verify source labels, raw values, and audit fields are omitted. Test that only synthetic, approved, unexpired alerts are eligible at the supplied `now`.

- [ ] **Step 2: Run the focused projection test and verify it fails**

Run: `pnpm --filter @alertasc/web test -- src/lib/public-alert.spec.ts`

Expected: FAIL because the projection helper does not exist.

- [ ] **Step 3: Implement the minimum public projection**

Create the typed projection helper; map normalized readings for display and omit internal fields. Keep filtering status, synthetic provenance, and expiry explicit.

- [ ] **Step 4: Write the focused dashboard test**

Assert that `focusAlertId` shows only that one approved, valid alert with its area, `4.5 m` reading, generated/expiry times, demonstration notice, and a “Voltar à fila” action. Assert unrelated fixed metrics and chart are absent in focused mode; invalid, expired, or missing selections show the explanatory empty state.

- [ ] **Step 5: Run the dashboard tests to verify they fail, then implement and rerun**

Run: `pnpm --filter @alertasc/web test -- src/components/PublicDashboard.spec.tsx`

Expected before implementation: FAIL on missing focus behavior. Expected after implementation: PASS; existing visitor-panel tests remain unchanged and pass.

### Task 3: Connect operator approval, public preview, and brand

**Files:**
- Modify: `apps/web/src/components/AlertBoard.tsx`
- Test: `apps/web/src/components/AlertBoard.spec.tsx`
- Modify: `apps/web/src/App.tsx`
- Test: `apps/web/src/App.spec.tsx`
- Modify: `apps/web/src/components/AppShell.tsx`
- Test: `apps/web/src/components/AppShell.spec.tsx`
- Modify: `apps/web/src/components/LoginForm.tsx`
- Modify: `apps/web/src/lib/alert-poster.ts`
- Modify: `apps/web/index.html`
- Test: `apps/web/e2e/public-experience.spec.ts`

**Interfaces:**
- `AlertBoard` accepts optional `onViewPublicPreview(alertId: string): void`; show the action only for an approved, unexpired alert.
- `App` stores only the selected minimal public projection for the preview, clears it on logout, and exposes an authenticated `public-preview` view that returns to the alert queue.
- Keep existing API methods and backend permissions unchanged.

- [ ] **Step 1: Write the failing `AlertBoard` test**

Assert that “Ver no painel público” is available for an approved and unexpired alert and calls the callback once with its ID; assert it is absent for awaiting, rejected, and expired alerts.

- [ ] **Step 2: Run the focused component test and verify it fails**

Run: `pnpm --filter @alertasc/web test -- src/components/AlertBoard.spec.tsx`

Expected: FAIL because there is no public-preview action.

- [ ] **Step 3: Add the guarded preview action**

Add the callback prop and button only after approval while the alert remains valid. Preserve existing review, audit, and poster actions.

- [ ] **Step 4: Write the failing app-flow test**

Mock the current API contract and exercise login, claim, approval, public preview, and return to queue. Assert the preview contains the same approved alert, does not show internal data, and logout clears the preview. Assert the preview remains unavailable to an unauthenticated visitor.

- [ ] **Step 5: Run the focused app test and verify it fails**

Run: `pnpm --filter @alertasc/web test -- src/App.spec.tsx`

Expected: FAIL because the app has no authenticated preview state or route.

- [ ] **Step 6: Implement the app preview and return path**

Add the local `public-preview` page state, derive/store the minimal projection only when the approved alert is selected, render the focused `PublicDashboard` with a return action, and clear the projection on logout. Do not add an endpoint or external request.

- [ ] **Step 7: Update visible product branding**

Use “Clima em Alerta” in the shared shell, login heading, document title, poster footer, and share title. Keep package names and internal test fixtures unchanged.

- [ ] **Step 8: Add a Playwright flow test**

Mock login, alert-tab locking, the single synthetic alert, claim, and approval endpoints. At mobile and desktop widths, record assertions for login, review, approval, focused public preview, the same area/value, return to the queue, poster preview and PNG download, and absence of horizontal overflow. Do not invoke share or delivery actions.

- [ ] **Step 9: Run acceptance verification**

Run: `pnpm --filter @alertasc/web test`; `pnpm --filter @alertasc/web test:e2e`; `pnpm typecheck`; `pnpm build`; and `pnpm --filter @alertasc/api exec vitest run --config vitest.integration.config.ts -t "canonical synthetic flood scenario"`.

Expected: PASS; all public-preview content remains synthetic, approved, and unexpired; the operator API remains authoritative.

## Commit

After review and all checks pass, commit the focused changes with `feat(web): add single-alert video demo flow`. Do not include secrets or generated artifacts.
