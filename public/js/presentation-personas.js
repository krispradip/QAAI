/**
 * QA.MAFer.AI presentation personas.
 * Intentional DEMO-ONLY client-side role switching. It is NOT authentication,
 * authorization or SSO. Protect real records at an authenticated backend.
 */
export const ROLE_LABELS=Object.freeze({
  agent:"Agent",bu_lead:"SHARE QA Lead",cc_lead:"CC Director",admin:"Platform Admin"
});
const USERS_KEY="qaai-demo-user-directory-v1";
const ACTIVE_KEY="qaai-demo-session-v3";
const session=()=>typeof sessionStorage!=="undefined"?sessionStorage:localStorage;
const defaultEmail=name=>"unassigned."+String(name||"user").toLowerCase().replace(/[^a-z0-9]+/g,".")+"@example.invalid";
const defaults=[
  {id:"demo-agent-001",email:"Hassan.Aly@maf.ae",name:"Hassan Aly",role:"agent",businessUnit:"SHARE",agent:"Hassan Aly",active:true,system:true},
  {id:"demo-bulead-001",email:"Rima.Soliman@maf.ae",name:"Rima Soliman",role:"bu_lead",businessUnit:"SHARE",agent:"",active:true,system:true},
  {id:"demo-cclead-001",email:"Nadia.Diehl@maf.ae",name:"Nadia Diehl",role:"cc_lead",businessUnit:"All",agent:"",active:true,system:true},
  {id:"demo-admin-001",email:"Pradip.krishnamoorthy@maf.ae",name:"Pradip Krishnamoorthy",role:"admin",businessUnit:"All",agent:"",active:true,system:true}
];
const text=(x,n=100)=>String(x??"").trim().slice(0,n);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export function demoUsers(){
  try {
    const raw=JSON.parse(localStorage.getItem(USERS_KEY)||"[]");
    if(!Array.isArray(raw))return defaults.map(x=>({...x}));
    const extra=raw.filter(x=>x&&!x.system&&!defaults.some(d=>d.id===x.id)&&ROLE_LABELS[x.role])
      .map(x=>({id:text(x.id,60),email:text(x.email||defaultEmail(x.name),120).toLowerCase(),name:text(x.name),role:x.role,businessUnit:text(x.businessUnit,50),agent:text(x.agent),active:x.active!==false,system:false})).slice(0,40);
    const flags=new Map(raw.filter(x=>x?.system).map(x=>[x.id,x.active!==false]));
    return defaults.map(x=>({...x,active:flags.get(x.id)??x.active})).concat(extra);
  } catch {return defaults.map(x=>({...x}));}
}
export function activeDemoUser(){
  const stored=session().getItem(ACTIVE_KEY);
  return demoUsers().find(x=>x.id===stored&&x.active)||null;
}
export function chooseDemoUser(id){
  const user=demoUsers().find(x=>x.id===id&&x.active);
  if(!user)throw Error("Selected persona is not active");
  session().setItem(ACTIVE_KEY,user.id);return user;
}
export function loginDemoEmail(email){
  const normalized=String(email||"").trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized))throw Error("Enter a valid persona email address.");
  const person=demoUsers().find(x=>x.email.toLowerCase()===normalized);
  if(!person)throw Error("This email is not registered as a presentation persona.");
  if(!person.active)throw Error("This persona has been offboarded.");
  return chooseDemoUser(person.id);
}
export function logoutDemoUser(){session().removeItem(ACTIVE_KEY);}
export function demoSessionHTML(user){
  return '<div class="qa-session-user"><span>PERSONA</span><b>'+esc(user.name)+'</b>'+
    '<small>'+esc(user.email)+'</small><em>'+esc(ROLE_LABELS[user.role])+'</em>'+
    '<button type="button" id="qa-demo-logout">Log out</button></div>';
}
export function renderDemoLoginAccounts(){ return ""; }
export function demoPermissions(user){
  switch(user?.role){
    case "agent":return new Set(["overview","agents"]);
    case "bu_lead":return new Set(["overview","studio","agents","standards","config"]);
    case "cc_lead":return new Set(["portfolio","overview","studio","agents","standards","config"]);
    case "admin":return new Set(["admin","portfolio","overview","studio","agents","standards","usage","config"]);
    default:return new Set();
  }
}
export function canViewPage(user,page){return demoPermissions(user).has(page);}
export function canEvaluate(user){return !!user?.active && ["bu_lead","cc_lead","admin"].includes(user.role); }
export function callBU(call){
  return text(call?.businessUnit||call?.bu||call?.meta?.businessUnit||
    (/\bshare\b/i.test(call?.queue||"")?"SHARE":"SHARE"),60)||"SHARE";
}
export function demoCallVisible(user,call){
  if(!user?.active)return false;
  if(user.role==="admin"||user.role==="cc_lead")return true;
  if(callBU(call)!=="SHARE")return false;
  return user.role==="bu_lead" || (user.role==="agent" && call.agent===user.agent && call.status==="COMPLETE" && Number.isFinite(call.score?.score));
}
export function scopedDemoCalls(user,calls){return (calls||[]).filter(c=>demoCallVisible(user,c));}
export function createDemoUser(input){
  const list=demoUsers();
  if(list.length>=44)throw Error("Demo user directory is full");
  if(!ROLE_LABELS[input?.role])throw Error("Choose a supported role");
  const name=text(input?.name,80);
  if(name.length<3)throw Error("Enter a user display name");
  const role=input.role;
  const agent=role==="agent"?text(input.agent||name,80):"";
  const businessUnit=role==="admin"||role==="cc_lead"?"All":text(input.businessUnit||"SHARE",60);
  if(role==="agent"&&!agent)throw Error("Map the demo agent to an agent name");
  const id="demo-custom-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8);
  const email=text(input?.email,120).toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error("Enter a valid demo email");
  if(list.some(x=>x.email?.toLowerCase()===email))throw Error("This demo email already exists");
  const user={id,email,name,role,agent,businessUnit,active:true,system:false};
  list.push(user);localStorage.setItem(USERS_KEY,JSON.stringify(list));return user;
}
export function setDemoUserActive(id,active){
  const list=demoUsers();const u=list.find(x=>x.id===id);
  if(!u)throw Error("User not found");
  if(u.id==="demo-admin-001"&&!active)throw Error("The presentation recovery administrator cannot be offboarded");
  u.active=!!active;
  localStorage.setItem(USERS_KEY,JSON.stringify(list));
  if(!u.active&&session().getItem(ACTIVE_KEY)===id)session().removeItem(ACTIVE_KEY);
  return u;
}
export function demoSelectorHTML(user){
  return '<div class="qa-persona-switch"><label for="qa-demo-user">DEMO PERSONA</label>'+
    '<select id="qa-demo-user" aria-label="Switch demonstration persona">'+
    demoUsers().filter(x=>x.active).map(x=>'<option value="'+esc(x.id)+'" '+(user.id===x.id?'selected':'')+'>'+esc(x.name)+' · '+esc(ROLE_LABELS[x.role])+'</option>').join("")+
    '</select><small>Presentation roles only · not a login</small></div>';
}
export function demoNavigation(user){
  const entries=[
    ["overview","▦","Home"],["portfolio","▥","BU Performance"],["studio","✦","AI Evaluation Studio"],
    ["agents","◉",user.role==="agent"?"My Performance":"Agents & Reports"],
    ["standards","▤","Rubric & References"],
    ["usage","▤","AI Usage & Diagnostics"],["config","⚙","Config"],["admin","♙","Platform Administration"]
  ];
  const allowed=demoPermissions(user);
  return entries.filter(x=>allowed.has(x[0])).map(([id,icon,label])=>
    '<button type="button" data-page="'+id+'"><span>'+icon+'</span> '+esc(label)+'</button>').join("");
}
export function renderDemoAdmin(users,usage,calls,apiStatus="Not checked"){
  const total=(usage||[]).reduce((s,x)=>s+(Number(x.aiTelemetry?.totalTokens)||0),0);
  const finished=(calls||[]).filter(x=>x.status==="COMPLETE").length;
  const active=users.filter(u=>u.active).length;
  const card=(label,value)=>'<div class="qa-admin-kpi"><small>'+esc(label)+'</small><strong>'+esc(value)+'</strong></div>';
  return '<div class="qa-persona-page"><div class="qa-demo-heading"><div><span class="kicker">PLATFORM GOVERNANCE</span><h2>Platform Administration</h2><p>Demo user lifecycle, system configuration, usage and operating status.</p></div><span class="qa-demo-pill">DEMO MODE</span></div>'+
  '<div class="qa-admin-kpis">'+card("Active demo users",active)+card("Completed SHARE assessments",finished)+card("Reported Gemini tokens",total.toLocaleString("en-US"))+card("Platform API",apiStatus)+'</div>'+
  '<div class="qa-admin-split"><section class="panel qa-admin-card"><h3>Access & user lifecycle</h3><p>Onboard / offboard simulated users; browser-local records only.</p>'+
  '<form id="qa-demo-user-form" class="qa-admin-form"><label>Display name<input name="name" maxlength="80" required placeholder="Demo user"></label><label>Email<input name="email" type="email" required placeholder="name@example.com"></label>'+
  '<label>Role<select name="role"><option value="agent">Agent</option><option value="bu_lead">BU Lead</option><option value="cc_lead">CC Lead</option><option value="admin">Admin</option></select></label>'+
  '<label>Business unit<input name="businessUnit" value="SHARE"></label><label>Agent name / mapping<input name="agent" placeholder="For agent role"></label>'+
  '<button type="submit" class="primary">Onboard demo user</button></form>'+
  '<div class="table-scroll"><table><thead><tr><th>Name / Email</th><th>Role</th><th>BU</th><th>Status</th><th>Action</th></tr></thead><tbody>'+
  users.map(u=>'<tr><td><b>'+esc(u.name)+'</b><small>'+esc(u.email)+'</small></td><td>'+esc(ROLE_LABELS[u.role])+'</td><td>'+esc(u.businessUnit)+'</td><td>'+(u.active?'Active':'Offboarded')+'</td><td><button type="button" class="secondary" data-demo-user-toggle="'+esc(u.id)+'" '+(u.id==="demo-admin-001"?'disabled':'')+'>'+ (u.active?"Offboard":"Reactivate")+'</button></td></tr>').join("")+
  '</tbody></table></div></section>'+
  '<section class="panel qa-admin-card"><h3>Platform operations</h3><p>Cloudflare Worker · Gemini API · Local usage ledger</p>'+
  '<div class="qa-admin-actions"><button class="secondary" type="button" id="qa-check-health">Check /api/health</button>'+
  '<button class="secondary" type="button" data-page-go="config">QA Configurator & libraries</button>'+
  '<button class="secondary" type="button" data-page-go="usage">Token usage & rate limits</button>'+
  '<button class="secondary" type="button" data-page-go="studio">Evaluation Studio</button></div>'+
  '<p class="qa-demo-note">The persona switcher is a product demonstration, not SSO, identity enforcement or secure RBAC. Enterprise administration requires authenticated APIs, server-enforced permissions and audit logs.</p></section></div></div>';
}
