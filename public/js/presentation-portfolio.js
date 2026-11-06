/** Customer Care Director demo: correct BU/brand hierarchy and actual browser SHARE roll-up. */
export const BU_BRANDS=Object.freeze([
 {bu:"Retail",brand:"Carrefour",agents:82,interactions:1240,quality:86,coverage:93},
 {bu:"Entertainment",brand:"VOX",agents:36,interactions:610,quality:91,coverage:96},
 {bu:"Lifestyle",brand:"Crate & Barrel",agents:24,interactions:395,quality:83,coverage:90},
 {bu:"AMBU",brand:"MOE",agents:19,interactions:290,quality:88,coverage:94},
 {bu:"DBU",brand:"TAG",agents:13,interactions:185,quality:89,coverage:91},
 {bu:"SHARERewards",brand:"SHARE",agents:0,interactions:0,quality:null,coverage:null},
 {bu:"Fintech",brand:"MGC Classic",agents:14,interactions:225,quality:85,coverage:91}
]);
const e=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const n=x=>Number.isFinite(x)?Number(x).toLocaleString("en-US"):"—";
const pct=x=>Number.isFinite(x)?Math.round(x)+"%":"—";
const isShare=c=>!c.businessUnit||["SHARE","SHARERewards"].includes(String(c.businessUnit))||c.brand==="SHARE"||["SHARE","SHARERewards"].includes(String(c.meta?.businessUnit));
export function demoBusinessUnits(){return BU_BRANDS.map(x=>({...x}));}
export function shareSummary(calls){
 const rows=(calls||[]).filter(isShare);
 const completed=rows.filter(c=>c.status==="COMPLETE"&&Number.isFinite(c.score?.score));
 const avg=f=>completed.length?Math.round(completed.reduce((s,c)=>s+Number(f(c)||0),0)/completed.length):null;
 return {bu:"SHARERewards",brand:"SHARE",agents:new Set(rows.map(c=>c.agent).filter(Boolean)).size,
  interactions:rows.length,evaluated:completed.length,quality:avg(c=>c.score.score),
  coverage:avg(c=>c.score.coverage),source:"Browser SHARE assessments"};
}
export function shareAgentSummary(calls){
 const map=new Map();
 for(const c of (calls||[]).filter(isShare)){
  if(!c.agent)continue;
  const a=map.get(c.agent)||{agent:c.agent,interactions:0,evaluated:0,scores:[],coverage:[]};
  a.interactions++;
  if(c.status==="COMPLETE"&&Number.isFinite(c.score?.score)){
   a.evaluated++;a.scores.push(c.score.score);
   if(Number.isFinite(c.score.coverage))a.coverage.push(c.score.coverage);
  }
  map.set(c.agent,a);
 }
 return [...map.values()].map(a=>({
  agent:a.agent,interactions:a.interactions,evaluated:a.evaluated,
  quality:a.scores.length?Math.round(a.scores.reduce((s,x)=>s+x,0)/a.scores.length):null,
  coverage:a.coverage.length?Math.round(a.coverage.reduce((s,x)=>s+x,0)/a.coverage.length):null
 })).sort((a,b)=>a.agent.localeCompare(b.agent));
}
export function renderDirectorPortfolio(calls,selected="all",selectedBrand="all"){
 const actual=shareSummary(calls);
 const all=BU_BRANDS.map(row=>row.bu==="SHARERewards"?{...row,...actual}: {...row,source:"Synthetic demo",evaluated:null});
 const list=all.filter(x=>(selected==="all"||x.bu===selected)&&(selectedBrand==="all"||x.brand===selectedBrand));
 const agents=shareAgentSummary(calls);
 const selectedShare=list.some(x=>x.bu==="SHARERewards");
 const scores=list.filter(x=>Number.isFinite(x.quality));
 const average=scores.length?Math.round(scores.reduce((s,x)=>s+x.quality,0)/scores.length):null;
 const total=list.reduce((s,x)=>s+x.interactions,0);
 const card=(label,value,sub)=>'<article class="qa-portfolio-metric"><small>'+e(label)+'</small><strong>'+e(value)+'</strong><span>'+e(sub)+'</span></article>';
 const chooser=(id,label,options,value)=>'<label>'+e(label)+' <select id="'+id+'"><option value="all">All '+e(label.toLowerCase())+'s</option>'+
   options.map(x=>'<option value="'+e(x)+'" '+(value===x?'selected':'')+'>'+e(x)+'</option>').join("")+'</select></label>';
 const brands=[...new Set(all.filter(x=>selected==="all"||x.bu===selected).map(x=>x.brand))];
 const filter='<div class="qa-portfolio-filter">'+chooser("qa-director-bu","Business unit",all.map(x=>x.bu),selected)+
 chooser("qa-director-brand","Brand",brands,selectedBrand)+'<p>SHARE is live from this browser’s assessed records. All other metrics are simulated for the presentation.</p></div>';
 const rows=list.map(b=>'<tr><td><b>'+e(b.bu)+'</b></td><td>'+e(b.brand)+'</td><td>'+n(b.agents)+'</td><td>'+n(b.interactions)+'</td><td>'+n(b.evaluated)+'</td><td>'+pct(b.quality)+'</td><td>'+pct(b.coverage)+'</td><td><span class="qa-source '+(b.source==="Synthetic demo"?"demo":"actual")+'">'+e(b.source)+'</span></td></tr>').join("");
 const bars=list.map(b=>'<div class="qa-bu-bar"><div class="qa-bu-bar-head"><b>'+e(b.bu)+' · '+e(b.brand)+'</b><span>'+pct(b.quality)+'</span></div><div class="qa-bu-track"><i style="width:'+(b.quality??0)+'%"></i></div><small>'+e(b.source)+'</small></div>').join("");
 const agentPanel=selectedShare?'<section class="panel"><div class="panel-heading"><div><span class="kicker">SHAREREWARDS / SHARE</span><h3>SHARE agent performance — current browser data</h3><p>Same assessed interactions used by the SHARE BU Lead.</p></div><button class="secondary" type="button" data-director-share>Open SHARE agent reports</button></div><div class="table-scroll"><table><thead><tr><th>Agent</th><th>Interactions</th><th>Evaluated</th><th>QA score</th><th>Coverage</th><th>Inspect</th></tr></thead><tbody>'+
 agents.map(a=>'<tr><td><b>'+e(a.agent)+'</b></td><td>'+n(a.interactions)+'</td><td>'+n(a.evaluated)+'</td><td>'+pct(a.quality)+'</td><td>'+pct(a.coverage)+'</td><td><button class="link" type="button" data-agent="'+e(a.agent)+'">Inspect</button></td></tr>').join("")+
 (!agents.length?'<tr><td colspan="6">No SHARE interactions available in this browser.</td></tr>':'')+
 '</tbody></table></div></section>':"";
 return '<div class="qa-persona-page"><div class="qa-demo-heading"><div><span class="kicker">CUSTOMER CARE COMMAND CENTRE</span><h2>Business Unit & Brand Performance</h2><p>Portfolio-level quality, volume and evidence coverage.</p></div><span class="qa-demo-pill">MIXED ACTUAL / DEMO DATA</span></div>'+filter+
 '<div class="qa-portfolio-metrics">'+card("Business units",list.length,"Selected portfolio")+card("Interactions",n(total),"SHARE real; others simulated")+
 card("Average BU QA",pct(average),"Indicative average of available BU scores")+card("SHARE assessed",n(actual.evaluated),"Completed assessments in this browser")+'</div>'+
 '<div class="qa-portfolio-grid"><section class="panel"><div class="panel-heading"><div><span class="kicker">QUALITY COMPARISON</span><h3>Performance by business unit</h3></div></div>'+bars+'</section>'+
 '<section class="panel"><div class="panel-heading"><div><span class="kicker">DATA PROVENANCE</span><h3>What these numbers mean</h3></div></div><p class="qa-demo-note">SHARERewards / SHARE rolls up the same browser-local agent assessments as the SHARE BU Lead view, using the same scoring results. Scores are unavailable until a Gemini assessment completes. All other BU volume and quality values are synthetic presentation examples, not corporate records.</p><div class="qa-director-insight"><strong>SHARE: '+n(actual.interactions)+' interactions · '+n(actual.evaluated)+' evaluated</strong><span>QA '+pct(actual.quality)+' · Coverage '+pct(actual.coverage)+'</span></div></section></div>'+
 '<section class="panel"><div class="panel-heading"><div><span class="kicker">BU / BRAND SCORECARD</span><h3>Volume and performance</h3></div></div><div class="table-scroll"><table><thead><tr><th>BU</th><th>Brand</th><th>Agents</th><th>Interactions</th><th>Evaluated</th><th>QA</th><th>Coverage</th><th>Source</th></tr></thead><tbody>'+rows+'</tbody></table></div></section>'+
 agentPanel+'</div>';
}
