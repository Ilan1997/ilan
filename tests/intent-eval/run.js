#!/usr/bin/env node
// Intent-eval: user text -> MODEL Intent -> compare with expected Intent.  Manual harness (costs tokens), not part of CI.
//   --dry                         validate cases + print the system prompt
//   --mock <file.json>            replay recorded model outputs { "<caseId>": {Intent} }  (harness self-check, NOT model quality)
//   --gemini [--model M]          call Gemini directly; needs env GEMINI_API_KEY
//   --function --jwt <token>      call the deployed Supabase function maya-ai with a signed-in user's JWT
//   --only id1,id2   --out report.json   --record golden.json (save raw model outputs for later --mock)
const fs=require('fs'),path=require('path');
const {JSDOM,VirtualConsole}=require('jsdom');
const {compareIntent,summarize}=require('./compare.js');
const args=process.argv.slice(2);const has=f=>args.includes(f);const val=f=>{const i=args.indexOf(f);return i>=0?args[i+1]:null;};
const cases=JSON.parse(fs.readFileSync(path.join(__dirname,'cases.json'),'utf8')).cases;
const only=val('--only')?new Set(val('--only').split(',')):null;
const html=fs.readFileSync(path.join(__dirname,'..','..','index.html'),'utf8');
function loadApp(){return new Promise(res=>{const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',virtualConsole:new VirtualConsole(),beforeParse(w){const m={};w.storage={get:async k=>{if(!(k in m))throw new Error('nf');return{value:m[k]}},set:async(k,v)=>{m[k]=v;return{}},delete:async k=>{delete m[k];return{}}};if(!w.structuredClone)w.structuredClone=o=>JSON.parse(JSON.stringify(o));w.requestAnimationFrame=f=>setTimeout(f,0);w.HTMLElement.prototype.scrollIntoView=()=>{};w.scrollTo=()=>{};}});setTimeout(()=>res(dom.window),1500);});}
const parseJSON=t=>{t=String(t||'').trim().replace(/^```(?:json)?/i,'').replace(/```$/,'').trim();const a=t.indexOf('{'),b=t.lastIndexOf('}');return JSON.parse(a>=0?t.slice(a,b+1):t);};
let SCHEMA=null;   // AI_INTENT_SCHEMA from the app — the live runs use the SAME structured-output contract as production
async function callGemini(sys,text){
  const key=process.env.GEMINI_API_KEY;if(!key)throw new Error('GEMINI_API_KEY is not set');
  const model=val('--model')||process.env.GEMINI_MODEL||'gemini-2.5-flash';
  const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({systemInstruction:{parts:[{text:sys}]},contents:[{role:'user',parts:[{text}]}],generationConfig:{temperature:0,responseMimeType:'application/json',...(SCHEMA?{responseSchema:SCHEMA}:{})}})});
  const d=await r.json();if(!r.ok)throw new Error('gemini '+r.status+' '+JSON.stringify(d).slice(0,200));
  return d.candidates&&d.candidates[0]&&d.candidates[0].content.parts.map(p=>p.text||'').join('');
}
async function callFunction(w,sys,text){
  const jwt=val('--jwt');if(!jwt)throw new Error('--jwt <token> required');
  const cfg=w.eval('CLOUD_CONFIG');
  const r=await fetch(cfg.url+'/functions/v1/'+(cfg.aiFunction||'maya-ai'),{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+jwt,apikey:cfg.anonKey},body:JSON.stringify({system:sys,messages:[{role:'user',content:text}],mode:'intent',schema:SCHEMA,temperature:0})});
  const d=await r.json();if(!r.ok)throw new Error('function '+r.status+' '+JSON.stringify(d).slice(0,200));return d.text;
}
(async()=>{
  const w=await loadApp();
  SCHEMA=JSON.parse(w.eval('JSON.stringify(AI_INTENT_SCHEMA)'));
  const list=cases.filter(c=>!only||only.has(c.id));
  if(has('--dry')){console.log(w.buildIntentSystem(list[0].today)+'\n\n'+list.length+' cases OK');process.exit(0);}
  const mock=has('--mock')?JSON.parse(fs.readFileSync(val('--mock'),'utf8')):null;
  const results=[],raw={};
  for(const c of list){
    let out=null,err=null;
    try{
      if(mock)out=mock[c.id];
      else{const sys=w.buildIntentSystem(c.today);const t=has('--function')?await callFunction(w,sys,c.text):await callGemini(sys,c.text);raw[c.id]=t;out=parseJSON(t);}
    }catch(e){err=String(e.message||e);}
    const r=err||!out?{pass:false,checks:[{k:'call',ok:false,msg:err||'אין פלט'}],failed:[{k:'call',msg:err||'אין פלט'}]}:compareIntent(out,c.expected);
    r.id=c.id;r.text=c.text;results.push(r);
    console.log((r.pass?'PASS ':'FAIL ')+c.id+(r.pass?'':'  — '+r.failed.map(x=>x.msg).join(' | ')));
  }
  const sum=summarize(results);
  console.log('\n'+sum.pass+'/'+sum.cases+' cases passed');
  Object.keys(sum.byCheck).sort().forEach(k=>{const b=sum.byCheck[k];console.log('  '+k.padEnd(20)+b.ok+'/'+b.n);});
  if(val('--out'))fs.writeFileSync(val('--out'),JSON.stringify({summary:sum,results},null,1));
  if(val('--record'))fs.writeFileSync(val('--record'),JSON.stringify(Object.fromEntries(Object.entries(raw).map(([k,v])=>[k,parseJSON(v)])),null,1));
  process.exit(sum.pass===sum.cases?0:1);
})();
