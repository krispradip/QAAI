/**
 * Evidence-aware theme scoring for the personal Gemini inspection.
 * Never converts observed-only scores into a finalized combined QA score.
 * Score calculation follows the engine's weighted evidence-coverage model.
 */
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pct=v=>Number.isFinite(v)?Math.round(v)+"%":"—";
const clamp=x=>Math.min(100,Math.max(0,Number(x)||0));
const ALL=["MET","MISSED","UNKNOWN","UNVERIFIED","NA","NOT_EVALUATED"];
export const QA_STATES=Object.freeze([...ALL]);
export const BUCKETS=Object.freeze([
 ["MET","Met"],["MISSED","Missed"],["UNKNOWN","Unknown"],
 ["UNVERIFIED","Unverified"],["NA","Not applicable"],["NOT_EVALUATED","Not evaluated"]
]);
export function assessedCriteria(call,rubric){
 const defs=call?.assessmentCriteria||call?.meta?.criteria||rubric?.criteria||[];
 return (Array.isArray(defs)?defs:[]).filter(c=>c&&c.enabled!==false);
}
export function groupedChecks(call,rubric){
 const definitions=assessedCriteria(call,rubric);
 const findings=new Map((call?.findings||[]).map(f=>[f.id,f]));
 return definitions.map(c=>{
  const f=findings.get(c.id)||null;
  const defined=(c.checkpoints||[]).filter(x=>x.enabled!==false);
  const raw=Array.isArray(f?.anchors)?f.anchors:[];
  const qual=new Map(raw.filter(a=>defined.some(x=>x.id===a.id)).map(x=>[x.id,x]));
  const others=raw.filter(a=>!defined.some(x=>x.id===a.id));
  const checks=[
   ...others.map(a=>({...a,methodKind:a.method==="qualitative"?"ai":"rule"})),
   ...defined.map(x=>({...x,...(qual.get(x.id)||{}),text:x.text,methodKind:"ai"}))
  ];
  // Some old samples/exports have no child checks and no observed anchors.
  // Use a criterion-level evidence availability marker, not an invented pass.
  if(!checks.length)checks.push({
   id:c.id+"-unverifiable",text:"Evidence availability for "+c.name,
   methodKind:c.mode==="ai"?"ai":"rule",state:"UNKNOWN",evidence:[]
  });
  return {criterion:c,finding:f,checks};
 });
}
export function checkpointState(check,call,criterion,finding){
 if(check?.validation?.status==="UNVERIFIED"||check?.validation?.status==="REJECTED")return "UNVERIFIED";
 const method=check.methodKind|| (check.method==="quantitative"?"rule":"ai");
 if(method==="ai"&&call?.status!=="COMPLETE")return "NOT_EVALUATED";
 let s=String(check?.state||"UNKNOWN").toUpperCase().replace(/\s+/g,"_");
 if(s==="NOT_APPLICABLE"||s==="N/A")s="NA";
 if(s==="NOT_EVALUATED")return s;
 if(s==="UNVERIFIABLE"||s==="UNVERIFIED")return "UNVERIFIED";
 if(s==="MET"||s==="MISSED"){
   // An anchored outcome without source evidence is not a validated pass/fail.
   if(!Array.isArray(check.evidence)||!check.evidence.length)return "UNVERIFIED";
   return s;
 }
 if(!ALL.includes(s))s="UNKNOWN";
 if(s==="UNKNOWN" && (criterion?.mode==="audio"||criterion?.mode==="external") && finding?.status==="UNVERIFIABLE")return "UNVERIFIED";
 return s;
}
export function summarizeCheckStates(call,rubric){
 const counts=Object.fromEntries(ALL.map(k=>[k,0]));
 const detail=[];
 for(const group of groupedChecks(call,rubric)){
  for(const check of group.checks){
   const state=checkpointState(check,call,group.criterion,group.finding);
   counts[state]++;
   detail.push({criterion:group.criterion,check,state,method:check.methodKind,finding:group.finding});
  }
 }
 return {counts,total:detail.length,checks:detail};
}
function findingCoverage(f){
 return f&&Number.isFinite(f.coverage)?clamp(f.coverage):f?.status==="SCORED"?100:0;
}
function scored(f){return f?.status==="SCORED"&&Number.isFinite(f.score);}
export function themeScores(call,rubric){
 const groups=new Map();
 for(const {criterion:c,finding:f} of groupedChecks(call,rubric)){
  const name=String(c.group||"OTHER");
  const row=groups.get(name)||{name,criteria:0,scored:0,weight:0,coverageWeight:0,observedWeight:0,
    scoredWeight:0,scoredSum:0,unknown:0,unverifiable:0,na:0,complete:false,coverage:null,observedScore:null,finalScore:null};
  row.criteria++;
  if(f?.status==="UNVERIFIABLE")row.unverifiable++;
  if(f?.status==="NOT_APPLICABLE")row.na++;
  if(!scored(f))row.unknown++;
  else row.scored++;
  const weight=Number(c.weight);
  if(Number.isFinite(weight)&&weight>0&&f?.status!=="NOT_APPLICABLE"){
   row.weight+=weight;
   row.coverageWeight+=weight;
   const coverage=findingCoverage(f)/100;
   row.observedWeight+=weight*coverage;
   if(scored(f)){
    row.scoredWeight+=weight*coverage;
    row.scoredSum+=weight*coverage*clamp(f.score);
   }
  }
  groups.set(name,row);
 }
 return [...groups.values()].map(row=>{
  row.coverage=row.coverageWeight?Math.round(100*row.observedWeight/row.coverageWeight):null;
  row.observedScore=row.scoredWeight?Math.round(row.scoredSum/row.scoredWeight):null;
  row.complete=call?.status==="COMPLETE"&&row.coverageWeight>0 &&
    Math.abs(row.observedWeight-row.coverageWeight)<0.00001&&row.unknown===0;
  row.finalScore=row.complete?row.observedScore:null;
  return row;
 });
}
export function renderStatusTotals(call,rubric){
 const {counts,total}=summarizeCheckStates(call,rubric);
 return '<section class="pb-status-summary" aria-label="Evidence status totals">'+
  '<div class="pb-summary-head"><b>CHECKPOINT OUTCOMES</b><small>'+total+' configured checks · evidence-aware counts</small></div>'+
  '<div class="pb-status-counts">'+BUCKETS.map(([id,label])=>
   '<div class="pb-status-pill pb-status-'+id.toLowerCase().replaceAll("_","-")+'">'+
   '<b>'+counts[id]+'</b><span>'+label+'</span></div>').join("")+'</div></section>';
}
export function renderThemeProgress(call,rubric){
 const themes=themeScores(call,rubric);
 return '<section class="pb-theme-performance"><div class="pb-summary-head">'+
   '<div><b>THEME-BASED QA PERFORMANCE</b><small>Weighted by rubric · score and evidence coverage are separate</small></div>'+
   '<span>'+themes.length+' themes</span></div>'+
   '<div class="pb-theme-grid">'+themes.map((g,i)=>{
    const display=g.finalScore??g.observedScore;
    const stage=g.complete?"Final":g.observedScore!==null?"Observed":"Unscored";
    const label=g.name.toLowerCase();
    const tone=display===null?"no-data":display>=85?"strong":display>=65?"attention":"risk";
    return '<article class="pb-theme-item" data-theme="'+esc(label)+'">'+
      '<div class="pb-theme-top"><b>'+esc(g.name)+'</b><span class="pb-theme-mark '+tone+'">'+
       pct(display)+'</span></div>'+
      '<div class="pb-theme-track" role="progressbar" aria-label="'+esc(g.name)+' observed QA score" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+(display??0)+'"><i class="'+tone+'" style="width:'+clamp(display)+'%"></i></div>'+
      '<div class="pb-theme-foot"><span>'+stage+' QA</span><span>Evidence '+pct(g.coverage)+'</span><span>'+g.scored+'/'+g.criteria+' scored</span></div>'+
      '</article>';
   }).join("")+'</div>'+
   '<p class="pb-theme-caution">Observed theme scores reflect only scored evidence. A theme is final only at full coverage; missing checkpoints are never scored as a pass.</p></section>';
}
export function renderScoreStatus(call){
 const score=call?.score||{};
 const complete=call?.status==="COMPLETE";
 if(!complete)return {value:"—",label:call?.status==="ERROR"?"Evaluation incomplete":"Awaiting evaluation",
  detail:Number.isFinite(score.observedScore)?"Observed "+pct(score.observedScore)+" · "+pct(score.coverage)+" evidence coverage":"No finalized score"};
 if(Number.isFinite(score.score))return {value:pct(score.score),label:"Final combined QA score",
  detail:"Evidence coverage "+pct(score.coverage)};
 if(Number.isFinite(score.observedScore))return {value:"—",label:"Combined score not finalized",
  detail:"Observed QA "+pct(score.observedScore)+" · "+pct(score.coverage)+" coverage; unresolved evidence prevents finalization"};
 return {value:"—",label:"No verified combined score",detail:"Evidence coverage "+pct(score.coverage)+"; no supported scored criteria"};
}
