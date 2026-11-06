/**
 * Presentation-only QA governance.
 * Drafts and publication events are browser-local; this is not production RBAC.
 * Real enterprise workflows require authenticated, server-enforced BU scope,
 * persistent baseline versions, approvals and centrally delivered notifications.
 */
const DRAFT_KEY="qaai-governance-working-v1";
const BU_KEY="qaai-governance-bu-baselines-v1";
const EVENT_KEY="qaai-governance-notifications-v1";
const deepCopy=value=>JSON.parse(JSON.stringify(value));
const safeRead=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||"null")||fallback;}catch{return fallback;}};
export const normalizeBU=bu=>["SHARE","SHARERewards"].includes(String(bu||""))?"SHARERewards":String(bu||"SHARERewards");
export const isShareBU=bu=>normalizeBU(bu)==="SHARERewards";
export function canConfigureBU(user,bu){
 if(!user?.active)return false;
 return user.role==="admin"||user.role==="cc_lead"||(user.role==="bu_lead"&&normalizeBU(user.businessUnit)===normalizeBU(bu));
}
export function publishedBUrubric(bu,shareRubric){
 if(isShareBU(bu))return shareRubric;
 const saved=safeRead(BU_KEY,{});
 return saved[normalizeBU(bu)]?deepCopy(saved[normalizeBU(bu)]):null;
}
export function savePublishedBUrubric(bu,rubric){
 if(isShareBU(bu))return;
 const saved=safeRead(BU_KEY,{});
 saved[normalizeBU(bu)]=deepCopy(rubric);
 localStorage.setItem(BU_KEY,JSON.stringify(saved));
}
function draftId(user,bu){return String(user?.id||"unknown")+":"+normalizeBU(bu);}
export function loadWorkingConfig(user,bu,baseline,referenceLibrary){
 const drafts=safeRead(DRAFT_KEY,{});
 const stored=drafts[draftId(user,bu)];
 return {
  rubric:stored?.rubric?.criteria&&stored?.rubric?.rules?deepCopy(stored.rubric):deepCopy(baseline),
  references:stored?.references?.datasets?deepCopy(stored.references):deepCopy(referenceLibrary),
  imported:!!stored?.imported||!!publishedBUrubric(bu,baseline),
  bu:normalizeBU(bu),userId:user.id
 };
}
export function saveWorkingConfig(user,bu,config){
 const drafts=safeRead(DRAFT_KEY,{});
 drafts[draftId(user,bu)]={rubric:deepCopy(config.rubric),references:deepCopy(config.references),imported:!!config.imported};
 localStorage.setItem(DRAFT_KEY,JSON.stringify(drafts));
 return config;
}
export function describeRubricChanges(before,after){
 const changes=[];
 const prior=new Map((before?.criteria||[]).map(x=>[x.id,x]));
 for(const c of after?.criteria||[]){
  const old=prior.get(c.id);
  if(!old){changes.push("Added criterion: "+c.name);continue;}
  if(old.name!==c.name)changes.push("Renamed "+old.name+" to "+c.name);
  if(Number(old.weight)!==Number(c.weight))changes.push(c.name+": weight "+old.weight+" to "+c.weight);
  if(old.enabled!==c.enabled)changes.push(c.name+": "+(c.enabled?"enabled":"disabled"));
  if(JSON.stringify(old.checkpoints)!==JSON.stringify(c.checkpoints))changes.push(c.name+": evaluation checkpoints updated");
  if(old.instructions!==c.instructions||old.definition!==c.definition)changes.push(c.name+": evaluation guidance updated");
 }
 const oldRules=new Map((before?.rules?.deterministic||[]).map(x=>[x.id,x]));
 for(const rule of after?.rules?.deterministic||[]){
  const old=oldRules.get(rule.id);
  if(old&&JSON.stringify(old)!==JSON.stringify(rule))changes.push(rule.id.replaceAll("_"," ")+": threshold/selection updated");
 }
 if(before?.instructions!==after?.instructions)changes.push("Global evaluator guidance updated");
 return [...new Set(changes)].slice(0,30);
}
export function publishBaselineEvent(user,bu,before,after){
 const changes=describeRubricChanges(before,after);
 const event={id:"qa-baseline-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8),
  bu:normalizeBU(bu),name:String(user.name||"BU Lead"),role:user.role,
  fromRevision:before?.revision??null,toRevision:after.revision,
  publishedAt:new Date().toISOString(),effectiveAt:new Date().toISOString(),
  changes:changes.length?changes:["Baseline republished with no parameter changes"]};
 const events=safeRead(EVENT_KEY,[]);
 events.unshift(event);
 localStorage.setItem(EVENT_KEY,JSON.stringify(events.slice(0,80)));
 return event;
}
export function agentBaselineNotifications(user){
 if(user?.role!=="agent")return [];
 return safeRead(EVENT_KEY,[]).filter(e=>normalizeBU(e.bu)===normalizeBU(user.businessUnit));
}
export function validateScopedDataset(user,bu,dataset){
 if(!canConfigureBU(user,bu))throw Error("This business unit is outside your editing scope.");
 if(user.role==="admin")return;
 const target=normalizeBU(bu);
 const rows=dataset?.rows||[];
 if(!rows.length)throw Error("Reference file contains no usable rows.");
 // An unscoped 'All' row could silently change a different BU's scoring context.
 if(rows.some(row=>normalizeBU(row.businessUnit||"All")!==target))
  throw Error("Every uploaded CSV row must use businessUnit "+target+". Cross-BU / All rows require Platform Admin.");
}
