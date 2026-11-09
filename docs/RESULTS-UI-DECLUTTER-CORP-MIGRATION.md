# QA.MAFer.AI — corporate Results UI decluttering handoff (9 November 2026)

## Status
- Personal Github `main` implementation: **merged PR #29** at `b243bc264a7e551989e98284274ad5df83df1e6f`, CI passed.
- Corporate `majidalfuttaim/customer-care` source access: still inaccessible to ChatGPT (404). **No corporate code has been changed or verified.**
- Corporate primary remains AWS/EKS + APIM/GPT-4o; personal main Gemini/Cloudflare is for test/fallback. Never overwrite corporate modules with personal equivalents wholesale.

## Corporate screen requirements, grounded in user screenshots
1. On the **interaction Results** page, render **Agent Name · Interaction ID** with existing metadata as the heading.
2. Render the existing **Competency overview & evidence highlights** immediately BELOW that heading and BEFORE the **Combined QA Score** block. Do not copy or recompute percentages, evidence, assessment data or scoring logic. Move the already-rendered component using the same assessment object. Use its existing scoring semantics.
3. The Combined QA Score and evidence coverage cards, scoring themes, checkpoint outcome counts and evidence-linked findings remain under Results, in their established order. No duplicate score banners.
4. Remove the **token/request breakdown** block (Input Tokens, Output Tokens, Reported Total, AI Requests, individual requests/stages/HTTP/retry budget/cooldown) from Results and render it in **AI Usage & Diagnostics**. The usage page should show the current interaction's records and a history/interaction filter if available. Preserve status codes and model-stage details, and never infer missing token metadata.
5. Move **Reference Library Provenance** into a dedicated tab positioned DIRECTLY after **Key Insights**. Keep existing reference selection/source IDs, versions, selected entry counts, display and authorization. Tabs should not duplicate the content on Results.
6. Role restrictions: Only authorized admins can access technical usage and diagnosis. BU Leads and Agents should not gain technical telemetry access just because a tab was moved.
7. The UI relocation must not change the published rubric, LLM prompts, scoring, reference retrieval, retries, model settings or backend traffic.

## How to implement in corporate without source access
1. Find the corporate component/function containing the exact literal **"Competency overview & evidence highlights"**, and the Results page parent containing **"COMBINED QA SCORE"**. Relocate the existing competency component immediately before the combined-score component.
2. Find the component containing **"Reference Library Provenance"**; remove it from the Scorecard body, add a **Reference Provenance** tab after **Key Insights**, reuse its existing renderer.
3. Find the Results component containing the per-request GPT-4o/APIM usage table. Remove its render location and reuse that table inside the existing **AI Usage & Diagnostics** page. Bind it to the existing attempt/interaction telemetry store, not the display-only assessment object. Preserve 2 requests: initial GPT-4o and independent evidence review.
4. Preserve existing CSS styling, adjust the summary to a compact 2-column layout with responsive single-column fallback.
5. Verify no duplicate score, provenance or token telemetry on Results; verify reference tab content, role restrictions, and complete billing-accurate token displays. Test a completed evaluation, pending result and 429 incomplete evaluation without altering final scoring.
6. Deploy through the existing approved corporate GitHub/Argo CD/EKS workflow, not through personal Cloudflare.

## Personal implementation files for design reference ONLY
- `public/js/presentation-inspection.js`: compact competency/evidence summary placement, Reference Provenance tab.
- `public/js/presentation-usage.js`: separate per-interaction AI request and token usage details.
- `src/worker.js`: personal Gemini telemetry tracks actual output-token budget; corporate GPT-4o/APIM telemetry must use its **own** budgets.
- `public/css/presentation-results-v2.css`: compact responsive styling.
- `tests/results-parity-governance.test.mjs`, `tests/results-layout-usage.test.mjs`: regression contracts.

**Next corporate integration input:** the current corporate Results component and AI Usage & Diagnostics component (source files or approved extracts, including their render/callback code) are required for exact replacement files/diffs. Screenshots alone cannot establish code or repository paths.
