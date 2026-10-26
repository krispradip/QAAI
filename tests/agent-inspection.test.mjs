import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { defaultRubric } from "../public/js/config.js";
import { agentsView } from "../public/js/ui.js";

const rubric = defaultRubric();
const call = (key,agent,status="COMPLETE") => ({
  key,id:key,agent,status,duration:"02:10",
  turns:[{speaker:"agent",timestamp:"00:01",line:1,text:"Hello and welcome."}],
  findings:status==="COMPLETE"?[{id:"opening",status:"SCORED",score:75,reason:"Sample finding",anchors:[]}]:[],
  score:status==="COMPLETE"?{score:75,coverage:100}:null
});

test("Agent overview Inspect leads to interaction inspection without a drilldown table", () => {
  const calls=[call("qa:1","Sample Agent")];
  const list=agentsView({calls,agentFilter:"",selected:null,rubric,running:false});
  assert.match(list,/PERFORMANCE INTELLIGENCE/);
  assert.match(list,/data-agent="Sample Agent"/);
  assert.doesNotMatch(list,/AGENT DRILLDOWN|qa-agent-inspection/);

  const detail=agentsView({calls,agentFilter:"Sample Agent",selected:"qa:1",rubric,running:false});
  assert.match(detail,/INTERACTION INSPECTION/);
  assert.match(detail,/Evaluation Results/);
  assert.match(detail,/75%/);
  assert.match(detail,/id="closeInspection"/);
  assert.doesNotMatch(detail,/AGENT DRILLDOWN|PERFORMANCE INTELLIGENCE/);
  assert.doesNotMatch(detail,/id="inspection-interaction"/);
});

test("Multiple interactions have an in-inspection selector and preserve the selected assessment", () => {
  const calls=[call("qa:1","Sample Agent"),call("qa:2","Sample Agent"),call("qa:3","Other Agent")];
  const detail=agentsView({calls,agentFilter:"Sample Agent",selected:"qa:2",rubric,running:false});
  const selector=detail.match(/<select id="inspection-interaction"[\\s\\S]*?<\\/select>/)?.[0]||"";
  assert.ok(selector,"Expected interaction selector inside inspection");
  assert.match(selector,/value="qa:1"/);
  assert.match(selector,/value="qa:2" selected/);
  assert.doesNotMatch(selector,/value="qa:3"/);
  assert.match(detail,/2 interactions for Sample Agent/);
  assert.doesNotMatch(detail,/AGENT DRILLDOWN/);
});

test("Inspect action routes to an agent's completed interaction and selector switches safely",()=>{
  const js=readFileSync(new URL("../public/js/app.js",import.meta.url),"utf8");
  assert.match(js,/const matches = state\\.calls\\.filter\\(c => c\\.agent === agent\\)/);
  assert.match(js,/find\\(c => c\\.status === "COMPLETE"\\)/);
  assert.match(js,/state\\.selected = preferred\\?\\.key \\|\\| null/);
  assert.match(js,/target\\.id === "inspection-interaction"/);
  assert.match(js,/c\\.agent === state\\.agentFilter/);
  assert.match(js,/state\\.agentFilter = "";/);
});
