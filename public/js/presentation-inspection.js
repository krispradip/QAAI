import {renderStatusTotals,renderThemeProgress,renderScoreStatus,checkpointState,themeScores} from "./presentation-themes.js";
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
/**
 * Compact, factual performance summary between identity and combined QA.
 * Full details stay in the Scorecard/Key Insights tabs.
 */
export function renderCompetencyHighlights(call,rubric){
  const themes=themeScores(call,rubric).filter(x=>Number.isFinite(x.finalScore)||Number.isFinite(x.observedScore));
  const displayed=themes.slice(0,4);
  const bars=displayed.map(row=>{
    const value=row.finalScore??row.observedScore;
    return '<div class="pb-competency-row"><div><b>'+escapeHtml(row.name)+'</b><span>'+pct(value)+(row.finalScore===null?' · observed':'')+'</span></div>'+
      '<div class="pb-competency-track" role="progressbar" aria-label="'+escapeHtml(row.name)+' quality score" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+value+'"><i style="width:'+value+'%"></i></div></div>';
  }).join("");
  const highlights=allChecks(call,rubric).flatMap(({criterion,finding,checks})=>
    checks.map(check=>({criterion,finding,check})))
    .filter(({criterion,finding,check})=>["MET","MISSED"].includes(checkpointState(check,call,criterion,finding))&&
      Array.isArray(check.evidence)&&check.evidence.length)
    .slice(0,3);
  const insights=highlights.map(({criterion,finding,check})=>{
    const status=checkpointState(check,call,criterion,finding);
    return '<li><span class="pb-evidence-indicator '+(status==="MET"?"met":"missed")+'">'+(status==="MET"?"✓":"!")+'</span>'+
      '<div><b>'+escapeHtml(check.text||criterion.name)+'</b><small>'+escapeHtml(criterion.group||"")+
      ' · Line '+escapeHtml(check.evidence[0]?.line??"—")+'</small></div></li>';
  }).join("");
  return '<section class="pb-competency-overview" aria-label="Competency overview and evidence highlights">'+
    '<div class="pb-summary-head"><b>COMPETENCY OVERVIEW &amp; EVIDENCE HIGHLIGHTS</b></div>'+
    '<div class="pb-competency-columns"><div><h4>Core competencies</h4>'+
    (bars||'<p class="pb-note">No verified competency score available yet.</p>')+
    (themes.length>displayed.length?'<small class="pb-note">'+(themes.length-displayed.length)+' additional themes available under Scorecard.</small>':"")+
    '</div><div><h4>Key insights · evaluated evidence</h4>'+
    (insights?'<ul class="pb-highlights">'+insights+'</ul>':'<p class="pb-note">No evidence-backed highlights available yet.</p>')+
    '</div></div></section>';
}
function tiles(call) {
  const rule=call.ruleAssessment || {};
  const score=renderScoreStatus(call);
  const complete=call.status==="COMPLETE";
  const trace=call.aiTelemetry||{};
  const tokens=trace.totalTokens;
  const summary=trace.failedStage ? ("Failed at " + trace.failedStage) : complete ? "Evaluation completed" : call.status==="ERROR" ? "AI evaluation incomplete" : "Awaiting assessment";
  const ruleScore=rule.observedScore ?? (complete?call.score?.observedScore:null);
  return '<div class="pb-metrics pb-results-tiles">'+
    '<article class="pb-combined"><small>COMBINED QA SCORE</small><strong>'+escapeHtml(score.value)+'</strong><span class="pb-score-label">'+escapeHtml(score.label)+'</span><span>'+escapeHtml(score.detail)+'</span></article>'+
    '<article><small>RULE-BASED ASSESSMENT</small><strong>'+pct(ruleScore)+'</strong><span>Rule-only observed · '+pct(rule.coverage)+' evidence coverage</span></article>'+
    '<article><small>AI QUALITATIVE ASSESSMENT</small><strong>'+(complete?"Evaluated":call.status==="ERROR"?"Not evaluated":"Pending")+'</strong><span>'+escapeHtml(summary)+'</span></article>'+
    '</div>'+
    (call.status==="ERROR" ? '<div class="pb-alert"><b>'+escapeHtml(summary)+'</b><span>'+escapeHtml(call.error||"AI service unavailable")+'</span><small>'+ (Number.isFinite(tokens)?number(tokens)+" provider-reported tokens · ":"")+'Rule findings retained; combined score unavailable</small></div>' : '');
}
function checkRow(a,call,criterion,finding) {
  const method=a.methodKind;
  const state=checkpointState(a,call,criterion,finding);
  const pending=state==="NOT_EVALUATED";
  const cls=state.toLowerCase().replaceAll("_","-");
  const notes=a.validation?.reason ? '<p class="pb-note">Independent review: '+escapeHtml(a.validation.status)+' · '+escapeHtml(a.validation.reason)+'</p>' : "";
  const evidence=!pending?evidenceBlock(a.evidence):"";
  return '<div class="pb-check">'+
    '<div class="pb-check-head"><div><span class="pb-method '+method+'">'+labelOf(method)+'</span> '+escapeHtml(a.text||a.id||"Check")+'</div><b class="pb-state '+cls+'">'+escapeHtml(state.replaceAll("_"," "))+'</b></div>'+
    (pending?'<p class="pb-note">No completed AI finding or validated evidence available yet.</p>':notes+evidence+
      (!evidence && (state==="UNVERIFIED"||state==="UNKNOWN")?
        '<p class="pb-note">'+escapeHtml(a.reason||finding?.reason||"Supporting evidence unavailable or inconclusive")+'</p>':""))+
    '</div>';
}
/**
 * Business-facing explanation of a pending score.
 * Shows the actual unscored criterion and supplied reason; it never changes
 * scoring or treats missing audio/system evidence as a pass or fail.
 */
export function renderPendingEvidenceGaps(call,rubric) {
  if(call?.status!=="COMPLETE" || Number.isFinite(call?.score?.score))return "";
  const all=allChecks(call,rubric);
  const unresolved=all.filter(({criterion,finding})=>
    Number(criterion.weight)>0 && finding?.status!=="NOT_APPLICABLE" &&
    (!finding || finding.status!=="SCORED" || !Number.isFinite(finding.score))
  ).sort((a,b)=>Number(b.criterion.weight||0)-Number(a.criterion.weight||0));
  if(!unresolved.length)return "";
  const observed=Number.isFinite(call.score?.observedScore)?pct(call.score.observedScore):"—";
  const coverage=pct(call.score?.coverage);
  const rows=unresolved.slice(0,12).map(({criterion,finding,checks})=>{
    const missing=checks.filter(x=>["UNKNOWN","UNVERIFIED","NOT_EVALUATED"].includes(checkpointState(x,call,criterion,finding)));
    const sample=missing.slice(0,2).map(x=>x.text||x.id).filter(Boolean).join("; ");
    const mode=criterion.mode==="audio"?"Audio or event evidence may be required"
      :criterion.mode==="external"?"CRM / Genesys / system evidence may be required"
      :"Transcript evidence or independent review is incomplete";
    const explanation=sample||String(finding?.reason||mode).slice(0,240);
    return '<li><div class="pb-gap-title"><b>'+escapeHtml(criterion.name||criterion.id)+'</b><span>'+escapeHtml(criterion.group||"Other")+' · weight '+escapeHtml(criterion.weight??"—")+'</span></div>'+
      '<p>'+escapeHtml(explanation)+'</p><small>'+escapeHtml(mode)+'</small></li>';
  }).join("");
  return '<section class="pb-evidence-gaps" aria-label="Why combined QA is pending">'+
    '<div class="pb-summary-head"><b>WHY IS COMBINED QA PENDING?</b><small>'+unresolved.length+' criteria without final scores</small></div>'+
    '<p><strong>Observed '+escapeHtml(observed)+'</strong> is based only on fully scored criteria. Evidence coverage is <strong>'+escapeHtml(coverage)+'</strong>. Some rubric criteria lack sufficient verified evidence to finalize a combined score.</p>'+
    '<details open><summary>Inspect unresolved criteria ('+unresolved.length+')</summary><ul class="pb-gap-list">'+rows+'</ul>'+
    (unresolved.length>12?'<p class="pb-note">+'+(unresolved.length-12)+' additional unresolved criteria are listed in Evidence-linked assessment findings below.</p>':"")+
    '</details><p class="pb-note">Audio, CRM and Genesys-dependent checks cannot be verified from transcript text alone. Review missing evidence and BU applicability; never mark unknown checks as met to force a final score.</p>'+
    '</section>';
}
function scorecard(call,rubric,filter) {
  const sections=allChecks(call,rubric);
  let visible=0;
  const content=sections.map(({criterion,finding,checks})=>{
    const shown=checks.filter(a=>filter==="all"||a.methodKind===filter);
    if(!shown.length)return "";
    visible+=shown.length;
    const coverage=Number.isFinite(finding?.coverage) ? " · "+pct(finding.coverage)+" evidence coverage" : "";
    const score=Number.isFinite(finding?.score) && finding?.status==="SCORED"
      ? pct(finding.score) : "Not scored";
    return '<section class="pb-criterion"><div class="pb-criterion-heading"><div><small>'+escapeHtml(criterion.group||"QUALITY THEME")+'</small><h4>'+escapeHtml(criterion.name||criterion.id)+'</h4></div><span>'+score+coverage+'</span></div>'+
      shown.map(a=>checkRow(a,call,criterion,finding)).join("")+'</section>';
  }).join("");
  const bar='<div class="pb-filter" role="group" aria-label="Filter findings">'+
    [["all","All findings"],["rule","Rule-based"],["ai","AI qualitative"]].map(x=>'<button type="button" data-finding-filter="'+x[0]+'" class="'+(filter===x[0]?"active":"")+'">'+x[1]+'</button>').join("")+'</div>';
  return renderPendingEvidenceGaps(call,rubric)+renderStatusTotals(call,rubric)+renderThemeProgress(call,rubric)+
    '<section class="pb-scorecard"><div class="pb-heading"><h3>Evidence-linked assessment findings</h3><span>'+visible+' checks shown</span></div>'+bar+
    (content||'<p class="pb-empty">No checks available for the selected method.</p>')+
    '<details class="pb-collapse"><summary>Scoring explanation and coverage policy</summary><p>Theme scores are weighted across configured criteria, with separately reported evidence coverage. Observed scores include only supported, scored findings. Combined QA is finalized only when the assessment is complete and applicable evidence coverage is sufficient. An AI failure cannot finalize missing qualitative checks.</p></details>'+
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
export function renderPresentationInspection(call,rubric,tab="scorecard",filter="all",evidenceView="all",options={}) {
  if(!call)return '<p class="pb-empty">Select an interaction to inspect.</p>';
  const tabs=[["scorecard","Scorecard"],["transcript","Transcript"],["timeline","Agent timeline"],
    ["insights","Key Insights"],["references","Reference Provenance"]];
  const valid=tabs.some(x=>x[0]===tab)?tab:"scorecard";
  const result=valid==="scorecard"?scorecard(call,rubric,filter):
    valid==="transcript"?transcript(call,evidenceView):
    valid==="references"?references(call):
    valid==="timeline"?'<section class="pb-panel"><h3>Agent timeline</h3>'+ (call.turns||[]).map(t=>'<p><b>'+escapeHtml(t.timestamp||"—")+'</b> · '+escapeHtml(t.speaker)+': '+escapeHtml(t.text)+'</p>').join("")+'</section>':
    '<section class="pb-panel"><h3>Key insights · evaluated evidence</h3>'+ (call.findings||[]).flatMap(f=>f.anchors||[]).filter(a=>(a.state==="MET"||a.state==="MISSED")&&(a.evidence||[]).length).map(a=>'<p><b>'+escapeHtml(a.text)+'</b> · '+escapeHtml(a.state)+'</p>').join("")+'</section>';
  return '<div class="pb-inspection">'+
    '<div class="pb-inspection-heading"><div><small>QUALITY INTELLIGENCE</small><h3>Evaluation Results</h3><p>'+escapeHtml(call.agent)+' · '+escapeHtml(call.id)+' · '+escapeHtml(call.duration||"")+" · "+escapeHtml(call.status)+'</p></div></div>'+
    renderCompetencyHighlights(call,rubric)+tiles(call)+'<div class="pb-tabs" role="tablist">'+tabs.map(x=>'<button type="button" role="tab" data-result-tab="'+x[0]+'" aria-selected="'+(x[0]===valid)+'" class="'+(x[0]===valid?"active":"")+'">'+x[1]+'</button>').join("")+'</div>'+result+'</div>';
}
