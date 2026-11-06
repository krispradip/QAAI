/**
 * Normalizes Word/Outlook clipboard tables for the existing Genesys TSV parser.
 * Does not use any external conversion service or inject clipboard HTML.
 */
const tidy = value => String(value ?? "").replace(/\s+/g," ").trim();
const TIME = /^(?:\d{1,2}:)?\d{1,2}:\d{2}(?:\.\d+)?$/;
const ROLE = /^(agent|advisor|representative|internal|customer|caller|client|external)\b/i;
const META = new Set(["Interaction Type","Interaction ID","Call Duration","Transcript Duration","Call Start","Transcript Start Time","Agent","Internal Participant(s)"]);
function convert(rows) {
  const meta=new Map(), dialogues=[]; let started=false;
  for(const row of rows) {
    const c=row.map(tidy);
    if(c.length>=3 && /^Time$/i.test(c[0]) && /^Speaker$/i.test(c[1])) {started=true;continue;}
    if(/^:?-{3,}/.test(c[0]||""))continue;
    if(c.length>=3 && TIME.test(c[0]) && ROLE.test(c[1])) {
      dialogues.push([c[0],c[1],c.slice(2).join(" ")]);
      started=true;continue;
    }
    if(!started && c.length>=2 && META.has(c[0])) meta.set(c[0],c.slice(1).join(" "));
  }
  if(!dialogues.length)return null;
  const agent=meta.get("Agent")||meta.get("Internal Participant(s)")||
    dialogues.map(c=>/^Agent\s*\(([^)]+)\)/i.exec(c[1])?.[1]).find(Boolean)||"Unidentified agent";
  const lines=[
    "Interaction Type:\t"+(meta.get("Interaction Type")||"Call"),
    "Interaction ID:\t"+(meta.get("Interaction ID")||"paste-"+Date.now()),
    "Transcript Duration:\t"+(meta.get("Call Duration")||meta.get("Transcript Duration")||""),
    "Internal Participant(s):\t"+agent,
    "Transcript Start Time:\t"+(meta.get("Call Start")||meta.get("Transcript Start Time")||""),
    "Date/Time\tParticipant Type\tParticipant\tText"
  ];
  for(const [stamp,actor,words] of dialogues) {
    const internal=/^(agent|advisor|representative|internal)\b/i.test(actor);
    lines.push([stamp,internal?"Internal":"External",internal?agent:"Customer",words].join("\t"));
  }
  return lines.join("\n");
}
function plainRows(value) {
  const data=String(value??"");
  const all=data.split(/\r?\n/);
  const pipe=all.filter(l=>l.trim().startsWith("|") && l.trim().endsWith("|"));
  if(pipe.some(l=>/^\|\s*(?:\*{0,2})Time(?:\*{0,2})\s*\|/i.test(l))) {
    return pipe.map(l=>l.trim().slice(1,-1).split(/(?<!\\)\|/).map(x=>x.replace(/\*\*/g,"")));
  }
  const tsv=all.filter(l=>l.includes("\t"));
  if(tsv.length>=3) return tsv.map(l=>l.split("\t"));
  const fields=[],dialogues=[];let n=0;const lines=all.map(tidy).filter(Boolean);
  while(n<lines.length) {
    if(META.has(lines[n]) && lines[n+1]){fields.push([lines[n],lines[n+1]]);n+=2;continue;}
    const match=/^([^:]{3,35}):\s*(.+)$/.exec(lines[n]);
    if(match && META.has(match[1])){fields.push([match[1],match[2]]);n++;continue;}
    if(/^Time$/i.test(lines[n]) && /^Speaker$/i.test(lines[n+1]||"")){n+=3;continue;}
    if(TIME.test(lines[n]) && ROLE.test(lines[n+1]||"")) {
      const time=lines[n++],who=lines[n++],text=[];
      while(n<lines.length && !(TIME.test(lines[n]) && ROLE.test(lines[n+1]||"")))text.push(lines[n++]);
      if(text.length)dialogues.push([time,who,text.join(" ")]);
      continue;
    }
    n++;
  }
  return [...fields,...dialogues];
}
export function normalizeClipboardPlain(plain) {
  const data=String(plain??"");
  if(/Date\/Time\s*\t\s*Participant Type\s*\t/i.test(data))return data;
  return convert(plainRows(data))||data;
}
export function normalizeClipboardHTML(plain,html) {
  if(!html || !/<table[\s>]/i.test(html) || typeof DOMParser!=="function")
    return normalizeClipboardPlain(plain);
  try{
    const doc=new DOMParser().parseFromString(html,"text/html");
    const rows=[...doc.querySelectorAll("table tr")].map(tr=>
      [...tr.children].filter(cell=>/^(td|th)$/i.test(cell.tagName))
        .map(cell=>tidy(cell.textContent)));
    return convert(rows)||normalizeClipboardPlain(plain);
  }catch {return normalizeClipboardPlain(plain);}
}
