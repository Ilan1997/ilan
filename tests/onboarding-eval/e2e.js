#!/usr/bin/env node
// End-to-end onboarding: calendar context -> extraction -> conversation state -> profile -> weekly template -> PARTIAL approval -> materialized routines. No calendar write.
//   node tests/onboarding-eval/e2e.js <noam|yuval|dani> --stub                       extraction = the fixture's recorded extraction (NOT a model; shows the pipeline)
//   node tests/onboarding-eval/e2e.js <name> --function --jwt <token> | --gemini     REAL model extraction of the fixture's free-text answers
//   ... --trace t.json        save every step (question, answer, prompt, raw model text, parsed raw, model, latency) — written after each step
//   node tests/onboarding-eval/e2e.js <name> --replay t.json   re-run the pipeline on a recorded trace's raw outputs (no model call, free) — reproduce/verify fixes
const fs=require('fs'),path=require('path');const {JSDOM,VirtualConsole}=require('jsdom');
const args=process.argv.slice(2);const has=f=>args.includes(f);const val=f=>{const i=args.indexOf(f);return i>=0?args[i+1]:null;};
const VALUED=['--jwt','--model','--trace','--replay'].map(val).filter(Boolean);
const name=args.find(a=>!a.startsWith('--')&&!VALUED.includes(a))||'noam';
const tracePath=val('--trace'),replay=val('--replay')?JSON.parse(fs.readFileSync(val('--replay'),'utf8')):null;
if(replay&&replay.fixture&&replay.fixture!==name){console.error('ה־trace שייך ל־'+replay.fixture+', לא ל־'+name);process.exit(1);}
const trace={fixture:name,mode:null,build:null,startedAt:new Date().toISOString(),steps:[]};
const saveTrace=()=>{if(tracePath)fs.writeFileSync(tracePath,JSON.stringify(trace,null,1));};
const fx=JSON.parse(fs.readFileSync(path.join(__dirname,'..','fixtures','onboarding',name+'.json'),'utf8'));
const html=fs.readFileSync(path.join(__dirname,'..','..','index.html'),'utf8');
const SYS='אתה מחלץ מבנה מתשובות בעברית. החזר JSON בלבד לפי הסכמה. אל תמציא.';
const J=o=>JSON.parse(JSON.stringify(o));
// returns {text, model}; transient upstream trouble (429/5xx) is retried with a pause, like run.js
async function model(w,schema,prompt){
  if(has('--gemini')){const key=process.env.GEMINI_API_KEY;if(!key)throw new Error('GEMINI_API_KEY is not set');const m=val('--model')||process.env.GEMINI_MODEL||'gemini-2.5-flash';
    const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(m)+':generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({systemInstruction:{parts:[{text:SYS}]},contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{temperature:0,responseMimeType:'application/json',responseSchema:schema}})});
    const d=await r.json();if(!r.ok)throw new Error('gemini '+r.status);return{text:d.candidates[0].content.parts.map(p=>p.text||'').join(''),model:m};}
  if(!val('--jwt'))throw new Error('--jwt <token> required');
  const cfg=w.eval('CLOUD_CONFIG');let r,d;
  for(let a=0;a<3;a++){r=await fetch(cfg.url+'/functions/v1/'+(cfg.aiFunction||'maya-ai'),{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+val('--jwt'),apikey:cfg.anonKey},body:JSON.stringify({system:SYS,messages:[{role:'user',content:prompt}],mode:'onboarding',schema,temperature:0})});
    d=await r.json().catch(()=>({}));if(r.ok||!(r.status===429||r.status>=500))break;await new Promise(f=>setTimeout(f,3000*(a+1)));}
  if(!r.ok)throw new Error('function '+r.status+' '+JSON.stringify(d).slice(0,200));
  await new Promise(f=>setTimeout(f,Number(val('--delay')||800)));return{text:d.text,model:d.model||null};}
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',virtualConsole:new VirtualConsole(),beforeParse(w){const m={};w.__MAYA_TEST__=true;
  w.storage={get:async k=>{if(!(k in m))throw new Error('nf');return{value:m[k]}},set:async(k,v)=>{m[k]=v;return{}},delete:async k=>{delete m[k];return{}}};w.structuredClone=o=>JSON.parse(JSON.stringify(o));w.requestAnimationFrame=f=>setTimeout(f,0);w.HTMLElement.prototype.scrollIntoView=()=>{};w.scrollTo=()=>{};}});
setTimeout(async()=>{
  const w=dom.window;const schema=J(w.ONB_EXTRACT_SCHEMA||JSON.parse(w.eval('JSON.stringify(ONB_EXTRACT_SCHEMA)')));
  const live=has('--function')||has('--gemini');if(!live&&!has('--stub')&&!replay){console.error('choose --stub, --replay <trace.json>, --function --jwt <t> or --gemini');process.exit(1);}
  if(replay&&live){console.error('--replay לא משלב עם --function/--gemini');process.exit(1);}
  trace.mode=replay?'replay':has('--function')?'function':has('--gemini')?'gemini':'stub';trace.build=w.eval('APP_BUILD');
  console.log('═══ '+fx.name+' · extraction: '+(replay?'REPLAY of '+val('--replay')+' (recorded '+(replay.mode||'?')+' output, build '+(replay.build||'?')+' → now '+trace.build+')':live?'REAL MODEL':'STUB (fixture extraction, not a model)')+' ═══\n');
  w.__fx=fx;let st=JSON.parse(w.eval('JSON.stringify(onbAdvance(onbNew({today:__fx.today,calendar:__fx.calendar}),null))'));
  if(fx.calendar)console.log('יומן → '+w.onbCalendarLine(fx.calendar)+'\n');
  let i=0;
  try{
  while(st.current&&i<fx.script.length){
    const step=fx.script[i];console.log('['+st.current.id+'] מאיה: '+st.current.text+'\n      משתמש: '+step.answer);
    w.__st=st;let raw;const rec={i,qid:st.current.id,question:st.current.text,answer:step.answer};
    if(replay){const rs=replay.steps&&replay.steps[i];
      if(!rs){console.error('ב־trace אין צעד '+i+' — השיחה הנוכחית ארוכה יותר מזו שהוקלטה');process.exit(4);}
      if(rs.answer!==step.answer)console.log('      ⚠ התשובה בפיקסצ\'ר שונה מזו שב־trace');
      if(rs.qid!==rec.qid)console.log('      ⚠ השאלה השתנתה מאז ההקלטה ('+rs.qid+' → '+rec.qid+'): משמיעים את הפלט שהוקלט לתשובה הזו');
      raw=rs.raw||{};rec.model=rs.model;}
    else if(live){const prompt=w.eval('onbExtractPrompt(__st,'+JSON.stringify(step.answer)+')');const t0=Date.now();
      let res=await model(w,schema,prompt);let p=w.parseIntentText(res.text);rec.repaired=false;
      if(!p.ok){rec.firstText=res.text;rec.repaired=true;res=await model(w,schema,prompt+'\nהתשובה הקודמת לא הייתה JSON תקין. החזר JSON בלבד.');p=w.parseIntentText(res.text);}
      raw=p.ok?J(p.raw):{};Object.assign(rec,{prompt,text:res.text,model:res.model,parsed:!!p.ok,latencyMs:Date.now()-t0});
      console.log('      ['+(res.model||'?')+' · '+rec.latencyMs+'ms'+(rec.repaired?' · repair':'')+(p.ok?'':' · ⚠ JSON לא תקין גם אחרי תיקון')+']');}
    else raw=step.extraction;
    rec.raw=raw;w.__raw=raw;w.__meta={answer:step.answer};st=JSON.parse(w.eval('JSON.stringify(onbAdvance(__st,__raw,__meta))'));
    rec.next=st.current?st.current.id:null;trace.steps.push(rec);saveTrace();i++;console.log('');}
  }catch(e){trace.error=String(e.message||e);saveTrace();console.error('\nנעצר בצעד '+i+': '+trace.error+(tracePath?'\nה־trace עד כאן נשמר ב־'+tracePath:''));process.exit(2);}
  if(!st.done){trace.result={done:false,stoppedAfter:i,next:st.current&&st.current.text};saveTrace();console.log('השיחה לא הסתיימה אחרי '+i+' תשובות. השאלה הבאה: '+(st.current&&st.current.text));process.exit(3);}
  w.__st=st;const out=JSON.parse(w.eval(`(()=>{const f=onbFinish(__st);const sel=f.template.items.filter(i=>i.needsApproval);
    const keepOut=sel.filter(i=>i.status==='tentative').map(i=>i.id);
    const ap=onbApprove(f.profile,f.template,{accept:sel.filter(i=>keepOut.indexOf(i.id)<0).map(i=>i.id),reject:[]});
    const after=ap.profile,t2=onbBuildTemplate(after);
    return JSON.stringify({text:f.text,asked:__st.log,approved:ap.accepted.length,pending:ap.pending.length,calendarWrites:ap.calendarWrites.length,
      before:{routines:f.profile.routines.map(r=>r.title+' ['+r.source+']'),proposals:f.profile.proposals.map(p=>p.id+':'+p.status)},
      after:{routines:after.routines.map(r=>r.title+' ['+r.source+(r.fromProposal?' ← '+r.fromProposal:'')+']'),proposalsStillPending:after.proposals.map(p=>p.id+':'+p.status),decisions:after.decisions,boundaries:after.boundaries.map(b=>b.rule+' ['+b.source+']'),
        goals:after.workloadGoals.map(g=>g.title+' total='+g.requiredTotalMinutes+' perWeek='+g.requiredPerWeekMinutes+' trial='+g.trialAllocationMinutes+(g.trialAccepted?' (accepted)':''))},
      nextWeekItemsFromMaterialized:t2.items.filter(i=>i.origin==='proposal'&&after.routines.some(r=>r.source==='maya_proposal'&&r.id===i.routineId)).map(i=>i.title+' '+i.date+' '+i.startMin)});})()`));
  trace.result=Object.assign({done:true},out);saveTrace();
  console.log('─── מאיה: אישור ───\n'+out.text+'\n');
  console.log('─── משתמש מאשר הכול חוץ מהניסויים ───');
  console.log('אושרו '+out.approved+' · ממתינים (ניסויים) '+out.pending+' · calendarWrites שהוחזרו (לא נכתבו) '+out.calendarWrites+'\n');
  console.log('─── STATE אחרי האישור ───\nroutines לפני: '+out.before.routines.join(' | ')+'\nroutines אחרי:  '+out.after.routines.join(' | ')+'\nproposals שנשארו pending: '+(out.after.proposalsStillPending.join(', ')||'—')+'\ndecisions: '+JSON.stringify(out.after.decisions)+'\nboundaries: '+(out.after.boundaries.join(' | ')||'—')+'\ngoals: '+out.after.goals.join(' | ')+'\nהשבוע הבא משתמש בשגרות שהתממשו: '+out.nextWeekItemsFromMaterialized.length+' פריטים');
  if(tracePath)console.log('\ntrace נשמר ב־'+tracePath+' · שחזור חינמי: node tests/onboarding-eval/e2e.js '+name+' --replay '+tracePath);
  process.exit(0);},1500);
