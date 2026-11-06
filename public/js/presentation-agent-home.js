/** Read-only Agent Home assessment history, without evaluation actions. */
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function gst(value) {
  const date=new Date(value||"");
  if(!Number.isFinite(date.getTime()))return "Date unavailable";
  return new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Dubai",year:"numeric",month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"}).format(date);
}
export function renderAgentRecentAssessments(calls,agent){
 const records=(calls||[]).filter(c=>c.agent===agent&&c.status==="COMPLETE"&&Number.isFinite(c.score?.score))
   .sort((a,b)=>(Date.parse(b.start||b.evaluatedAt||"")||0)-(Date.parse(a.start||a.evaluatedAt||"")||0)).slice(0,8);
 const table=records.length?'<div class="table-scroll"><table><thead><tr>'+
  '<th>Interaction</th><th>Interaction date (GST)</th><th>QA Score</th><th>Coverage</th><th>Source</th><th>Action</th>'+
  '</tr></thead><tbody>'+records.map(c=>'<tr><td><b>'+esc(c.id||c.key)+'</b></td>'+
  '<td>'+esc(gst(c.start))+'</td><td><strong>'+Math.round(c.score.score)+'%</strong></td>'+
  '<td>'+(Number.isFinite(c.score.coverage)?Math.round(c.score.coverage)+"%":"—")+'</td>'+
  '<td>Saved assessment</td>'+
  '<td><button type="button" class="link" data-open="'+esc(c.key)+'">Inspect QA →</button></td></tr>').join("")+'</tbody></table></div>':
  '<div class="empty">No completed QA assessments are available for this agent in this browser. Results will appear after an authorized lead completes an assessment.</div>';
 return '<section class="panel qa-recent-agent-results"><div class="panel-heading"><div>'+
  '<span class="kicker">MY QUALITY ASSESSMENTS</span><h3>Previous-shift QA outcomes</h3>'+
  '<p class="muted">Completed assessments only · Read-only inspection</p></div></div>'+table+'</section>';
}
