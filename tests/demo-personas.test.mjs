import test from "node:test";
import assert from "node:assert/strict";
import {activeDemoUser,chooseDemoUser,demoUsers,demoNavigation,scopedDemoCalls,
  canViewPage,canEvaluate,createDemoUser,setDemoUserActive,renderDemoAdmin} from "../public/js/presentation-personas.js";
import {renderDirectorPortfolio,shareSummary} from "../public/js/presentation-portfolio.js";
import {readFile} from "node:fs/promises";

const memory=new Map();
globalThis.localStorage={
  getItem:k=>memory.has(k)?memory.get(k):null,
  setItem:(k,v)=>memory.set(k,String(v)),
  removeItem:k=>memory.delete(k),
  clear:()=>memory.clear()
};
const calls=[
  {agent:"Hassan Aly",id:"demo-a",businessUnit:"SHARE",status:"COMPLETE",score:{score:95,coverage:100}},
  {agent:"Amir Demo",id:"demo-b",businessUnit:"SHARE",status:"READY"},
  {agent:"Demo Cinema",id:"demo-c",businessUnit:"VOX Cinemas",status:"COMPLETE",score:{score:70,coverage:90}}
];
test("agent sees only their own SHARE interactions",()=>{
  memory.clear();const u=chooseDemoUser("demo-agent-001");
  assert.equal(activeDemoUser().role,"agent");
  assert.deepEqual(scopedDemoCalls(u,calls).map(c=>c.id),["demo-a"]);
  assert.equal(canViewPage(u,"config"),false);
  assert.equal(canViewPage(u,"studio"),false);
  assert.equal(canEvaluate(u),false);
});
test("BU lead sees all SHARE agents, no other BUs",()=>{
  const u=chooseDemoUser("demo-bulead-001");
  assert.deepEqual(scopedDemoCalls(u,calls).map(c=>c.id),["demo-a","demo-b"]);
  assert.equal(canViewPage(u,"studio"),true);
  assert.equal(canViewPage(u,"usage"),false);
  assert.equal(canViewPage(u,"portfolio"),false);
  assert.equal(canEvaluate(u),true);
});
test("customer care lead accesses cross-BU demo but not admin and config",()=>{
  const u=chooseDemoUser("demo-cclead-001");
  assert.equal(canViewPage(u,"portfolio"),true);
  assert.equal(canViewPage(u,"admin"),false);
  assert.equal(canViewPage(u,"config"),false);
  assert.equal(canEvaluate(u),true);
  assert.equal(canViewPage(u,"studio"),true);
  assert.equal(scopedDemoCalls(u,calls).length,3);
  const html=renderDirectorPortfolio(calls);
  assert.match(html,/Carrefour/);
  assert.match(html,/Entertainment · VOX/);
  assert.match(html,/SHARE/);
  assert.match(html,/Synthetic demo/);
  assert.equal(shareSummary(calls.slice(0,2)).quality,95);
});
test("admin manages demo users, can restore users, cannot offboard recovery admin",()=>{
  const admin=chooseDemoUser("demo-admin-001");
  assert.equal(canViewPage(admin,"admin"),true);
  assert.equal(canViewPage(admin,"usage"),true);
  assert.equal(canViewPage(admin,"config"),true);
  const user=createDemoUser({name:"Test Advisor",email:"test.advisor@example.com",role:"agent",businessUnit:"SHARE",agent:"Test Advisor"});
  assert.ok(demoUsers().some(x=>x.id===user.id));
  assert.match(renderDemoAdmin(demoUsers(),[],calls),/Onboard demo user/);
  setDemoUserActive(user.id,false);
  assert.ok(demoUsers().find(x=>x.id===user.id).active===false);
  setDemoUserActive(user.id,true);
  assert.ok(demoUsers().find(x=>x.id===user.id).active===true);
  assert.throws(()=>setDemoUserActive("demo-admin-001",false),/cannot be offboarded/);
});
test("demo navigation hides disallowed pages",()=>{
  const u=chooseDemoUser("demo-agent-001");
  const html=demoNavigation(u);
  assert.match(html,/My Performance/);
  assert.doesNotMatch(html,/AI Usage &amp; Diagnostics/);
  assert.doesNotMatch(html,/Config/);
});
test("synthetic fixture data is populated and explicitly marked as demo",async()=>{
  const content=await readFile(new URL("../public/demo/share-synthetic-transcripts.json",import.meta.url),"utf8");
  const rows=JSON.parse(content);
  assert.ok(rows.length>=3);
  assert.ok(rows.every(x=>x.id.startsWith("DEMO-")&&x.turns.length>=5));
  const ref=JSON.parse(await readFile(new URL("../public/demo/share-reference-library.json",import.meta.url),"utf8"));
  assert.equal(ref.datasets.length,4);
  assert.ok(ref.datasets.every(x=>x.name.includes("synthetic")&&x.rows.length));
});
test("animated brand includes reduced motion support",async()=>{
 const css=await readFile(new URL("../public/css/presentation-brand.css",import.meta.url),"utf8");
 assert.match(css,/qa-brand-shine/);
 assert.match(css,/qa-brand-pulse/);
 assert.match(css,/prefers-reduced-motion/);
});
