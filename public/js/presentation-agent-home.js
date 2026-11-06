/** Agent-facing, read-only QA history. Uses existing completed records only. */
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export function renderAgentRecentAssessments(calls,agent){
 const items=[...(calls||[])].filter(c=>c.agent===agent&&c.status==="COMPLETE"&&Number.isFinite(c.score?.score))
   .sort((a,b)=>{const d=x=>Date.parse(x.start||x.evaluatedAt||"")||0;return d(b)-d(a);})
   .slice(0,8);
 const content=items.length?'<div class="table-scroll"><table><thead><tr>'+
  '<th>Interaction</th><th>Interaction date</th><th>QA score</th><th>Evidence coverage</th><th>Action</th>'+
  '</tr></thead><tbody>'+items.map(c=>'<tr><td><b>'+esc(c.id||c.key)+'</b></td>'+
  '<td>'+esc(c.start||"Date unavailable")+'</td><td><strong>'+Math.round(c.score.score)+'%</strong></td>'+
  '<td>'+(Number.isFinite(c.score?.coverage)?Math.round(c.score.coverage)+"%":"—")+'</td>'+
  '<td><button type="button" class="link" data-open="'+esc(c.key)+'">Inspect QA →</button></td></tr>').join("")+
  '</tbody></table></div>':
  '<div class="empty">No completed QA assessments are available for your account in this browser yet. Results appear after an authorized lead completes an assessment.</div>';
 return '<section class="panel qa-recent-agent-results">'+
  '<div class="panel-heading"><div><span class="kicker">MY QUALITY ASSESSMENTS</span>'+
  '<h3>Latest assessed interactions</h3><p class="muted">Review outcomes from previous shifts, where completed QA results are available.</p></div></div>'+
  content+'</section>';
}
