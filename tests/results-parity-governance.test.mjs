import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {defaultRubric} from "../public/js/config.js";
import {summarizeCheckStates,themeScores,renderStatusTotals,renderThemeProgress,renderScoreStatus,checkpointState} from "../public/js/presentation-themes.js";
import {renderPresentationInspection} from "../public/js/presentation-inspection.js";
import {renderQualityContextStrip,qualityGovernanceStats,renderQualityGovernance} from "../public/js/presentation-quality-governance.js";
import {demoUsers,canViewPage} from "../public/js/presentation-personas.js";
import {canConfigureBU,normalizeBU,describeRubricChanges,validateScopedDataset} from "../public/js/presentation-baseline.js";
const rubric=defaultRubric();
const fixture=JSON.parse(readFileSync(new URL("../public/demo/hassan-previous-shift-qa.json",import.meta.url),"utf8"))[0];
const lib=JSON.parse(readFileSync(new URL("../public/demo/share-reference-library.json",import.meta.url),"utf8"));

test("combined-score card uses finalized synthetic score only for completed result",()=>{
 const status=renderScoreStatus(fixture);
 assert.equal(status.value,"94%");
 const html=renderPresentationInspection(fixture,rubric,"scorecard","all");
 assert.match(html,/COMBINED QA SCORE/);
 assert.match(html,/94%/);
 assert.match(html,/CHECKPOINT OUTCOMES/);
 assert.match(html,/THEME-BASED QA PERFORMANCE/);
 assert.match(html,/Evidence-linked assessment findings/);
 assert.match(html,/OPENING/);
});
test("incomplete evidence has observed percentage but no finalized combined score",()=>{
 const c={...fixture,score:{score:null,observedScore:81,coverage:43},status:"COMPLETE"};
 const x=renderScoreStatus(c);
 assert.equal(x.value,"Pending");
 assert.match(x.label,/Observed QA 81%/);
 assert.match(x.detail,/43%/);
 const h=renderPresentationInspection(c,rubric,"scorecard");
 assert.match(h,/not finalized/);
 assert.match(h,/81%/);
});
test("the theme score is weighted, observed vs final is explicit, and missing checks stay unscored",()=>{
 const rows=themeScores(fixture,rubric);
 const opening=rows.find(x=>x.name==="OPENING");
 assert.ok(opening);
 assert.equal(opening.observedScore,100);
 assert.equal(opening.finalScore,100);
 const partial={...fixture,status:"COMPLETE",findings:fixture.findings.filter(f=>f.id!=="opening")};
 const observed=themeScores(partial,rubric).find(x=>x.name==="OPENING");
 assert.equal(observed.finalScore,null);
 assert.ok(observed.coverage<100);
 assert.match(renderThemeProgress(partial,rubric),/Unscored|Observed/);
});
test("all six evidence checkpoint state categories are counted without inventing passes",()=>{
 const base={...fixture,assessmentCriteria:[
 {id:"x",name:"X",group:"THEME",enabled:true,weight:1,checkpoints:[
  {id:"x1",text:"A"},{id:"x2",text:"B"},{id:"x3",text:"C"},
  {id:"x4",text:"D"},{id:"x5",text:"E"},{id:"x6",text:"F"}]}
 ],findings:[{id:"x",status:"PARTIAL",coverage:50,score:null,anchors:[
  {id:"x1",method:"qualitative",text:"A",state:"MET",evidence:[{line:1,quote:"Hello"}]},
  {id:"x2",method:"qualitative",text:"B",state:"MISSED",evidence:[{line:2,quote:"No"}]},
  {id:"x3",method:"qualitative",text:"C",state:"UNKNOWN",evidence:[]},
  {id:"x4",method:"qualitative",text:"D",state:"MET",evidence:[],validation:{status:"UNVERIFIED"}},
  {id:"x5",method:"qualitative",text:"E",state:"NA",evidence:[]}
 ]}],status:"COMPLETE"};
 const {counts,total}=summarizeCheckStates(base,rubric);
 assert.equal(total,6);
 assert.equal(counts.MET,1);
 assert.equal(counts.MISSED,1);
 assert.equal(counts.UNKNOWN,2); // the missing sixth check
 assert.equal(counts.UNVERIFIED,1);
 assert.equal(counts.NA,1);
 assert.equal(counts.NOT_EVALUATED,0);
 assert.match(renderStatusTotals(base,rubric),/Unverified/);
 const pending={...base,status:"ERROR"};
 const statuses=summarizeCheckStates(pending,rubric).counts;
 assert.equal(statuses.NOT_EVALUATED,5);
});
test("BU Lead and CC Director can open existing rubric correction and CSV upload screens",()=>{
 const stats=qualityGovernanceStats(rubric,lib);
 assert.ok(stats.criteria>0);
 const roles=demoUsers();
 for(const role of ["bu_lead","cc_lead"]){
  const user=roles.find(x=>x.role===role);
  assert.ok(canViewPage(user,"standards"));
  assert.ok(canViewPage(user,"config"));
  const html=renderQualityGovernance(rubric,lib,role);
  assert.match(html,/Edit \/ Test Rubric/);
  assert.match(html,/Upload \/ Manage Reference Files/);
  assert.match(html,/data-open-config-tab="references"/);
  assert.doesNotMatch(html,/READ-ONLY REVIEW/);
  assert.match(renderQualityContextStrip(rubric,lib,role),/data-page-go="standards"/);
 }
});
test("persistent desktop navigation, six-count palette and responsive layout styles are loaded",()=>{
 const css=readFileSync(new URL("../public/css/presentation-results-v2.css",import.meta.url),"utf8");
 const html=readFileSync(new URL("../public/index.html",import.meta.url),"utf8");
 assert.match(css,/position:sticky\s*!important/);
 assert.match(css,/height:100dvh/);
 assert.match(css,/overflow-y:auto/);
 assert.match(css,/pb-status-unverified/);
 assert.match(css,/pb-theme-grid/);
 assert.match(css,/@media\(max-width:720px\)/);
 assert.match(html,/presentation-results-v2\.css/);
});
test("result page remains six tabs and diagnostics/reference audit are still available",()=>{
 const tabs=["scorecard","transcript","timeline","insights","diagnostics","references"];
 for(const name of tabs) {
  const html=renderPresentationInspection(fixture,rubric,name);
  assert.match(html,new RegExp('data-result-tab="'+name+'"'));
 }
});

test("business unit boundaries and rubric change descriptions",()=>{
 const roles=demoUsers();
 const lead=roles.find(x=>x.role==="bu_lead");
 const director=roles.find(x=>x.role==="cc_lead");
 const agent=roles.find(x=>x.role==="agent");
 assert.ok(canConfigureBU(lead,"SHARERewards"));
 assert.ok(!canConfigureBU(lead,"Retail"));
 assert.ok(canConfigureBU(director,"Retail"));
 assert.ok(!canConfigureBU(agent,"SHARERewards"));
 assert.equal(normalizeBU("SHARE"),"SHARERewards");
 const next=structuredClone(rubric);
 next.criteria[0].weight+=1;
 assert.ok(describeRubricChanges(rubric,next).some(x=>x.includes("weight")));
 assert.doesNotThrow(()=>validateScopedDataset(lead,"SHARERewards",{rows:[{businessUnit:"SHARE"}]}));
 assert.throws(()=>validateScopedDataset(lead,"SHARERewards",{rows:[{businessUnit:"Retail"}]}),/businessUnit/);
});
