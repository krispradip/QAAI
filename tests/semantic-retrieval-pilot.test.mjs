import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {recognizeSemanticCheckpoints,unresolvedModelCriteria} from "../public/js/semantic-assessment.js";
import {rankedReferenceEntries} from "../public/js/retrieval.js";
import {defaultRubric,setCriterionEnabled} from "../public/js/config.js";
import {assess} from "../public/js/engine.js";

const check=(id,text)=>({id,text,enabled:true});
const opening={id:"opening",checkpoints:[
 check("opening-1","Brand"),check("opening-2","Identity"),
 check("opening-3","Invites customer to explain"),check("opening-4","Professional manner")
]};

test("semantic evidence requires exact agent utterance and stays within opening window",()=>{
 const call={turns:[
  {line:1,speaker:"customer",text:"How may I help you?"},
  {line:2,speaker:"agent",seconds:4,text:"Thank you for calling SHARE. How may I help you today?"},
  {line:3,speaker:"agent",seconds:245,text:"How may I help you?"}
 ]};
 const hits=recognizeSemanticCheckpoints(call,[opening]);
 assert.equal(hits.get("opening")?.length,1);
 assert.equal(hits.get("opening")[0].id,"opening-3");
 assert.equal(hits.get("opening")[0].evidence[0].line,2);
 assert.equal(hits.get("opening")[0].method,"semantic-equivalence");
 assert.deepEqual(unresolvedModelCriteria([opening],hits)[0].checkpoints.map(x=>x.id),
  ["opening-1","opening-2","opening-4"]);
});

test("negated, ambiguous and customer-only phrases abstain instead of inventing MET",()=>{
 const snippets=[
  [{line:1,speaker:"agent",text:"No, how may I help you?"}],
  [{line:1,speaker:"customer",text:"Is there anything else I can help you with?"}],
  [{line:1,speaker:"agent",text:"I cannot help you with anything else"}],
  [{line:1,speaker:"agent",text:"How may I help you?",seconds:400}]
 ];
 for(const turns of snippets){
  const c={turns};const found=recognizeSemanticCheckpoints(c,[opening]);
  assert.equal(found.size,0,JSON.stringify(turns));
 }
});

test("semantic library may add a scoped phrase for a known safe checkpoint",()=>{
 const refs=[{type:"semantic",criterionId:"opening-3",phrase:"Tell me what you need assistance with",
  source:"SHARE-approved.csv",version:7},
 {type:"semantic",criterionId:"verification-1",phrase:"Say your account number please",
  source:"unrelated.csv",version:1}];
 const c={turns:[{line:1,speaker:"agent",text:"Tell me what you need assistance with today"}]};
 const found=recognizeSemanticCheckpoints(c,[opening,{id:"verification",checkpoints:[check("verification-1","Verify profile")]}],refs);
 assert.equal(found.get("opening")[0].validation.source,"SHARE-approved.csv");
 assert.equal(found.has("verification"),false);
});

test("ranked retrieval honors enabled status, explicit BU/market/channel, criterion and small prompt budget",()=>{
 const ds=(name,id,type,rows,enabled=true)=>({name,id,type,version:3,enabled,rows});
 const library={datasets:[
  ds("share.csv","s","semantic",[{concept:"Further assistance",phrase:"anything else i can help you with",
    businessUnit:"SHARE",market:"UAE",channel:"Call",criterionId:"assistance-1"}]),
  ds("retail.csv","r","semantic",[{concept:"Further assistance",phrase:"anything else i can help you with",
    businessUnit:"Retail",market:"UAE",channel:"Call",criterionId:"assistance-1"}]),
  ds("disabled.csv","x","semantic",[{concept:"Further assistance",phrase:"anything else i can help you with",
    businessUnit:"SHARE",market:"UAE",channel:"Call",criterionId:"assistance-1"}],false)
 ]};
 const call={businessUnit:"SHARE",market:"UAE",type:"Call",
  turns:[{speaker:"agent",line:1,text:"Is there anything else I can help you with?"}]};
 const refs=rankedReferenceEntries(library,call,[{id:"assistance"}],{maxChars:2000});
 assert.equal(refs.length,1);
 assert.equal(refs[0].source,"share.csv");
 assert.equal(refs[0].referenceId,"s:1");
 assert.equal(rankedReferenceEntries(library,{...call,businessUnit:""},[{id:"assistance"}]).length,0);
 assert.equal(rankedReferenceEntries(library,{...call,market:"Oman"},[{id:"assistance"}]).length,0);
 assert.equal(rankedReferenceEntries(library,call,[{id:"solution"}]).length,0);
});

test("opt-in semantic recognition removes only supported checkpoints from LLM request",async()=>{
 const rubric=defaultRubric();
 rubric.optimization={semanticFirst:true,rankedRetrieval:false};
 for(const c of rubric.criteria)setCriterionEnabled(rubric,c.id,false);
 setCriterionEnabled(rubric,"opening",true);
 const turn={line:1,speaker:"agent",seconds:3,timestamp:"00:03",
  text:"Thank you for calling SHARE, my name is Hassan. How may I help you?"};
 const call={id:"semantic-opt-in",businessUnit:"SHARE",status:"READY",turns:[turn]};
 const prev=globalThis.fetch;let submitted;
 globalThis.fetch=async(url,opts)=>{
  submitted=JSON.parse(opts.body);
  const pending=submitted.criteria[0].checkpoints;
  return {ok:true,json:async()=>({findings:[{id:"opening",reason:"Model assessed remaining checkpoints",
    anchors:pending.map(a=>({id:a.id,state:"UNKNOWN",evidence:[]}))}]})};
 };
 try{await assess(call,rubric,new AbortController().signal,()=>{});
  assert.equal(submitted.criteria.length,1);
  assert.equal(submitted.criteria[0].checkpoints.some(x=>x.id==="opening-3"),false);
  assert.equal(submitted.criteria[0].checkpoints.length,3);
  assert.equal(call.semanticAudit.recognizedCheckpoints,1);
  const a=call.findings.find(x=>x.id==="opening").anchors.find(x=>x.id==="opening-3");
  assert.equal(a.state,"MET");
  assert.equal(a.method,"semantic-equivalence");
  assert.equal(a.evidence[0].line,1);
  assert.equal(call.score.score,null); // unmatched checks never become MET
 }finally{globalThis.fetch=prev;}
});

test("semantic-first can avoid a model call when the only enabled checkpoint is unambiguous",async()=>{
 const rubric=defaultRubric();
 rubric.optimization.semanticFirst=true;
 for(const c of rubric.criteria)setCriterionEnabled(rubric,c.id,false);
 setCriterionEnabled(rubric,"assistance",true);
 rubric.criteria.find(c=>c.id==="assistance").checkpoints[1].enabled=false;
 const c={id:"only-observable",status:"READY",turns:[
  {line:1,speaker:"customer",text:"That solved it."},
  {line:2,speaker:"agent",text:"Is there anything else I can help you with?"}
 ]};
 const old=globalThis.fetch;globalThis.fetch=()=>{throw Error("LLM should not be called")};
 try{await assess(c,rubric,new AbortController().signal,()=>{});
  assert.equal(c.semanticAudit.recognizedCheckpoints,1);
  assert.equal(c.semanticAudit.pendingModelCheckpoints,0);
  assert.equal(c.findings[0].status,"SCORED");
  assert.equal(c.score.score,100);
 }finally{globalThis.fetch=old;}
});

test("optimization is off by default and must be enabled in published rubric",()=>{
 assert.deepEqual(defaultRubric().optimization,{semanticFirst:false,rankedRetrieval:false});
 const html=readFileSync(new URL("../public/js/ui.js",import.meta.url),"utf8");
 assert.match(html,/qa-opt-semantic/);
 assert.match(html,/qa-opt-retrieval/);
 const engine=readFileSync(new URL("../public/js/engine.js",import.meta.url),"utf8");
 assert.match(engine,/rubric\.optimization\?\.semanticFirst===true/);
});
