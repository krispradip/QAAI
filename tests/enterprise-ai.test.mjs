import test from "node:test";
import assert from "node:assert/strict";
import {enterpriseChatJSON,EnterpriseAIError} from "../src/enterprise-ai.js";

const env={ENTERPRISE_AI_API_KEY:"test-only",ENTERPRISE_AI_ENDPOINT:"https://apim-prod-ai-platform.azure-api.net/foundry-customer-care-prod/openai/v1/chat/completions"};
test("Corporate provider sends Azure APIM api-key only server side and accepts JSON",async()=>{
 const previous=globalThis.fetch;let observed;
 globalThis.fetch=async(url,init)=>{observed={url,init};return {ok:true,json:async()=>({choices:[{finish_reason:"stop",message:{content:'{"findings":[]}'}}]})}};
 try{
 const data=await enterpriseChatJSON({env,model:"gpt-4o",system:"Judge QA evidence",user:{criteria:[]}});
 assert.deepEqual(data,{findings:[]});
 assert.equal(observed.init.headers["api-key"],"test-only");
 assert.equal(JSON.parse(observed.init.body).model,"gpt-4o");
 assert.equal(JSON.parse(observed.init.body).response_format.type,"json_object");
 assert.equal(observed.url,env.ENTERPRISE_AI_ENDPOINT);
 }finally{globalThis.fetch=previous;}
});
test("No enterprise secret fails closed",async()=>{
 await assert.rejects(()=>enterpriseChatJSON({env:{},model:"gpt-4o",system:"json",user:{}}),e=>e instanceof EnterpriseAIError&&e.status===503);
});
test("Corporate upstream errors redact raw messages",async()=>{
 const previous=globalThis.fetch;
 globalThis.fetch=async()=>({ok:false,status:403,json:async()=>({error:{message:"Secret credential is hidden"}})});
 try{await assert.rejects(()=>enterpriseChatJSON({env,model:"gpt-4o",system:"json",user:{}}),e=>e.status===403&&!e.message.includes("Secret credential"))}
 finally{globalThis.fetch=previous}
});
test("Truncated JSON response is rejected",async()=>{
 const previous=globalThis.fetch;
 globalThis.fetch=async()=>({ok:true,json:async()=>({choices:[{finish_reason:"length",message:{content:'{"incomplete":true}'}}]})});
 try{await assert.rejects(()=>enterpriseChatJSON({env,model:"gpt-4o",system:"json",user:{}}),e=>e.providerError.category==="OUTPUT_LIMIT")}
 finally{globalThis.fetch=previous}
});
