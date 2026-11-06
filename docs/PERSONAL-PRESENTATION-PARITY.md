# Personal QA.MAFer.AI presentation parity (Gemini)

This feature branch adapts presentation-facing QA capabilities to the existing personal **Cloudflare Workers + Gemini** stack. It does **not** copy the corporate Azure/APIM adapter, corporate credentials, private reference-library CSVs or real customer transcripts. The existing `main` branch is preserved.

## Included

- Compact interaction inspection with consolidated rule/AI checkpoints, evidence-aware filtering and full transcript navigation.
- Six inspection tabs: Scorecard, Transcript, Agent timeline, Key insights, AI Diagnostics and References.
- Local reference-library provenance, recorded per assessment attempt: revision, selected source file versions and entry counts.
- Gemini provider usage metadata: input, output, total tokens per request; independent review request status and 429 retry-after when forwarded by Gemini.
- AI Usage & Diagnostics navigation with daily assessment counts, successes, failures, token volume and rate-limit history; exportable CSV.
- Browser-only Word (.docx) and Markdown table import for Genesys-style transcripts.
- Existing Gemini configuration, scoring engine, interactive prototype UI and Cloudflare Worker deployment.
- Local **Config → QA Configurator → Import rubric JSON** for a saved corporate-format rubric backup; active model remains a supported Gemini model.
- Local **Config → Reference Library → Import library JSON** to load an exported versioned reference library. Existing CSV upload still works for individual datasets.
- Uploaded or pasted transcripts are parsed on the client; the supported Genesys Word and Markdown formats normalize to the same interaction model.

## Deploy and test

1. Review/merge the PR into your personal repository only after its tests succeed.
2. Deploy the preview branch to Cloudflare Workers or merge to main for your current personal deployment.
3. Set the **GEMINI_API_KEY** as a Cloudflare runtime secret (never in GitHub source).
4. Open `/api/health` and check `personalBackup: gemini_presentation_v1` and `apiReady: true`.
5. Run the synthetic sample, inspect the six tabs, then view AI Usage & Diagnostics.
6. To match an existing corporate rubric, use **Config → QA Configurator → Import rubric JSON**, inspect the resulting configuration, and save any intentional changes.
7. To load approved reference data, use **Config → Reference Library → Import library JSON** (or the existing individual CSV upload controls).
8. Upload a transcript or paste speaker-labelled text. Never add a real transcript or private reference CSV/JSON to the public GitHub repository.
9. DOCX extraction depends on native `DecompressionStream('deflate-raw')` in a modern Chromium browser; it does not send the file to any external conversion service.

## Privacy and billing limitation

The repo is **public**. Do not commit confidential company rubrics, internal reference datasets, original customer conversations or credentials into it. Use only synthetic or formally approved anonymized data for the unauthenticated public demo. Even when imported only into the browser, selected reference entries and redacted transcript text are transmitted to the personal Gemini service during an assessment; basic masking does not constitute enterprise DLP. Rubrics, reference library and usage history are **browser-local**. Provider usage metadata is not guaranteed for rejected requests and must not be interpreted as zero. This dashboard is not a billing system shared across devices.

## Architecture compatibility

Gemini uses its existing responseSchema; OpenAI strict `json_schema` and APIM policies are **not** copied to the Gemini adapter. Prompt and evaluation rules remain independent of the presentation modules.

## What is not automatically migrated

Corporate browser localStorage and IndexedDB are separate from the personal domain. The personal app cannot access the original corporate rubric revision, reference-library datasets, or historical evaluated interactions by itself. Export the configuration from the authorized corporate browser and import it *locally* to this personal browser, subject to internal data-sharing approval. The personal backup is not a centralized synced copy of the corporate environment.

## Persona login and director presentation (2026-11-06)

The personal demo begins with a standalone **Persona** login screen. Type a demo email, leave the password blank and choose Login. The password is intentionally ignored; never type a real password. This flow is only an email-to-persona simulated browser-tab session, not authentication or server-enforced RBAC.

| Persona | Email | First screen | Scope |
| --- | --- | --- | --- |
| SHARE Agent | `layla.agent@demo.mafer.ai` | Home | Own SHARE interactions |
| SHARE BU Lead | `share.lead@demo.mafer.ai` | Home | All SHARE agents, QA studio, reporting |
| Customer Care Director | `cc.director@demo.mafer.ai` | BU Performance | Cross-BU portfolio, SHARE agent drill-down |
| Platform Admin | `admin@demo.mafer.ai` | Platform Administration | Configuration, usage, demo user lifecycle |

To change persona, **Log out** and sign in using a different demo email. The Admin can create and offboard other demo users with unique emails from Platform Administration. This data is browser-local.

### Customer Care Director BU and brand hierarchy

| BU | Brand | Source |
| --- | --- | --- |
| Retail | Carrefour | Synthetic demo |
| Entertainment | VOX | Synthetic demo |
| Lifestyle | Crate & Barrel | Synthetic demo |
| AMBU | MOE | Synthetic demo |
| DBU | TAG | Synthetic demo |
| SHARERewards | SHARE | Browser-local real assessments |
| Fintech | MGC Classic | Synthetic demo |

SHARERewards metrics and agent rows are derived from the **same browser-local assessment records** as SHARE BU Lead dashboards. They do not synchronize with corporate infrastructure or any other user's browser, and unevaluated calls have no fabricated score. The other BU metrics are illustrative fixtures only.

### Transcript import parity

The existing DOCX intake remains, and the paste handler also recognizes Word or Outlook HTML tables, Markdown pipe tables, tab-separated text, and column-per-line dialogue table copies. The normalizer produces the existing Genesys-compatible text contract before assessment. Speaker-labelled plain transcript paste still works.

### Visual system

The blue, indigo and cyan palette now extends to the animated Gemini evaluator, intake/upload cards, toolbar, configuration and reference library. Red remains for genuine errors and failed QA checkpoints. Logo and evaluator motion respect reduced-motion preferences.

### Public repository and production boundaries

The public GitHub repository includes synthetic sample conversations and safe reference fixtures only. Actual customer conversations and internal corporate libraries were **not** uploaded. The personal Cloudflare/Gemini deployment is not a company-approved system for processing confidential customer data. The persona login is a presentation simulation, not SSO or enterprise access control.

The preserved rollback branch is `baseline/personal-gemini-pre-roles-branding-20261106`.
