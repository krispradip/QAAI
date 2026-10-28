/**
 * Runtime environment contract for AWS Lambda.
 * An approved deployment mechanism must inject ENTERPRISE_AI_API_KEY
 * from the enterprise secret store. No credentials in source or build files.
 */
export async function resolveRuntimeEnv(config = process.env) {
  const key = config.ENTERPRISE_AI_API_KEY;
  if (typeof key !== "string" || !key.trim()) {
    throw Error("Enterprise AI runtime credential unavailable");
  }
  return {
    ENTERPRISE_AI_API_KEY: key,
    ENTERPRISE_AI_ENDPOINT: config.ENTERPRISE_AI_ENDPOINT || undefined
  };
}
