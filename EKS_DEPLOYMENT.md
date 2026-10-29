# QA.MAFer.AI — GPT-4o integration on existing company EKS

Company application URL: https://qamaferai.dev.grid2.maf.ae/
Company GitHub repository: majidalfuttaim/customer-care (not accessible via the connected personal GitHub account).

## Application files to transfer

- Replace `src/worker.js`, `public/js/config.js`, `public/js/ui.js`.
- Add `src/enterprise-ai.js`.
- Adapt `src/server.js` (existing DevOps Node.js server) to pass `ENTERPRISE_AI_API_KEY` and `ENTERPRISE_AI_ENDPOINT` to the worker, and update `/readyz` for the enterprise key.
- `public/js/app.js` and `public/js/engine.js` contain copy-only updates removing obsolete Gemini wording (no behavior change).
- Existing company `package.json`: `"type":"module"`, Node >=24, `"start":"node src/server.js"`.
- Existing company `Dockerfile`: Node.js 24 distroless, `CMD ["src/server.js"]`, port 8080.
- Existing company `.dockerignore`: allowlist `src/`, `public/`, `package.json` and Dockerfile.
- Keep existing Kubernetes Helm, ingress, image registry, Vault and authentication controls. No Lambda and no alternate EKS server.

## Environment (DevOps)

- `PUBLIC_ORIGIN=https://qamaferai.dev.grid2.maf.ae`
- `ENTERPRISE_AI_ENDPOINT` = approved Azure APIM OpenAI-compatible chat-completions URL
- `ENTERPRISE_AI_API_KEY` = rotated corporate credential injected from an approved runtime secret store
- `PORT=8080`
- Ensure pods can reach APIM over HTTPS and verify ingress timeout for the two-pass evaluation.
- Do not commit the API key or customer transcripts. PostgreSQL integration is separate.

## Verify deployment

The old live API previously returned `Gemini rejected the request (400, INVALID_ARGUMENT, API_CREDENTIALS).`
That exact error is produced by the **old** `worker.js`; it is not emitted by the enterprise GPT-4o backend. A working `/api/health` response with `apiReady:true` is not enough to prove a new image has been deployed.

DevOps should verify the running image digest/commit and pod rollout, then test `/readyz`, `/api/health`, and a synthetic evaluation in Chrome Network > Response. Do not send real transcripts until security approval.

Testing here uses mocked APIM calls; live company APIM connectivity has not been verified.
