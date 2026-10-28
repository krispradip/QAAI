/**
 * QA enterprise LLM adapter | Azure AI Foundry behind corporate APIM.
 * Server-side only: NEVER expose keys or this endpoint request to the browser.
 * The existing QA engine remains provider-independent.
 */
export const DEFAULT_ENTERPRISE_AI_ENDPOINT =
  "https://apim-prod-ai-platform.azure-api.net/foundry-customer-care-prod/openai/v1/chat/completions";

export class EnterpriseAIError extends Error {
  constructor(message, status = 502, code = "UNCLASSIFIED", category = "UNSPECIFIED") {
    super(message);
    this.name = "EnterpriseAIError";
    this.status = status;
    this.providerError = { httpStatus: status, code, category };
  }
}

function endpointFor(env) {
  const endpoint = env.ENTERPRISE_AI_ENDPOINT || DEFAULT_ENTERPRISE_AI_ENDPOINT;
  let url;
  try { url = new URL(endpoint); } catch {
    throw new EnterpriseAIError("Enterprise AI endpoint configuration is invalid", 503, "CONFIG", "ENDPOINT");
  }
  if (url.protocol !== "https:" || url.username || url.password ||
      !url.pathname.endsWith("/openai/v1/chat/completions")) {
    throw new EnterpriseAIError("Enterprise AI endpoint configuration is invalid", 503, "CONFIG", "ENDPOINT");
  }
  return url.toString();
}

function categorize(status, raw) {
  const code = typeof raw?.error?.code === "string" &&
    /^[A-Z_]{2,50}$/.test(raw.error.code) ? raw.error.code : "UNCLASSIFIED";
  const text = String(raw?.error?.message || "").toLowerCase();
  const category =
    status === 429 ? "QUOTA_OR_RATE_LIMIT" :
    status === 401 || status === 403 ? "API_ACCESS" :
    /model|deployment/.test(text) ? "MODEL_ACCESS" :
    /response.?format|json|schema/.test(text) ? "RESPONSE_FORMAT" :
    /quota|rate limit/.test(text) ? "QUOTA_OR_RATE_LIMIT" :
    status >= 500 ? "UPSTREAM_UNAVAILABLE" : "UPSTREAM_REJECTED";
  return { code, category };
}

/**
 * Chat Completions JSON mode is supported by GPT-4o and the Azure v1 API.
 * Validate the returned object in the caller; JSON mode does not validate schema.
 */
export async function enterpriseChatJSON({ env, model, system, user, maxTokens = 8192 }) {
  if (!env.ENTERPRISE_AI_API_KEY) {
    throw new EnterpriseAIError(
      "Enterprise AI API key is not configured in the runtime secret store",
      503, "CONFIG", "API_CREDENTIALS"
    );
  }
  const endpoint = endpointFor(env);
  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "api-key": env.ENTERPRISE_AI_API_KEY
      },
      signal: AbortSignal.timeout(95000),
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system + "\nReturn a complete JSON object only." },
          { role: "user", content: JSON.stringify(user) }
        ],
        temperature: 0,
        max_tokens: maxTokens,
        response_format: { type: "json_object" }
      })
    });
  } catch {
    throw new EnterpriseAIError(
      "Enterprise AI connection failed or timed out", 502, "NETWORK", "UPSTREAM_UNAVAILABLE"
    );
  }
  if (!response.ok) {
    let raw = {};
    try { raw = await response.json(); } catch { /* no raw upstream data in client errors */ }
    const { code, category } = categorize(response.status, raw);
    throw new EnterpriseAIError(
      "Enterprise AI rejected request (" + response.status + ", " + category + ")",
      response.status, code, category
    );
  }
  let data;
  try { data = await response.json(); } catch {
    throw new EnterpriseAIError("Enterprise AI returned invalid JSON response", 502, "INVALID_RESPONSE", "RESPONSE_FORMAT");
  }
  const choice = data?.choices?.[0];
  if (choice?.finish_reason !== "stop") {
    throw new EnterpriseAIError(
      "Enterprise AI response was truncated or incomplete",
      502, "INCOMPLETE_RESPONSE", "OUTPUT_LIMIT"
    );
  }
  const text = choice?.message?.content;
  if (typeof text !== "string" || !text.trim()) {
    throw new EnterpriseAIError("Enterprise AI returned no JSON content", 502, "INVALID_RESPONSE", "RESPONSE_FORMAT");
  }
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw Error("Object required");
    return parsed;
  } catch {
    throw new EnterpriseAIError("Enterprise AI returned invalid JSON content", 502, "INVALID_RESPONSE", "RESPONSE_FORMAT");
  }
}
