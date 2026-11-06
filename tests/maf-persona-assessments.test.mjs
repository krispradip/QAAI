import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {demoUsers,loginDemoEmail,logoutDemoUser,activeDemoUser,canEvaluate,
  canViewPage,demoSessionHTML,scopedDemoCalls} from "../public/js/presentation-personas.js";
import {renderPreviewLogin} from "../public/js/presentation-login.js";
import {renderAgentRecentAssessments} from "../public/js/presentation-agent-home.js";
import {overview,agentsView} from "../public/js/ui.js";
import {defaultRubric} from "../public/js/config.js";
const storage=new Map(),session=new Map();
globalThis.localStorage={
 getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)
};
globalThis.sessionStorage={
 getItem:k=>session.get(k)||null,setItem:(k,v)=>session.set(k,String(v)),removeItem:k=>session.delete(k)
};
const fixtures=JSON.parse(readFileSync(new URL("./fixtures/qa-agent-assessments.json",import.meta.url),"utf8"));
test("three assigned MAF persona identifiers map to expected roles",()=>{
 const expected=[
  ["Hassan.Aly@maf.ae","agent","Hassan Aly"],
  ["Rima.Soliman@maf.ae","bu_lead","Rima Soliman"],
  ["Pradip.krishnamoorthy@maf.ae","admin","Pradip Krishnamoorthy"]
 ];
 assert.deepEqual(demoUsers().filter(x=>x.system).map(x=>[x.email,x.role,x.name]),expected);
 for(const [email,role] of expected){logoutDemoUser();assert.equal(loginDemoEmail(email.toUpperCase()).role,role);}
 logoutDemoUser();assert.equal(activeDemoUser(),null);
});
test("login is a visibly marked email-only preview with no password or chooser",()=>{
 const html=renderPreviewLogin();
 assert.match(html,/name@maf\.ae/);
 assert.match(html,/EMAIL-BASED WORKSPACE ACCESS/);
 assert.doesNotMatch(html,/type="password"|Choose a presentation persona|@demo\.mafer\.ai/);
});
test("agent is read-only while lead and admin can evaluate",()=>{
 const users=demoUsers();
 const agent=users.find(x=>x.role==="agent");
 assert.equal(canEvaluate(agent),false);
 assert.equal(canViewPage(agent,"studio"),false);
 for(const role of ["bu_lead","admin"]){
  const user=users.find(x=>x.role===role);
  assert.equal(canEvaluate(user),true);
  assert.equal(canViewPage(user,"studio"),true);
 }
 assert.deepEqual(scopedDemoCalls(agent,fixtures).map(c=>c.id),fixtures.map(c=>c.id));
 assert.match(demoSessionHTML(agent),/Hassan\.Aly@maf\.ae/);
});
test("previous-shift records are synthetic completed QA examples with inspected evidence",()=>{
 assert.ok(fixtures.length>=2);
 for(const c of fixtures){
  assert.equal(c.agent,"Hassan Aly");
  assert.equal(c.status,"COMPLETE");
  assert.equal(c.source,"synthetic_presentation");
  assert.ok(c.score.score>0);
  assert.ok(c.findings.length>=2);
  assert.ok(c.turns.every((t,i)=>t.line===i+1));
  assert.ok(c.findings.some(f=>f.anchors.some(a=>a.evidence?.length)));
  assert.equal(c.aiTelemetry.totalTokens,null);
 }
 const html=renderAgentRecentAssessments(fixtures,"Hassan Aly");
 assert.match(html,/Previous-shift QA outcomes/);
 assert.match(html,/SAMPLE-SHARE-HASSAN-001/);
 assert.doesNotMatch(html,/Sample assessment/);
 assert.match(html,/Inspect QA/);
 assert.doesNotMatch(html,/Reassess|data-page-go="studio"/);
});
test("Agent Home displays assessed sample results with no Studio link",()=>{
 const html=overview(fixtures,defaultRubric(),"Hassan Aly",{mode:"all"},{},{personaRole:"agent",allowClearHistory:false});
 assert.match(html,/94%/);
 assert.match(html,/86%/);
 assert.match(html,/Previous-shift QA outcomes/);
 assert.doesNotMatch(html,/data-page-go="studio"|id="clearHistory"/);
 const results=agentsView({calls:fixtures,selected:fixtures[0].key,agentFilter:"Hassan Aly",rubric:defaultRubric(),personaRole:"agent",running:false});
 assert.match(results,/INTERACTION INSPECTION/);
 assert.doesNotMatch(results,/data-page-go="studio"|id="rerunAgent"/);
});
test("sidebar logout handler is bound outside dynamic #view",()=>{
 const s=readFileSync(new URL("../public/js/app.js",import.meta.url),"utf8");
 assert.match(s,/document\.querySelector\("#qa-demo-persona"\)/);
 assert.match(s,/sessionPanel\?\.addEventListener\?\.\("click"/);
 assert.match(s,/logoutDemoUser\(\)/);
 assert.match(s,/renderPreviewLogin\(\)/);
 assert.match(s,/personaRole:user\.role/);
 assert.doesNotMatch(s,/const HASSAN_SAMPLE_KEY/);
});
