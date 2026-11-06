/**
 * Presentation-parity UI for the personal Gemini prototype.
 * No corporate endpoints, credentials, or customer data in source control.
 * Browser-local diagnostics are not a centralized billing ledger.
 */
const esc = v => String(v ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const fmt = n => Number.isFinite(n) ? n.toLocaleString("en-US") : "—";
const dateUAE = stamp => new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Dubai",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(stamp));
const LEDGER = "qaai-demo-usage-v1";
const ledger = () => { try { const v=JSON.parse(localStorage.getItem(LEDGER)); return Array.isArray(v) ? v : []; } catch { return []; } };
export function recordUsageAttempt(call,model,startedAt) {
  const flow=call.flowTrace || call.aiFlow || {};
  const tokens=flow.tokenUsage || call.tokenUsage || {};
  const requests=Array.isArray(flow.requests)?flow.requests:[];
  const row={
    at:new Date().toISOString(),startedAt:new Date(startedAt).toISOString(),
    interactionId:String(call.id||call.key||"").slice(0,100),agent:String(call.agent||"").slice(0,80),
    model:String(model||"Gemini").slice(0,60),status:call.status==="COMPLETE"?"SUCCESS":"FAILED",
    input:Number.isFinite(tokens.promptTokens)?tokens.promptTokens:null,
    output:Number.isFinite(tokens.completionTokens)?tokens.completionTokens:null,
    total:Number.isFinite(tokens.totalTokens)?tokens.totalTokens:null,
    requests:requests.length,rateLimits:requests.filter(r=>r.httpStatus===429).length,
    stages:Array.isArray(flow.stages)?flow.stages.map(s=>({stage:s.stage,status:s.status,at:s.at})):[],
    failureStage:flow.failureStage||"",errorCategory:flow.errorCategory||""
  };
  const all=ledger();all.push(row);
  try {localStorage.setItem(LEDGER,JSON.stringify(all.slice(-500)));}catch{}
  return row;
}
export function downloadUsageCSV(rows) {
  const data=[["Date (UAE)","Timestamp (UTC)","Interaction","Agent","Model","Outcome","Input tokens","Output tokens","Total tokens","API requests","429 events","Failed stage"],
    ...rows.map(r=>[dateUAE(r.at),r.at,r.interactionId,r.agent,r.model,r.status,r.input??"",r.output??"",r.total??"",r.requests,r.rateLimits,r.failureStage])];
  const cell=x=>'"'+String(x??"").replace(/^[=+@-]/,"'"+String(x??"").charAt(0)).replace(/"/g,'""')+'"';
  const blob=new Blob([data.map(r=>r.map(cell).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="QA.MAFer.AI-Gemini-usage.csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function usageRecords(){return ledger();}
export function renderUsageDashboard(from="",to=""){
  const all=ledger().slice().reverse();const rows=all.filter(r=>(!from||dateUAE(r.at)>=from)&&(!to||dateUAE(r.at)<=to));
  const total=rows.reduce((n,r)=>n+(Number(r.total)||0),0);
  const known=rows.filter(r=>Number.isFinite(r.total)).length;
  const failures=rows.filter(r=>r.status!=="SUCCESS").length;
  const limits=rows.reduce((n,r)=>n+(Number(r.rateLimits)||0),0);
  const days=new Map();
  for(const r of rows){const k=dateUAE(r.at),v=days.get(k)||{date:k,runs:0,success:0,failed:0,tokens:0,known:0,limits:0};
    v.runs++;if(r.status==="SUCCESS")v.success++;else v.failed++;if(Number.isFinite(r.total)){v.tokens+=r.total;v.known++;}v.limits+=r.rateLimits;days.set(k,v);}
  const head='<div class="qa-parity-head"><div><div class="kicker">MODEL OBSERVABILITY</div><h3>AI Usage & Diagnostics</h3><p>Gemini request activity recorded in this browser; UAE calendar dates.</p></div><button class="secondary" data-usage-export>Export CSV</button></div>';
  const cards='<div class="qa-parity-cards">'+[
    ["Assessment attempts",rows.length],["Successful",rows.length-failures],["Failed",failures],["Reported tokens",fmt(total)],["Rate-limit events",limits]
  ].map(p=>'<div class="qa-parity-card"><small>'+esc(p[0])+'</small><strong>'+esc(p[1])+'</strong></div>').join("")+'</div>';
  const filters='<div class="qa-usage-filter"><label>From <input type="date" id="usage-from" value="'+esc(from)+'"></label><label>To <input type="date" id="usage-to" value="'+esc(to)+'"></label><small>'+known+' of '+rows.length+' attempts have provider-reported token totals.</small></div>';
  const th='<tr><th>Date (UAE)</th><th>Attempts</th><th>Success</th><th>Failed</th><th>Tokens reported</th><th>429</th></tr>';
  const daily='<section class="qa-parity-panel"><h4>Daily volumes & token trends</h4><div class="scroller"><table><thead>'+th+'</thead><tbody>'+
    [...days.values()].sort((a,b)=>b.date.localeCompare(a.date)).map(d=>'<tr><td>'+esc(d.date)+'</td><td>'+d.runs+'</td><td>'+d.success+'</td><td>'+d.failed+'</td><td>'+fmt(d.tokens)+(d.known<d.runs?' <small>(partial)</small>':'')+'</td><td>'+d.limits+'</td></tr>').join("")+
    '</tbody></table></div></section>';
  const details='<section class="qa-parity-panel"><h4>Assessment history</h4><div class="scroller"><table><thead><tr><th>Date / time (UAE)</th><th>Interaction</th><th>Model</th><th>Status</th><th>Requests</th><th>Tokens</th><th>429</th></tr></thead><tbody>'+
    rows.map(r=>'<tr><td>'+esc(new Date(r.at).toLocaleString("en-GB",{timeZone:"Asia/Dubai"}))+'</td><td>'+esc(r.interactionId)+'</td><td>'+esc(r.model)+'</td><td>'+esc(r.status)+'</td><td>'+r.requests+'</td><td>'+fmt(r.total)+'</td><td>'+r.rateLimits+'</td></tr>').join("")+
    '</tbody></table></div></section>';
  return '<div class="qa-parity">'+head+filters+cards+daily+details+'<p class="muted">Usage is measured only when Gemini returns usageMetadata. Failed or rate-limited requests may have unknown tokens. Browser storage is not a production billing source.</p></div>';
}
function summaryCards(call){
  const findings=call.findings||[];
  const all=findings.flatMap(f=>f.anchors||[]);
  const knownRules=all.filter(a=>a.method==="quantitative"&&["MET","MISSED"].includes(a.state));
  const ruleTotal=all.filter(a=>a.method==="quantitative").length;
  const observed=knownRules.length?Math.round(100*knownRules.filter(a=>a.state==="MET").length/knownRules.length):null;
  const coverage=ruleTotal?Math.round(100*knownRules.length/ruleTotal):null;
  const complete=call.status==="COMPLETE";
  return '<div class="qa-parity-cards qa-score-cards">'+
   '<div class="qa-parity-card"><small>COMBINED QA SCORE</small><strong>'+ (complete&&Number.isFinite(call.score?.score)?fmt(call.score.score)+'%':'—')+'</strong><span>'+(complete?'Final result':'Not finalized')+'</span></div>'+
   '<div class="qa-parity-card"><small>RULE-BASED ASSESSMENT</small><strong>'+(observed===null?'—':observed+'%')+'</strong><span>'+fmt(coverage)+'% observed rule coverage</span></div>'+
   '<div class="qa-parity-card"><small>AI QUALITATIVE ASSESSMENT</small><strong class="'+(complete?'':'qa-amber')+'">'+(complete?'Reviewed':'Not evaluated')+'</strong><span>'+(complete?'Gemini evidence checked':'AI incomplete or not yet run')+'</span></div>'+
   '</div>';
}
function allStages(call) {
  const flow=call.flowTrace||{};
  const stages=Array.isArray(flow.stages)?flow.stages:[];
  if(!stages.length) return '<p class="muted">Stage telemetry will appear for assessments run after this update.</p>';
  return '<div class="qa-stage-row">'+stages.map(s=>'<div class="qa-stage '+(s.status==="FAILED"?'qa-stage-failed':'')+'"><small>'+esc(s.stage)+'</small><b>'+esc(s.status)+'</b></div>').join("")+'</div>';
}
function diagnostic(call) {
  const flow=call.flowTrace||{}, usage=flow.tokenUsage||{}, requests=Array.isArray(flow.requests)?flow.requests:[];
  const metrics='<div class="qa-parity-cards">'+[["Input tokens",fmt(usage.promptTokens)],["Output tokens",fmt(usage.completionTokens)],["Reported total",fmt(usage.totalTokens)],["AI requests",requests.length]].map(p=>'<div class="qa-parity-card"><small>'+p[0]+'</small><strong>'+esc(p[1])+'</strong></div>').join("")+'</div>';
  const events=requests.filter(r=>r.httpStatus===429).map(r=>'<p class="qa-rate-event">429 rate limit · '+esc(r.stage)+' · '+esc(r.at||"")+' · Cooldown '+esc(r.retryAfterMs??"unknown")+'ms</p>').join("");
  const table='<div class="scroller"><table><thead><tr><th>Time</th><th>Stage</th><th>HTTP</th><th>Input</th><th>Output</th><th>Total</th><th>Cooldown</th></tr></thead><tbody>'+requests.map(r=>'<tr><td>'+esc(r.at||"—")+'</td><td>'+esc(r.stage||"—")+'</td><td>'+esc(r.httpStatus??"—")+'</td><td>'+fmt(r.promptTokens)+'</td><td>'+fmt(r.completionTokens)+'</td><td>'+fmt(r.totalTokens)+'</td><td>'+fmt(r.retryAfterMs)+'</td></tr>').join("")+'</tbody></table></div>';
  return '<div class="qa-parity-panel"><h4>Gemini evaluation flow</h4>'+allStages(call)+metrics+events+table+'<p class="muted">Actual tokens are provided by Gemini usageMetadata; unavailable usage is not counted as zero.</p></div>';
}
function references(call) {
 const a=call.referenceAudit;
 if(!a)return '<div class="qa-parity-panel"><h4>Reference library provenance</h4><p class="muted">No per-attempt reference snapshot was recorded for this assessment.</p></div>';
 return '<div class="qa-parity-panel"><h4>Reference library provenance</h4><p>Library revision <b>'+esc(a.revision)+'</b> · '+(a.files||[]).length+' files · '+esc(a.entryCount)+' entries supplied</p><div class="scroller"><table><thead><tr><th>File</th><th>Type</th><th>Version</th><th>Entries selected</th></tr></thead><tbody>'+
   (a.files||[]).map(f=>'<tr><td>'+esc(f.name)+'</td><td>'+esc(f.type)+'</td><td>v'+esc(f.version)+'</td><td>'+f.count+'</td></tr>').join("")+'</tbody></table></div><p class="muted">Supplied reference entries are context, not proof that Gemini relied on a particular file.</p></div>';
}
function findingsMarkup(call,rubric,filter){
 const cfg=call.assessmentCriteria||call.meta?.criteria||rubric.criteria||[];
 const name=new Map(cfg.map(c=>[c.id,c]));
 const view=(call.findings||[]).map(f=>{
   const c=name.get(f.id)||{},checks=new Set((c.checkpoints||[]).map(a=>a.id));
   const anchors=(f.anchors||[]).filter(a=>filter==="all"||(filter==="rule"?!checks.has(a.id):checks.has(a.id)));
   if(!anchors.length)return "";
   const rows=anchors.map(a=>{
     const ai=checks.has(a.id)||a.method==="qualitative", pending=ai&&call.status!=="COMPLETE";
     const state=pending?"NOT EVALUATED":a.state||"UNKNOWN";
     const method=ai?"AI qualitative":"Rule-based";
     const evidence=pending?[]:a.evidence||[];
     return '<div class="qa-find-row"><div class="qa-find-name"><b>'+esc(a.text||a.id)+'</b><span class="qa-method-label">'+method+'</span><span class="qa-check-status qa-'+state.toLowerCase().replaceAll(" ","-")+'">'+esc(state)+'</span></div>'+
       (a.validation?.status?'<small>Independent review: '+esc(a.validation.status)+'</small>':'')+
       evidence.map(e=>'<blockquote><b>Line '+Number(e.line)+'</b> '+esc(e.quote)+'</blockquote>').join("")+'</div>';
   }).join("");
   return '<section class="qa-finding-card"><div class="qa-finding-top"><div><small>'+esc(c.group||"QA")+'</small><h4>'+esc(c.name||f.id)+'</h4></div><span>'+esc(f.status||"—")+'</span></div>'+rows+'</section>';
 }).filter(Boolean).join("");
 return view||'<p class="muted">No findings match this filter yet.</p>';
}
export function renderParityInspection(call,rubric,tab="scorecard",filter="all"){
 const tabs=[["scorecard","Scorecard"],["transcript","Transcript"],["timeline","Agent timeline"],["insights","Key insights"],["diagnostics","AI Diagnostics"],["references","References"]];
 const nav='<nav class="qmf-result-tabs" role="tablist">'+tabs.map(p=>'<button type="button" role="tab" data-result-tab="'+p[0]+'" class="'+(tab===p[0]?'active':'')+'" aria-selected="'+(tab===p[0])+'">'+p[1]+'</button>').join("")+'</nav>';
 const header='<div class="panel-heading qmf-results-heading"><div><span class="kicker">QUALITY INTELLIGENCE</span><h3>Evaluation Results</h3><p class="muted">'+esc(call.agent)+' · '+esc(call.id)+' · '+esc(call.duration||"")+" · "+esc(call.status)+'</p></div></div>';
 let body="";
 if(tab==="scorecard"){
   const flow=call.flowTrace||{},failed=(flow.requests||[]).find(r=>r.httpStatus===429);
   const state=call.status==="ERROR"?(failed?'Rate limit interrupted '+esc(failed.stage):'AI assessment failed'):"";
   const banner=call.status==="ERROR"?'<div class="qa-compact-status"><b>'+state+'</b> · Combined QA score unavailable'+(failed?' · Gemini 429':'')+'</div>':"";
   const filters='<div class="qa-find-toolbar"><h3>Assessment findings</h3><div class="qa-filter-buttons">'+[["all","All findings"],["rule","Rule-based"],["ai","AI qualitative"]].map(p=>'<button type="button" class="'+(filter===p[0]?'active':'')+'" data-findings-filter="'+p[0]+'">'+p[1]+'</button>').join("")+'</div></div>';
   body=summaryCards(call)+banner+filters+findingsMarkup(call,rubric,filter)+'<details class="qa-parity-panel"><summary>Competency overview & evidence highlights</summary><p class="muted">Inspect scores and evidence above, or open the Key insights tab.</p></details>';
 }else if(tab==="diagnostics")body=diagnostic(call);
 else if(tab==="references")body=references(call);
 return '<div class="qa-parity">'+header+nav+body+'</div>';
}
export function referenceSnapshot(library,selected){
 const counts=new Map();for(const e of selected||[]){const key=String(e.source)+"|"+String(e.version);counts.set(key,(counts.get(key)||0)+1);}
 const files=(library.datasets||[]).filter(d=>d.enabled).map(d=>({name:d.name,type:d.type,version:d.version,count:counts.get(d.name+"|"+d.version)||0})).filter(f=>f.count>0);
 return {revision:library.revision,entryCount:(selected||[]).length,files};
}
