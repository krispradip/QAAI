import test from "node:test";
import assert from "node:assert/strict";
import { executeRule } from "../public/js/engine.js";
import { defaultRubric, loadRubric } from "../public/js/config.js";

const def=(id)=>({id,name:id,source:"genesys"});
const numeric=(id,value,threshold,operator)=>executeRule(
 {turns:[],evidence:{holdEvents:[{durationSeconds:value}],transferEvents:Array.from({length:value},()=>({}))}},
 def(id),{id,value:threshold,operator},{greetingTerms:["hello"]});
test("Configured hold thresholds use <= and custom >= operators",()=>{
 assert.equal(numeric("hold_single",135,120,"<=").state,"MISSED");
 assert.equal(numeric("hold_single",135,130,">=").state,"MET");
 assert.equal(numeric("hold_single",120,120,"<=").state,"MET");
});
test("Configured transfer count uses exact numeric evidence",()=>{
 assert.equal(numeric("transfer_count",2,2,"==").state,"MET");
 assert.equal(numeric("transfer_count",3,2,"<=").state,"MISSED");
});
test("Missing verified metric evidence does not become fabricated MET",()=>{
 const r=executeRule({turns:[],evidence:{}},def("hold_single"),
 {id:"hold_single",value:120,operator:"<="},{});
 assert.equal(r.state,"UNKNOWN");
});
test("Configuration has a valid operator for every catalog rule",()=>{
 const rubric=defaultRubric();
 for(const rule of rubric.rules.deterministic){
  assert.ok([">=",">","<=","<","==","!="].includes(rule.operator),rule.id);
 }
});
test("Configured phrase count is binary with transcript evidence",()=>{
 const r=executeRule({turns:[{speaker:"agent",text:"Thank you for calling",line:1,seconds:3}]},
 def("mandatory_greeting"),{id:"mandatory_greeting",value:1,operator:">="},
 {greetingTerms:["thank you for calling"]});
 assert.equal(r.state,"MET");
});

test("Genesys duration header is normalized into verified numeric evidence", async()=>{
 const {parseExport}=await import("../public/js/parser.js");
 const sample="Interaction Type:\tCall\nInteraction ID:\tduration-pass\nTranscript Duration:\t04:16\nInternal Participant(s):\tTest Agent\nDate/Time\tParticipant Type\tParticipant\tText\n00:05\tInternal\tTest Agent\tHello\n00:10\tExternal\tCustomer\tHi";
 const [call]=parseExport(sample,"call.txt");
 assert.equal(call.evidence.interactionDurationSeconds,256);
 const r=executeRule(call,def("interaction_duration"),{id:"interaction_duration",value:900,operator:"<="},{});
 assert.equal(r.state,"MET");
 assert.match(r.reason,/256/);
});
test("Duration 15:03 fails 900-second threshold, missing duration stays UNKNOWN",async()=>{
 const {parseExport}=await import("../public/js/parser.js");
 const sample="Interaction Type:\tCall\nInteraction ID:\tduration-fail\nTranscript Duration:\t15:03\nInternal Participant(s):\tTest Agent\nDate/Time\tParticipant Type\tParticipant\tText\n00:05\tInternal\tTest Agent\tHello\n00:10\tExternal\tCustomer\tHi";
 const [call]=parseExport(sample,"call.txt");
 assert.equal(call.evidence.interactionDurationSeconds,903);
 assert.equal(executeRule(call,def("interaction_duration"),{id:"interaction_duration",value:900,operator:"<="},{}).state,"MISSED");
 delete call.evidence.interactionDurationSeconds;
 assert.equal(executeRule(call,def("interaction_duration"),{id:"interaction_duration",value:900,operator:"<="},{}).state,"UNKNOWN");
});
test("Interaction duration is linked to the existing rubric and defaults remain unchanged",async()=>{
 const {linkedRules}=await import("../public/js/config.js");
 assert.ok(linkedRules("systems").includes("interaction_duration"));
 assert.equal(defaultRubric().rules.deterministic.find(x=>x.id==="interaction_duration").enabled,false);
});

test("Configured opening and closing phrase checks respect time windows",()=>{
 const transcript={turns:[
  {speaker:"agent",text:"Thanks for calling",seconds:5,line:1},
  {speaker:"customer",text:"Issue",seconds:10,line:2},
  {speaker:"agent",text:"Thanks for calling",seconds:200,line:3},
  {speaker:"agent",text:"Goodbye",seconds:250,line:4}
 ],evidence:{interactionDurationSeconds:256}};
 const rules={greetingTerms:["Thanks for calling"],closingTerms:["Goodbye"]};
 assert.equal(executeRule(transcript,def("mandatory_greeting"),{value:2,operator:">="},rules).state,"MISSED");
 assert.equal(executeRule(transcript,def("closing_statement"),{value:1,operator:">="},rules).state,"MET");
});
test("Fallback greeting toggles exclusively",async()=>{
 const {setCriterionEnabled}=await import("../public/js/config.js");
 const rubric=defaultRubric();
 setCriterionEnabled(rubric,"greet10",true);
 assert.equal(rubric.criteria.find(c=>c.id==="greet7").enabled,false);
 assert.equal(rubric.rules.deterministic.find(r=>r.id==="greeting_time").enabled,false);
 setCriterionEnabled(rubric,"greet7",true);
 assert.equal(rubric.criteria.find(c=>c.id==="greet10").enabled,false);
});
test("Unsupported qualitative checkpoint evidence is downgraded even after AI reviewer confirms",async()=>{
 const {enforceEvidencePolicy}=await import("../src/evidence-policy.js");
 const findings=enforceEvidencePolicy([{id:"tone",anchors:[{id:"tone-1",state:"MET",evidence:[{line:1,quote:"Hello"}]}]}]);
 assert.equal(findings[0].anchors[0].state,"UNKNOWN");
 assert.match(findings[0].anchors[0].validation.reason,/recorded audio/);
});
