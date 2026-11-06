# QA.MAFer.AI — Personal / Enterprise Branch Change Tracker

Last prepared: 2026-11-06 (UTC)

## Authoritative locations and boundaries

| Environment | Repository / branch | Last verified baseline | Scope |
| --- | --- | --- | --- |
| Personal presentation / Gemini | `krispradip/QAAI` / `main` | `b44e66218d010961a13248b00479abdb98be4113` (2026-11-06 05:40 UTC, *before* current PR) | Cloudflare personal environment, Gemini, presentation UI, browser-local history |
| Personal enterprise migration branch | `krispradip/QAAI` / `feature/corporate-azure-apim` | `70dee87bcd9a1f543af6bb7e5b5ef77d79b035ac` (2026-10-29 07:43 UTC) | Node + Docker + EKS hosting, company APIM / GPT-4o integration |
| Corporate GitHub | `majidalfuttaim/customer-care` (the `QAMAFerAI` application) | **Not verified through this GitHub connection** | Actual corporate source and deployment must be checked with authorized GitHub access |

The personal `main` and the personal enterprise branch have **diverged**. Do not merge either wholesale into the other: the AI adapters, credentials, runtime and deployment assumptions differ.

## Personal main — verified last completed update (baseline)

Commit `b44e66218d01`, 2026-11-06 05:40 UTC:

- Agents are scoped to completed, read-only quality scores; no evaluation permission.
- SHARE QA Lead, Customer Care Director and Platform Admin may evaluate.
- A sidebar-level logout event handler was added so the button works outside the dynamically rendered content.
- The Agent Home and Reports routes now receive `personaRole` correctly.

## Personal main — current proposed update

Branch `feature/main-hassan-personas-readonly-20261106`, pending validation and merge.

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
