import test from "node:test";
import assert from "node:assert/strict";
import {handler} from "../src/aws-lambda.mjs";
const snapshot=()=>({key:process.env.ENTERPRISE_AI_API_KEY,origins:process.env.QA_ALLOWED_ORIGINS});
const setup=()=>{process.env.ENTERPRISE_AI_API_KEY="test-only";process.env.QA_ALLOWED_ORIGINS="https://qa.company.example"};
const restore=x=>{for(const [k,v] of Object.entries({ENTERPRISE_AI_API_KEY:x.key,QA_ALLOWED_ORIGINS:x.origins})){if(v===undefined)delete process.env[k];else process.env[k]=v}};
const event=(method,path,origin="https://qa.company.example")=>({
 version:"2.0",rawPath:path,rawQueryString:"",requestContext:{http:{method}},
 headers:{"origin":origin,"content-type":"application/json"},isBase64Encoded:false
});
test("Lambda HTTP API health returns JSON and safe CORS",async()=>{
 const x=snapshot();setup();
 try{
  const r=await handler(event("GET","/api/health"));
  assert.equal(r.statusCode,200);assert.equal(JSON.parse(r.body).apiReady,true);
  assert.equal(r.headers["access-control-allow-origin"],"https://qa.company.example");
  assert.doesNotMatch(r.body,/test-only/);
 }finally{restore(x)}
});
test("Lambda rejects disallowed origins and non-API paths",async()=>{
 const x=snapshot();setup();
 try{
  assert.equal((await handler(event("GET","/api/health","https://other.example"))).statusCode,403);
  assert.equal((await handler(event("GET","/index.html"))).statusCode,404);
 }finally{restore(x)}
});
test("Lambda preflight accepts configured origin",async()=>{
 const x=snapshot();setup();
 try{const r=await handler(event("OPTIONS","/api/evaluate"));assert.equal(r.statusCode,204)}
 finally{restore(x)}
});
test("Lambda rejects requests without runtime credential",async()=>{
 const x=snapshot();setup();delete process.env.ENTERPRISE_AI_API_KEY;
 try{const r=await handler(event("GET","/api/health"));assert.equal(r.statusCode,503)}
 finally{restore(x)}
});
test("Lambda REST API v1 event supported",async()=>{
 const x=snapshot();setup();
 try{
  const r=await handler({path:"/api/health",httpMethod:"GET",headers:{"origin":"https://qa.company.example"}});
  assert.equal(r.statusCode,200);
 }finally{restore(x)}
});
