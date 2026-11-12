#!/usr/bin/env node
// Demo (step D): Intent → Context → Plan → Validate → Repair suggestions. No UI, no state writes.
//  Scene A: chain "after the Petah Tikva meeting: travel to Ariel, then an hour at the beit midrash" collides with a hard appointment.
//  Scene B: same, but the user's rules forbid shortening the beit midrash → the whole chain is shifted.
//  Scene C: a day is planned, then a new hard meeting lands in the calendar → overload → optional items leave first.
//  Scene D: "must be home by 21:00" (hard) vs "prefer" (soft); two hard events that overlap → the user decides.
const fs=require('fs'),path=require('path');const {JSDOM,VirtualConsole}=require('jsdom');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',virtualConsole:new VirtualConsole(),beforeParse(w){const m={};w.storage={get:async k=>{if(!(k in m))throw new Error('nf');return{value:m[k]}},set:async(k,v)=>{m[k]=v;return{}},delete:async k=>{delete m[k];return{}}};if(!w.structuredClone)w.structuredClone=o=>JSON.parse(JSON.stringify(o));w.requestAnimationFrame=f=>setTimeout(f,0);w.HTMLElement.prototype.scrollIntoView=()=>{};w.scrollTo=()=>{};}});
setTimeout(()=>{
  const out=dom.window.eval(`(()=>{
    const L=[];const say=(who,t)=>L.push(who+': '+t);const hd=t=>L.push('\\n══ '+t+' ══');
    const MON='2026-11-16';
    const ev=(id,title,sm,em,x)=>({id,title,date:MON,startH:Math.floor(sm/60),endH:Math.ceil(em/60),startMin:sm,endMin:em,...(x||{})});
    const mk=(events,rules)=>{const s=structuredClone(STATE_ACTIVE);s.meta.today='2026-11-15';s.constraintsGlobal.events=structuredClone(events);s.userRules=rules||{};return s;};
    const mat=(base)=>({...(base||{}),...travelAnswerPatch(normalizeUserRules(base||{}),'פתח תקווה','אריאל',40)});
    const chainParsed={op:'create',items:[{ref:'i1',title:'נסיעה לאריאל',kind:'travel',place:'אריאל',anchor:{rel:'after',target:{text:'הפגישה בפתח תקווה',date:MON}},confidence:{kind:0.95,place:0.95,anchor:0.9}},{ref:'i2',title:'בית מדרש',kind:'religious',durationMin:60,afterItem:'i1',confidence:{kind:0.85,duration:0.95}}]};
    const E1=[ev('pt','פגישה בפתח תקווה',540,600,{place:'פתח תקווה',attendees:2}),ev('tr','טיפול',680,740,{attendees:1})];
    const scene=(rules)=>{
      const st=mk(E1,mat(rules));const sn=buildContextSnapshot(st,{engine:false});const it=normalizeIntent(chainParsed);const g=planningGaps(it,getUserRules(st));
      const ch=planChain(sn,it,g);say('מאיה (תכנית)',chainSummaryText(ch));
      const items=planItemsFrom(sn,g,ch,{chain:true});say('מאיה (בדיקה)',repairSummaryText(proposeCuts(sn,items)));
    };
    hd('A. רצף נסיעה + בית מדרש מתנגש בטיפול');say('אתה','אחרי הפגישה בפתח תקווה תכנן לי נסיעה לאריאל ואז שעה בית מדרש.');scene({});
    hd('B. אותו דבר, אבל אסור לקצר בית מדרש');scene({mobilityByKind:{religious:{canShorten:false}}});
    hd('C. יום מתוכנן, ואז נוסף אירוע קשיח ליומן');
    {const E=[ev('m','פגישה',540,720,{attendees:2})];const st=mk(E,{maxLoadMin:540});const sn=buildContextSnapshot(st,{engine:false});
     const it=normalizeIntent({op:'arrange',targetDays:[MON],items:[{ref:'a',title:'ללמוד סטטיסטיקה',kind:'study',durationMin:120},{ref:'b',title:'קניות',kind:'shopping',durationMin:60,rigidity:'optional',confidence:{rigidity:0.9}},{ref:'c',title:'לסדר מסמכים',kind:'admin',durationMin:45,rigidity:'optional',confidence:{rigidity:0.9}},{ref:'d',title:'עבודה על הדוח',kind:'deep_work',durationMin:120}]});
     const g=planningGaps(it,getUserRules(st));const sc=scheduleSet(sn,it,g);const items=planItemsFrom(sn,g,sc);
     say('מאיה (שיבוץ)',sc.placed.map(p=>'• '+_fmtMin(p.startMin)+'–'+_fmtMin(p.endMin)+' '+p.title).join('\\n'));
     const E2=E.concat([ev('new','ישיבת הנהלה',780,960,{attendees:5})]);const sn2=buildContextSnapshot(mk(E2,st.userRules),{engine:false});
     say('(היומן השתנה)','נוספה "ישיבת הנהלה" 13:00–16:00 — התכנית כבר לא עדכנית: '+contextIsStale(sn,mk(E2,st.userRules)));
     say('מאיה (בדיקה)',repairSummaryText(proposeCuts(sn2,items)));}
    hd('D. "חייב להיות בבית ב-21:00" מול "מעדיף", ושני אירועים קשיחים חופפים');
    {const late=[{ref:'e',title:'סידור',kind:'errand',place:null,date:MON,startMin:1170,endMin:1290,origDurationMin:120,rigidity:'flexible',canMove:true,canShorten:true,canDrop:false,minDurationMin:15,earliest:null,latest:null,bufferMin:0,inTravel:false,chain:null,chainIdx:null,chainAnchor:null}];
     [['hard','חייב'],['soft','מעדיף']].forEach(([enf,w])=>{const sn=buildContextSnapshot(mk([],{anchors:[{id:'home',type:'family',title:'בבית ב-21:00',mode:'curfew',days:[0,1,2,3,4,5,6],startMin:1260,enforcement:enf}]}),{engine:false});
       say('אתה','"'+w+' להיות בבית ב-21:00"');say('מאיה',repairSummaryText(proposeCuts(sn,late)));});
     const sn=buildContextSnapshot(mk([ev('t','טיפול',900,960,{attendees:1}),ev('p','פגישה עם דנה',930,990,{attendees:2})],{}),{engine:false});
     say('מאיה (שני קשיחים)',repairSummaryText(proposeCuts(sn,late.map(x=>({...x,startMin:540,endMin:570,origDurationMin:30})))));}
    return L.join('\\n');
  })()`);
  console.log(out);process.exit(0);
},1500);
