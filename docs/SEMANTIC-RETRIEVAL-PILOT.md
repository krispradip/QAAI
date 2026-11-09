# QA.MAFer.AI — semantic and retrieval pilot

Updated 2026-11-09. **Personal Gemini branch only**; corporate GitHub/AWS/APIM source untouched.

## What is implemented

1. `public/js/semantic-assessment.js` recognises a very small, explicitly approved set of observable agent behaviours for four checkpoint IDs: `opening-3`, `assistance-1`, `survey-1`, `closing-1`. A scoped published semantic-equivalent row may extend the phrase list for those same checkpoint IDs. Recognition requires an attributed agent turn, a valid line number, a relevant turn position and absence of disqualifying negation. The engine returns **MET only when directly observed**; never invents MISSED, NA, CRM events or policies.
2. `public/js/engine.js` skips recognised checkpoints in the LLM request only if `rubric.optimization.semanticFirst===true`, preserving the remaining checks for Gemini + independent review. It merges recognised anchored evidence back into existing criterion calculations. Final weighted score and rubric weights remain outside the LLM. Each completed assessment keeps a `semanticAudit` with check counts and method.
3. `public/js/retrieval.js` is a metadata-filtered, lexical-ranked selector for approved reference-library files. It filters by explicit BU, market, channel and criterion; caps selected entries and characters; and carries source filename/version/row provenance. It is **not** vector or embedding RAG. No infrastructure added.
4. Config's `Semantic & retrieval pilot` section has two switches, both **OFF by default**. BU Lead/Admin may turn them on in a **working draft** and test against interactions. Changes affect official assessment only after a deliberate baseline publication.
5. The current `activeReferenceEntries` path remains intact and is used when the retrieval pilot is not selected.

## Safety and limitations

- Do not treat lexical matching as broad semantic understanding. Only opt-in after validating false positives/negatives against independently QA-reviewed interactions.
- No vectors, embeddings, PostgreSQL integration, S3 ingestion or corporate APIM modifications are part of this pilot.
- No model-call reduction is guaranteed for a particular interaction. Checkpoint count decreases only for safely recognised behaviours. If the remaining checkpoints need reasoning, Gemini still receives the dialogue.
- This does not address audio/CRM/Genesys verification gaps. Unverifiable stays unverifiable.
- Missing explicit BU metadata prevents non-global reference rows being retrieved. The older legacy path is unchanged by default.
- Preserve source/version and evaluation method for auditability. Never upload confidential corporate policy or customer data to the publicly hosted personal fallback.

## Corporate migration (separately review before 26 November)

1. Compare with live enterprise scoring engine and existing reference APIs. **Do not replace** corporate engine or GPT-4o/APIM adapter wholesale.
2. Port the pure semantic and retrieval modules through reviewed incremental diffs; adapt for Node/EKS and corporate auth/RBAC.
3. Connect governed reference publication to existing PostgreSQL 16 (once application persistence has been wired). Use database full-text retrieval first; introduce pgvector + an approved embeddings endpoint only if warranted by corpus size/language retrieval quality.
4. Produce a labelled benchmark of 100–200 independently scored real/approved de-identified interactions. Gate per-checkpoint automation on evidence precision, zero critical unsupported passes, score agreement, unknown rate and token usage.
5. Only then enable semantic-first/ranked retrieval per published BU baseline and compare APIM token usage/429 events to the current official pipeline.

## Testing

`npm test` invokes Node's test runner including `tests/semantic-retrieval-pilot.test.mjs`. Keep GitHub Actions green and test the working draft in a browser. Deployment of personal Cloudflare Worker requires separate verification.
