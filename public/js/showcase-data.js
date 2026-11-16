/**
 * MAFerLens SHOWCASE ONLY.
 * Isolated, synthetic sample dialogue shaped for the existing UI renderers.
 * Agent display names and Awad Osman's 50% result/closing coaching come from
 * user-supplied demo screenshots. No AI calls, customer records or DB writes.
 */
const AGENTS=[
  ["Mariam Hithem Ibrahim Mahmoud",2,null],["Mariam Khaled",1,null],
  ["Farah Mohamed7",1,null],["Shahenda Azzam Abdelghany Mohamed",2,100],
  ["Marawan Mohamed Refaat Saeed",1,100],["Youssef Mohamed8",1,100],
  ["Anfal Mohamed",2,null],["Awad Osman",1,50],["Hassan Aly1",1,100]
];
const safeText=[
  ["agent","Thank you for calling SHARE. How can I help you today?"],
  ["customer","I have a question about my SHARE points."],
  ["agent","I can help explain the general process."],
  ["customer","Could you clarify the next steps?"],
  ["agent","Please check your transaction details in the SHARE app."],
  ["customer","All right, thank you."],
  ["agent","Thank you for contacting SHARE."],
];
function demoTurns(){return safeText.map(([speaker,text],i)=>({
  line:i+1,speaker,text,timestamp:"00:"+String(i*9).padStart(2,"0")
}));}
function findingsFor(rubric,awad){
  return (rubric.criteria||[]).filter(c=>c.enabled!==false).map((c,j)=>{
    const missed=awad&&c.id==="assistance";
    const snippets=demoTurns();
    const anchors=(c.checkpoints||[]).filter(a=>a.enabled!==false).map((a,k)=>{
      const closing=missed;
      return {
        id:a.id,text:a.text,method:"qualitative",state:closing?"MISSED":"MET",
        evidence:[{line:closing?7:1,quote:snippets[closing?6:0].text}]
      };
    });
    if(missed && !anchors.length)anchors.push(
      {id:"showcase-assistance-1",text:"Offers further help at the appropriate closing",
       method:"qualitative",state:"MISSED",
       evidence:[{line:7,quote:snippets[6].text}]},
      {id:"showcase-assistance-2",text:"Allows the customer opportunity to raise another need",
       method:"qualitative",state:"MISSED",
       evidence:[{line:7,quote:snippets[6].text}]}
    );
    return {
      id:c.id,score:missed?0:100,status:"SCORED",coverage:100,
      reason:missed
        ?"The agent did not offer further assistance or allow the customer to raise another need before closing."
        :"Showcase illustration — sample dialogue, not a verified production assessment.",
      anchors
    };
  });
}
export function makeShowcaseCalls(rubric){
  const now=new Date(),items=[];
  let n=0;
  for(const [name,count,rated] of AGENTS)for(let j=0;j<count;j++){
    const awad=name==="Awad Osman";
    const d=new Date(now.getTime()-(n%6)*86400000-3600000);
    const id="SHOWCASE-INT-"+String(++n).padStart(3,"0");
    items.push({
      key:"maferlens-showcase:"+id,id,agent:name,
      businessUnit:"SHARE",language:awad?"ENG":(n%3===0?"AR":"ENG"),
      source:"maferlens-showcase-only",sampleData:true,
      start:d.toISOString(),duration:"05:"+String(12+n).padStart(2,"0"),
      turns:demoTurns(),status:"COMPLETE",findings:findingsFor(rubric,awad),
      score:{score:rated,observedScore:rated??100,coverage:awad?100:(n%5===0?92:100)},
      ruleAssessment:{observedScore:100,coverage:100},
      meta:{rubricRevision:rubric.revision,criteria:rubric.criteria},
      referenceAudit:{revision:6,files:[]},
      aiTelemetry:{totalTokens:null},
      evaluatedAt:d.toISOString()
    });
  }
  return items;
}
export function makeShowcaseReferences(){
  const types=[
    ["phonetic","SHARE phonetic variations.csv",{canonical:"SHARE",variant:"Shair",language:"en",businessUnit:"SHARE"}],
    ["semantic","Service-language equivalents.csv",{concept:"Further assistance",phrase:"Anything else I can help with?",language:"en",businessUnit:"SHARE"}],
    ["terminology","SHARE business terminology.csv",{term:"SHARE Points",meaning:"Reward points in the SHARE programme",language:"en",businessUnit:"SHARE"}],
    ["guidance","Closing evaluation guidance.csv",{criterionId:"assistance",exampleType:"negative",example:"Closing without offering any further help",evaluationRule:"Check the full closing dialogue",scope:"closing",language:"en",businessUnit:"SHARE"}]
  ];
  return {version:1,revision:6,datasets:types.map(([type,name,row],i)=>({
    id:"mafer-showcase-ref-"+(i+1),name,type,enabled:true,version:1,
    uploadedAt:"2026-11-09T00:00:00.000Z",rows:[row]
  }))};
}
export const AWAD_COACHING={
 agent:"Awad Osman",score:50,criterion:"Further assistance",
 missed:[
  "Offers further help at the appropriate closing",
  "Allows the customer opportunity to raise another need"
 ],
 recommendation:"Practise explicitly offering further assistance before closing and allowing the customer time to raise another request."
};