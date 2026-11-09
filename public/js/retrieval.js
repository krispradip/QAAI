/**
 * QA.RETRIEVAL.001 - bounded, BU-scoped lexical retrieval over approved files.
 *
 * This is a retrieval foundation, not vector RAG. No embeddings or external
 * infrastructure required. Retrieval never establishes interaction evidence.
 */
import {REFERENCE_SCHEMAS} from "./reference.js";
const norm=s=>String(s??"").normalize("NFKC").toLocaleLowerCase("en")
 .replace(/[\u064b-\u065f\u0670\u0640]/g,"").replace(/[^\p{L}\p{N}]+/gu," ").trim().replace(/\s+/g," ");
const common=new Set("a an and are as at be by for from have i in is it me of on or our the their there this to was we will with would you your thank please".split(" "));
const tokens=s=>new Set(norm(s).split(" ").filter(w=>w.length>2&&!common.has(w)));
const scoped=(value,observed)=>{
 const v=norm(value);
 return !v||["all","global"].includes(v)||value==="*"||Boolean(observed&&norm(observed)===v);
};
const criterionApplies=(ref,ids)=>!ref.criterionId||["all","*"].includes(ref.criterionId.toLowerCase())||
 ids.some(id=>ref.criterionId===id||ref.criterionId.startsWith(id+"-"));
const FIELD_LIMITS={maxEntries:8,maxChars:3800};
/**
 * Rank relevant approved knowledge within a fixed character budget.
 * Call BU/market/channel are authoritative metadata; never inferred from text.
 */
export function rankedReferenceEntries(library,call,criteria,options={}){
 const maxEntries=Math.min(12,Math.max(1,Number(options.maxEntries)||FIELD_LIMITS.maxEntries));
 const maxChars=Math.min(8000,Math.max(500,Number(options.maxChars)||FIELD_LIMITS.maxChars));
 const ids=(criteria||[]).map(c=>typeof c==="string"?c:c?.id).filter(Boolean);
 const dialogue=(call?.turns||[]).map(x=>x.text||"").join(" ");
 const words=tokens(dialogue+" "+ids.join(" "));
 const exact=" "+norm(dialogue)+" ";
 const matches=[],seen=new Set();
 for(const data of library?.datasets||[]){
  if(data.enabled!==true||!REFERENCE_SCHEMAS[data.type])continue;
  for(const [rowIndex,ref] of (data.rows||[]).entries()){
   if(!scoped(ref.businessUnit,call?.businessUnit||call?.bu||"")||
      !scoped(ref.market,call?.market||call?.country||"")||
      !scoped(ref.channel,call?.type||call?.channel||"")||
      !criterionApplies(ref,ids))continue;
   // Guidance may be selected by checkpoint scope; terms/equivalents must
   // actually overlap the dialogue (no spraying irrelevant knowledge).
   const fields=REFERENCE_SCHEMAS[data.type].columns;
   const candidateText=data.type==="phonetic"?[ref.canonical,ref.variant]:
     data.type==="semantic"?[ref.concept,ref.phrase]:
     data.type==="terminology"?[ref.term,...String(ref.aliases||"").split("|")]:
     [ref.example,ref.evaluationRule,ref.criterionId];
   const candidateWords=tokens(candidateText.join(" "));
   const overlap=[...candidateWords].filter(w=>words.has(w)).length;
   const matchedPhrase=candidateText.some(p=>norm(p).length>3&&exact.includes(" "+norm(p)+" "));
   const targeted=Boolean(ref.criterionId&&ids.some(id=>ref.criterionId===id||ref.criterionId.startsWith(id+"-")));
   if(data.type!=="guidance"&&!matchedPhrase&&overlap<2)continue;
   // Generic guidance still needs overlap or a precise checkpoint ID.
   if(data.type==="guidance"&&!targeted&&!matchedPhrase&&overlap<2)continue;
   const summary=Object.fromEntries(fields.map(field=>[field,String(ref[field]||"").slice(0,600)]));
   const reference={type:data.type,source:String(data.name||"Approved reference").slice(0,120),
     version:data.version||1,referenceId:String(data.id||"ref").slice(0,32)+":"+(rowIndex+1),...summary};
   const unique=data.type+"|"+JSON.stringify(summary);
   if(seen.has(unique))continue;
   seen.add(unique);
   const score=(targeted?20:0)+(matchedPhrase?16:0)+Math.min(10,overlap)+
     (data.type==="guidance"?4:0);
   matches.push({reference,score,index:matches.length});
  }
 }
 matches.sort((a,b)=>b.score-a.score||a.index-b.index);
 let chars=0;const selected=[];
 const byFile=new Map();
 for(const m of matches){
  if(selected.length>=maxEntries)break;
  const size=JSON.stringify(m.reference).length;
  if(chars+size>maxChars)continue;
  const k=m.reference.source+"|"+m.reference.type;
  // A single large guidance file must not monopolize the prompt budget.
  if((byFile.get(k)||0)>=3)continue;
  chars+=size;
  selected.push(m.reference);
  byFile.set(k,(byFile.get(k)||0)+1);
 }
 return selected;
}
