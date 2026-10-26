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
  assert.match(detail,/PERFORMANCE INTELLIGENCE/);
  assert.ok(detail.indexOf("PERFORMANCE INTELLIGENCE") < detail.indexOf("INTERACTION INSPECTION"),
    "Interaction Inspection must render beneath Performance Intelligence");
  assert.match(detail,/data-agent="Sample Agent"/);
  assert.equal((detail.match(/qa-agent-inspection/g)||[]).length,1);
  assert.doesNotMatch(detail,/AGENT DRILLDOWN/);
  assert.doesNotMatch(detail,/id="inspection-interaction"/);
});

test("Multiple interactions have an in-inspection selector and preserve the selected assessment", () => {
  const calls=[call("qa:1","Sample Agent"),call("qa:2","Sample Agent"),call("qa:3","Other Agent")];
  const detail=agentsView({calls,agentFilter:"Sample Agent",selected:"qa:2",rubric,running:false});
  const selector=detail.slice(detail.indexOf('<select id="inspection-interaction"'),detail.indexOf("</select>")+9);
  assert.ok(selector,"Expected interaction selector inside inspection");
  assert.match(selector,/value="qa:1"/);
  assert.match(selector,/value="qa:2" selected/);
  assert.doesNotMatch(selector,/value="qa:3"/);
  assert.match(detail,/2 interactions for Sample Agent/);
  assert.ok(detail.indexOf("PERFORMANCE INTELLIGENCE") < detail.indexOf("INTERACTION INSPECTION"));
  assert.equal((detail.match(/PERFORMANCE INTELLIGENCE/g)||[]).length,1);
  assert.equal((detail.match(/INTERACTION INSPECTION/g)||[]).length,1);
  assert.doesNotMatch(detail,/AGENT DRILLDOWN/);
});

test("Inspect action routes to an agent's completed interaction and selector switches safely",()=>{
  const js=readFileSync(new URL("../public/js/app.js",import.meta.url),"utf8");
  assert.ok(js.includes("const matches = state.calls.filter(c => c.agent === agent)"));
  assert.ok(js.includes('find(c => c.status === "COMPLETE")'));
  assert.ok(js.includes("state.selected = preferred?.key || null"));
  assert.ok(js.includes('target.id === "inspection-interaction"'));
  assert.ok(js.includes("c.agent === state.agentFilter"));
  assert.ok(js.includes('state.agentFilter = "";'));
});
