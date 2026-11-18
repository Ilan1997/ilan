#!/usr/bin/env node
// Onboarding-eval: free-text answer -> MODEL extraction -> compare with expected facts. Manual harness (costs tokens), not part of CI.
//   --dry                         validate cases + show one prompt
//   --mock-expected               replay each case's EXPECTATION as the model output (harness self-check: must score all pass)
//   --mock <file.json>            replay recorded raw outputs { "<caseId>": {extraction} }
//   --gemini [--model M]          call Gemini directly; needs env GEMINI_API_KEY
//   --function --jwt <token>      call the deployed maya-ai function with mode "onboarding" (same schema as production)
//   --only id1,id2  --out report.json  --md report.md  --record golden.json
// Gate: any critical (invented/wrong CONSEQUENTIAL fact) → fix prompt/schema/normalizer, do not wire UI.
const fs=require('fs'),path=require('path');const {JSDOM,VirtualConsole}=require('jsdom');
const {compareExtraction,toRaw,summarize}=require('./compare.js');
const args=process.argv.slice(2);const has=f=>args.includes(f);const val=f=>{const i=args.indexOf(f);return i>=0?args[i+1]:null;};
const cases=JSON.parse(fs.readFileSync(path.join(__dirname,'cases.json'),'utf8')).cases;const only=val('--only')?new Set(val('--only').split(',')):null;
const html=fs.readFileSync(path.join(__dirname,'..','..','index.html'),'utf8');
function loadApp(){return new Promise(res=>{const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',virtualConsole:new VirtualConsole(),beforeParse(w){const m={};w.__MAYA_TEST__=true;
  w.storage={get:async k=>{if(!(k in m))throw new Error('nf');return{value:m[k]}},set:async(k,v)=>{m[k]=v;return{}},delete:async k=>{delete m[k];return{}}};w.structuredClone=o=>JSON.parse(JSON.stringify(o));w.requestAnimationFrame=f=>setTimeout(f,0);w.HTMLElement.prototype.scrollIntoView=()=>{};w.scrollTo=()=>{};}});setTimeout(()=>res(dom.window),1500);});}
let CALLS=0;const J=o=>JSON.parse(JSON.stringify(o));
const SYS='אתה מחלץ מבנה מתשובות בעברית. החזר JSON בלבד לפי הסכמה. אל תמציא.';
async function callGemini(schema,prompt){CALLS++;const key=process.env.GEMINI_API_KEY;if(!key)throw new Error('GEMINI_API_KEY is not set');const model=val('--model')||process.env.GEMINI_MODEL||'gemini-2.5-flash';
  const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({systemInstruction:{parts:[{text:SYS}]},contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{temperature:0,responseMimeType:'application/json',responseSchema:schema}})});
  const d=await r.json();if(!r.ok)throw new Error('gemini '+r.status+' '+JSON.stringify(d).slice(0,200));return d.candidates&&d.candidates[0]&&d.candidates[0].content.parts.map(p=>p.text||'').join('');}
async function callFunction(w,schema,prompt){CALLS++;const jwt=val('--jwt');if(!jwt)throw new Error('--jwt <token> required');const cfg=w.eval('CLOUD_CONFIG');
  const r=await fetch(cfg.url+'/functions/v1/'+(cfg.aiFunction||'maya-ai'),{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+jwt,apikey:cfg.anonKey},body:JSON.stringify({system:SYS,messages:[{role:'user',content:prompt}],mode:'onboarding',schema,temperature:0})});
  const d=await r.json();if(!r.ok)throw new Error('function '+r.status+' '+JSON.stringify(d).slice(0,200));return d.text;}
// mirrors onbExtractWith: one structured call, one repair retry on unparsable output
async function extract(w,schema,prompt){const t0=Date.now();let txt=null,raw=null,repaired=false;
  for(let a=0;a<2;a++){txt=has('--function')?await callFunction(w,schema,prompt+(a?'\nהתשובה הקודמת לא הייתה JSON תקין. החזר JSON בלבד.':'')):await callGemini(schema,prompt+(a?'\nהתשובה הקודמת לא הייתה JSON תקין. החזר JSON בלבד.':''));
    const p=w.parseIntentText(txt);if(p.ok){raw=J(p.raw);break;}repaired=true;}
  return{raw,txt,repaired,latencyMs:Date.now()-t0};}
(async()=>{
  const w=await loadApp();const schema=JSON.parse(w.eval('JSON.stringify(ONB_EXTRACT_SCHEMA)'));
  const list=cases.filter(c=>!only||only.has(c.id));
  const stateOf=c=>{w.__c=c;return w.eval('(()=>{const c=__c;let st=onbNew({today:c.today,calendar:c.calendar});const n=onbNormalizeExtraction({fixed:(c.ctx.fixed||[]).map(f=>({key:f.key,title:f.title,days:f.days,dayUnknown:f.dayUnknown,start:f.start?{hhmm:f.start,precision:f.startPrecision||"exact"}:undefined,end:f.end?{hhmm:f.end,precision:"exact"}:undefined,travelNeeded:f.travelNeeded}))});st.facts=onbMerge(st.facts,n);'+
    'st.current={id:c.q,kind:c.q==="f"?"followup":"main",field:c.field,text:c.question||onbRender({type:"ask_topic",data:{topic:c.q,calendar:!!c.calendar}})};return st;})()');};
  if(has('--dry')){const st=stateOf(list[0]);console.log(w.onbExtractPrompt(st,list[0].answer)+'\n\n'+list.length+' cases OK, schema '+JSON.stringify(schema).length+' chars');process.exit(0);}
  const mock=has('--mock')?JSON.parse(fs.readFileSync(val('--mock'),'utf8')):null;const record={};const results=[];
  for(const c of list){
    let raw=null,err=null,meta={latencyMs:0,repaired:false};
    try{ if(has('--mock-expected'))raw=toRaw(c);else if(mock)raw=mock[c.id];else{const st=stateOf(c);const e=await extract(w,schema,w.onbExtractPrompt(st,c.answer));raw=e.raw;meta=e;if(!raw)err='JSON לא תקין גם אחרי ניסיון תיקון';} }catch(e){err=String(e.message||e);}
    record[c.id]=raw;let r;
    if(err||!raw)r={errors:[{type:'missed_fact',severity:'major',detail:err||'אין פלט'}],severity:'major',pass:false};
    else{w.__raw=raw;w.__c=c;const st=stateOf(c);w.__st=st;
      const info=JSON.parse(w.eval('(()=>{const a=onbNormalizeExtraction(__raw);const merged=onbMerge(__st.facts,a);return JSON.stringify({actual:a,gaps:onbGaps(merged,__c.field?[__c.field]:[]).length,covered:onbCovered(merged)});})()'));
      r=compareExtraction(info.actual,c,{gaps:info.gaps,covered:info.covered});r.actual=info.actual;}
    Object.assign(r,{id:c.id,cat:c.cat,answer:c.answer,expect:c.expect,latencyMs:meta.latencyMs,repairAttempted:!!meta.repaired});results.push(r);
    console.log((r.pass?'PASS ':'FAIL['+r.severity+'] ')+c.id+(has('--mock-expected')||mock?'':' ['+meta.latencyMs+'ms]')+(r.pass?'':'  — '+r.errors.map(x=>x.type+': '+x.detail).join(' | ')));
  }
  const sum=summarize(results);const lat=results.map(r=>r.latencyMs).filter(x=>x>0).sort((a,b)=>a-b);
  sum.latency=lat.length?{p50:lat[Math.floor(lat.length*.5)],p95:lat[Math.min(lat.length-1,Math.floor(lat.length*.95))]}:null;sum.modelCalls=CALLS;sum.repairAttempts=results.filter(r=>r.repairAttempted).length;
  const byCat={};results.forEach(r=>{(byCat[r.cat]=byCat[r.cat]||{n:0,bad:0});byCat[r.cat].n++;if(!r.pass)byCat[r.cat].bad++;});sum.byCategory=byCat;
  console.log('\n'+JSON.stringify({cases:sum.cases,bySeverity:sum.bySeverity,metrics:sum.metrics,latency:sum.latency,modelCalls:sum.modelCalls},null,1));
  if(val('--out'))fs.writeFileSync(val('--out'),JSON.stringify({summary:sum,results},null,1));
  if(val('--record'))fs.writeFileSync(val('--record'),JSON.stringify(record,null,1));
  if(val('--md')){const m=sum.metrics;const L=['# Onboarding extraction eval','','| מדד | ערך |','|---|---|',...Object.entries(m).map(([k,v])=>'| '+k+' | '+v+' |'),'','**חומרה:** '+JSON.stringify(sum.bySeverity),'','**Gate:** '+(sum.bySeverity.critical?'❌ יש critical ('+sum.criticalCases.join(', ')+') — לא מתקדמים ל־UI':'✅ אין critical'),'','## כשלים',''];
    results.filter(r=>!r.pass).forEach(r=>{L.push('### '+r.id+' ['+r.severity+'] ('+r.cat+')','> '+r.answer,'',...r.errors.map(e=>'- **'+e.type+'** ('+e.severity+'): '+e.detail),'');});fs.writeFileSync(val('--md'),L.join('\n'));}
  process.exit(sum.bySeverity.critical?2:0);
})();
