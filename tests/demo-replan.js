#!/usr/bin/env node
// Demo (step E): "the day went wrong". One plan, six things happen, the plan adjusts with minimal disruption. No UI, no state writes.
const fs=require('fs'),path=require('path');const {JSDOM,VirtualConsole}=require('jsdom');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',virtualConsole:new VirtualConsole(),beforeParse(w){w.__MAYA_TEST__=true;const m={};w.storage={get:async k=>{if(!(k in m))throw new Error('nf');return{value:m[k]}},set:async(k,v)=>{m[k]=v;return{}},delete:async k=>{delete m[k];return{}}};if(!w.structuredClone)w.structuredClone=o=>JSON.parse(JSON.stringify(o));w.requestAnimationFrame=f=>setTimeout(f,0);w.HTMLElement.prototype.scrollIntoView=()=>{};w.scrollTo=()=>{};}});
setTimeout(()=>{
  console.log(dom.window.eval(`(()=>{
    const L=[];const P=t=>L.push(t);const MON='2026-11-16';const HM=(h,m)=>h*60+(m||0);const F=_fmtMin;
    const EV=(id,title,sm,em,x)=>({id,title,date:MON,startH:Math.floor(sm/60),endH:Math.ceil(em/60),startMin:sm,endMin:em,attendees:2,...(x||{})});
    const PI=(ref,title,kind,sm,em,x)=>({ref,title,kind,place:null,date:MON,startMin:sm,endMin:em,origDurationMin:em-sm,rigidity:'flexible',canMove:true,canShorten:false,canDrop:false,minDurationMin:null,earliest:null,latest:null,bufferMin:0,inTravel:false,chain:null,chainIdx:null,chainAnchor:null,...(x||{})});
    const snapOf=(events)=>{const s=structuredClone(STATE_ACTIVE);s.meta.today=MON;s.constraintsGlobal.events=structuredClone(events);s.userRules={maxLoadMin:600};return buildContextSnapshot(s,{engine:false});};
    let events=[EV('m','פגישת צוות',HM(15),HM(16))];
    let plan=makePlan(snapOf(events),[
      PI('x','סיכום בוקר','deep_work',HM(8,30),HM(9,30),{status:'done'}),
      PI('a','לימודים','study',HM(10),HM(12),{canShorten:true,minDurationMin:45}),
      PI('b','טפסים','admin',HM(12),HM(13)),
      PI('c','סידורים','errand',HM(13,30),HM(14,30)),
      PI('d','קניות','shopping',HM(16,30),HM(17,15),{rigidity:'optional',canDrop:true}),
      PI('e','עבודה על הדוח','deep_work',HM(17,30),HM(19),{canShorten:true,minDurationMin:45})]);
    const show=(p)=>p.items.slice().sort((a,b)=>a.startMin-b.startMin).forEach(x=>{
      const tag=x.status==='done'?' ✔ בוצע':x.status==='cancelled'?' ✖ '+(x.droppedByReplan?'הורד':'בוטל'):x.status==='started'?' ▶ התחיל':x.lockedByUser?' 🔒 נעול':'';
      P('   '+(x.status==='cancelled'?'  —  –  ':F(x.startMin)+'–'+F(x.endMin))+'  '+x.title+tag);});
    P('═══ היום כפי שאושר בבוקר (planId '+plan.planId+') ═══');events.forEach(e=>P('   '+F(e.startMin)+'–'+F(e.endMin)+'  '+e.title+'  (אירוע קשיח)'));show(plan);
    let total=0;
    const step=(title,trg,nowMin,evs)=>{
      if(evs)events=events.concat(evs);
      const sn=snapOf(events);const r=replan(plan,trg,sn,{today:MON,nowMin});
      P('\\n═══ '+F(nowMin)+' · '+title+' ═══');P('trigger: '+JSON.stringify(trg));
      P('סטטוס: '+r.status+(r.plan?'  ·  planId '+r.plan.planId+' (מחליף '+r.plan.supersedes+')':''));
      P('מאיה:\\n'+replanSummaryText(r).split('\\n').map(l=>'   '+l).join('\\n'));
      if(r.status==='needs_decision'){return r;}
      P('מה השתנה בפועל: '+(r.changes.length?r.changes.map(c=>c.title+' ('+c.type+')').join(', '):'כלום')+'   |   disruptionCost='+r.disruptionCost+(r.repairCost?'  repairCost='+r.repairCost:''));
      total+=r.disruptionCost;plan=r.plan;P('התכנית עכשיו:');show(plan);return r;};
    step('איחרתי ב-20 דקות',{type:'delay',minutes:20},HM(10,5));
    step('נוסף ליומן תור לרופא (קשיח) 12:15–13:15',{type:'new_event',eventId:'doc'},HM(10,40),[EV('doc','תור לרופא',HM(12,15),HM(13,15),{attendees:1})]);
    step('לימודים נגמרו מוקדם (ב-11:45)',{type:'item_done',itemId:'a',actualEnd:MON+'T11:45'},HM(11,45));
    step('סידורים בוטלו',{type:'item_cancelled',itemId:'c'},HM(13,20));
    step('"את העבודה על הדוח אל תזיז"',{type:'user_request',text:'את העבודה על הדוח אל תזיז'},HM(13,25));
    step('נוספה ישיבה קשיחה 17:15–18:30 שפוגשת את הדוח הנעול',{type:'new_event',eventId:'mtg'},HM(14,30),[EV('mtg','ישיבת הורים',HM(17,15),HM(18,30))]);
    P('\\nסה״כ disruptionCost לאורך היום: '+total+'  (כל אירוע קשיח וכל פריט שבוצע/נעול נשארו במקומם)');
    return L.join('\\n');
  })()`));process.exit(0);
},1500);
