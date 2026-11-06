/** Presentation-safe, Gemini-compatible interaction inspection.
 * Keeps rubric order and labels UNKNOWN distinctly from NOT EVALUATED.
 * No transcript leaves the browser through this renderer.
 */
const escapeHtml = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const number = v => Number.isFinite(v) ? Number(v).toLocaleString("en-US") : "—";
const pct = v => Number.isFinite(v) ? Math.round(v) + "%" : "—";
const datetime = v => v && Number.isFinite(Date.parse(v))
  ? new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Dubai",year:"numeric",month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}).format(new Date(v)) + " GST" : "—";
const methodOf = a => a?.method === "quantitative" ? "rule" : "ai";
const labelOf = method => method === "rule" ? "Rule-based" : "AI qualitative";
function evidenceBlock(items) {
  return (items || []).filter(e=>Number.isInteger(Number(e.line))).slice(0,8).map(e =>
    '<blockquote class="pb-evidence"><b>Line ' + escapeHtml(e.line) + '</b><span dir="auto">' + escapeHtml(e.quote) + '</span></blockquote>').join("");
}
function allChecks(call,rubric) {
  const definitions = (call.assessmentCriteria || call.meta?.criteria || rubric.criteria || []).filter(c=>c.enabled !== false);
  const findings = new Map((call.findings || []).map(f=>[f.id,f]));
  return definitions.map(c => {
    const f=findings.get(c.id);
    const definedQual=(c.checkpoints||[]).filter(a=>a.enabled!==false);
    const found=(f?.anchors||[]);
    const rules=found.filter(a=>methodOf(a)==="rule").map(a=>({...a,methodKind:"rule"}));
    const existing=new Map(found.filter(a=>methodOf(a)!=="rule").map(a=>[a.id,a]));
    const ai=definedQual.map(a=>({...a,...(existing.get(a.id)||{}),text:a.text,methodKind:"ai"}));
    return {criterion:c,finding:f,checks:[...rules,...ai]};
  });
}
function tiles(call) {
  const rule=call.ruleAssessment || {};
  const complete=call.status==="COMPLETE";
  const trace=call.aiTelemetry||{};
  const tokens=trace.totalTokens;
  const summary=trace.failedStage ? ("Failed at " + trace.failedStage) : complete ? "Evaluation completed" : call.status==="ERROR" ? "AI evaluation incomplete" : "Awaiting assessment";
  return '<div class="pb-metrics">'+
    '<article><small>COMBINED QA SCORE</small><strong>'+pct(complete?call.score?.score:null)+'</strong><span>'+ (complete?"Final assessment":"Not finalized") +'</span></article>'+
    '<article><small>RULE-BASED ASSESSMENT</small><strong>'+pct(rule.observedScore ?? (complete?call.score?.observedScore:null))+'</strong><span>Rule-only · '+pct(rule.coverage)+' coverage</span></article>'+
    '<article><small>AI QUALITATIVE</small><strong>'+(complete?"Evaluated":call.status==="ERROR"?"Not evaluated":"Pending")+'</strong><span>'+escapeHtml(summary)+'</span></article>'+
    '</div>'+
    (call.status==="ERROR" ? '<div class="pb-alert"><b>'+escapeHtml(summary)+'</b><span>'+escapeHtml(call.error||"AI service unavailable")+'</span><small>'+ (Number.isFinite(tokens)?number(tokens)+" provider-reported tokens · ":"")+'Rule findings retained; combined score unavailable</small></div>' : '');
}
function checkRow(a,complete) {
  const method=a.methodKind;
  const pending=method==="ai"&&!complete;
  const state=pending ? "NOT EVALUATED" : String(a.state||"NOT EVALUATED");
  const cls=state.toLowerCase().replaceAll(" ","-");
  const notes=a.validation?.reason ? '<p class="pb-note">Independent review: '+escapeHtml(a.validation.status)+' · '+escapeHtml(a.validation.reason)+'</p>' : "";
  return '<div class="pb-check">'+
    '<div class="pb-check-head"><div><span class="pb-method '+method+'">'+labelOf(method)+'</span> '+escapeHtml(a.text||a.id||"Check")+'</div><b class="pb-state '+cls+'">'+escapeHtml(state)+'</b></div>'+
    (pending?'<p class="pb-note">No AI finding or validated evidence available yet.</p>':notes+evidenceBlock(a.evidence))+
    '</div>';
}
function scorecard(call,rubric,filter) {
  const complete=call.status==="COMPLETE";
  const sections=allChecks(call,rubric);
  let visible=0;
  const content=sections.map(({criterion,finding,checks})=>{
    const shown=checks.filter(a=>filter==="all"||a.methodKind===filter);
    if(!shown.length)return "";
    visible+=shown.length;
    const coverage=complete && Number.isFinite(finding?.coverage) ? " · "+pct(finding.coverage)+" coverage" : "";
    return '<section class="pb-criterion"><div class="pb-criterion-heading"><div><small>'+escapeHtml(criterion.group||"QUALITY")+'</small><h4>'+escapeHtml(criterion.name||criterion.id)+'</h4></div><span>'+shown.length+' checks'+coverage+'</span></div>'+
      shown.map(a=>checkRow(a,complete)).join("")+'</section>';
  }).join("");
  const bar='<div class="pb-filter" role="group" aria-label="Filter findings">'+
    [["all","All findings"],["rule","Rule-based"],["ai","AI qualitative"]].map(x=>'<button type="button" data-finding-filter="'+x[0]+'" class="'+(filter===x[0]?"active":"")+'">'+x[1]+'</button>').join("")+'</div>';
  return '<section class="pb-scorecard"><div class="pb-heading"><h3>Assessment findings</h3><span>'+visible+' checks shown</span></div>'+bar+
    (content||'<p class="pb-empty">No checks available for the selected method.</p>')+
    '<details class="pb-collapse"><summary>Competency overview and scoring explanation</summary><p>Scores only apply where evidence supports all required checks. An AI failure does not complete or validate a qualitative finding.</p></details>'+
    '</section>';
}
function transcript(call,scope) {
  const indexes={rule:new Set(),ai:new Set()};
  for(const f of call.findings||[])for(const a of f.anchors||[])for(const e of a.evidence||[]) {
    const key=methodOf(a);
    if(Number.isInteger(Number(e.line))) indexes[key].add(Number(e.line));
  }
  const options=[["all","Full transcript"],["rule","Rule evidence"],["ai","AI evidence"]]
    .map(a=>'<button type="button" data-evidence-view="'+a[0]+'" class="'+(a[0]===scope?"active":"")+'">'+a[1]+'</button>').join("");
  const turns=(call.turns||[]).filter(t=>scope==="all"||indexes[scope]?.has(Number(t.line)));
  const rows=turns.map(t=>'<article class="pb-turn" id="qa-line-'+escapeHtml(t.line)+'"><div><b>'+escapeHtml(t.speaker||"unknown")+'</b><small>'+escapeHtml(t.timestamp||"")+" · Line "+escapeHtml(t.line)+'</small>'+
    (indexes.rule.has(Number(t.line))?'<span class="pb-method rule">Rule evidence</span>':"")+
    (indexes.ai.has(Number(t.line))?'<span class="pb-method ai">AI evidence</span>':"")+'</div><p dir="auto">'+escapeHtml(t.text)+'</p></article>').join("");
  return '<section class="pb-transcript"><div class="pb-heading"><h3>Evidence-linked transcript</h3><span>'+turns.length+' of '+(call.turns||[]).length+' turns</span></div><div class="pb-filter">'+options+'</div>'+
    (rows||'<p class="pb-empty">No tagged transcript lines for this selection. The full transcript is unchanged.</p>')+'</section>';
}
function diagnostics(call) {
  const trace=call.aiTelemetry||{};
  const req=trace.requests||[];
  const events=trace.stages||[];
  const row=x=>'<tr><td>'+datetime(x.at||x.time)+'</td><td>'+escapeHtml(x.stage||"Gemini")+'</td><td>'+escapeHtml(x.httpStatus||x.status||"—")+'</td><td>'+number(x.inputTokens??x.promptTokens)+'</td><td>'+number(x.outputTokens??x.completionTokens)+'</td><td>'+number(x.totalTokens)+'</td><td>'+ (Number.isFinite(x.retryAfterMs)?Math.ceil(x.retryAfterMs/1000)+"s":"—")+'</td></tr>';
  return '<section class="pb-panel"><h3>AI Evaluation Diagnostics</h3><p>Provider: Gemini · Timezone: Gulf Standard Time (UTC+4)</p>'+
    '<div class="pb-metrics"><article><small>INPUT TOKENS</small><strong>'+number(trace.inputTokens)+'</strong></article><article><small>OUTPUT TOKENS</small><strong>'+number(trace.outputTokens)+'</strong></article><article><small>REPORTED TOTAL</small><strong>'+number(trace.totalTokens)+'</strong></article></div>'+
    '<p>'+escapeHtml(trace.failedStage?"Failed stage: "+trace.failedStage:"Assessment status: "+call.status)+'</p>'+
    (events.length?'<ul class="pb-events">'+events.map(e=>'<li><b>'+escapeHtml(e.stage||e.name)+'</b> · '+escapeHtml(e.status||"")+' '+datetime(e.at)+'</li>').join("")+'</ul>':"")+
    '<div class="pb-table"><table><thead><tr><th>Time (GST)</th><th>Stage</th><th>HTTP</th><th>Input</th><th>Output</th><th>Total</th><th>Cooldown</th></tr></thead><tbody>'+req.map(row).join("")+'</tbody></table></div>'+
    (!req.length?'<p class="pb-note">No request telemetry recorded for this assessment. Earlier runs cannot be reconstructed.</p>':"")+'</section>';
}
function references(call) {
  const audit=call.referenceAudit||null;
  const files=audit?.files||[];
  return '<section class="pb-panel"><h3>Reference Library Provenance</h3>'+
    '<p>Revision '+escapeHtml(audit?.revision ?? call.meta?.referenceRevision ?? "Not recorded")+
    ' · '+files.length+' selected file versions · '+number(audit?.selectedEntries ?? call.meta?.referenceEntriesUsed ?? null)+' entries supplied</p>'+
    '<div class="pb-table"><table><thead><tr><th>Reference file</th><th>Type</th><th>Version</th><th>Entries</th></tr></thead><tbody>'+
    files.map(x=>'<tr><td>'+escapeHtml(x.name)+'</td><td>'+escapeHtml(x.type)+'</td><td>v'+escapeHtml(x.version)+'</td><td>'+number(x.entries)+'</td></tr>').join("")+
    '</tbody></table></div><p class="pb-note">Selected entries were sent as guidance. This does not prove Gemini relied on a particular reference for a finding.</p></section>';
}
export function renderPresentationInspection(call,rubric,tab="scorecard",filter="all",evidenceView="all") {
  if(!call)return '<p class="pb-empty">Select an interaction to inspect.</p>';
  const tabs=[["scorecard","Scorecard"],["transcript","Transcript"],["timeline","Agent timeline"],["insights","Key insights"],["diagnostics","AI Diagnostics"],["references","References"]];
  const valid=tabs.some(x=>x[0]===tab)?tab:"scorecard";
  const result=valid==="scorecard"?scorecard(call,rubric,filter):
    valid==="transcript"?transcript(call,evidenceView):
    valid==="diagnostics"?diagnostics(call):
    valid==="references"?references(call):
    valid==="timeline"?'<section class="pb-panel"><h3>Agent timeline</h3>'+ (call.turns||[]).map(t=>'<p><b>'+escapeHtml(t.timestamp||"—")+'</b> · '+escapeHtml(t.speaker)+': '+escapeHtml(t.text)+'</p>').join("")+'</section>':
    '<section class="pb-panel"><h3>Key insights · evaluated evidence</h3>'+ (call.findings||[]).flatMap(f=>f.anchors||[]).filter(a=>(a.state==="MET"||a.state==="MISSED")&&(a.evidence||[]).length).map(a=>'<p><b>'+escapeHtml(a.text)+'</b> · '+escapeHtml(a.state)+'</p>').join("")+'</section>';
  return '<div class="pb-inspection">'+
    '<div class="pb-inspection-heading"><div><small>QUALITY INTELLIGENCE</small><h3>Evaluation Results</h3><p>'+escapeHtml(call.agent)+' · '+escapeHtml(call.id)+' · '+escapeHtml(call.duration||"")+" · "+escapeHtml(call.status)+'</p></div></div>'+
    tiles(call)+'<div class="pb-tabs" role="tablist">'+tabs.map(x=>'<button type="button" role="tab" data-result-tab="'+x[0]+'" aria-selected="'+(x[0]===valid)+'" class="'+(x[0]===valid?"active":"")+'">'+x[1]+'</button>').join("")+'</div>'+result+'</div>';
}
