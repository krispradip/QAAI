/**
 * Customer Care portfolio built from saved assessment records.
 * No invented volumes, headcounts or QA outcomes are shown.
 */
export const BU_BRANDS=Object.freeze([
 {bu:"Retail",brand:"Carrefour"},
 {bu:"Entertainment",brand:"VOX"},
 {bu:"Lifestyle",brand:"Crate & Barrel"},
 {bu:"AMBU",brand:"MOE"},
 {bu:"DBU",brand:"TAG"},
 {bu:"SHARERewards",brand:"SHARE"},
 {bu:"Fintech",brand:"MGC Classic"}
]);
const e=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const n=x=>Number.isFinite(x)?Number(x).toLocaleString("en-US"):"—";
const pct=x=>Number.isFinite(x)?Math.round(x)+"%":"—";
const normalizedBU=c=>{
 const raw=String(c?.businessUnit||c?.bu||c?.meta?.businessUnit||"");
 if(["SHARE","SHARERewards"].includes(raw)||(!raw&&c?.brand==="SHARE"))return "SHARERewards";
 return raw||"SHARERewards";
};
const isShare=c=>normalizedBU(c)==="SHARERewards";
const mean=values=>values.length?Math.round(values.reduce((s,v)=>s+v,0)/values.length):null;
export function demoBusinessUnits(){return BU_BRANDS.map(x=>({...x}));}
function groupSummary(bu,brand,calls){
 const rows=(calls||[]).filter(c=>normalizedBU(c)===bu && (!c.brand||c.brand===brand||bu==="SHARERewards"));
 const scored=rows.filter(c=>c.status==="COMPLETE"&&Number.isFinite(c.score?.score));
 return {bu,brand,agents:rows.length?new Set(rows.map(c=>c.agent).filter(Boolean)).size:null,
  interactions:rows.length||null,evaluated:rows.length?scored.length:null,
  quality:mean(scored.map(c=>c.score.score)),
  coverage:mean(scored.filter(c=>Number.isFinite(c.score?.coverage)).map(c=>c.score.coverage)),
  source:rows.length?"Saved interaction records":"No records"};
}
export function shareSummary(calls){return groupSummary("SHARERewards","SHARE",calls);}
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
  quality:mean(a.scores),coverage:mean(a.coverage)
 })).sort((a,b)=>a.agent.localeCompare(b.agent));
}
export function renderDirectorPortfolio(calls,selected="all",selectedBrand="all"){
 const actual=shareSummary(calls);
 const configured=BU_BRANDS.map(row=>groupSummary(row.bu,row.brand,calls));
 const known=new Set(BU_BRANDS.map(x=>x.bu));
 const extras=[...new Set((calls||[]).map(normalizedBU).filter(b=>!known.has(b)))];
 const all=configured.concat(extras.map(b=>groupSummary(b,b,calls)));
 const list=all.filter(x=>(selected==="all"||x.bu===selected)&&(selectedBrand==="all"||x.brand===selectedBrand));
 const agents=shareAgentSummary(calls);
 const selectedShare=list.some(x=>x.bu==="SHARERewards");
 const scores=list.filter(x=>Number.isFinite(x.quality));
 const average=mean(scores.map(x=>x.quality));
 const total=list.reduce((s,x)=>s+(x.interactions||0),0);
 const withData=list.filter(x=>Number.isFinite(x.interactions)).length;
 const card=(label,value,sub)=>'<article class="qa-portfolio-metric"><small>'+e(label)+'</small><strong>'+e(value)+'</strong><span>'+e(sub)+'</span></article>';
 const chooser=(id,label,options,value)=>'<label>'+e(label)+' <select id="'+id+'"><option value="all">All '+e(label.toLowerCase())+'s</option>'+
   options.map(x=>'<option value="'+e(x)+'" '+(value===x?'selected':'')+'>'+e(x)+'</option>').join("")+'</select></label>';
 const brands=[...new Set(all.filter(x=>selected==="all"||x.bu===selected).map(x=>x.brand))];
 const filters='<div class="qa-portfolio-filter">'+chooser("qa-director-bu","Business unit",all.map(x=>x.bu),selected)+
  chooser("qa-director-brand","Brand",brands,selectedBrand)+'<p>Metrics are calculated only from interactions stored and assessed in this browser.</p></div>';
 const rows=list.map(b=>'<tr><td><b>'+e(b.bu)+'</b></td><td>'+e(b.brand)+'</td><td>'+n(b.agents)+'</td><td>'+n(b.interactions)+'</td><td>'+n(b.evaluated)+'</td><td>'+pct(b.quality)+'</td><td>'+pct(b.coverage)+'</td></tr>').join("");
 const bars=list.map(b=>'<div class="qa-bu-bar"><div class="qa-bu-bar-head"><b>'+e(b.bu)+' · '+e(b.brand)+'</b><span>'+pct(b.quality)+'</span></div><div class="qa-bu-track"><i style="width:'+(b.quality??0)+'%"></i></div><small>'+(b.source==="No records"?"No assessed interactions available":n(b.evaluated)+" completed scored assessments")+'</small></div>').join("");
 const agentPanel=selectedShare?'<section class="panel"><div class="panel-heading"><div><span class="kicker">SHAREREWARDS / SHARE</span><h3>SHARE agent performance</h3><p>Assessed interactions used by the SHARE BU Lead.</p></div><button class="secondary" type="button" data-director-share>Open SHARE agent reports</button></div><div class="table-scroll"><table><thead><tr><th>Agent</th><th>Interactions</th><th>Evaluated</th><th>QA score</th><th>Coverage</th><th>Inspect</th></tr></thead><tbody>'+
  agents.map(a=>'<tr><td><b>'+e(a.agent)+'</b></td><td>'+n(a.interactions)+'</td><td>'+n(a.evaluated)+'</td><td>'+pct(a.quality)+'</td><td>'+pct(a.coverage)+'</td><td><button class="link" type="button" data-agent="'+e(a.agent)+'">Inspect</button></td></tr>').join("")+
  (!agents.length?'<tr><td colspan="6">No SHARE interaction assessments are available yet.</td></tr>':'')+
  '</tbody></table></div></section>':"";
 return '<div class="qa-persona-page"><div class="qa-demo-heading"><div><span class="kicker">CUSTOMER CARE COMMAND CENTRE</span><h2>Business Unit & Brand Performance</h2><p>Portfolio-level quality, volume and evidence coverage.</p></div><span class="qa-demo-pill">ALL BUSINESS UNITS</span></div>'+filters+
  '<div class="qa-portfolio-metrics">'+card("Business units",list.length,"In selected portfolio")+
  card("Interactions",n(total),"Saved interactions")+
  card("Average BU QA",pct(average),"Across scored BUs")+
  card("BUs with records",n(withData),"Of "+list.length+" selected")+'</div>'+
  '<div class="qa-portfolio-grid"><section class="panel"><div class="panel-heading"><div><span class="kicker">QUALITY COMPARISON</span><h3>Performance by business unit</h3></div></div>'+bars+'</section>'+
  '<section class="panel"><div class="panel-heading"><div><span class="kicker">DATA AVAILABILITY</span><h3>Assessment coverage by BU</h3></div></div><p class="qa-demo-note">A score appears only where completed assessments exist in this browser. Other business units show no score until their interactions have been imported and evaluated. This workspace does not synchronize with corporate records.</p><div class="qa-director-insight"><strong>SHARE: '+n(actual.interactions)+' interactions · '+n(actual.evaluated)+' evaluated</strong><span>QA '+pct(actual.quality)+' · Coverage '+pct(actual.coverage)+'</span></div></section></div>'+
  '<section class="panel"><div class="panel-heading"><div><span class="kicker">BU / BRAND SCORECARD</span><h3>Volume and performance</h3></div></div><div class="table-scroll"><table><thead><tr><th>BU</th><th>Brand</th><th>Agents</th><th>Interactions</th><th>Evaluated</th><th>QA</th><th>Coverage</th></tr></thead><tbody>'+rows+'</tbody></table></div></section>'+
  agentPanel+'</div>';
}
