/**
 * QA.SEMANTIC.001 - conservative, evidence-anchored phrase-equivalence pilot.
 * NOT an embedding model, sentiment classifier or general semantic inference.
 *
 * Only explicit, affirmative AGENT speech can create a MET candidate for the
 * four approved low-risk checkpoints below. No MISSED or NA is inferred.
 * Unmatched, ambiguous or externally dependent checkpoints go to the LLM.
 * A published rubric must opt in before this can affect official evaluation.
 */
const SAFE_CHECKPOINTS=Object.freeze({
  "opening-3":[
    "how may i help you", "how can i help you", "how may i assist you",
    "what can i help you with", "how can i assist you today",
    "what can i do for you today", "what would you like help with"
  ],
  "assistance-1":[
    "anything else i can help you with", "anything else i can assist you with",
    "is there anything else i can do for you",
    "any other questions i can help with", "do you need any further assistance"
  ],
  "survey-1":[
    "you will receive a survey", "you may receive a survey",
    "you will get a survey", "please complete the survey",
    "you might receive a feedback survey", "a survey after this call"
  ],
  "closing-1":[
    "thank you for calling", "thanks for calling", "have a good day",
    "have a nice day", "have a great day", "goodbye", "take care"
  ]
});
const normalize=s=>String(s||"").normalize("NFKC").toLocaleLowerCase("en").replace(/[\u064b-\u065f\u0670\u0640]/g,"").replace(/[^\p{L}\p{N}]+/gu," ").trim().replace(/\s+/g," ");
const disqualifying=/\b(?:not|never|no|don't|doesn't|didn't|can't|cannot|won't|wouldn't|shouldn't|isn't|aren't)\b/i;

/** Approved semantic library rows may extend phrases ONLY for a known safe checkpoint. */
function approvedPhrases(references,checkpointId){
  const allowed=SAFE_CHECKPOINTS[checkpointId]||[];
  const phrases=allowed.map(phrase=>({phrase,source:"QA checkpoint catalogue",version:"1"}));
  for(const ref of references||[]){
    if(ref.type!=="semantic"||ref.criterionId!==checkpointId)continue;
    const phrase=normalize(ref.phrase);
    // A short fragment such as "yes" is too ambiguous to classify safely.
    if(phrase.length<12||phrase.split(" ").length<3)continue;
    phrases.push({phrase,source:ref.source||"Approved reference",version:ref.version||1});
  }
  return phrases;
}
function turnIsInScope(turn,position,allAgent,checkpointId){
  const first=checkpointId==="opening-3";
  if(first){
    // Opening intent must be near the opening, not an unrelated later question.
    const sec=Number.isFinite(turn.seconds)?turn.seconds:null;
    return position<5 && (sec===null||sec<=90);
  }
  // Closing behaviours should appear near the end of the interaction.
  return position>=Math.max(0,allAgent.length-4);
}
/**
 * Return a map of criterion ID -> recognized evidence-anchored checkpoints.
 * Matching alone never establishes that an entire criterion should pass.
 */
export function recognizeSemanticCheckpoints(call,criteria,references=[]){
  const result=new Map();
  const agent=(call?.turns||[]).filter(t=>String(t.speaker||"").toLowerCase()==="agent");
  for(const criterion of criteria||[]){
    const matches=[];
    for(const check of criterion.checkpoints||[]){
      if(check.enabled===false||!Object.hasOwn(SAFE_CHECKPOINTS,check.id))continue;
      const phraseOptions=approvedPhrases(references,check.id);
      for(const [position,turn] of agent.entries()){
        if(!turnIsInScope(turn,position,agent,check.id))continue;
        if(!Number.isFinite(turn.line)||turn.line<1||!String(turn.text||"").trim())continue;
        if(disqualifying.test(turn.text))continue;
        const normalized=normalize(turn.text);
        const match=phraseOptions.find(p=>{
          const phrase=normalize(p.phrase);
          return normalized===phrase||normalized.startsWith(phrase+" ")||
            normalized.endsWith(" "+phrase)||normalized.includes(" "+phrase+" ");
        });
        if(!match)continue;
        matches.push({
          id:check.id,text:check.text,state:"MET",method:"semantic-equivalence",
          reason:"Directly observed approved phrase-equivalent behaviour",
          evidence:[{line:turn.line,quote:turn.text}],
          validation:{status:"PHRASE_VERIFIED",source:match.source,version:match.version}
        });
        break;
      }
    }
    if(matches.length)result.set(criterion.id,matches);
  }
  return result;
}
/** Only unresolved enabled checks need model reasoning; no implicit passes. */
export function unresolvedModelCriteria(criteria,recognized){
  return (criteria||[]).map(c=>({
    ...c,checkpoints:(c.checkpoints||[]).filter(a=>
      a.enabled!==false&&!(recognized.get(c.id)||[]).some(b=>b.id===a.id))
  })).filter(c=>c.checkpoints.length);
}
