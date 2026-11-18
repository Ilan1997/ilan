#!/usr/bin/env node
// Intent-eval: user text -> MODEL Intent -> compare with expected Intent.  Manual harness (costs tokens), not part of CI.
//   --dry                         validate cases + print the system prompt
//   --mock <file.json>            replay recorded model outputs { "<caseId>": {Intent} }  (harness self-check, NOT model quality)
//   --gemini [--model M]          call Gemini directly; needs env GEMINI_API_KEY
//   --function --jwt <token>      call the deployed Supabase function maya-ai with a signed-in user's JWT
//   --only id1,id2   --out report.json   --md report.md   --record golden.json (save raw model outputs for later --mock)
const fs=require('fs'),path=require('path');
const {JSDOM,VirtualConsole}=require('jsdom');
const {compareIntent,summarize,classifyCheck,summarizeByError,ERROR_TYPES}=require('./compare.js');
const args=process.argv.slice(2);const has=f=>args.includes(f);const val=f=>{const i=args.indexOf(f);return i>=0?args[i+1]:null;};
const cases=JSON.parse(fs.readFileSync(path.join(__dirname,'cases.json'),'utf8')).cases;
const only=val('--only')?new Set(val('--only').split(',')):null;
const html=fs.readFileSync(path.join(__dirname,'..','..','index.html'),'utf8');
function loadApp(){return new Promise(res=>{const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',virtualConsole:new VirtualConsole(),beforeParse(w){const m={};w.storage={get:async k=>{if(!(k in m))throw new Error('nf');return{value:m[k]}},set:async(k,v)=>{m[k]=v;return{}},delete:async k=>{delete m[k];return{}}};if(!w.structuredClone)w.structuredClone=o=>JSON.parse(JSON.stringify(o));w.requestAnimationFrame=f=>setTimeout(f,0);w.HTMLElement.prototype.scrollIntoView=()=>{};w.scrollTo=()=>{};}});setTimeout(()=>res(dom.window),1500);});}
const parseJSON=t=>{t=String(t||'').trim().replace(/^```(?:json)?/i,'').replace(/```$/,'').trim();const a=t.indexOf('{'),b=t.lastIndexOf('}');return JSON.parse(a>=0?t.slice(a,b+1):t);};
let SCHEMA=null;   // AI_INTENT_SCHEMA from the app — the live runs use the SAME structured-output contract as production
async function callGemini(sys,text,hist){
  const key=process.env.GEMINI_API_KEY;if(!key)throw new Error('GEMINI_API_KEY is not set');
  const model=val('--model')||process.env.GEMINI_MODEL||'gemini-2.5-flash';
  const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({systemInstruction:{parts:[{text:sys}]},contents:(hist||[{role:'user',content:text}]).map(m=>({role:m.role==='assistant'?'model':'user',parts:[{text:m.content}]})),generationConfig:{temperature:0,responseMimeType:'application/json',...(SCHEMA?{responseSchema:SCHEMA}:{})}})});
  const d=await r.json();if(!r.ok)throw new Error('gemini '+r.status+' '+JSON.stringify(d).slice(0,200));
  return d.candidates&&d.candidates[0]&&d.candidates[0].content.parts.map(p=>p.text||'').join('');
}
async function callFunction(w,sys,text,hist){
  const jwt=val('--jwt');if(!jwt)throw new Error('--jwt <token> required');
  const cfg=w.eval('CLOUD_CONFIG');
  const r=await fetch(cfg.url+'/functions/v1/'+(cfg.aiFunction||'maya-ai'),{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+jwt,apikey:cfg.anonKey},body:JSON.stringify({system:sys,messages:hist||[{role:'user',content:text}],mode:'intent',schema:SCHEMA,temperature:0})});
  const d=await r.json();if(!r.ok)throw new Error('function '+r.status+' '+JSON.stringify(d).slice(0,200));return d.text;
}

const J=o=>JSON.parse(JSON.stringify(o));
// Mirrors production (_mayaCallIntent): one structured call, ONE repair retry with the exact problems.
async function interpret(w,c){
  const sys=w.buildIntentSystem(c.today);const hist=[{role:'user',content:c.text}];const t0=Date.now();const log=[];
  for(let attempt=0;attempt<2;attempt++){
    const txt=has('--function')?await callFunction(w,sys,c.text,hist):await callGemini(sys,c.text,hist);
    const p=w.parseIntentText(txt);const probs=p.ok?J(w.intentProblems(p.raw)):['התשובה לא הייתה JSON תקין'];
    log.push({attempt:attempt+1,rawText:String(txt||'').slice(0,4000),problems:probs});
    if(!probs.length)return{out:J(p.raw),latencyMs:Date.now()-t0,repairAttempted:attempt>0,attempts:log};
    hist.push({role:'assistant',content:String(txt||'').slice(0,2000)},{role:'user',content:'התשובה לא תקינה: '+probs.join('; ')+'. החזירי JSON בלבד, לפי הפורמט.'});
  }
  return{out:null,latencyMs:Date.now()-t0,repairAttempted:true,attempts:log,failedAfterRepair:true};
}
function gapsOf(w,intent){
  try{const it=w.normalizeIntent(intent);const g=J(w.planningGaps(it,w.normalizeUserRules(null)));return{ask:g.ask.map(a=>a.field+': '+a.question),assumptions:g.assumptions.map(a=>(a.ref||'')+'.'+a.field)};}catch(e){return{ask:[],assumptions:[],error:String(e.message)};}
}
(async()=>{
  const w=await loadApp();
  SCHEMA=JSON.parse(w.eval('JSON.stringify(AI_INTENT_SCHEMA)'));
  const list=cases.filter(c=>!only||only.has(c.id));
  if(has('--dry')){console.log(w.buildIntentSystem(list[0].today)+'\n\n'+list.length+' cases OK');process.exit(0);}
  const mock=has('--mock')?JSON.parse(fs.readFileSync(val('--mock'),'utf8')):null;
  const results=[];
  for(const c of list){
    let out=null,err=null,meta={latencyMs:0,repairAttempted:false,attempts:[]};
    try{
      if(mock){out=mock[c.id];}
      else{meta=await interpret(w,c);out=meta.out;if(!out)err='JSON לא תקין גם אחרי ניסיון תיקון';}
    }catch(e){err=String(e.message||e);}
    const r=err||!out?{pass:false,checks:[{k:'call',ok:false,msg:err||'אין פלט'}],failed:[{k:'call',msg:err||'אין פלט'}]}:compareIntent(out,c.expected);
    const ga=out?gapsOf(w,out):{ask:[],assumptions:[]},ge=gapsOf(w,c.expected);
    const needsQuestion=ga.ask.length>0,expectedQuestion=ge.ask.length>0;
    if(out&&c.expected.op!=='none'){
      if(needsQuestion&&!expectedQuestion){const x={k:'question',ok:false,msg:'שאלה מיותרת: '+ga.ask[0]};r.checks.push(x);r.failed.push(x);r.pass=false;}
      else if(!needsQuestion&&expectedQuestion){const x={k:'question',ok:false,msg:'לא נשאלה שאלה שנדרשה: '+ge.ask[0]};r.checks.push(x);r.failed.push(x);r.pass=false;}
    }
    r.errors=r.failed.map(x=>({type:x.k==='question'?(x.msg.startsWith('שאלה מיותרת')?'unnecessary question':'missing question'):classifyCheck(x,out,c.expected),field:x.k,msg:x.msg}));
    Object.assign(r,{id:c.id,text:c.text,expectedIntent:c.expected,modelIntent:out,needsQuestion,expectedQuestion,questions:ga.ask,hasAssumption:ga.assumptions.length>0,assumptions:ga.assumptions,latencyMs:meta.latencyMs,repairAttempted:meta.repairAttempted,attempts:meta.attempts});
    results.push(r);
    console.log((r.pass?'PASS ':'FAIL ')+c.id+(mock?'':' ['+meta.latencyMs+'ms'+(meta.repairAttempted?', repair':'')+']')+(r.pass?'':'  — '+r.errors.map(x=>x.type+': '+x.msg).join(' | ')));
  }
  const sum=summarize(results);sum.byError=summarizeByError(results);
  const lat=results.map(r=>r.latencyMs).filter(x=>x>0).sort((a,b)=>a-b);
  sum.latency=lat.length?{p50:lat[Math.floor(lat.length*0.5)],p95:lat[Math.min(lat.length-1,Math.floor(lat.length*0.95))],max:lat[lat.length-1]}:null;
  sum.repairAttempts=results.filter(r=>r.repairAttempted).length;sum.questionsNeeded=results.filter(r=>r.needsQuestion).length;sum.withAssumption=results.filter(r=>r.hasAssumption).length;
  console.log('\n'+sum.pass+'/'+sum.cases+' cases passed');
  Object.keys(sum.byCheck).sort().forEach(k=>{const b=sum.byCheck[k];console.log('  '+k.padEnd(20)+b.ok+'/'+b.n);});
  console.log('\nשגיאות לפי סוג:');
  Object.keys(ERROR_TYPES).forEach(t=>{const b=sum.byError[t];console.log('  '+t.padEnd(26)+(b?b.n+'  ('+b.cases.join(', ')+')':'0'));});
  if(sum.latency)console.log('\nlatency p50 '+sum.latency.p50+'ms  p95 '+sum.latency.p95+'ms  max '+sum.latency.max+'ms; repair '+sum.repairAttempts+'; שאלות '+sum.questionsNeeded+'; הנחות '+sum.withAssumption);
  if(val('--out'))fs.writeFileSync(val('--out'),JSON.stringify({summary:sum,results},null,1));
  if(val('--md'))fs.writeFileSync(val('--md'),toMarkdown(sum,results));
  if(val('--record'))fs.writeFileSync(val('--record'),JSON.stringify(Object.fromEntries(results.filter(r=>r.modelIntent).map(r=>[r.id,r.modelIntent])),null,1));
  process.exit(sum.pass===sum.cases?0:1);
})();
function toMarkdown(sum,results){
  const L=['# Intent-eval — '+sum.pass+'/'+sum.cases+' עברו','','| שגיאה | מספר | מקרים |','|---|---|---|'];
  Object.keys(ERROR_TYPES).forEach(t=>{const b=sum.byError[t];L.push('| '+t+' | '+(b?b.n:0)+' | '+(b?b.cases.join(', '):'')+' |');});
  if(sum.latency)L.push('','latency p50 '+sum.latency.p50+'ms · p95 '+sum.latency.p95+'ms · max '+sum.latency.max+'ms · repair '+sum.repairAttempts+' · שאלות '+sum.questionsNeeded+' · הנחות '+sum.withAssumption);
  results.forEach(r=>{
    L.push('','## '+(r.pass?'✅':'❌')+' '+r.id,'**טקסט:** '+r.text,'','- שאלה נדרשה: '+(r.needsQuestion?'כן — '+r.questions.join('; '):'לא')+' (צפוי: '+(r.expectedQuestion?'כן':'לא')+')','- הנחה: '+(r.hasAssumption?'כן — '+r.assumptions.join(', '):'לא'),'- latency: '+r.latencyMs+'ms · repair: '+(r.repairAttempted?'כן':'לא'));
    L.push('','| שדה | תוצאה | פירוט |','|---|---|---|');r.checks.forEach(c=>L.push('| '+c.k+' | '+(c.ok?'pass':'FAIL')+' | '+(c.msg||'')+' |'));
    L.push('','צפוי: `'+JSON.stringify(r.expectedIntent)+'`','','המודל: `'+JSON.stringify(r.modelIntent)+'`');
  });
  return L.join('\n');
}
