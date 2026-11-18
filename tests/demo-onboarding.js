#!/usr/bin/env node
// Demo: one full onboarding conversation (default: yuval), model stubbed with the fixture's extraction. No UI, nothing written anywhere.
// Usage: node tests/demo-onboarding.js [noam|yuval|dani]
const fs=require('fs'),path=require('path');const {JSDOM,VirtualConsole}=require('jsdom');
const name=process.argv[2]||'yuval';const root=path.join(__dirname,'..');
const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',virtualConsole:new VirtualConsole(),beforeParse(w){w.__MAYA_TEST__=true;const m={};
  w.storage={get:async k=>{if(!(k in m))throw new Error('nf');return{value:m[k]}},set:async(k,v)=>{m[k]=v;return{}},delete:async k=>{delete m[k];return{}}};w.structuredClone=o=>JSON.parse(JSON.stringify(o));w.requestAnimationFrame=f=>setTimeout(f,0);w.HTMLElement.prototype.scrollIntoView=()=>{};w.scrollTo=()=>{};}});
setTimeout(async()=>{
  const w=dom.window;w.__FX__=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures','onboarding',name+'.json'),'utf8'));
  w.eval(fs.readFileSync(path.join(__dirname,'onboarding.driver.js'),'utf8'));
  const out=await w.eval(`(async()=>{
    const fx=__FX__;const L=[];const P=t=>L.push(t);
    const r=await onbPlay(fx);const {profile,template,text}=r.fin;
    P('═══ '+fx.name+' ═══');P('היום: '+fx.today+' · יומן '+(fx.calendar?'מחובר ('+fx.calendar.length+' אירועים)':'לא מחובר'));P('');
    P('מאיה: '+ONB_OPENING);if(fx.calendar)P('מאיה: '+onbCalendarLine(onbNew({today:fx.today,calendar:fx.calendar}).calendar));P('');
    r.asked.forEach((a,i)=>{P('['+(a.kind==='main'?'שאלה '+a.id.slice(1):'follow-up')+'] מאיה: '+a.text);P('        משתמש: '+a.answer);P('');});
    P('שאלות ראשיות: '+r.asked.filter(a=>a.kind==='main').length+' · follow-ups: '+r.asked.filter(a=>a.kind==='followup').length+' · דולגו: '+ONB_ORDER.filter(q=>!r.asked.some(a=>a.id===q)).join(',')+'\\n');
    P('─── OnboardingProfile (תמצית) ───');
    P('minimumViableWeek: '+JSON.stringify(profile.minimumViableWeek));
    P('fixedConstraints (user_said): '+profile.fixedConstraints.filter(f=>f.origin==='user_said').map(f=>f.title+' ['+f.days+'] start='+JSON.stringify(f.start)+(f.travelBefore?' travel='+JSON.stringify(f.travelBefore):'')).join(' | '));
    P('availability: '+profile.availability.map(a=>a.source+':'+JSON.stringify(a.rule)).join(' | '));
    P('routines (user fact): '+profile.routines.map(x=>x.title).join(', '));
    P('proposals (pending, לא routines): '+profile.proposals.map(x=>x.id+' '+x.status+(x.trial?' [trial]':'')).join(', '));
    P('holds: '+(profile.holds.length?profile.holds.map(h=>_fmtMin(h.from)+'–'+_fmtMin(h.to)+' derivedFrom='+h.derivedFrom).join(' | '):'—'));
    P('guards: '+(profile.guards.length?profile.guards.map(g=>g.kind+' '+_fmtMin(g.min)+' ('+g.source+')').join(' | '):'—'));
    P('assumptions (כולן low): '+profile.assumptions.map(a=>a.field+(a.ref?'/'+a.ref:'')+'='+a.value).join(', '));
    P('unknowns: '+profile.unknowns.map(u=>u.field+' ['+u.planningImpact+'/'+u.handling+']').join(', '));
    P('');P('─── מאיה: אישור ───');P(text);P('');
    const sel=template.items.filter(i=>i.needsApproval);const skip=sel.filter(i=>i.status==='tentative').map(i=>i.id);
    const ap=onbApprove(profile,template,{accept:sel.filter(i=>skip.indexOf(i.id)<0).map(i=>i.id),reject:[]});
    P('─── המשתמש מאשר הכול חוץ מהניסויים ───');
    P('אושרו '+ap.accepted.length+' · ממתינים (ניסויים) '+ap.pending.length+' · נדחו '+ap.rejected.length+' · קיים ביומן ולא נגע בו: '+template.items.filter(i=>i.origin==='calendar').length+' · holds שהוצגו בלי אישור: '+template.items.filter(i=>i.origin==='hold').length);
    P('calendarWrites (מוחזרים, לא נכתבים): '+ap.calendarWrites.length);
    P('proposals אחרי האישור: '+ap.profile.proposals.map(p=>p.id+'='+p.status).join(', ')+' · routines חדשות מהצעות: '+(ap.profile.routines.filter(r=>r.source==='accepted_proposal').map(r=>r.title).join(', ')||'אין'));
    return L.join('\\n');})()`);
  console.log(out);process.exit(0);},1500);
