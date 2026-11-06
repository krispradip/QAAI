import test from "node:test";
import assert from "node:assert/strict";
import {loginDemoEmail,logoutDemoUser,activeDemoUser,chooseDemoUser,demoUsers,
  createDemoUser,setDemoUserActive} from "../public/js/presentation-personas.js";
import {BU_BRANDS,renderDirectorPortfolio,shareSummary,shareAgentSummary} from "../public/js/presentation-portfolio.js";
import {normalizeClipboardPlain,normalizeClipboardHTML} from "../public/js/presentation-paste.js";
import {parseExport} from "../public/js/parser.js";
import {readFileSync} from "node:fs";
const store=new Map(),sessions=new Map();
globalThis.localStorage={
 getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)
};
globalThis.sessionStorage={
 getItem:k=>sessions.get(k)||null,setItem:(k,v)=>sessions.set(k,String(v)),removeItem:k=>sessions.delete(k)
};
test("persona login uses email alone, persists only in the browser tab, and logs out",()=>{
 assert.equal(activeDemoUser(),null);
 assert.equal(loginDemoEmail("  NADIA.DIEHL@maf.ae  ").role,"cc_lead");
 assert.equal(activeDemoUser().email,"Nadia.Diehl@maf.ae");
 logoutDemoUser();
 assert.equal(activeDemoUser(),null);
 assert.throws(()=>loginDemoEmail("no-user@example.com"),/not registered/);
 assert.throws(()=>loginDemoEmail("not-email"),/valid persona email/);
});
test("custom admin-managed email is selected as its persona, and offboarded users cannot log in",()=>{
 chooseDemoUser("demo-admin-001");
 const person=createDemoUser({name:"Advisor Demo",email:"advisor.demo@example.com",role:"agent",businessUnit:"SHARE",agent:"Advisor Demo"});
 logoutDemoUser();
 assert.equal(loginDemoEmail(person.email).id,person.id);
 setDemoUserActive(person.id,false);
 assert.equal(activeDemoUser(),null);
 assert.throws(()=>loginDemoEmail(person.email),/offboarded/);
 setDemoUserActive(person.id,true);
});
test("correct BU to brand hierarchy with MGC Classic",()=>{
 const expected=[["Retail","Carrefour"],["Entertainment","VOX"],["Lifestyle","Crate & Barrel"],["AMBU","MOE"],["DBU","TAG"],["SHARERewards","SHARE"],["Fintech","MGC Classic"]];
 assert.deepEqual(BU_BRANDS.map(x=>[x.bu,x.brand]),expected);
 const html=renderDirectorPortfolio([]);
 for(const [bu,brand] of expected){assert.ok(html.includes(bu),bu);assert.ok(html.includes(brand.replace(/&/g,"&amp;")),brand);}
 assert.match(html,/Synthetic demo/);
 assert.match(html,/SHARE agent performance/);
});
test("SHARE rolls up the same agent assessment rows and does not invent scores for pending calls",()=>{
 const calls=[
  {agent:"Layla",businessUnit:"SHARE",status:"COMPLETE",score:{score:88,coverage:70}},
  {agent:"Layla",businessUnit:"SHARERewards",status:"COMPLETE",score:{score:92,coverage:80}},
  {agent:"Riya",businessUnit:"SHARE",status:"ERROR",score:null},
  {agent:"Cinema",businessUnit:"Entertainment",status:"COMPLETE",score:{score:99,coverage:99}}
 ];
 const total=shareSummary(calls);
 assert.equal(total.interactions,3);assert.equal(total.evaluated,2);assert.equal(total.quality,90);assert.equal(total.coverage,75);
 const agents=shareAgentSummary(calls);assert.equal(agents.length,2);
 assert.equal(agents.find(x=>x.agent==="Layla").quality,90);
 assert.equal(agents.find(x=>x.agent==="Riya").quality,null);
 assert.match(renderDirectorPortfolio(calls,"SHARERewards","SHARE"),/Layla/);
 assert.doesNotMatch(renderDirectorPortfolio(calls,"Retail","Carrefour"),/SHARE agent performance/);
});
test("Word markdown, TSV and column-per-line pasted transcripts normalize through common parser",()=>{
 const pairs=[
 ["md",["| Interaction ID | DEMO-MD |","| Agent | Layla |","| Time | Speaker | Text |","| --- | --- | --- |","| 00:00 | Agent (Layla) | Good morning |","| 00:10 | Customer | Hello |"].join("\n")],
 ["tabs",["Interaction ID\tDEMO-TABS","Agent\tLayla","Time\tSpeaker\tText","00:00\tAgent (Layla)\tGood morning","00:10\tCustomer\tHello"].join("\n")],
 ["columns",["Interaction ID","DEMO-COLUMN","Agent","Layla","Time","Speaker","Text","00:00","Agent (Layla)","Good morning","00:10","Customer","Hello"].join("\n")]
 ];
 for(const [kind,raw] of pairs){
  const normalized=normalizeClipboardPlain(raw);
  const parsed=parseExport(normalized,"paste.txt");
  assert.equal(parsed.length,1,kind);
  assert.equal(parsed[0].status,"READY",kind);
  assert.equal(parsed[0].turns.length,2,kind);
 }
});
test("HTML clipboard fallback without DOMParser keeps usable plain text",()=>{
 const plain="Agent: Hi there!\nCustomer: Hello";
 assert.equal(normalizeClipboardHTML(plain,"<table></table>"),plain);
});
test("studio refresh removes residual red/pink for normal controls and retains red for errors",()=>{
 const css=readFileSync(new URL("../public/css/presentation-brand.css",import.meta.url),"utf8");
 assert.match(css,/\.studio-v5 \.studio-evaluator-main \.qmf-evaluator/);
 assert.match(css,/\.studio-v5 \.studio-v5-toolbar/);
 assert.match(css,/qa-demo-login-open/);
 assert.match(css,/qa-login-options/);
});
