/**
 * Cross-BU director demonstration. All non-SHARE metrics here are synthetic.
 * Real SHARE assessments come from the browser-local interaction history.
 * Never label fixture values as observed production performance.
 */
const DEMO=[
 {bu:"Carrefour",market:"UAE",channel:"Call",agents:82,interactions:1240,quality:86,coverage:93,fcr:81,trend:[80,82,84,86]},
 {bu:"VOX Cinemas",market:"UAE",channel:"Call + Chat",agents:36,interactions:610,quality:91,coverage:96,fcr:88,trend:[83,85,89,91]},
 {bu:"MAF Lifestyle",market:"UAE",channel:"Call + Chat",agents:24,interactions:395,quality:83,coverage:90,fcr:79,trend:[78,81,80,83]},
 {bu:"MAF Entertainment",market:"UAE",channel:"Call + Chat",agents:19,interactions:290,quality:88,coverage:94,fcr:84,trend:[83,84,86,88]},
 {bu:"BELONG",market:"UAE",channel:"Call",agents:13,interactions:185,quality:89,coverage:91,fcr:86,trend:[84,85,87,89]}
];
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=n=>Number.isFinite(n)?Number(n).toLocaleString("en-US"):"—";
export function demoBusinessUnits(){return DEMO.map(x=>({...x,trend:[...x.trend]}));}
export function shareSummary(calls){
 const valid=(calls||[]).filter(c=>c.status==="COMPLETE"&&Number.isFinite(c.score?.score));
 const quality=valid.length?Math.round(valid.reduce((s,c)=>s+c.score.score,0)/valid.length):null;
 const coverage=valid.length?Math.round(valid.reduce((s,c)=>s+(c.score?.coverage??0),0)/valid.length):null;
 return {bu:"SHARE",market:"UAE",channel:"Call + Chat",agents:new Set((calls||[]).map(c=>c.agent).filter(Boolean)).size,interactions:(calls||[]).length,
 quality,coverage,fcr:null,trend:null,source:"Browser assessments"};
}
function qualityBadge(v){return Number.isFinite(v)?v+"%":"—";}
export function renderDirectorPortfolio(calls,selected="all"){
 const share=shareSummary((calls||[]).filter(c=>!c.businessUnit||c.businessUnit==="SHARE"));
 const units=[share,...DEMO.map(b=>({...b,source:"Synthetic demo"}))];
 const shown=selected==="all"?units:units.filter(x=>x.bu===selected);
 const available=shown.filter(x=>Number.isFinite(x.quality));
 const mean=available.length?Math.round(available.reduce((s,x)=>s+x.quality,0)/available.length):null;
 const totals=shown.reduce((sum,x)=>sum+x.interactions,0);
 const cards=(label,value,desc)=>'<div class="qa-portfolio-metric"><small>'+esc(label)+'</small><strong>'+esc(value)+'</strong><span>'+esc(desc)+'</span></div>';
 const option=units.map(x=>'<option value="'+esc(x.bu)+'" '+(selected===x.bu?'selected':'')+'>'+esc(x.bu)+'</option>').join("");
 const rows=shown.map(b=>'<tr><td><b>'+esc(b.bu)+'</b><small>'+esc(b.source)+'</small></td><td>'+fmt(b.agents)+'</td><td>'+fmt(b.interactions)+'</td><td>'+qualityBadge(b.quality)+'</td><td>'+qualityBadge(b.coverage)+'</td><td>'+qualityBadge(b.fcr)+'</td><td><span class="qa-source '+(b.source==="Synthetic demo"?"demo":"actual")+'">'+esc(b.source)+'</span></td></tr>').join("");
 const bars=shown.map(b=>'<div class="qa-bu-bar"><div class="qa-bu-bar-head"><b>'+esc(b.bu)+'</b><span>'+(Number.isFinite(b.quality)?b.quality+'%':'No completed scores')+'</span></div><div class="qa-bu-track"><i style="width:'+(b.quality??0)+'%"></i></div><small>'+esc(b.source)+'</small></div>').join("");
 return '<div class="qa-persona-page"><div class="qa-demo-heading"><div><span class="kicker">CUSTOMER CARE COMMAND CENTRE</span><h2>Business Unit Performance</h2><p>Cross-business-unit service quality, volumes and evidence coverage.</p></div><span class="qa-demo-pill">SYNTHETIC CROSS-BU DATA</span></div>'+
 '<div class="qa-portfolio-filter"><label>Business unit <select id="qa-director-bu"><option value="all">All business units</option>'+option+'</select></label><p>SHARE uses available browser assessments. All other BU values are fictional presentation examples.</p></div>'+
 '<div class="qa-portfolio-metrics">'+cards("Business units",shown.length,"Included in this view")+cards("Interactions",fmt(totals),"Mix of browser records and demo volumes")+cards("Average shown QA",qualityBadge(mean),"Illustrative unweighted BU average")+cards("Demo agents",fmt(shown.reduce((s,x)=>s+x.agents,0)),"Synthetic counts except SHARE")+'</div>'+
 '<div class="qa-portfolio-grid"><section class="panel"><div class="panel-heading"><div><span class="kicker">QUALITY COMPARISON</span><h3>BU quality performance</h3></div></div>'+bars+'</section>'+
 '<section class="panel"><div class="panel-heading"><div><span class="kicker">LEADERSHIP INSIGHTS</span><h3>Operational signals</h3></div></div><p class="qa-demo-note">These cross-BU values are presentation fixtures, not operational evidence. Once connected to authorized corporate data, this view should use assessed interaction dates, channel filters, volume counts and evidence coverage.</p>'+
 '<div class="qa-director-insight"><strong>SHARE</strong><span>'+esc(share.quality===null?"Awaiting a completed assessment in this browser.":"Uses evaluated agent findings saved locally.")+'</span></div>'+
 '<div class="qa-director-insight"><strong>Other business units</strong><span>Illustrative quality and service outcomes for portfolio navigation.</span></div></section></div>'+
 '<section class="panel"><div class="panel-heading"><div><span class="kicker">BU SCORECARD</span><h3>Volumes and performance by business unit</h3></div></div><div class="table-scroll"><table><thead><tr><th>Business Unit</th><th>Agents</th><th>Interactions</th><th>QA</th><th>Coverage</th><th>FCR</th><th>Data source</th></tr></thead><tbody>'+rows+'</tbody></table></div></section></div>';
}
