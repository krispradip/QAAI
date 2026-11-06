/** Local browser-only DOCX / Markdown intake for Genesys-style transcript tables.
 * Produces the existing TSV contract; no upload to a conversion service.
 */
const WORD_NS="http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const text=v=>String(v??"").replace(/\s+/g," ").trim();
const escapeTab=v=>text(v).replace(/[\t\r\n]+/g," ");
function asExport(fields,turns) {
  if(!turns.length)throw Error("No timestamped dialogue in transcript table.");
  const f=k=>fields.get(k)||"";
  const name=f("Agent")||turns.map(t=>/^Agent\s*\((.*?)\)/i.exec(t[1])?.[1]).find(Boolean)||"Agent";
  const out=[
    "Interaction Type:\t"+(f("Interaction Type")||"Call"),
    "Interaction ID:\t"+(f("Interaction ID")||"uploaded-"+Date.now()),
    "Transcript Duration:\t"+(f("Call Duration")||""),
    "Internal Participant(s):\t"+name,
    "Transcript Start Time:\t"+(f("Call Start")||""),
    "Date/Time\tParticipant Type\tParticipant\tText"
  ];
  for(const [time,speaker,utterance] of turns){
    const role=/^(agent|advisor|internal|representative)/i.test(speaker)?"Internal":
      /^(customer|caller|external|client)/i.test(speaker)?"External":null;
    if(role&&/^(\d{1,2}:)?\d{1,2}:\d{2}$/.test(time)&&text(utterance))
      out.push([time,role,role==="Internal"?name:"Customer",escapeTab(utterance)].join("\t"));
  }
  if(out.length===6)throw Error("No recognizable agent/customer dialogue found.");
  return out.join("\n");
}
export function normalizeTranscriptText(raw) {
  const data=String(raw??"");
  const rows=data.split(/\r?\n/);
  if(!rows.some(x=>/^\|\s*(?:\*{0,2})Time(?:\*{0,2})\s*\|/i.test(x)))return data;
  const fields=new Map(),turns=[];
  let transcript=false;
  const cells=line=>line.trim().startsWith("|")&&line.trim().endsWith("|")
    ?line.trim().slice(1,-1).split(/(?<!\\)\|/).map(x=>x.trim().replace(/\*\*|__|`/g,"")):null;
  for(const line of rows){
    const c=cells(line);
    if(!c)continue;
    if(/^Time$/i.test(c[0]||"")&&/^Speaker$/i.test(c[1]||"")){transcript=true;continue;}
    if(/^:?-{3,}/.test(c[0]||""))continue;
    if(!transcript && c.length===2)fields.set(c[0],c[1]);
    else if(transcript && c.length>=3)turns.push([c[0],c[1],c.slice(2).join(" | ")]);
  }
  return turns.length?asExport(fields,turns):data;
}
async function documentXml(file) {
  const bytes=new Uint8Array(await file.arrayBuffer());
  if(bytes.length>8*1024*1024)throw Error("Word file exceeds 8 MB.");
  if(bytes.length<22)throw Error("Invalid DOCX ZIP archive.");
  const dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const u16=i=>dv.getUint16(i,true), u32=i=>dv.getUint32(i,true);
  let end=-1;
  for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){
    if(u32(i)===0x06054b50){end=i;break;}
  }
  if(end<0)throw Error("DOCX ZIP directory not found.");
  let pos=u32(end+16),entries=u16(end+10);
  for(let j=0;j<entries;j++){
    if(pos+46>bytes.length||u32(pos)!==0x02014b50)throw Error("Invalid DOCX directory.");
    const flags=u16(pos+8),method=u16(pos+10),compressed=u32(pos+20),size=u32(pos+24);
    const nameLen=u16(pos+28),extraLen=u16(pos+30),commentLen=u16(pos+32),loc=u32(pos+42);
    const name=new TextDecoder().decode(bytes.subarray(pos+46,pos+46+nameLen));
    pos+=46+nameLen+extraLen+commentLen;
    if(name!=="word/document.xml")continue;
    if(flags&1)throw Error("Encrypted Word documents are not supported.");
    if(size>24*1024*1024)throw Error("Word XML is too large.");
    if(u32(loc)!==0x04034b50)throw Error("Invalid DOCX data header.");
    const begin=loc+30+u16(loc+26)+u16(loc+28);
    if(begin+compressed>bytes.length)throw Error("Truncated DOCX XML.");
    const part=bytes.subarray(begin,begin+compressed);
    if(method===0)return new TextDecoder().decode(part);
    if(method!==8)throw Error("Unsupported DOCX compression.");
    if(typeof DecompressionStream!=="function")throw Error("Modern Chrome/Edge is required for Word upload.");
    const stream=new Blob([part]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    const out=await new Response(stream).arrayBuffer();
    if(out.byteLength>24*1024*1024)throw Error("Word XML exceeds limit.");
    return new TextDecoder().decode(out);
  }
  throw Error("Word document.xml not found.");
}
export async function readDocxTranscript(file) {
  const xml=await documentXml(file);
  const doc=new DOMParser().parseFromString(xml,"application/xml");
  if(doc.getElementsByTagName("parsererror").length)throw Error("Word XML could not be parsed.");
  const tables=[...doc.getElementsByTagNameNS(WORD_NS,"tbl")];
  const fields=new Map(),turns=[];
  for(const table of tables){
    const rows=[...table.getElementsByTagNameNS(WORD_NS,"tr")];
    const data=rows.map(row=>[...row.getElementsByTagNameNS(WORD_NS,"tc")].map(cell=>
      text([...cell.getElementsByTagNameNS(WORD_NS,"t")].map(t=>t.textContent).join(" "))));
    if(data.some(r=>/^Time$/i.test(r[0]||"")&&/^Speaker$/i.test(r[1]||"")&&/^Text$/i.test(r[2]||""))){
      for(const row of data)if(row.length>=3&&!/^Time$/i.test(row[0])&&row[2])turns.push([row[0],row[1],row.slice(2).join(" ")]);
    }else for(const row of data)if(row.length>=2&&row[0]&&row[1])fields.set(row[0],row[1]);
  }
  return asExport(fields,turns);
}
