# QA.MAFer.AI — Personal / Enterprise Branch Change Tracker

Last prepared: 2026-11-06 (UTC)

## Authoritative locations and boundaries

| Environment | Repository / branch | Last verified baseline | Scope |
| --- | --- | --- | --- |
| Personal presentation / Gemini | `krispradip/QAAI` / `main` | `c63634d791ecdcc01182190d0663a11eb8a4c8ab` (2026-11-06, PR #24 merged) | Cloudflare personal environment, Gemini, presentation UI, browser-local history |
| Personal enterprise migration branch | `krispradip/QAAI` / `feature/corporate-azure-apim` | `70dee87bcd9a1f543af6bb7e5b5ef77d79b035ac` (2026-10-29 07:43 UTC) | Node + Docker + EKS hosting, company APIM / GPT-4o integration |
| Corporate GitHub | `majidalfuttaim/customer-care` (the `QAMAFerAI` application) | **Not verified through this GitHub connection** | Actual corporate source and deployment must be checked with authorized GitHub access |

The personal `main` and the personal enterprise branch have **diverged**. Do not merge either wholesale into the other: the AI adapters, credentials, runtime and deployment assumptions differ.

## Personal main — verified last completed update (baseline)

Commit `b44e66218d01`, 2026-11-06 05:40 UTC:

- Agents are scoped to completed, read-only quality scores; no evaluation permission.
- SHARE QA Lead, Customer Care Director and Platform Admin may evaluate.
- A sidebar-level logout event handler was added so the button works outside the dynamically rendered content.
- The Agent Home and Reports routes now receive `personaRole` correctly.

## Personal main — completed persona update (PR #23)

Merged as `76c3f242b1cb2c73c15f4ba4eaa18f433f76701e`.

- MAF presentation persona identifiers:
  - Agent: `Hassan.Aly@maf.ae` — Hassan Aly.
  - SHARE QA Lead: `Rima.Soliman@maf.ae` — Rima Soliman.
  - CC Director: `Nadia.Diehl@maf.ae` — Nadia Diehl.
  - Platform Admin: `Pradip.krishnamoorthy@maf.ae` — Pradip Krishnamoorthy.
- Email-only, explicitly unauthenticated presentation entry. No password field, credential processing or persona-choice shortcuts.
- Read-only previous-shift Agent assessment table, using two **synthetic** pre-scored Hassan interactions for an empty personal browser.
- Existing completed, non-synthetic Hassan assessments remain authoritative; the seed is never applied over them.
- SHARE QA Lead, CC Director and Admin retain evaluation controls and the existing Gemini pipeline.
- Updated automated checks and explicit sample-data provenance.

## Personal main — completed Results & Governance parity update (PR #24)

Merged as `c63634d791ecdcc01182190d0663a11eb8a4c8ab` on 2026-11-06.

- Persistent, internally scrollable sidebar on desktop with mobile layout fallback.
- A corrected combined QA status card: final scores appear only when the engine finalizes evidence, while observed-only percentages are visibly labeled non-final and the combined score remains pending.
- Theme-based weighted progress bars across the rubric's configured groups, with separate evidence coverage and scored-criterion counts.
- Outcome totals for **MET, MISSED, UNKNOWN, UNVERIFIED, NOT APPLICABLE** and **NOT EVALUATED** checkpoints; missing evidence is not auto-passed.
- Existing interaction inspection tabs, AI diagnostics, request tokens and reference provenance retained.
- SHARE QA Lead and CC Director have a **read-only Rubric & References** page; the active rubric/library revision and files/entry counts are also visible from their dashboards.
- Platform Admin remains the configuration editor. Changes are browser-local in the personal demo and do **not** synchronize across browsers/users.
- Invalid agent score averaging from absent final scores corrected without changing the underlying scoring engine.
- Corporate EKS/APIM files, internal customer data and production authentication were **not** changed.

Regression status before merge: Qualis stability, import regression and QA.MAFer.AI regression workflows all passed on branch commit `ef47eecd581ca67a8119d1d4420adcc1de15e215`. Post-merge GitHub Pages/CI status must be checked separately from Cloudflare Worker deployment.

## Not present on corporate branch (until separately reviewed and migrated)

The changes in this PR are personal-presentation behaviors, not corporate production features. Do not copy the sample-data seeding, mock role/email selection or public-site login into the corporate environment. For production, use authenticated Entra SSO, server-enforced RBAC, centrally sourced interaction data, and PostgreSQL-backed usage history.

For the eventual corporate migration, review these feature requirements independently:

1. The Agent role can inspect their own previously completed assessments, with no evaluation controls.
2. SHARE QA Lead can assess SHARE calls and see its agents.
3. CC Director can run authorized cross-BU evaluations and see all BU dashboards.
4. Platform Admin manages configuration, monitoring and user lifecycle.
5. Previous-shift metrics must come from real interaction ingestions and QA jobs—not presentation fixture data.
6. Carry forward the independent-review stage telemetry, 429 event reporting and token ledger without changing corporate APIM or EKS configuration.

## Verification after a merge

Record in a subsequent commit: actual personal `main` SHA, PR number, automated test result, GitHub Pages deployment and Cloudflare Worker deployment (separately checked). Update the corporate SHA only after authorized verification.
