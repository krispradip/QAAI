/** Personal presentation usage ledger: browser-local; no transcripts, prompts or secrets. */
const KEY="qaai-gemini-usage-v1";
export const usageDate = v => new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Dubai",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(v));
export function readUsage() {
  try { const x=JSON.parse(localStorage.getItem(KEY)||"[]"); return Array.isArray(x)?x:[]; }
  catch {return [];}
}
export function saveUsage(record) {
  const records=readUsage();
  const i=records.findIndex(x=>x.id===record.id);
  if(i>=0)records[i]=record;else records.push(record);
  try {localStorage.setItem(KEY,JSON.stringify(records.slice(-1000)));}
  catch { /* A full browser quota cannot interrupt QA evaluation. */ }
}
export function dailyUsage(records=readUsage()){
  const map=new Map();
  for(const r of records){
    if(!r.startedAt)continue;
    const day=usageDate(r.startedAt);
    const v=map.get(day)||{day,attempts:0,completed:0,failed:0,rateLimits:0,requests:0,inputTokens:0,outputTokens:0,totalTokens:0,unknownUsage:0};
    v.attempts++;
    if(r.status==="COMPLETE")v.completed++;else if(r.status==="ERROR")v.failed++;
    const trace=r.aiTelemetry||{};
    const requests=Array.isArray(trace.requests)?trace.requests:[];
    v.requests+=requests.length;
    v.rateLimits+=requests.filter(x=>x.httpStatus===429).length;
    if(Number.isFinite(trace.totalTokens)){
      v.inputTokens+=Number(trace.inputTokens)||0;
      v.outputTokens+=Number(trace.outputTokens)||0;
      v.totalTokens+=trace.totalTokens;
    }else if(requests.length) v.unknownUsage++;
    map.set(day,v);
  }
  return [...map.values()].sort((a,b)=>b.day.localeCompare(a.day));
}
export function exportUsageCsv(records=readUsage()){
  const q=v=>'"'+String(v??"").replaceAll('"','""').replace(/^[=+@-]/,"'$&")+'"';
  const head=["Date GST","Started UTC","Interaction","Model","Status","Failed stage","Input tokens","Output tokens","Reported total","Requests","429 events"];
  const rows=records.map(r=>{
    const t=r.aiTelemetry||{};const req=t.requests||[];
    return [usageDate(r.startedAt),r.startedAt,r.interactionId,r.model,r.status,t.failedStage||"",t.inputTokens,t.outputTokens,t.totalTokens,req.length,req.filter(x=>x.httpStatus===429).length];
  });
  return [head,...rows].map(a=>a.map(q).join(",")).join("\r\n");
}
