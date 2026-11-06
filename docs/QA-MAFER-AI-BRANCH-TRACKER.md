# QA.MAFer.AI — Personal / Enterprise Branch Change Tracker

Last prepared: 2026-11-06 (UTC)

## Authoritative locations and boundaries

| Environment | Repository / branch | Last verified baseline | Scope |
| --- | --- | --- | --- |
| Personal presentation / Gemini | `krispradip/QAAI` / `main` | `9b05b118638f1890604acea849a0fda97308c870` (2026-11-06, PR #26 merged, before this tracker update) | **Fallback for 26 November showcase**; Cloudflare personal environment, Gemini, presentation UI, browser-local history |
| Personal enterprise migration branch | `krispradip/QAAI` / `feature/corporate-azure-apim` | `70dee87bcd9a1f543af6bb7e5b5ef77d79b035ac` (2026-10-29 07:43 UTC) | Node + Docker + EKS hosting, company APIM / GPT-4o integration |
| Corporate GitHub | `majidalfuttaim/customer-care` (the `QAMAFerAI` application) | **Not verified through this GitHub connection** | **PRIMARY LIVE DEMO for 26 November 2026**; corporate AWS/EKS, GPT-4o via APIM. Keep the existing corporate scoring engine and live UI as the authoritative showcase. |

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

## Personal main — historical Results & Governance parity update (PR #24; read-only role policy superseded by PR #25)

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

## Demonstration hierarchy — user confirmed 2026-11-06

- **26 November 2026**: Corporate GitHub deployment is the **primary live showcase**; personal `main` / Cloudflare / Gemini is strictly the **fallback** if corporate AI/APIM hits HTTP 429 or cannot complete an evaluation.
- Preserve the working **corporate** scoring/evaluation engine and already implemented functionality. The personal branch is not the source of truth for corporate feature implementation. Changes must not be mirrored blindly in either direction.
- From the 2026-11-05 corporate UI discussion: the Scorecard was made too cluttered by full AI execution diagnostics and reference provenance, plus a duplicate combined-score display. The intended compact corporate Results layout keeps combined, rule, AI outcome and evidence-linked QA findings on the Scorecard; detailed execution diagnostics and reference provenance belong in their own tabs. Agreed tabs: Scorecard, Transcript, Agent timeline, Key insights, AI Diagnostics, References. Keep only concise operational status on the Scorecard.
- Corporate test observation from that discussion: initial GPT-4o evaluation succeeded (4,512 tokens); independent evidence review received HTTP 429 with about 75 seconds cooldown. This is a fallback rationale, not proof that all corporate evaluations fail.
- Do **not** change corporate source or infrastructure based on personal demo changes without explicit separate authorization. Corporate latest GitHub SHA and live deployment status are not verified through this connection.

## Personal main — completed governance correction (PR #25)

Merged as `61ec78f8efd8809afeb434d23846598b868e8182` on 2026-11-06.

- Supersedes the **read-only** lead/director restriction from historical PR #24.
- BU Lead: editable/testable rubric and CSV reference uploads limited to assigned BU; CC Director: editable/testable rubrics across BUs and authorized publication; Agent: own completed scores only, no rubric editing.
- Working drafts, explicit published baseline revisions and local agent change notifications; testing a draft does not overwrite an official assessed interaction.
- Original Config editor and Reference Library UI retained, rather than rebuilt. Demo storage and notifications remain browser-local and are **not** shared or security-enforced in production.
- Qualis stability checks, import regression and QA.MAFer.AI regression workflows all passed on the PR branch.

## Personal main — completed diagnostics/coverage presentation (PR #26)

Merged as `9b05b118638f1890604acea849a0fda97308c870` on 2026-11-06.

- AI Diagnostics interaction tab limited to Platform Admin; hidden from BU Lead, CC Director and Agent results.
- Retain the full underlying diagnostic telemetry; remove only its business-persona presentation.
- A **Why is Combined QA Pending?** panel now lists unresolved criteria and evidence requirements where observed score exists but coverage is insufficient (e.g., observed 90% / 46% coverage). Missing evidence is not turned into a pass/fail or an invented final score.
- Qualis stability checks, import regression and QA.MAFer.AI regression workflows all passed on the PR branch.
- The merge is GitHub verified; current Cloudflare Worker serving this main SHA and final on-screen UX **not independently verified**.

## Ongoing change-control

- **Corporate primary:** prioritize UI clarity, working enterprise evaluation and graceful 429 handling for the showcase. Do not copy personal demo authentication, sample-data seeding, Gemini adapters or browser-only storage to corporate.
- **Personal backup:** record every PR/merge SHA and changed behavior in this tracker; maintain independent Gemini compatibility and minimum viable operational test before the demo.
- For each new change, record (1) repo and branch, (2) PR and SHA, (3) affected personas/screens, (4) test/CI outcome, (5) deployment check and (6) whether it is corporate-only, personal-only or a separately approved parity improvement.

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
