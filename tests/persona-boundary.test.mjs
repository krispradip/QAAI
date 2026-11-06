import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {overview,agentsView} from "../public/js/ui.js";
import {defaultRubric} from "../public/js/config.js";
import {renderPreviewLogin} from "../public/js/presentation-login.js";
import {demoUsers,canEvaluate,canViewPage} from "../public/js/presentation-personas.js";
import {renderAgentRecentAssessments} from "../public/js/presentation-agent-home.js";
const sample=[
 {key:"demo:1",id:"DEMO-1",agent:"Hassan Aly",businessUnit:"SHARE",status:"COMPLETE",
  start:"2026-11-05T13:30:00+04:00",score:{score:88,coverage:70},findings:[],duration:"01:30",turns:[]},
 {key:"demo:2",id:"DEMO-2",agent:"Hassan Aly",businessUnit:"SHARE",status:"READY",
  start:"2026-11-06T13:30:00+04:00",score:null,findings:[],duration:"01:35",turns:[]}
];
test("Agent home shows existing completed previous-shift scores without evaluate button",()=>{
 const html=overview(sample,defaultRubric(),"Hassan Aly",{mode:"all"},{},"agent");
 assert.match(html,/Your quality progress/);
 assert.match(html,/Latest assessed interactions/);
 assert.match(html,/DEMO-1/);
 assert.match(html,/88%/);
 assert.doesNotMatch(html,/data-page-go="studio"/);
 assert.doesNotMatch(html,/id="clearHistory"/);
 assert.doesNotMatch(html,/DEMO-2<\/b>/);
});
test("Agent performance has inspection but no evaluation or reassessment controls",()=>{
 const html=agentsView({calls:sample,selected:"demo:1",agentFilter:"Hassan Aly",rubric:defaultRubric(),viewerRole:"agent",running:false});
 assert.match(html,/INTERACTION INSPECTION/);
 assert.doesNotMatch(html,/data-page-go="studio"/);
 assert.doesNotMatch(html,/id="rerunAgent"/);
});
test("Agent without completed assessments receives an honest empty state",()=>{
 const html=renderAgentRecentAssessments(sample.slice(1),"Hassan Aly");
 assert.match(html,/No completed QA assessments/);
 assert.doesNotMatch(html,/88%/);
});
test("BU Lead, CC Director and Admin can evaluate; Agent cannot",()=>{
 const users=demoUsers();
 for(const role of ["bu_lead","cc_lead","admin"]){
  const u=users.find(x=>x.role===role);
  assert.equal(canEvaluate(u),true);
  assert.equal(canViewPage(u,"studio"),true);
 }
 const agent=users.find(x=>x.role==="agent");
 assert.equal(canEvaluate(agent),false);
 assert.equal(canViewPage(agent,"studio"),false);
});
test("Entry is email-only with visible preview notice, no password or persona chooser",()=>{
 const html=renderPreviewLogin();
 assert.match(html,/name@maf\.ae/);
 assert.match(html,/PRESENTATION PREVIEW/);
 assert.match(html,/not company SSO/);
 assert.doesNotMatch(html,/type="password"|Leave blank for demo|Choose a presentation persona/);
});
test("Sidebar Logout is handled at actual sidebar DOM scope",()=>{
 const src=readFileSync(new URL("../public/js/app.js",import.meta.url),"utf8");
 assert.match(src,/document\.querySelector\("#qa-demo-persona"\)\?\.addEventListener\("click"/);
 assert.match(src,/logoutDemoUser\(\);/);
 assert.match(src,/viewerRole:user\.role/);
 assert.match(src,/&& evaluable\(c\)/);
});
