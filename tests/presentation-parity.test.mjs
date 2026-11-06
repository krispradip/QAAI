import test from "node:test";
import assert from "node:assert/strict";
import {normalizeTranscriptText} from "../public/js/presentation-docx.js";
import {parseExport} from "../public/js/parser.js";
import {renderPresentationInspection} from "../public/js/presentation-inspection.js";
import {dailyUsage} from "../public/js/presentation-usage-ledger.js";
test("Markdown transcript is normalized without changing roles or dialogue",()=>{
  const markdown=["| Interaction Type | Call (Voice) |","| Interaction ID | demo-1 |","| Agent | Demo Agent |",
    "| Call Duration | 01:03 |","| Time | Speaker | Text |","| --- | --- | --- |",
    "| 00:00 | Agent (Demo Agent) | Hello customer |","| 00:03 | Customer | Hi there |"].join("\n");
  const parsed=parseExport(normalizeTranscriptText(markdown),"test.md");
  assert.equal(parsed[0].id,"demo-1");
  assert.equal(parsed[0].status,"READY");
  assert.equal(parsed[0].agent,"Demo Agent");
  assert.equal(parsed[0].turns.length,2);
});
test("Incomplete AI is labelled NOT EVALUATED, not UNKNOWN, in inspection",()=>{
  const criterion={id:"opening",name:"Opening",group:"OPENING",enabled:true,checkpoints:[{id:"opening-1",text:"Agent introduction",enabled:true}]};
  const call={id:"demo-2",agent:"Demo",status:"ERROR",error:"AI rate limited",
    turns:[],findings:[{id:"opening",anchors:[{id:"opening-1",state:"UNKNOWN",method:"qualitative",text:"Agent introduction"}]}],
    assessmentCriteria:[criterion],ruleAssessment:{observedScore:100,coverage:25},aiTelemetry:{requests:[],totalTokens:null}};
  const html=renderPresentationInspection(call,{criteria:[criterion]},"scorecard","ai");
  assert.match(html,/NOT EVALUATED/);
  assert.match(html,/Agent introduction/);
  assert.doesNotMatch(html,/Rule evidence/);
});
test("Daily ledger distinguishes 429 from succeeded requests",()=>{
  const rows=dailyUsage([
    {startedAt:"2026-11-05T10:00:00Z",status:"ERROR",aiTelemetry:{inputTokens:4445,outputTokens:67,totalTokens:4512,
      requests:[{httpStatus:200},{httpStatus:429}]}},
    {startedAt:"2026-11-05T10:10:00Z",status:"COMPLETE",aiTelemetry:{inputTokens:100,outputTokens:10,totalTokens:110,
      requests:[{httpStatus:200}]}}
  ]);
  assert.equal(rows[0].attempts,2);
  assert.equal(rows[0].completed,1);
  assert.equal(rows[0].failed,1);
  assert.equal(rows[0].rateLimits,1);
  assert.equal(rows[0].totalTokens,4622);
});
