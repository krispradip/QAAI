/**
 * Evidence-weighted quality themes and checkpoint distributions.
 * A score on observed evidence is NOT a finalized score when coverage < 100%.
 * No missing or unverifiable checkpoint is treated as MISSED.
 */
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const finite=x=>typeof x==="number"&&Number.isFinite(x);
const fmt=x=>finite(x)?Math.round(x)+"%":"—";
const groupsOrder=["OPENING","CUSTOMER INFORMATION","LISTENING SKILLS","COMMUNICATION SKILLS","HOLD & TRANSFER","SYSTEMS & PROCESSES","CLOSING"];
const ruleOnly=a=>a?.method==="quantitative"||a?.methodKind==="rule";
const unavailableModes=new Set(["audio","external","system"]);
export const QA_STATES=["MET","MISSED","UNKNOWN","UNVERIFIABLE","NOT_EVALUATED","NA"];
function rawStatus(anchor,criteria,call,found){
 const state=String(anchor.state||"UNKNOWN").trim().toUpperCase().replace(/[\s-]+/g,"_");
 if(state==="NA"||state==="NOT_APPLICABLE")return "NA";
 const ai=!ruleOnly(anchor);
 if(ai&&call.status!=="COMPLETE")return "NOT_EVALUATED";
 if(["MET","MISSED"].includes(state))return state;
 if(["UNVERIFIABLE","UNVERIFIED"].includes(state))return "UNVERIFIABLE";
 const validation=String(anchor.validation?.status||"").toUpperCase();
 const mode=String(criteria.mode||"").toLowerCase();
 if(["UNVERIFIED","INSUFFICIENT","EVIDENCE_UNAVAILABLE"].includes(validation))return "UNVERIFIABLE";
 if(unavailableModes.has(mode))return "UNVERIFIABLE";
 if(!found&&["UNVERIFIABLE","NOT_VERIFIABLE"].includes(String(criteria.status||"")))return "UNVERIFIABLE";
 return "UNKNOWN";
}
function keyOf(c,a){return String(c.id||"")+":"+String(a.id||a.text||"");}
function getDefinitions(call,rubric){
 const base=Array.isArray(rubric?.criteria)?rubric.criteria:[];
 const source=Array.isArray(call.assessmentCriteria)&&call.assessmentCriteria.length?call.assessmentCriteria:
              Array.isArray(call.meta?.criteria)&&call.meta.criteria.length?call.meta.criteria:base;
 const defaults=new Map(base.map(c=>[c.id,c]));
 return source.filter(c=>c?.enabled!==false).map(c=>({...defaults.get(c.id),...c,
    checkpoints:Array.isArray(c.checkpoints)?c.checkpoints:(defaults.get(c.id)?.checkpoints||[])}));
}
export function summarizeQualityThemes(call,rubric){
 const definitions=getDefinitions(call,rubric), findings=new Map((call.findings||[]).map(f=>[f.id,f]));
 const counts=Object.fromEntries(QA_STATES.map(s=>[s,0])), themes=new Map(), checks=[],seen=new Set();
 for(const criterion of definitions){
   const f=findings.get(criterion.id),group=String(criterion.group||"OTHER").trim()||"OTHER";
   const theme=themes.get(group)||{name:group,counts:Object.fromEntries(QA_STATES.map(s=>[s,0])),
     observedMetWeight:0,observedWeight:0,applicableWeight:0,scoredCriteria:0,totalCriteria:0,unverifiableCriteria:0};
   theme.totalCriteria++;
   if(f?.status==="SCORED"&&finite(f.score))theme.scoredCriteria++;
   if(f?.status==="UNVERIFIABLE"||f?.status==="PARTIAL")theme.unverifiableCriteria++;
   const defined=(criterion.checkpoints||[]).filter(a=>a.enabled!==false);
   const anchors=Array.isArray(f?.anchors)?f.anchors:[];
   const checkpointIds=new Set(defined.map(a=>String(a.id)));
   const qualitative=new Map(anchors.filter(a=>!ruleOnly(a)).map(a=>[String(a.id),a]));
   const items=[
     ...defined.map(d=>({...d,...(qualitative.get(String(d.id))||{}),id:d.id,text:d.text,
       methodKind:"ai",_found:qualitative.has(String(d.id))})),
     ...anchors.filter(a=>ruleOnly(a)&&!checkpointIds.has(String(a.id))).map(a=>({...a,methodKind:"rule",_found:true}))
   ];
   const applicable=items.filter(a=>!["NA","NOT_APPLICABLE"].includes(String(a.state||"").toUpperCase()));
   const pointOf=a=>{
     const rule=criterion.ruleWeights?.[a.id];
     const val=a.methodKind==="rule"?rule:a.points;
     return finite(val)&&val>=0?val:1;
   };
   const totalPoints=applicable.reduce((sum,a)=>sum+pointOf(a),0);
   const criterionWeight=finite(criterion.weight)&&criterion.weight>0?criterion.weight:1;
   for(const a of items){
     const k=keyOf(criterion,a);if(seen.has(k))continue;seen.add(k);
     const state=rawStatus(a,criterion,call,a._found),method=a.methodKind==="rule"?"rule":"ai";
     counts[state]++;theme.counts[state]++;
     const points=pointOf(a);
     const weight=totalPoints>0?criterionWeight*points/totalPoints:0;
     if(state!=="NA"){
       theme.applicableWeight+=weight;
       if(state==="MET"||state==="MISSED"){
         theme.observedWeight+=weight;
         if(state==="MET")theme.observedMetWeight+=weight;
       }
     }
     checks.push({criterionId:criterion.id,criterion:criterion.name||criterion.id,
       group,state,method,id:a.id,text:a.text||a.id||"",reason:a.reason||"",
       evidence:Array.isArray(a.evidence)?a.evidence:[]});
   }
   themes.set(group,theme);
 }
 const result=[...themes.values()].map(t=>({...t,
   score:t.observedWeight>0?Math.round(100*t.observedMetWeight/t.observedWeight):null,
   coverage:t.applicableWeight>0?Math.round(100*t.observedWeight/t.applicableWeight):0,
   totalChecks:QA_STATES.reduce((sum,k)=>sum+t.counts[k],0)}));
 result.sort((a,b)=>{
   const ia=groupsOrder.findIndex(k=>a.name.toUpperCase().includes(k));
   const ib=groupsOrder.findIndex(k=>b.name.toUpperCase().includes(k));
   return (ia<0?100:ia)-(ib<0?100:ib)||a.name.localeCompare(b.name);
 });
 return {themes:result,counts,checks,totalChecks:checks.length};
}
export function scoreDisplay(call){
 const score=call.score||{};
 if(call.status==="ERROR")return {value:null,caption:"AI assessment failed · not finalized",provisional:false};
 if(call.status!=="COMPLETE")return {value:null,caption:"Awaiting completed assessment",provisional:false};
 if(finite(score.score))return {value:score.score,caption:"Final combined QA · "+fmt(score.coverage)+" evidence coverage",provisional:false};
 if(finite(score.observedScore))return {value:score.observedScore,
   caption:"Observed QA only · "+fmt(score.coverage)+" evidence coverage · not finalized",provisional:true};
 return {value:null,caption:"Insufficient verified evidence for a QA score",provisional:false};
}
function severity(score,coverage){
 if(!finite(score))return "none";
 if(score<60)return "critical";
 if(score<80)return "attention";
 return coverage<100?"partial":"good";
}
export function renderQualityCounts(summary){
 const terms=[["MET","Met","✓"],["MISSED","Missed","×"],["UNKNOWN","Unknown","?"],["UNVERIFIABLE","Unverifiable","!"],["NOT_EVALUATED","AI not evaluated","◷"],["NA","N/A","—"]];
 return '<section class="qa-outcome-section" aria-label="Checkpoint outcomes">'+
   '<div class="qa-overview-header"><div><small>RUBRIC EVIDENCE</small><h4>Checkpoint outcomes</h4></div><span>'+
   summary.totalChecks+' configured / reported checks</span></div>'+
   '<div class="qa-outcome-grid">'+terms.map(([state,label,icon])=>
     '<div class="qa-outcome qa-outcome-'+state.toLowerCase()+'"><div><span class="qa-outcome-icon">'+icon+'</span><b>'+summary.counts[state]+'</b></div><small>'+label+'</small></div>').join("")+
   '</div></section>';
}
export function renderQualityThemes(summary){
 const themes=summary.themes;
 return '<section class="qa-themes-section" aria-label="Quality themes"><div class="qa-overview-header">'+
  '<div><small>THEME PERFORMANCE</small><h4>Quality by competency</h4></div>'+
  '<span>Observed performance · unverified evidence excluded from scoring</span></div>'+
  '<div class="qa-themes-grid">'+
  themes.map(t=>{
    const cls=severity(t.score,t.coverage),coverage=Math.min(100,Math.max(0,t.coverage));
    const score=finite(t.score)?Math.min(100,Math.max(0,t.score)):0;
    return '<article class="qa-theme-card qa-theme-'+cls+'">'+
      '<div class="qa-theme-card-head"><div><b>'+esc(t.name)+'</b><small>'+t.totalCriteria+' criteria · '+t.totalChecks+' checks</small></div>'+
      '<strong>'+fmt(t.score)+'</strong></div>'+
      '<div class="qa-theme-track" role="meter" aria-label="'+esc(t.name)+' observed QA score" aria-valuemin="0" aria-valuemax="100"'+
        (finite(t.score)?' aria-valuenow="'+score+'"':'')+'><i style="width:'+score+'%"></i></div>'+
      '<div class="qa-theme-foot"><span>Verified coverage <b>'+coverage+'%</b></span><span>'+
      t.counts.MET+' met · '+t.counts.MISSED+' missed · '+(t.counts.UNKNOWN+t.counts.UNVERIFIABLE+t.counts.NOT_EVALUATED)+' unresolved</span></div>'+
      (t.score===null?'<p class="qa-theme-no-score">No verified checkpoints to score yet.</p>':
       t.coverage<100?'<p class="qa-theme-provisional">Observed score — incomplete coverage</p>':"")+
      '</article>';
  }).join("")+
  '</div><p class="qa-theme-footnote">Theme percentages use validated MET/MISSED checkpoints, weighted by each configured criterion and checkpoint points. Unknown, unverifiable and pending checks lower evidence coverage, not the observed score. Scores are not final unless the relevant evidence is complete.</p></section>';
}
