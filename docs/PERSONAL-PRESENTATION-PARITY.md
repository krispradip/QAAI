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
