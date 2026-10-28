# QA.MAFer.AI — corporate Azure AI APIM integration

This branch is a **portable migration patch**, not the company deployment.
The company GitHub repository is inaccessible through the currently connected account.

## What changes
- `src/enterprise-ai.js` implements server-side OpenAI-compatible Chat Completions through corporate Azure API Management (APIM).
- `src/worker.js` uses the adapter for both initial QA evaluation and independent review; the existing rubric, deterministic scoring, evidence checks, transcript import, and UI remain.
- The selectable model is the supplied corporate deployment name, `gpt-4o`.
- A JSON-mode response is parsed and checked by existing QA evidence normalization and validation, including evidence provenance enforcement.
- Secrets and full upstream error bodies are never returned to users.

## Company-host setup

1. Apply the changed files from this branch into the **company repository** through its normal review/CI process. Do not merge this branch into personal `main`.
2. Configure runtime secret **`ENTERPRISE_AI_API_KEY`** in the corporate-managed Vault, mapped securely to the application runtime. Never place it in code, browser, GitHub, build variables, or unprotected logs.
3. Set non-secret runtime configuration:
   - `ENTERPRISE_AI_ENDPOINT`: `https://apim-prod-ai-platform.azure-api.net/foundry-customer-care-prod/openai/v1/chat/completions`
4. Allow server-side outbound HTTPS from the hosting environment to the corporate APIM endpoint (including corporate network/DNS requirements); do not call APIM from the browser.
5. Verify corporate APIM accepts `model: gpt-4o`, `response_format: { type: json_object }`, `max_tokens`, and its deployment's capacity/context limits. If APIM does not support JSON mode, adjust only the provider adapter following approved platform contract.
6. Run a synthetic, non-customer sample; check `/api/health` returns `apiReady: true` without disclosing any credentials. Review per-criterion MET/MISSED/UNKNOWN and independent evidence validation.
7. Configure authentication/RBAC, audit, logging/retention and privacy requirements before processing real customer transcripts. The prototype does not make the company deployment production-ready by itself.

## Important
The API key pasted in chat must be rotated and replaced. The branch contains **no real credential**. No live call to the corporate endpoint was attempted. CI uses mocks only.
