# QA.MAFer.AI — company EKS deployment

Confirmed company frontend: https://qamaferai.dev.grid2.maf.ae/
Confirmed infrastructure: **Amazon EKS**, not AWS Lambda.

Use the repository Dockerfile to build a Node.js 22 container. The app serves `public/` and implements `GET /api/health` and `POST /api/evaluate` using the existing QA engine and corporate GPT-4o Azure APIM adapter.

## Platform team actions
1. Build and scan the image through the approved company CI/CD pipeline; push to the approved ECR registry.
2. Deploy via the existing EKS namespace, Helm chart or Kubernetes manifests. Container port: **8080**. Keep the existing company Ingress, DNS, TLS, WAF and SSO controls.
3. Inject `ENTERPRISE_AI_API_KEY` from the company-approved secret store at **runtime** (e.g. External Secrets + Secrets Manager); never commit it. Rotate the previously shared key.
4. Set `ENTERPRISE_AI_ENDPOINT` to the approved Azure APIM Chat Completions URL and `QA_ALLOWED_ORIGINS=https://qamaferai.dev.grid2.maf.ae`.
5. Ensure EKS pod egress, DNS, firewall rules and TLS trust permit calls to the APIM endpoint.
6. Set readiness/liveness probes to `GET /api/health`; use appropriate resource requests/limits, non-root container securityContext, replicas and HPA under existing platform standards.
7. Confirm that the corporate ingress timeout accommodates two sequential AI calls; larger transcript batches need a separate asynchronous job architecture. Current API is synchronous.
8. Require company authentication and authorization at ingress or application layer. CORS/origin checking is **not** authentication. Avoid logging transcript bodies, prompts or secrets.
9. Smoke test with synthetic data and verify GPT-4o JSON mode support. No live corporate APIM call was performed by the assistant.

## Deployment compatibility
This is a standalone container adaptation, not a claim about the existing company's Dockerfile or Helm chart. Compare the current company repository and retain its approved Kubernetes configuration, auth middleware and security controls. Do **not** deploy the Lambda adapter on EKS.
