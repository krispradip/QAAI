import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/worker.js";

const baseline={model:"gpt-4o",instructions:"Judge evidence only",
 criteria:[{id:"opening",name:"Opening",definition:"",instructions:"",checkpoints:[{id:"opening-3",text:"Invite customer"}]}],
 turns:[{line:1,speaker:"agent",text:"How can I help?",timestamp:"00:05",seconds:5}]
};
async function simulate(status,body){
 const old=globalThis.fetch;globalThis.fetch=async()=>({ok:false,status,json:async()=>body});
 try{
 const response=await worker.fetch(new Request("https://qaai.example/api/evaluate",{method:"POST",body:JSON.stringify(baseline)}),{ENTERPRISE_AI_API_KEY:"test-only"});
 return {status:response.status,result:await response.json()};
 }finally{globalThis.fetch=old}
}
test("Corporate API returns redacted error metadata",async()=>{
 const {status,result}=await simulate(403,{error:{code:"ACCESS_DENIED",message:"Hidden user key 12345"}});
 assert.equal(status,502);assert.equal(result.providerError.category,"API_ACCESS");
 assert.doesNotMatch(JSON.stringify(result),/Hidden user key/);
});
test("Corporate upstream 429 preserved",async()=>{
 const {status,result}=await simulate(429,{error:{code:"RESOURCE_EXHAUSTED",message:"Quota exceeded"}});
 assert.equal(status,429);assert.equal(result.providerError.category,"QUOTA_OR_RATE_LIMIT");
});
test("Corporate model rejected safely",async()=>{
 const {result}=await simulate(400,{error:{code:"INVALID_MODEL",message:"Model unavailable"}});
 assert.equal(result.providerError.category,"MODEL_ACCESS");
});
