#!/usr/bin/env node
// Human-readable walkthrough (step D): request → Intent → Context → Initial plan → Validation → Repair options → Best plan (+cost, why).
const fs=require('fs'),path=require('path');const {JSDOM,VirtualConsole}=require('jsdom');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',virtualConsole:new VirtualConsole(),beforeParse(w){const m={};w.storage={get:async k=>{if(!(k in m))throw new Error('nf');return{value:m[k]}},set:async(k,v)=>{m[k]=v;return{}},delete:async k=>{delete m[k];return{}}};if(!w.structuredClone)w.structuredClone=o=>JSON.parse(JSON.stringify(o));w.requestAnimationFrame=f=>setTimeout(f,0);w.HTMLElement.prototype.scrollIntoView=()=>{};w.scrollTo=()=>{};}});
setTimeout(()=>{
  console.log(dom.window.eval(`(()=>{
    const L=[];const P=t=>L.push(t);const H=t=>L.push('\\n████ '+t+' ████');const S=t=>L.push('\\n── '+t);
    const MON='2026-11-16';const F=_fmtMin;
    const ev=(id,title,sm,em,x)=>({id,title,date:MON,startH:Math.floor(sm/60),endH:Math.ceil(em/60),startMin:sm,endMin:em,...(x||{})});
    const mk=(events,rules)=>{const s=structuredClone(STATE_ACTIVE);s.meta.today='2026-11-15';s.constraintsGlobal.events=structuredClone(events);s.userRules=rules||{};return s;};
    const mat=(b)=>({...(b||{}),...travelAnswerPatch(normalizeUserRules(b||{}),'פתח תקווה','אריאל',40)});
    const itemLine=x=>'  '+F(x.startMin)+'–'+F(x.endMin)+'  '+x.title+'  ['+(x.rigidity||'?')+(x.canShorten?', מותר לקצר':'')+(x.canDrop?', אופציונלי':'')+(x.chain?', רצף '+x.chain:'')+']';
    const showCtx=(sn)=>{P('  חלון: '+sn.from+' עד '+sn.to+' · sig='+sn.sig);sn.events.filter(e=>e.date===MON).forEach(e=>P('  אירוע ביומן: '+F(e.startMin)+'–'+F(e.endMin)+' "'+e.title+'" → '+e.rigidity.rigidity+' ('+(e.rigidity.source==='inferred'?'הוסק: ':'')+e.rigidity.reason+')'));const r=sn.rules;P('  כללים: תקרת עומס '+r.maxLoadMin+' דק׳ · עוגנים: '+((r.anchors||[]).map(a=>a.title+' ('+a.enforcement+')').join(', ')||'אין'));};
    const showAssume=(g)=>{(g.assumptions||[]).forEach(a=>P('  הנחה: '+a.text));(g.ask||[]).forEach(q=>P('  שאלה פתוחה: '+(q.text||q.question||JSON.stringify(q))));if(!(g.assumptions||[]).length&&!(g.ask||[]).length)P('  (אין הנחות ואין חסרים)');};
    const showVal=(v)=>{P('  תקין? '+(v.ok?'כן':'לא')+'  ·  חוסמים: '+v.blocks.length+'  ·  אזהרות: '+v.warnings.length);v.blocks.forEach(b=>P('   ⛔ ['+b.code+'] '+b.message));v.warnings.forEach(b=>P('   ⚠️  ['+b.code+'] '+b.message));};
    const showRepair=(res)=>{P('  סטטוס: '+res.status+(res.snapshotSig?'  (sig '+res.snapshotSig+')':''));
      (res.options||[]).forEach((o,i)=>{P('  אפשרות '+(i+1)+(o===res.best?' ← נבחרה':'')+'  עלות כוללת '+o.totalCost+(o.complete?'':'  (לא פותרת הכול)'));o.steps.forEach(s=>P('     - '+s.text+'   [סוג '+s.type+', עלות '+s.costScore+', פותר '+s.fixes+']'));});
      if(res.best&&(res.options||[]).length>1){const o=res.options;P('  למה זו: הכי זולה מבין '+o.length+' (עלויות '+o.map(x=>x.totalCost).join(' / ')+'), שומרת על כל האילוצים הקשיחים ובלי לגעת באירועים קשיחים.');}
      if(res.best){P('  התכנית אחרי תיקון:');res.best.plan.forEach(x=>P('   '+itemLine(x)));const v=validatePlan(res.snap||null,res.best.plan);P('  בדיקה חוזרת: '+(res.best.complete?'נקייה מחוסמים':'עדיין יש חוסמים'));}
      (res.decisions||[]).forEach(d=>P('  ❓ צריך החלטה: '+(d.text||d.message||JSON.stringify(d))));};
    const run=(title,say,st,intentRaw,mode,extra)=>{
      H(title);S('1. בקשת המשתמש');P('  "'+say+'"');
      const sn=buildContextSnapshot(st,{engine:false});const it=normalizeIntent(intentRaw);
      S('2. Intent (מה המודל הבין — בלי שעות)');it.items.forEach(i=>P('  • '+i.title+' · סוג '+i.kind+(i.durationMin?' · '+i.durationMin+' דק׳':'')+(i.place?' · מקום '+i.place:'')+(i.anchor?' · עוגן: '+i.anchor.rel+' "'+i.anchor.target.text+'"':'')+(i.afterItem?' · אחרי '+i.afterItem:'')+(i.rigidity?' · '+i.rigidity:'')));
      S('3. Context (מה המנוע יודע)');showCtx(sn);
      const g=planningGaps(it,getUserRules(st));S('4. הנחות / חסרים');showAssume(g);
      let items,pre;
      if(mode==='chain'){const ch=planChain(sn,it,g);pre=ch;S('5. תכנית ראשונית');P('  עוגן שנקשר: '+ch.anchor.title+' '+F(ch.anchor.startMin)+'–'+F(ch.anchor.endMin)+' (ביטחון '+ch.anchor.confidence+')');items=planItemsFrom(sn,g,ch,{chain:true});}
      else{const sc=scheduleSet(sn,it,g);S('5. תכנית ראשונית');items=planItemsFrom(sn,g,sc);}
      items.forEach(x=>P(itemLine(x)));
      let sn2=sn;if(extra&&extra.afterPlan){const r=extra.afterPlan(sn);sn2=r.snap;P('\\n  >>> '+r.note+' (התכנית הישנה מיושנת? '+contextIsStale(sn,r.state)+')');}
      S('6. Validation');const v=validatePlan(sn2,items);showVal(v);
      S('7. Repair');const res=proposeCuts(sn2,items);res.snap=sn2;showRepair(res);};
    // A
    {const E=[ev('pt','פגישה בפתח תקווה',540,600,{place:'פתח תקווה',attendees:2}),ev('tr','טיפול',680,740,{attendees:1})];
     const raw={op:'create',items:[{ref:'i1',title:'נסיעה לאריאל',kind:'travel',place:'אריאל',anchor:{rel:'after',target:{text:'הפגישה בפתח תקווה',date:MON}},confidence:{kind:0.95,place:0.95,anchor:0.9}},{ref:'i2',title:'בית מדרש',kind:'religious',durationMin:60,afterItem:'i1',confidence:{kind:0.85,duration:0.95}}]};
     run('A. רצף נסיעה + בית מדרש מתנגש בטיפול','אחרי הפגישה בפתח תקווה תכנן לי נסיעה לאריאל ואז שעה בית מדרש.',mk(E,mat({})),raw,'chain');
     run('B. אותו דבר, אסור לקצר בית מדרש','(אותה בקשה; כלל: בית מדרש לא מתקצר)',mk(E,mat({mobilityByKind:{religious:{canShorten:false}}})),raw,'chain');}
    // C
    {const E=[ev('m','פגישה',540,720,{attendees:2})];const st=mk(E,{maxLoadMin:540});
     const raw={op:'arrange',targetDays:[MON],items:[{ref:'a',title:'ללמוד סטטיסטיקה',kind:'study',durationMin:120},{ref:'b',title:'קניות',kind:'shopping',durationMin:60,rigidity:'optional',confidence:{rigidity:0.9}},{ref:'c',title:'לסדר מסמכים',kind:'admin',durationMin:45,rigidity:'optional',confidence:{rigidity:0.9}},{ref:'d',title:'עבודה על הדוח',kind:'deep_work',durationMin:120}]};
     run('C. יום מתוכנן ואז נוסף אירוע קשיח','תסדר לי ביום שני: סטטיסטיקה, דוח, קניות ולסדר מסמכים.',st,raw,'set',{afterPlan:()=>{const E2=E.concat([ev('new','ישיבת הנהלה',780,960,{attendees:5})]);const s2=mk(E2,st.userRules);return{state:s2,snap:buildContextSnapshot(s2,{engine:false}),note:'נוספה ישיבת הנהלה 13:00–16:00 ליומן'};}});}
    // D
    {const late=[{ref:'e',title:'סידור',kind:'errand',place:null,date:MON,startMin:1170,endMin:1290,origDurationMin:120,rigidity:'flexible',canMove:true,canShorten:true,canDrop:false,minDurationMin:15,earliest:null,latest:null,bufferMin:0,inTravel:false,chain:null,chainIdx:null,chainAnchor:null}];
     [['hard','חייב'],['soft','מעדיף']].forEach(([enf,w])=>{H('D. "'+w+' להיות בבית ב-21:00"  (enforcement='+enf+')');S('1. בקשה');P('  "'+w+' להיות בבית ב-21:00" ; הסידור המתוכנן 19:30–21:30');const sn=buildContextSnapshot(mk([],{anchors:[{id:'home',type:'family',title:'בבית ב-21:00',mode:'curfew',days:[0,1,2,3,4,5,6],startMin:1260,enforcement:enf}]}),{engine:false});S('3. Context');showCtx(sn);S('5. תכנית ראשונית');late.forEach(x=>P(itemLine(x)));S('6. Validation');showVal(validatePlan(sn,late));S('7. Repair');const r=proposeCuts(sn,late);r.snap=sn;showRepair(r);});
     H('D2. שני אירועים קשיחים חופפים');const sn=buildContextSnapshot(mk([ev('t','טיפול',900,960,{attendees:1}),ev('p','פגישה עם דנה',930,990,{attendees:2})],{}),{engine:false});S('3. Context');showCtx(sn);const it=late.map(x=>({...x,startMin:540,endMin:570,origDurationMin:30}));S('6. Validation');showVal(validatePlan(sn,it));S('7. Repair');const r=proposeCuts(sn,it);r.snap=sn;showRepair(r);}
    return L.join('\\n');
  })()`));process.exit(0);
},1500);
