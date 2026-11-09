import test from "node:test";
import assert from "node:assert/strict";
import {renderInteractionRequestDetails,renderUsagePage} from "../public/js/presentation-usage.js";
import {renderPresentationInspection} from "../public/js/presentation-inspection.js";
import {defaultRubric} from "../public/js/config.js";
const storage=new Map();
const oldStorage=globalThis.localStorage;
globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
const attempt={
 id:"usage-1",interactionId:"CASE-2026-11-09",model:"Gemini",
 status:"COMPLETE",startedAt:"2026-11-09T04:01:00Z",
 aiTelemetry:{
 inputTokens:7351,outputTokens:168,totalTokens:7519,requests:[
  {at:"2026-11-09T04:02:00Z",stage:"Initial Gemini evaluation",httpStatus:200,
   inputTokens:3886,outputTokens:66,totalTokens:3952,requestedOutputBudget:12288},
  {at:"2026-11-09T04:03:00Z",stage:"Independent evidence review",httpStatus:200,
   inputTokens:3465,outputTokens:102,totalTokens:3567,requestedOutputBudget:8192}
 ]
}};
test("per-interaction request usage and retries move to technical Usage page",()=>{
 const html=renderInteractionRequestDetails([attempt]);
 assert.match(html,/CASE-2026-11-09/);
 assert.match(html,/7,351/);
 assert.match(html,/7,519/);
 assert.match(html,/3,952/);
 assert.match(html,/3,567/);
 assert.match(html,/Initial Gemini evaluation/);
 assert.match(html,/Independent evidence review/);
 assert.match(html,/Requested output budget/);
 assert.match(html,/12,288/);
 assert.match(html,/8,192/);
 assert.equal((html.match(/200 OK/g)||[]).length,2);
});
test("request breakdown remains readable from AI Usage but not from Results",()=>{
 storage.set("qaai-gemini-usage-v1",JSON.stringify([attempt]));
 const usage=renderUsagePage();
 assert.match(usage,/AI Usage &amp; Diagnostics|AI Usage & Diagnostics/);
 assert.match(usage,/Individual AI requests, retries and token usage/);
 assert.match(usage,/CASE-2026-11-09/);
 const call={agent:"Hassan Aly",id:"CASE-2026-11-09",status:"COMPLETE",
  turns:[],findings:[],score:{score:null,observedScore:null,coverage:0},
  aiTelemetry:attempt.aiTelemetry};
 const results=renderPresentationInspection(call,defaultRubric(),"scorecard");
 assert.doesNotMatch(results,/7,351|Requested output budget|Initial Gemini evaluation/);
 assert.match(results,/COMPETENCY OVERVIEW &amp; EVIDENCE HIGHLIGHTS/);
 assert.match(results,/COMBINED QA SCORE/);
});
test("usage details do not expose input prompts or raw transcript",()=>{
 const raw='<script>alert("x")</script>';
 const html=renderInteractionRequestDetails([{...attempt,interactionId:raw}]);
 assert.doesNotMatch(html,/<script>/);
 assert.match(html,/&lt;script&gt;/);
});
