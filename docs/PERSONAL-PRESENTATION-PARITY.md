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

## Deploy and test

1. Review/merge the PR into your personal repository only after its tests succeed.
2. Deploy the preview branch to Cloudflare Workers or merge to main for your current personal deployment.
3. Set the **GEMINI_API_KEY** as a Cloudflare runtime secret (never in GitHub source).
4. Open `/api/health` and check `personalBackup: gemini_presentation_v1` and `apiReady: true`.
5. Run the synthetic sample, inspect the six tabs, then view AI Usage & Diagnostics.
6. DOCX extraction depends on native `DecompressionStream('deflate-raw')` in a modern Chromium browser; it does not send the file to any external conversion service.

## Privacy and billing limitation

The repo is public. Use only synthetic or appropriately anonymized data in this unauthenticated personal demo. Rubrics, reference library and usage history are **browser-local**. Provider usage metadata is not guaranteed for rejected requests and must not be interpreted as zero. This dashboard is not a billing system shared across devices.

## Architecture compatibility

Gemini uses its existing responseSchema; OpenAI strict `json_schema` and APIM policies are **not** copied to the Gemini adapter. Prompt and evaluation rules remain independent of the presentation modules.
