import test from "node:test";
import assert from "node:assert/strict";
import {defaultRubric} from "../public/js/config.js";
import {overview,agentsView} from "../public/js/ui.js";
import {demoPermissions,canViewPage,canEvaluate,scopedDemoCalls,chooseDemoUser,activeDemoUser} from "../public/js/presentation-personas.js";
const values=new Map(),sessions=new Map();
globalThis.localStorage={
  getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),
  removeItem:k=>values.delete(k),clear:()=>values.clear()
};
globalThis.sessionStorage={
  getItem:k=>sessions.get(k)??null,setItem:(k,v)=>sessions.set(k,String(v)),
  removeItem:k=>sessions.delete(k),clear:()=>sessions.clear()
};
const completed={key:"agent-completed",id:"A-1",agent:"Layla Demo",businessUnit:"SHARE",status:"COMPLETE",
  score:{score:94,coverage:75},findings:[],turns:[],meta:{rubricRevision:1}};
const pending={key:"agent-pending",id:"A-2",agent:"Layla Demo",businessUnit:"SHARE",status:"READY",
  score:null,findings:[],turns:[]};
const other={key:"other",id:"B-1",agent:"Other Advisor",businessUnit:"SHARE",status:"COMPLETE",
  score:{score:61,coverage:73},findings:[],turns:[]};
test("Agent sees only completed scored interactions belonging to them",()=>{
  const agent=chooseDemoUser("demo-agent-001");
  assert.equal(canEvaluate(agent),false);
  assert.equal(canViewPage(agent,"studio"),false);
  assert.deepEqual(scopedDemoCalls(agent,[completed,pending,other]).map(x=>x.key),["agent-completed"]);
});
test("Agent Home is a completed, read-only performance screen",()=>{
  const html=overview([completed],defaultRubric(),"Layla Demo",{mode:"all"},{},
    {personaRole:"agent",allowClearHistory:false});
  assert.match(html,/My quality performance/);
  assert.match(html,/My quality scorecard/);
  assert.match(html,/My assessments/);
  assert.doesNotMatch(html,/Open Evaluation Studio/);
  assert.doesNotMatch(html,/data-page-go="studio"/);
  assert.doesNotMatch(html,/clearHistory/);
  assert.doesNotMatch(html,/overview-agent-filter/);
  const empty=overview([],defaultRubric(),"Layla Demo",{mode:"all"},{},
    {personaRole:"agent",allowClearHistory:false});
  assert.match(empty,/No completed QA assessments/);
  assert.doesNotMatch(empty,/Import and evaluate calls/);
});
test("Agent My Performance has no evaluations, reassessment or Studio shortcut",()=>{
  const state={calls:[completed],agentFilter:"Layla Demo",selected:null,rubric:defaultRubric(),personaRole:"agent"};
  const html=agentsView(state);
  assert.match(html,/My QA performance/);
  assert.match(html,/Read only/);
  assert.doesNotMatch(html,/data-page-go="studio"/);
  assert.doesNotMatch(html,/id="rerunAgent"/);
  assert.doesNotMatch(html,/Evaluate interactions/);
});
test("SHARE lead, CC director and admin may run independent evaluations",()=>{
  for(const id of ["demo-bulead-001","demo-cclead-001","demo-admin-001"]){
    const user=chooseDemoUser(id);
    assert.equal(canViewPage(user,"studio"),true,id);
    assert.equal(canEvaluate(user),true,id);
  }
  const agent=chooseDemoUser("demo-agent-001");
  assert.equal(canEvaluate(agent),false);
});
test("Sidebar logout dispatches outside the main #view controller",async()=>{
  const els={};
  function el(sel){
    return els[sel] ||= {
      textContent:"",value:"",innerHTML:"",dataset:{},className:"",
      listeners:{},classList:{add(){},remove(){},toggle(){}},
      addEventListener(type,fn){this.listeners[type]=fn;},
      querySelector(){return null;},querySelectorAll(){return [];},
      setAttribute(){},scrollTop:0
    };
  }
  sessions.clear();chooseDemoUser("demo-bulead-001");
  globalThis.document={
    querySelector:el,querySelectorAll:()=>[],
    body:{classList:{add(){},remove(){}}},
    scrollingElement:{scrollTop:100}
  };
  globalThis.window={scrollY:0,scrollTo(){}};
  globalThis.indexedDB=undefined;
  await import("../public/js/app.js?sidebar-logout-regression=1");
  const sidebar=el("#qa-demo-persona");
  assert.equal(typeof sidebar.listeners.click,"function");
  assert.ok(activeDemoUser());
  sidebar.listeners.click({target:{closest:selector=>selector==="#qa-demo-logout"?{id:"qa-demo-logout"}:null},
    preventDefault(){}});
  assert.equal(activeDemoUser(),null);
  assert.match(el("#view").innerHTML,/id="qa-demo-login"/);
});
