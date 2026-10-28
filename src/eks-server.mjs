import {createServer} from "node:http";
import {readFile,stat} from "node:fs/promises";
import {resolve,extname,sep} from "node:path";
import {fileURLToPath} from "node:url";
import worker from "./worker.js";
import {resolveRuntimeEnv} from "./runtime-env.js";

const root=resolve(fileURLToPath(new URL("../public/",import.meta.url)));
const types={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".ico":"image/x-icon",".webp":"image/webp",".woff2":"font/woff2"};
const limit=230000;
function originAllowed(value) {
  if (!value) return true;
  return String(process.env.QA_ALLOWED_ORIGINS||"").split(",").map(s=>s.trim()).includes(value);
}
function write(res,status,body,headers={}) {
  res.writeHead(status,{"cache-control":"no-store","x-content-type-options":"nosniff",...headers});
  res.end(body);
}
async function serve(req,res,path) {
  if(req.method!=="GET"&&req.method!=="HEAD") return write(res,405,"Method not allowed");
  let decoded;
  try{decoded=decodeURIComponent(path)}catch{return write(res,400,"Invalid path")}
  if(decoded.includes("\0")||decoded.includes("\\")||decoded.split("/").includes(".."))return write(res,403,"Forbidden");
  let target=resolve(root,"."+decoded);
  if(target===root||decoded.endsWith("/"))target=resolve(target,"index.html");
  if(target!==root&&!target.startsWith(root+sep))return write(res,403,"Forbidden");
  try {
    const fileStat=await stat(target);
    if(!fileStat.isFile())return write(res,404,"Not found");
    const bytes=await readFile(target);
    write(res,200,req.method==="HEAD"?"":bytes,{"content-type":types[extname(target)]||"application/octet-stream"});
  } catch {write(res,404,"Not found")}
}
export function createAppServer() {
  return createServer(async(req,res)=>{
    try{
      const base="http://localhost";
      const url=new URL(req.url||"/",base);
      if(!url.pathname.startsWith("/api/"))return serve(req,res,url.pathname);
      if(!originAllowed(req.headers.origin))return write(res,403,JSON.stringify({error:"Origin not allowed"}),{"content-type":"application/json"});
      if(!["GET","POST"].includes(req.method))return write(res,405,JSON.stringify({error:"Method not allowed"}),{"content-type":"application/json"});
      const chunks=[];let size=0;
      for await(const chunk of req){
        size+=chunk.length;
        if(size>limit)return write(res,413,JSON.stringify({error:"Payload exceeds 230 KB"}),{"content-type":"application/json"});
        chunks.push(chunk);
      }
      let env;
      try{env=resolveRuntimeEnv()}catch{return write(res,503,JSON.stringify({error:"Enterprise AI credential unavailable"}),{"content-type":"application/json"})}
      const headers=new Headers();
      if(req.headers["content-type"])headers.set("content-type",req.headers["content-type"]);
      const request=new Request("https://qamaferai.dev.grid2.maf.ae"+url.pathname+url.search,{method:req.method,headers,...(req.method==="POST"?{body:Buffer.concat(chunks)}:{})});
      const response=await worker.fetch(request,env);
      const body=Buffer.from(await response.arrayBuffer());
      write(res,response.status,body,{"content-type":response.headers.get("content-type")||"application/json"});
    }catch{write(res,500,JSON.stringify({error:"Internal server error"}),{"content-type":"application/json"})}
  });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const port=Number(process.env.PORT||8080);
  const server=createAppServer();
  server.listen(port,"0.0.0.0",()=>console.log("QA.MAFer.AI listening on "+port));
  const shutdown=()=>server.close(()=>process.exit(0));
  process.on("SIGTERM",shutdown);
  process.on("SIGINT",shutdown);
}
