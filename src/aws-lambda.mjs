/**
 * QA.MAFer.AI - AWS Lambda request adapter.
 *
 * AWS API Gateway HTTP API (payload 2.0), REST API proxy (payload 1.0),
 * or Lambda Function URL. Static frontend files are served elsewhere.
 *
 * Security: enforce authentication at the gateway / CloudFront. CORS is NOT
 * authentication. No company API key is exposed to the browser.
 */
import worker from "./worker.js";
import { resolveRuntimeEnv } from "./aws-runtime.js";

function jsonReply(statusCode, error, extraHeaders = {}) {
  return {
    statusCode,
    isBase64Encoded: false,
    headers: {
      "content-type": "application/json;charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...extraHeaders
    },
    body: JSON.stringify({ error })
  };
}

function permittedOrigins(config) {
  return new Set(String(config.QA_ALLOWED_ORIGINS || "")
    .split(",").map(s => s.trim()).filter(s => {
      try {
        const url = new URL(s);
        return (url.protocol === "https:" || url.hostname === "localhost") &&
          url.origin === s && !url.username && !url.password;
      } catch { return false; }
    }));
}

function corsHeaders(origin) {
  return origin ? {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type, authorization",
    "vary": "Origin"
  } : {};
}

function requestDetails(event) {
  if (!event || typeof event !== "object") return null;
  const v2 = event.version === "2.0";
  const v1 = !v2 && typeof event.httpMethod === "string";
  if (!v2 && !v1) return null;
  const method = (v2 ? event.requestContext?.http?.method : event.httpMethod) || "";
  const path = v2 ? event.rawPath : event.path;
  if (typeof path !== "string" || !path.startsWith("/api/") || !["GET","POST","OPTIONS"].includes(method)) {
    return null;
  }
  const raw = v2 ? String(event.rawQueryString || "") :
    new URLSearchParams(event.multiValueQueryStringParameters
      ? Object.entries(event.multiValueQueryStringParameters).flatMap(([k,vs])=>
          (Array.isArray(vs) ? vs : [vs]).map(v=>[k,String(v)]))
      : event.queryStringParameters || {}).toString();
  const incomingHeaders = new Headers(event.headers || {});
  const origin = incomingHeaders.get("origin");
  const b64 = event.isBase64Encoded === true;
  const body = typeof event.body === "string"
    ? (b64 ? Buffer.from(event.body, "base64").toString("utf8") : event.body) : "";
  return { method, path, query:raw, origin, body, headers:incomingHeaders };
}

/** AWS Lambda entry point: src/aws-lambda.handler, runtime nodejs22.x. */
export async function handler(event) {
  const details = requestDetails(event);
  if (!details) return jsonReply(404, "Unsupported API route or gateway event");

  const allowed = permittedOrigins(process.env);
  const approvedOrigin = details.origin && allowed.has(details.origin) ? details.origin : null;
  if (details.origin && !approvedOrigin)
    return jsonReply(403, "Origin not allowed");

  const cors = corsHeaders(approvedOrigin);
  if (details.method === "OPTIONS")
    return {statusCode:204,isBase64Encoded:false,headers:cors,body:""};

  if (Buffer.byteLength(details.body, "utf8") > 230000)
    return jsonReply(413, "Request payload exceeds 230 KB", cors);

  // Preserve same-origin browser contract in worker.js after explicit allowlist
  // verification. API Gateway/Function URL host may differ from frontend host.
  const origin = approvedOrigin || "https://aws-api.internal";
  const url = origin + details.path + (details.query ? "?" + details.query : "");
  const request = new Request(url, {
    method: details.method,
    headers: details.headers,
    ...(details.method === "POST" ? {body:details.body} : {})
  });

  let env;
  try {
    env = await resolveRuntimeEnv(process.env);
  } catch {
    return jsonReply(503, "Enterprise AI secret retrieval unavailable", cors);
  }

  try {
    const response = await worker.fetch(request, env);
    return {
      statusCode: response.status,
      isBase64Encoded: false,
      headers: { ...Object.fromEntries(response.headers), ...cors },
      body: await response.text()
    };
  } catch {
    return jsonReply(502, "QA evaluation backend unavailable", cors);
  }
}
