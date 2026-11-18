#!/usr/bin/env node
// End-to-end onboarding: calendar context -> extraction -> conversation state -> profile -> weekly template -> PARTIAL approval -> materialized routines. No calendar write.
//   node tests/onboarding-eval/e2e.js <noam|yuval|dani> --stub                       extraction = the fixture's recorded extraction (NOT a model; shows the pipeline)
//   node tests/onboarding-eval/e2e.js <name> --function --jwt <token> | --gemini     REAL model extraction of the fixture's free-text answers
const fs=require('fs'),path=require('path');const {JSDOM,VirtualConsole}=require('jsdom');
const args=process.argv.slice(2);const has=f=>args.includes(f);const val=f=>{const i=args.indexOf(f);return i>=0?args[i+1]:null;};
const name=args.find(a=>!a.startsWith('--')&&a!==val('--jwt')&&a!==val('--model'))||'noam';
const fx=JSON.parse(fs.readFileSync(path.join(__dirname,'..','fixtures','onboarding',name+'.json'),'utf8'));
const html=fs.readFileSync(path.join(__dirname,'..','..','index.html'),'utf8');
const SYS='אתה מחלץ מבנה מתשובות בעברית. החזר JSON בלבד לפי הסכמה. אל תמציא.';
const J=o=>JSON.parse(JSON.stringify(o));
async function model(w,schema,prompt){
  if(has('--gemini')){const key=process.env.GEMINI_API_KEY;if(!key)throw new Error('GEMINI_API_KEY is not set');const m=val('--model')||process.env.GEMINI_MODEL||'gemini-2.5-flash';
    const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(m)+':generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({systemInstruction:{parts:[{text:SYS}]},contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{temperature:0,responseMimeType:'application/json',responseSchema:schema}})});
    const d=await r.json();if(!r.ok)throw new Error('gemini '+r.status);return d.candidates[0].content.parts.map(p=>p.text||'').join('');}
  const cfg=w.eval('CLOUD_CONFIG');const r=await fetch(cfg.url+'/functions/v1/'+(cfg.aiFunction||'maya-ai'),{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+val('--jwt'),apikey:cfg.anonKey},body:JSON.stringify({system:SYS,messages:[{role:'user',content:prompt}],mode:'onboarding',schema,temperature:0})});
  const d=await r.json();if(!r.ok)throw new Error('function '+r.status+' '+JSON.stringify(d).slice(0,200));return d.text;}
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',virtualConsole:new VirtualConsole(),beforeParse(w){const m={};w.__MAYA_TEST__=true;
  w.storage={get:async k=>{if(!(k in m))throw new Error('nf');return{value:m[k]}},set:async(k,v)=>{m[k]=v;return{}},delete:async k=>{delete m[k];return{}}};w.structuredClone=o=>JSON.parse(JSON.stringify(o));w.requestAnimationFrame=f=>setTimeout(f,0);w.HTMLElement.prototype.scrollIntoView=()=>{};w.scrollTo=()=>{};}});
setTimeout(async()=>{
  const w=dom.window;const schema=J(w.ONB_EXTRACT_SCHEMA||JSON.parse(w.eval('JSON.stringify(ONB_EXTRACT_SCHEMA)')));
  const live=has('--function')||has('--gemini');if(!live&&!has('--stub')){console.error('choose --stub, --function --jwt <t> or --gemini');process.exit(1);}
  console.log('═══ '+fx.name+' · extraction: '+(live?'REAL MODEL':'STUB (fixture extraction, not a model)')+' ═══\n');
  w.__fx=fx;let st=JSON.parse(w.eval('JSON.stringify(onbAdvance(onbNew({today:__fx.today,calendar:__fx.calendar}),null))'));
  if(fx.calendar)console.log('יומן → '+w.onbCalendarLine(fx.calendar)+'\n');
  let i=0;
  while(st.current&&i<fx.script.length){
    const step=fx.script[i];console.log('['+st.current.id+'] מאיה: '+st.current.text+'\n      משתמש: '+step.answer);
    w.__st=st;let raw;
    if(live){const prompt=w.eval('onbExtractPrompt(__st,'+JSON.stringify(step.answer)+')');let txt=await model(w,schema,prompt);let p=w.parseIntentText(txt);if(!p.ok){txt=await model(w,schema,prompt+'\nהתשובה הקודמת לא הייתה JSON תקין. החזר JSON בלבד.');p=w.parseIntentText(txt);}raw=p.ok?J(p.raw):{};}
    else raw=step.extraction;
    w.__raw=raw;st=JSON.parse(w.eval('JSON.stringify(onbAdvance(__st,__raw))'));i++;console.log('');}
  if(!st.done){console.log('השיחה לא הסתיימה אחרי '+i+' תשובות. השאלה הבאה: '+(st.current&&st.current.text));process.exit(3);}
  w.__st=st;const out=JSON.parse(w.eval(`(()=>{const f=onbFinish(__st);const sel=f.template.items.filter(i=>i.needsApproval);
    const keepOut=sel.filter(i=>i.status==='tentative').map(i=>i.id);
    const ap=onbApprove(f.profile,f.template,{accept:sel.filter(i=>keepOut.indexOf(i.id)<0).map(i=>i.id),reject:[]});
    const after=ap.profile,t2=onbBuildTemplate(after);
    return JSON.stringify({text:f.text,asked:__st.log,approved:ap.accepted.length,pending:ap.pending.length,calendarWrites:ap.calendarWrites.length,
      before:{routines:f.profile.routines.map(r=>r.title+' ['+r.source+']'),proposals:f.profile.proposals.map(p=>p.id+':'+p.status)},
      after:{routines:after.routines.map(r=>r.title+' ['+r.source+(r.fromProposal?' ← '+r.fromProposal:'')+']'),proposalsStillPending:after.proposals.map(p=>p.id+':'+p.status),decisions:after.decisions,boundaries:after.boundaries.map(b=>b.rule+' ['+b.source+']'),
        goals:after.workloadGoals.map(g=>g.title+' total='+g.requiredTotalMinutes+' perWeek='+g.requiredPerWeekMinutes+' trial='+g.trialAllocationMinutes+(g.trialAccepted?' (accepted)':''))},
      nextWeekItemsFromMaterialized:t2.items.filter(i=>i.origin==='proposal'&&after.routines.some(r=>r.source==='maya_proposal'&&r.id===i.routineId)).map(i=>i.title+' '+i.date+' '+i.startMin)});})()`));
  console.log('─── מאיה: אישור ───\n'+out.text+'\n');
  console.log('─── משתמש מאשר הכול חוץ מהניסויים ───');
  console.log('אושרו '+out.approved+' · ממתינים (ניסויים) '+out.pending+' · calendarWrites שהוחזרו (לא נכתבו) '+out.calendarWrites+'\n');
  console.log('─── STATE אחרי האישור ───\nroutines לפני: '+out.before.routines.join(' | ')+'\nroutines אחרי:  '+out.after.routines.join(' | ')+'\nproposals שנשארו pending: '+(out.after.proposalsStillPending.join(', ')||'—')+'\ndecisions: '+JSON.stringify(out.after.decisions)+'\nboundaries: '+(out.after.boundaries.join(' | ')||'—')+'\ngoals: '+out.after.goals.join(' | ')+'\nהשבוע הבא משתמש בשגרות שהתממשו: '+out.nextWeekItemsFromMaterialized.length+' פריטים');
  process.exit(0);},1500);
