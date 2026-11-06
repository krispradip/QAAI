/**
 * Rubric and Reference Library visibility with leadership access to the existing editor.
 * BU Lead edits are scoped to the assigned BU; CC Director can select any BU.
 * The current personal Gemini prototype has only an actual SHARE baseline
 * rubric. Other business-unit rubrics are not falsely presented as ready.
 */
import {REFERENCE_SCHEMAS} from "./reference.js";
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export function qualityGovernanceStats(rubric,library){
 const criteria=(rubric?.criteria||[]).filter(c=>c.enabled!==false);
 const all=(library?.datasets||[]);
 const active=all.filter(d=>d.enabled===true);
 return {criteria:criteria.length,themes:new Set(criteria.map(c=>c.group||"OTHER")).size,
  checkpoints:criteria.reduce((n,c)=>n+(c.checkpoints||[]).filter(x=>x.enabled!==false).length,0),
  files:all.length,activeFiles:active.length,activeEntries:active.reduce((n,d)=>n+(d.rows?.length||0),0),
  rubricRevision:rubric?.revision||1,libraryRevision:library?.revision||1};
}
export function renderQualityContextStrip(rubric,library,role){
 const stats=qualityGovernanceStats(rubric,library);
 if(!["bu_lead","cc_lead","admin"].includes(role))return "";
 return '<section class="qa-governance-strip" aria-label="QA rubric and reference library">'+
  '<div><small>ACTIVE QUALITY GOVERNANCE</small><strong>SHARE QA Rubric · Rev '+esc(stats.rubricRevision)+'</strong>'+
  '<span>'+stats.criteria+' criteria · '+stats.themes+' themes · '+stats.checkpoints+' AI checkpoints</span></div>'+
  '<div><small>REFERENCE LIBRARY</small><strong>Rev '+esc(stats.libraryRevision)+'</strong>'+
  '<span>'+stats.activeFiles+' active files · '+stats.activeEntries+' contextual entries</span></div>'+
  '<button class="secondary" type="button" data-page-go="standards">View rubric & references</button>'+
  '</section>';
}
function rubricCriterion(c) {
 const checks=(c.checkpoints||[]).filter(x=>x.enabled!==false);
 return '<details class="qa-governance-criterion"><summary><span>'+esc(c.name||c.id)+'</span>'+
  '<small>'+esc(c.mode||"")+' · Weight '+esc(c.weight??"—")+' · '+checks.length+' checkpoints</small></summary>'+
  '<p>'+esc(c.definition||"")+'</p>'+
  (checks.length?'<ul>'+checks.map(x=>'<li>'+esc(x.text||x.id)+'</li>').join("")+'</ul>':
    '<p class="muted">This criterion is assessed through configured rules, audio or system evidence.</p>')+
  '</details>';
}
function rubricGroup(name,criteria){
 return '<section class="qa-governance-group"><div><h3>'+esc(name)+'</h3><span>'+criteria.length+' criteria</span></div>'+
  criteria.map(rubricCriterion).join("")+'</section>';
}
function refFile(d){
 const rows=Array.isArray(d.rows)?d.rows:[];
 const scopes=[...new Set(rows.map(r=>String(r.businessUnit||"All")).filter(Boolean))];
 const schema=REFERENCE_SCHEMAS[d.type];
 return '<article class="qa-governance-file"><div><b>'+esc(d.name||"Reference dataset")+'</b>'+
  '<span>'+esc(schema?.title||d.type||"Reference")+' · Version '+esc(d.version||1)+' · '+rows.length+' entries</span></div>'+
  '<span class="qa-source actual">Active</span><small>BU scope: '+esc(scopes.join(", ")||"All")+'</small>'+
  '<details><summary>Preview structured entries</summary><div class="qa-governance-preview"><table>'+
  '<thead><tr><th>Term / criterion</th><th>Example or description</th><th>BU</th></tr></thead><tbody>'+
  rows.slice(0,7).map(r=>'<tr><td>'+esc(r.term||r.canonical||r.concept||r.criterionId||"—")+'</td><td>'+esc(r.meaning||r.variant||r.phrase||r.example||"—")+'</td><td>'+esc(r.businessUnit||"All")+'</td></tr>').join("")+
  '</tbody></table></div></details></article>';
}
export function renderQualityGovernance(rubric,library,role,bu="SHARE"){
 const stats=qualityGovernanceStats(rubric,library);
 const criteria=(rubric?.criteria||[]).filter(c=>c.enabled!==false);
 const byGroup=new Map();
 for(const c of criteria){const name=c.group||"OTHER";if(!byGroup.has(name))byGroup.set(name,[]);byGroup.get(name).push(c);}
 const active=(library?.datasets||[]).filter(d=>d.enabled);
 const other=bu!=="SHARE"&&bu!=="SHARERewards"&&bu!=="all";
 return '<div class="qa-persona-page qa-governance-view">'+
  '<div class="qa-demo-heading"><div><span class="kicker">QUALITY ASSURANCE GOVERNANCE</span><h2>QA Rubric & Reference Library</h2>'+
  '<p>Current configurations and the source material used for new AI assessments.</p></div>'+
  '<span class="qa-demo-pill">BASELINE / WORKING RUBRIC</span></div>'+
  (other?'<p class="qa-governance-warning">A dedicated rubric has not been configured for '+esc(bu)+'. The SHARE baseline below is for structural reference only and must not be treated as an approved '+esc(bu)+' scorecard.</p>':"")+
  '<div class="qa-governance-metrics">'+[
   ["QA criteria",stats.criteria],["Scoring themes",stats.themes],["AI checkpoints",stats.checkpoints],
   ["Active reference files",stats.activeFiles],["Reference entries",stats.activeEntries]
  ].map(([label,value])=>'<article><small>'+esc(label)+'</small><strong>'+esc(value)+'</strong></article>').join("")+'</div>'+
  '<section class="panel qa-governance-top"><div><span class="kicker">CURRENT SHARE RUBRIC</span><h3>Revision '+esc(stats.rubricRevision)+'</h3>'+
  '<p>Business-unit applicability: SHARE / SHARERewards. Published baseline remains authoritative until a proposed revision is explicitly published.</p></div>'+
  '<button class="primary" type="button" data-page-go="config">Edit / Test Rubric</button>'+'</section>'+
  '<div class="qa-governance-groups">'+[...byGroup.entries()].map(([name,list])=>rubricGroup(name,list)).join("")+'</div>'+
  '<section class="panel qa-governance-reference"><div class="pb-summary-head"><div><span class="kicker">REFERENCE LIBRARY</span><h3>Active files · Revision '+esc(stats.libraryRevision)+'</h3>'+
  '<p>Context used in new assessments, not proof of an agent action. Published references are visible in this browser.</p></div>'+
  '<button class="secondary" type="button" data-page-go="config" data-open-config-tab="references">Upload / Manage Reference Files</button>'+'</div>'+
  (active.length?'<div class="qa-governance-files">'+active.map(refFile).join("")+'</div>':
    '<p class="qa-governance-warning">No active reference files are available in this browser. Ask the Platform Admin to configure the library.</p>')+
  '<p class="pb-note">Personal presentation limitation: browser-local rubric and reference data do not synchronize across users, browsers or devices. Enterprise deployment needs centrally managed storage and authenticated role permissions.</p></section></div>';
}
