import {readUsage,dailyUsage,usageDate} from "./presentation-usage-ledger.js";
const e=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const n=v=>Number.isFinite(v)?v.toLocaleString("en-US"):"Unavailable";
const t=v=>v&&Number.isFinite(Date.parse(v))?new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Dubai",day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(v))+" GST":"—";
const cell=(v)=>"<td>"+e(v)+"</td>";
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
    '<div class="pb-page-head"><div><small>GEMINI · QUALITY INTELLIGENCE</small><h2>AI Usage & Diagnostics</h2><p>Daily volumes, request stages, token consumption, and rate-limit events. All data stays in this browser.</p></div><button type="button" class="secondary" id="pb-export-usage">Export usage CSV</button></div>'+
    '<div class="pb-usage-metrics">'+metrics.map(x=>'<article><small>'+e(x[0])+'</small><strong>'+e(x[1])+'</strong></article>').join("")+'</div>'+
    (unknown?'<p class="pb-note">Some attempts lack provider usage metadata. They are excluded from token totals; unavailable is not zero.</p>':"")+
    '<h3>Daily trends · UAE time</h3><div class="pb-table"><table><thead><tr><th>Date</th><th>Attempts</th><th>Success</th><th>Failed</th><th>Requests</th><th>429</th><th>Input</th><th>Output</th><th>Tokens</th></tr></thead><tbody>'+
    days.map(x=>'<tr>'+cell(x.day)+cell(x.attempts)+cell(x.completed)+cell(x.failed)+cell(x.requests)+cell(x.rateLimits)+cell(n(x.inputTokens))+cell(n(x.outputTokens))+cell(n(x.totalTokens))+'</tr>').join("")+'</tbody></table></div>'+
    '<h3>Rate-limit history</h3><div class="pb-table"><table><thead><tr><th>When (GST)</th><th>Stage</th><th>Model</th><th>Cooldown</th></tr></thead><tbody>'+
    limited.map(x=>'<tr>'+cell(t(x.at))+cell(x.stage)+cell(x.model)+cell(Number.isFinite(x.retryAfterMs)?Math.ceil(x.retryAfterMs/1000)+" seconds":"Unknown")+'</tr>').join("")+'</tbody></table></div>'+
    (!limited.length?'<p class="pb-note">No 429 events recorded yet.</p>':"")+
    '<h3>Assessment attempt ledger</h3><div class="pb-table"><table><thead><tr><th>Started (GST)</th><th>Interaction</th><th>Status</th><th>Model</th><th>Requests</th><th>Reported tokens</th><th>Failed stage</th></tr></thead><tbody>'+
    records.map(x=>'<tr>'+cell(t(x.startedAt))+cell(x.interactionId)+cell(x.status)+cell(x.model)+cell(x.aiTelemetry?.requests?.length||0)+cell(n(x.aiTelemetry?.totalTokens))+cell(x.aiTelemetry?.failedStage||"—")+'</tr>').join("")+'</tbody></table></div>'+
    '<p class="pb-note">Billing estimate: token usage is provider-reported where available, but this is a browser-local usage ledger, not a centralized invoice. It does not include other users or applications.</p>'+
    '</section>';
}
