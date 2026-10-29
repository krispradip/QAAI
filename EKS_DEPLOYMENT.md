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

## Missing adapter / non-Pages deployment correction (2026-10-29)

EKS pod startup failed with `ERR_MODULE_NOT_FOUND: /app/src/enterprise-ai.js`. This means the **company-built image** does not contain the adapter, even though the personal enterprise branch has it. Confirm `src/enterprise-ai.js` is committed to the company application repository and is included in the exact Docker build context, commit and image digest used by the EKS deployment.

Do **not** use GitHub Pages for the company deployment. Transfer application files to the one company repository and deploy through its existing AWS EKS CI/CD process. Retain its chart, Vault and image-publish workflow.

This branch now includes a Node 24 Docker build stage that imports `src/server.js` during the image build. That import requires `src/worker.js`, `src/enterprise-ai.js`, and `src/evidence-policy.js`; a missing file fails the build rather than failing in the EKS pod. The added `npm run check:eks` and `.github/workflows/eks-validation.yml` provide similar checks for CI. They do not deploy to AWS.

Do not copy personal GitHub workflow files into company GitHub unless explicitly adopted by DevOps; the company's existing AWS pipeline remains authoritative.
