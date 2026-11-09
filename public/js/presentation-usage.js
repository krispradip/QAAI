import {readUsage,dailyUsage} from "./presentation-usage-ledger.js";
const e=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const n=v=>Number.isFinite(v)?Number(v).toLocaleString("en-US"):"Unavailable";
const t=v=>v&&Number.isFinite(Date.parse(v))?new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Dubai",day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(v))+" GST":"—";
const cell=v=>"<td>"+e(v)+"</td>";
const response=x=>Number.isFinite(x.httpStatus)?x.httpStatus+(x.httpStatus===200?" OK":x.httpStatus===429?" · Rate limited":""):"Unavailable";

/** Technical detail belongs in AI Usage & Diagnostics, not the agent scorecard. */
export function renderInteractionRequestDetails(records){
 const withRequests=records.filter(r=>Array.isArray(r.aiTelemetry?.requests)&&r.aiTelemetry.requests.length).slice(0,50);
 if(!withRequests.length)return '<p class="pb-note">No API request-level telemetry has been recorded in this browser.</p>';
 return '<div class="pb-usage-request-details">'+withRequests.map((r,i)=>{
   const trace=r.aiTelemetry||{},requests=trace.requests||[];
   const totals='<div class="pb-usage-metrics">'+[
     ["Input tokens",n(trace.inputTokens)],["Output tokens",n(trace.outputTokens)],
     ["Reported total",n(trace.totalTokens)],["AI requests",n(requests.length)]
   ].map(([label,value])=>'<article><small>'+e(label)+'</small><strong>'+e(value)+'</strong></article>').join("")+'</div>';
   const rows=requests.map(x=>'<tr>'+cell(t(x.at||x.time))+cell(x.stage||"AI evaluation")+
     cell(response(x))+cell(n(x.inputTokens??x.promptTokens))+cell(n(x.outputTokens??x.completionTokens))+
     cell(n(x.totalTokens))+cell(n(x.requestedOutputBudget))+
     cell(Number.isFinite(x.retryAfterMs)?Math.ceil(x.retryAfterMs/1000)+" seconds":"—")+'</tr>').join("");
   return '<details class="pb-usage-attempt" '+(i===0?"open":"")+'><summary><strong>'+e(r.interactionId||"Interaction")+
     '</strong> · '+e(t(r.startedAt))+' · '+e(r.model||"Model unrecorded")+' · '+e(r.status||"Unknown")+
     ' · '+requests.length+' requests</summary>'+totals+
     '<div class="pb-table"><table><thead><tr><th>Time (GST)</th><th>Stage / batch</th><th>Response</th><th>Input</th><th>Output</th><th>Actual total</th><th>Requested output budget</th><th>Cooldown</th></tr></thead><tbody>'+
     rows+'</tbody></table></div>'+
     (trace.failedStage?'<p class="pb-note">Failed stage: '+e(trace.failedStage)+'</p>':"")+
     '</details>';
 }).join("")+'</div>';
}

export function renderUsagePage() {
  const records=readUsage().sort((a,b)=>String(b.startedAt).localeCompare(String(a.startedAt)));
  const days=dailyUsage(records);
  const requests=records.flatMap(r=>(r.aiTelemetry?.requests||[]).map(x=>({...x,interaction:r.interactionId,model:r.model})));
  const limited=requests.filter(x=>x.httpStatus===429).sort((a,b)=>String(b.at).localeCompare(String(a.at)));
  const total=days.reduce((sum,d)=>sum+d.totalTokens,0),unknown=days.reduce((sum,d)=>sum+d.unknownUsage,0);
  const metrics=[
    ["Assessment attempts",records.length],
    ["Successful",records.filter(x=>x.status==="COMPLETE").length],
    ["Failed",records.filter(x=>x.status==="ERROR").length],
    ["Reported tokens",n(total)],
    ["AI API requests",requests.length],
    ["429 events",limited.length]
  ];
  return '<section class="panel pb-usage">'+
    '<div class="pb-page-head"><div><small>GEMINI · QUALITY INTELLIGENCE</small><h2>AI Usage & Diagnostics</h2><p>Request stages, token consumption, daily volumes and rate-limit events. This ledger is stored in the current browser.</p></div><button type="button" class="secondary" id="pb-export-usage">Export usage CSV</button></div>'+
    '<div class="pb-usage-metrics">'+metrics.map(x=>'<article><small>'+e(x[0])+'</small><strong>'+e(x[1])+'</strong></article>').join("")+'</div>'+
    (unknown?'<p class="pb-note">Some attempts lack provider usage metadata. They are excluded from token totals; unavailable is not zero.</p>':"")+
    '<h3>Individual AI requests, retries and token usage</h3>'+renderInteractionRequestDetails(records)+
    '<h3>Daily trends · UAE time</h3><div class="pb-table"><table><thead><tr><th>Date</th><th>Attempts</th><th>Success</th><th>Failed</th><th>Requests</th><th>429</th><th>Input</th><th>Output</th><th>Tokens</th></tr></thead><tbody>'+
    days.map(x=>'<tr>'+cell(x.day)+cell(x.attempts)+cell(x.completed)+cell(x.failed)+cell(x.requests)+cell(x.rateLimits)+cell(n(x.inputTokens))+cell(n(x.outputTokens))+cell(n(x.totalTokens))+'</tr>').join("")+'</tbody></table></div>'+
    '<h3>Rate-limit history</h3><div class="pb-table"><table><thead><tr><th>When (GST)</th><th>Stage</th><th>Model</th><th>Cooldown</th></tr></thead><tbody>'+
    limited.map(x=>'<tr>'+cell(t(x.at))+cell(x.stage)+cell(x.model)+cell(Number.isFinite(x.retryAfterMs)?Math.ceil(x.retryAfterMs/1000)+" seconds":"Unknown")+'</tr>').join("")+'</tbody></table></div>'+
    (!limited.length?'<p class="pb-note">No 429 events recorded yet.</p>':"")+
    '<h3>Assessment attempt ledger</h3><div class="pb-table"><table><thead><tr><th>Started (GST)</th><th>Interaction</th><th>Status</th><th>Model</th><th>Requests</th><th>Reported tokens</th><th>Failed stage</th></tr></thead><tbody>'+
    records.map(x=>'<tr>'+cell(t(x.startedAt))+cell(x.interactionId)+cell(x.status)+cell(x.model)+cell(x.aiTelemetry?.requests?.length||0)+cell(n(x.aiTelemetry?.totalTokens))+cell(x.aiTelemetry?.failedStage||"—")+'</tr>').join("")+'</tbody></table></div>'+
    '<p class="pb-note">Token use is provider-reported where available; this browser-local ledger is not a centralized invoice and excludes other users and applications.</p>'+
    '</section>';
}
