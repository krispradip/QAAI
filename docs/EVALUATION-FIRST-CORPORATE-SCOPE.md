# QA.MAFer.AI — Evaluation-first corporate delivery scope
Status: agreed 2026-11-09. Personal GitHub is development/test; corporate AWS/EKS + corporate APIM/GPT-4o is authoritative for the 26 November showcase.

## Explicit phase boundary
**Phase A — perfect evaluation and Results:** rules, semantic evaluation, governed retrieval/RAG, LLM assessment, independent evidence controls, official scoring, reference provenance, error/429 handling, token usage and the approved decluttered Results/Diagnostics layout. Validate against approved, de-identified representative cases in the personal test environment; port to corporate only through reviewed, corporate-specific code diffs/files.

**Phase B — later:** login, SSO, RBAC/persona screens, user administration, manager access. Do NOT include personal browser-local demo identity or login components in the corporate Phase A change package. Do not remove or alter corporate authentication if it already exists; exclude it from the change scope.

## Source audit — what is implemented, not what is assumed
- `public/js/engine.js`: deterministic rules, evidence-state scoring; opt-in semantic checkpoint skip; existing Gemini request/independent-review pipeline. Published score and coverage are computed by the local engine, not the LLM.
- `public/js/semantic-assessment.js`: explicitly limited positive phrase-equivalence pilot for `opening-3`, `assistance-1`, `survey-1`, `closing-1`. Not embedding-based semantics, not general intent inference. Guard against position/negation false positives; ensure negative/contradictory contexts abstain. Do not enable automatically.
- `public/js/retrieval.js`: metadata-filtered, lexical-ranked hints with small prompt budget. No indexed/canonical approved SOP corpus, embeddings, vector search or persistent RAG system.
- `public/js/reference.js`: browser-local, versioned CSV schemas for phonetic, semantic equivalents, terminology and evaluation guidance. Approved and timestamped policy/SOP evidence is not yet a trusted source.
- `src/evidence-policy.js`: audio, CRM/Genesys actions and SOP-dependent findings are forced to UNKNOWN/UNVERIFIED when authoritative source data is unavailable. Must keep these guardrails while enabling only evidence-backed policy findings with citations.
- Corporate `majidalfuttaim/customer-care` is currently inaccessible through ChatGPT GitHub App (404); do not assume its source matches personal `main` or replace its GPT-4o adapter.

## Corporate evaluation engine — required target sequence
1. Resolve rubric/BU/market/channel and published baseline version.
2. Inventory available transcript, audio/events, CRM/Genesys and approved policy data, so impossible checks are not sent to AI.
3. Evaluate connected deterministic rules from trusted source evidence, retaining UNKNOWN when missing.
4. Semantic-first checkpoint detection using approved behaviours, agent/customer attribution, context windows, negation/discourse checks, calibrated precision and explicit abstention/fallback. Preserve evidence line IDs and method.
5. Governed RAG over approved SOP/knowledge chunks: source file ID, revision, BU/market/channel, effective/expiry dates, citation and policy authority. Prefer PostgreSQL full-text/hybrid retrieval; use pgvector and an approved embedding endpoint only after infrastructure/permission and quality validation. Retrieved text is policy context, not proof that the agent performed an action.
6. Route genuinely unresolved/complex checkpoints to GPT-4o via existing corporate APIM. Send minimum relevant evidence and grounded passages. Keep independent review for high-risk or ambiguous findings, review prompts and token consumption.
7. Validate every finding against source requirements and expected schema; score with the established deterministic engine. Record score, evidence coverage, rubric revision, method, reference versions and any incomplete/429 status.
8. Keep complete interaction history and official baseline unchanged when testing working drafts.

## Corporate Results/Diagnostics UI — approved placement
- Agent name and interaction ID at top.
- **Competency Overview & Evidence Highlights** immediately underneath, preceding **Combined QA Score**.
- Combined QA, evidence coverage, theme-based scores, checkpoint outcomes and evidence-linked findings stay on Results; no duplicate scorecards or execution tables.
- **Reference Provenance** has its own tab immediately after **Key Insights**.
- Detailed GPT-4o/APIM request stages, HTTP, retry/cooldown and input/output totals moved to **AI Usage & Diagnostics**; access controlled by existing corporate policy, without new persona/login screens.
- See `docs/RESULTS-UI-DECLUTTER-CORP-MIGRATION.md` for UI handoff details. Personal PR #29 is a visual reference only, not a corporate replacement package.

## No-go before corporate code handoff
- Do not market the current lexical hints as full enterprise RAG or four phrase patterns as general semantic evaluation.
- No fabricated MET/MISSED/NA, no automatic passing of source-dependent checks, no weakening of evidence validation to inflate coverage.
- Evaluate on 100–200 independently QA-labelled, approved/de-identified interactions (including Arabic/English, negation, short calls, partial transcript, no data, 429 cases). Compare unsupported-MET rate, checkpoint agreement, final-score agreement, coverage, tokens, requests and latency against current GPT-4o baseline.
- Require enterprise source/diff verification (evaluation/Results/Usage files) before generating drop-in corporate replacements. Never port personal Cloudflare/Gemini, browser-local stores or login/persona modules.
- Keep the 26 November demo primary and stable. Release new routing as opt-in behind a validated feature flag until acceptance is proven.

## Change log
- Personal PR #28: first opt-in semantic/lexical retrieval pilot, **not** full RAG.
- Personal PR #29: Results UI de-cluttering and AI usage move. No scoring changes.
- 2026-11-09: User explicitly deferred login/persona work; corporate transfer scope narrowed to evaluation engine + approved layouts only.
