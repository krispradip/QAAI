/**
 * Runtime environment for containerized QA.MAFer.AI.
 * Kubernetes should inject ENTERPRISE_AI_API_KEY from an approved secret store.
 * Never log or return the credential.
 */
export function resolveRuntimeEnv(config = process.env) {
  const key = config.ENTERPRISE_AI_API_KEY;
  if (typeof key !== "string" || !key.trim())
    throw Error("Enterprise AI runtime credential unavailable");
  return {
    ENTERPRISE_AI_API_KEY: key,
    ENTERPRISE_AI_ENDPOINT: config.ENTERPRISE_AI_ENDPOINT || undefined
  };
}
