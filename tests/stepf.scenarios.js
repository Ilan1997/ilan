// Evaluated INSIDE the app page by tests/run.js. Async. Returns {name:boolean}. window.__GOLDEN__ = recorded model outputs (intent-eval).
(async function(){
  const o={};const MON='2026-11-16';const HM=(h,m)=>h*60+(m||0);
  const lintOk=t=>mayaVoiceLint(String(t||'')).ok;
  const savedState=STATE_ACTIVE,savedPlan=AI_CURRENT_PLAN,savedModel=_aiCallModel,savedRoute=_aiRoute;
  const mkState=(events,rules)=>{const s=structuredClone(savedState);s.meta.today=MON;s.constraintsGlobal.events=structuredClone(events);s.userRules=rules||{};return s;};
  const EV=(id,title,sm,em,x)=>({id,title,date:MON,startH:Math.floor(sm/60),endH:Math.ceil(em/60),startMin:sm,endMin:em,attendees:2,...(x||{})});
  const TRAVEL=travelAnswerPatch(normalizeUserRules({}),'פתח תקווה','אריאל',40);
  const E1=[EV('pt','פגישה בפתח תקווה',HM(9),HM(10),{place:'פתח תקווה'}),EV('tr','טיפול',HM(11,20),HM(12,20),{attendees:1})];
  const CHAIN={op:'create',items:[{ref:'i1',title:'נסיעה לאריאל',kind:'travel',place:'אריאל',anchor:{rel:'after',target:{text:'הפגישה בפתח תקווה',date:MON}},confidence:{kind:0.95,place:0.95,anchor:0.9}},{ref:'i2',title:'בית מדרש',kind:'religious',durationMin:60,afterItem:'i1',confidence:{kind:0.85,duration:0.95}}]};
  const SAY='אחרי הפגישה בפתח תקווה תכנן לי נסיעה לאריאל ואז שעה בית מדרש';
  try{
    // ── 1) parsing the model's reply ──
    o.a1_parseFenced=parseIntentText('```json\n{"op":"none"}\n```').ok&&parseIntentText('הנה: {"op":"create","items":[{"ref":"i1","title":"x"}]} תודה').ok;
    o.a2_parseGarbage=!parseIntentText('לא הבנתי').ok&&!parseIntentText('{"op":').ok&&!parseIntentText('[1,2]').ok&&!parseIntentText('').ok;
    o.a3_problems=intentProblems({op:'create',items:[{ref:'i1',title:'x'}]}).length===0&&intentProblems({op:'none'}).length===0&&intentProblems({op:'create',items:[]}).length>0&&intentProblems({op:'zzz',items:[{title:'x'}]}).length>0&&intentProblems({op:'create',items:[{ref:'i1'}]}).length>0;
    // ── 2) the schema must accept everything the model was ever recorded saying, and be what normalizeIntent understands ──
    const conforms=(sc,v,path)=>{const e=[];
      if(v===null||v===undefined)return e;
      const T=sc.type;
      if(T==='OBJECT'){if(typeof v!=='object'||Array.isArray(v))return[path+': not object'];
        (sc.required||[]).forEach(r=>{if(v[r]===undefined)e.push(path+'.'+r+': missing');});
        Object.keys(v).forEach(k=>{if(!sc.properties[k])e.push(path+'.'+k+': not in schema');else e.push(...conforms(sc.properties[k],v[k],path+'.'+k));});}
      else if(T==='ARRAY'){if(!Array.isArray(v))return[path+': not array'];v.forEach((x,i)=>e.push(...conforms(sc.items,x,path+'['+i+']')));}
      else if(T==='STRING'){if(typeof v!=='string')e.push(path+': not string');else if(sc.enum&&sc.enum.indexOf(v)<0)e.push(path+': '+v+' not in enum');}
      else if(T==='INTEGER'){if(!Number.isInteger(v))e.push(path+': not integer');}
      else if(T==='NUMBER'){if(typeof v!=='number')e.push(path+': not number');}
      else if(T==='BOOLEAN'){if(typeof v!=='boolean')e.push(path+': not boolean');}
      return e;};
    const G=window.__GOLDEN__||{};const gk=Object.keys(G);const bad=[];
    gk.forEach(k=>conforms(AI_INTENT_SCHEMA,G[k],k).forEach(x=>bad.push(x)));
    o.b1_goldenConforms=gk.length>=25&&bad.length===0;if(bad.length)o.b1_detail=bad.slice(0,5).join(' | ');
    o.b2_schemaEnumsMatchEngine=JSON.stringify(AI_INTENT_SCHEMA.properties.items.items.properties.kind.enum)===JSON.stringify(PLAN_KINDS)&&AI_INTENT_SCHEMA.required.indexOf('op')>=0&&AI_INTENT_SCHEMA.properties.op.enum.indexOf('none')>=0;
    o.b3_schemaSmall=JSON.stringify(AI_INTENT_SCHEMA).length<=8000;
    o.b4_promptKnowsNone=/op=none/.test(AI_INTENT_PROMPT);
    // ── 3) the router is only a cost optimisation: it may skip pleasantries, never a real request ──
    const trivial=['שלום','תודה רבה','אוקיי','מה שלומך?','בוקר טוב!','',null];
    const real=[SAY,'תסדרי לי את מחר','אני צריך 8 שעות לימוד עד ה-23','יש לי רופא ברביעי ב-10, תוסיפי נסיעה','אל תעמיסי לי את יום שני','מה דעתך שנלמד ברביעי','תארגני לי את היום','קחי לי שעתיים השבוע'];
    o.c1_trivialSkipped=trivial.every(isClearlyNotPlanning);o.c2_neverSkipsARequest=real.every(x=>!isClearlyNotPlanning(x));
    // ── 4) pure pipeline ──
    {const st=mkState(E1,TRAVEL);const r=mayaPlanFromIntent(st,CHAIN);
     o.d1_chainProposal=r.status==='proposal'&&r.items.length===2&&r.plan.items.every(x=>x.status==='planned'&&x.planId===r.plan.planId)&&r.plan.rootId===r.plan.planId;
     o.d2_conflictRepaired=!!r.repair&&r.repair.status==='repaired'&&validatePlan(r.snap,r.items).ok;
     o.d3_textHumanAndChecked=/10:00–10:40/.test(r.text)&&/בית מדרש/.test(r.text)&&/לאשר\?$/.test(r.text)&&lintOk(r.text)&&!/\b(shift|shorten|chain)\b/.test(r.text);
     o.d4_textSaysWhatRepaired=/התנגש/.test(r.text)&&/לקצר|להזיז/.test(r.text);
     const ev=mayaPlanEvents(r.plan);
     o.d5_eventsWellFormed=ev.length===2&&ev.every(e=>e.id.indexOf('mplan:'+r.plan.rootId+':')===0&&e.startMin<e.endMin&&e.startH===Math.floor(e.startMin/60)&&e.endH===Math.ceil(e.endMin/60)&&_cleanEvMinutes(e)===e)&&/^נסיעה/.test(ev[0].title);
     const tr=mayaPlanFromIntent(mkState(E1,{}),CHAIN);
     o.d6_unknownTravelAsks=tr.status==='ask'&&tr.ask.field==='travel'&&tr.ask.from==='פתח תקווה'&&tr.ask.to==='אריאל'&&lintOk(tr.text);
     o.d7_notPlan=mayaPlanFromIntent(st,{op:'none'}).status==='not_plan'&&mayaPlanFromIntent(st,{op:'find',items:[{ref:'i1',title:'x',kind:'errand'}]}).status==='not_plan'&&mayaPlanFromIntent(st,{op:'create',items:[]}).status==='not_plan';
     const arr=mayaPlanFromIntent(mkState([EV('m','פגישה',HM(9),HM(12))],{}),{op:'arrange',targetDays:[MON],items:[{ref:'a',title:'ללמוד סטטיסטיקה',kind:'study',durationMin:120},{ref:'b',title:'קניות',kind:'shopping',durationMin:60,rigidity:'optional'}]});
     o.d8_arrangeProposal=arr.status==='proposal'&&arr.items.length===2&&arr.items.every(x=>x.startMin>=HM(8))&&lintOk(arr.text);
     const nr=mayaPlanFromIntent(mkState(E1,TRAVEL),{op:'create',items:[{ref:'i1',title:'נסיעה לאריאל',kind:'travel',place:'אריאל',anchor:{rel:'after',target:{text:'הפגישה במאדים',date:MON}}}]});
     o.d9_unknownAnchorAsks=nr.status==='ask'&&lintOk(nr.text);}
    // ── 4b) "N hours until a date": a workload goal spread around the life that is already in the calendar ──
    {const G=(x)=>({op:'goal',goals:[{ref:'g1',title:'לימוד',kind:'study',totalMinutes:480,deadline:'2026-11-23',...(x||{})}]});
     const busy=[EV('m1','פגישה',HM(9),HM(12)),{...EV('full','יום מלא',HM(9),HM(18)),date:'2026-11-17'}];
     const stG=mkState(busy,{});const now={today:MON,nowMin:HM(14)};
     const r=mayaPlanFromIntent(stG,G(),{now});const tot=r.items?r.items.reduce((t,x)=>t+x.endMin-x.startMin,0):0;
     o.n1_goalProposal=r.status==='proposal'&&tot===480&&r.goals[0].shortfallMin===0&&r.plan.items.every(x=>x.goalRef==='g1');
     o.n2_sessionSizes=r.items.every(x=>x.endMin-x.startMin>=45&&x.endMin-x.startMin<=120)&&new Set(r.items.map(x=>x.date)).size>=4;
     o.n3_valid=validatePlan(r.snap,r.items).ok&&r.items.every(x=>x.date>=MON&&x.date<='2026-11-23');
     o.n4_nothingInThePast=r.items.filter(x=>x.date===MON).every(x=>x.startMin>=HM(14));
     o.n5_busyDayRespected=!r.items.some(x=>x.date==='2026-11-17')&&r.items.filter(x=>x.date===MON).every(x=>x.startMin>=HM(14));
     o.n6_deadlineDayLast=!r.items.some(x=>x.date==='2026-11-23');
     o.n7_textPlain=/סה״כ 8 שעות/.test(r.text)&&/אין לי עדיין העדפת שעות/.test(r.text)&&/לאשר\?$/.test(r.text)&&lintOk(r.text)&&/עד יום ב׳ 23\/11/.test(r.text);
     const r60=mayaPlanFromIntent(stG,G({maxSessionMin:60}),{now});
     o.n8_maxSessionRespected=r60.status==='proposal'&&r60.items.every(x=>x.endMin-x.startMin<=60)&&r60.items.reduce((t,x)=>t+x.endMin-x.startMin,0)===480;
     const rShort=mayaPlanFromIntent(stG,G({totalMinutes:1500,deadline:'2026-11-17'}),{now});
     o.n9_shortfallSaidAloud=(rShort.status==='proposal'||rShort.status==='needs_decision')&&(rShort.status==='needs_decision'||(rShort.goals[0].shortfallMin>0&&/נשארו/.test(rShort.text)));
     o.n10_asksWhatIsMissing=mayaPlanFromIntent(stG,G({deadline:undefined}),{now}).ask.field==='deadline'&&mayaPlanFromIntent(stG,G({deadline:'2026-11-10'}),{now}).ask.field==='deadline'&&mayaPlanFromIntent(stG,{op:'goal',goals:[{title:'לימוד',kind:'study'}]},{now}).ask.field==='totalMinutes';
     const stW=mkState(busy,{preferredWindows:{study:[{from:'08:00',to:'12:00'}]}});const rw=mayaPlanFromIntent(stW,G(),{now:{today:MON,nowMin:HM(6)}});
     o.n11_preferredWindowUsed=rw.status==='proposal'&&rw.items.filter(x=>x.startMin>=HM(8)&&x.startMin<HM(12)).length>=rw.items.length-1&&!/אין לי עדיין העדפת שעות/.test(rw.text);
     o.n12_nonStudyKindsToo=mayaPlanFromIntent(stG,{op:'goal',goals:[{title:'עבודה על הפרויקט',kind:'work',totalMinutes:300,deadline:'2026-11-19',maxSessionMin:120}]},{now}).status==='proposal';}
    // ── 4c) preferences become rules (after approval), and the planner then uses them ──
    {const st=mkState(E1,{dayModes:{5:'rest'}});
     const a=mayaPlanFromIntent(st,{op:'preference',scope:'global',preference:{dayRule:{dow:1,mode:'light'}}});
     o.p1_dayRule=a.status==='rules_proposal'&&a.patch.dayModes[1]==='light'&&a.patch.dayModes[5]==='rest'&&/יום שני/.test(a.text)&&lintOk(a.text);
     const b=mayaPlanFromIntent(st,{op:'preference',preference:{preferredWindow:{kind:'study',from:'08:00',to:'12:00'}}});
     o.p2_preferredWindow=b.status==='rules_proposal'&&b.patch.preferredWindows.study[0].from==='08:00'&&/לימודים/.test(b.text)&&lintOk(b.text);
     o.p3_nothingToSave=mayaPlanFromIntent(st,{op:'preference',preference:{}}).status==='not_plan'&&mayaPlanFromIntent(st,{op:'preference',preference:{preferredWindow:{kind:'study',from:'12:00',to:'08:00'}}}).status==='not_plan';
     o.p4_globalAsksScope=mayaPlanFromIntent(st,{op:'preference',preference:{bufferBeforeMin:10}}).status==='ask';
     STATE_ACTIVE=mkState(E1,{});AI_PENDING_MAYA=null;AI_PENDING_ASK=null;window.__MAYA_NOW__={iso:MON,minutes:HM(8)};
     _aiCallModel=async()=>JSON.stringify({op:'preference',preference:{preferredWindow:{kind:'study',from:'08:00',to:'12:00'}}});_aiRoute=async()=>'proxy';
     const h=await _mayaHandleStructured('אני רוצה ללמוד בבקרים');const had=!!(AI_PENDING_MAYA&&AI_PENDING_MAYA.rules);
     _mayaApprove(null);
     o.p5_savedThroughApproval=h===true&&had&&getUserRules(STATE_ACTIVE).preferredWindows.study[0].to==='12:00'&&AI_PENDING_MAYA===null;}
    // ── 4d) every repair says WHY, from a code + data (the sentence is written in code) ──
    {const r=mayaPlanFromIntent(mkState(E1,TRAVEL),CHAIN);const st1=r.repair.best.steps[0];
     o.q1_stepHasExplanation=!!st1.explanationCode&&st1.explanationData&&st1.explanationData.eventTitle==='טיפול'&&st1.explanationCode==='SHORTENED_BEFORE_EVENT';
     const plan=r.plan;const st=mkState(E1,TRAVEL);
     const rp=mayaReplanFromState(st,plan,{type:'delay',minutes:20},{today:MON,nowMin:HM(10,5)});
     const ch=rp.changes[0];
     o.q2_replanSaysWhy=rp.changes.length>=1&&rp.changes.every(c=>c.explanationCode&&c.because)&&ch.explanationCode==='SHIFTED_AFTER_EVENT'&&/טיפול/.test(ch.because)&&/שאי אפשר להזיז/.test(ch.because);
     o.q3_textHasBecause=/ — כי ב-11:20 יש לך "טיפול"/.test(replanSummaryText(rp))&&lintOk(replanSummaryText(rp));}
    // ── 5) spoken changes to a plan ──
    {const plan=makePlan(buildContextSnapshot(mkState(E1,TRAVEL),{engine:false}),[
       {ref:'a',title:'בית מדרש',kind:'religious',place:null,date:MON,startMin:HM(10),endMin:HM(11),origDurationMin:60,rigidity:'flexible',canMove:true,canShorten:false,canDrop:false,minDurationMin:null,earliest:null,latest:null,bufferMin:0,inTravel:false,chain:null,chainIdx:null,chainAnchor:null},
       {ref:'b',title:'קניות בסופר',kind:'shopping',place:null,date:MON,startMin:HM(13),endMin:HM(14),origDurationMin:60,rigidity:'flexible',canMove:true,canShorten:false,canDrop:false,minDurationMin:null,earliest:null,latest:null,bufferMin:0,inTravel:false,chain:null,chainIdx:null,chainAnchor:null}]);
     const now={today:MON,nowMin:HM(10,5)};const P=t=>parseReplanText(t,plan,now);
     o.e1_delay=P('איחרתי ב-20 דקות').trigger.minutes===20&&P('איחרתי בחצי שעה').trigger.minutes===30&&P('אני מאחר בשעה').trigger.minutes===60&&P('איחרתי בשעתיים').trigger.minutes===120&&P('איחרתי').kind==='ask';
     o.e2_cancel=P('ביטלו את הקניות').trigger.itemId==='b'&&P('בית מדרש בוטל').trigger.itemId==='a'&&P('ביטלו את הבנק').kind==='ask';
     o.e3_done=P('סיימתי את בית מדרש').trigger.type==='item_done'&&P('סיימתי את בית מדרש').trigger.actualEnd===MON+'T10:05';
     o.e4_lock=P('את בית מדרש אל תזיז').trigger.type==='user_request';
     o.e5_notAReplan=P('מה דעתך על שבוע הבא')===null&&parseReplanText('איחרתי 20 דקות',null,now)===null;
     o.e6_minutes=parseMinutesAnswer('40')===40&&parseMinutesAnswer('40 דקות')===40&&parseMinutesAnswer('שעה')===60&&parseMinutesAnswer('חצי שעה')===30&&parseMinutesAnswer('שעה וחצי')===90&&parseMinutesAnswer('אני לא יודע')===null;}
    // ── 6) the whole conversation, with a stubbed model ──
    let calls=0,lastUser='',reply=JSON.stringify(CHAIN);
    _aiCallModel=async(sys,msgs)=>{calls++;lastUser=msgs[msgs.length-1].content;return reply;};
    _aiRoute=async()=>'proxy';
    window.__MAYA_NOW__={iso:MON,minutes:HM(8)};
    const events=()=>((STATE_ACTIVE.constraintsGlobal||{}).events||[]).filter(e=>String(e.id).indexOf('mplan:')===0);
    STATE_ACTIVE=mkState(E1,TRAVEL);AI_CURRENT_PLAN=null;AI_PENDING_MAYA=null;AI_PENDING_ASK=null;
    // 6a) not a planning message → the planner path stays out of the way (no model call at all)
    o.f1_chatUntouched=(await _mayaHandleStructured('שלום'))===false&&calls===0;
    // 6b) a planning request → structured call → proposal waiting for approval, calendar still untouched
    calls=0;const handled=await _mayaHandleStructured(SAY);
    o.f2_proposalShown=handled===true&&calls===1&&!!AI_PENDING_MAYA&&AI_PENDING_MAYA.plan.items.length===2&&events().length===0&&AI_CURRENT_PLAN===null;
    // 6c) approve → written to the calendar in one commit, plan remembered and persisted
    const rev0=STATE_ACTIVE.meta.revision;const planId=AI_PENDING_MAYA.plan.planId;
    _mayaApprove(null);await new Promise(r=>setTimeout(r,20));
    let saved=null;try{saved=JSON.parse((await window.storage.get('ai:plan')).value);}catch(_e){}
    o.g1_committed=events().length===2&&AI_PENDING_MAYA===null&&AI_CURRENT_PLAN&&AI_CURRENT_PLAN.planId===planId&&STATE_ACTIVE.meta.revision===rev0+1;
    o.g2_persisted=!!saved&&saved.planId===planId&&saved.items.length===2;
    o.g3_noOverlapWithTreatment=!events().some(e=>e.endMin>HM(11,20)&&e.startMin<HM(12,20));
    // 6d) "I'm 20 minutes late" → replan proposal that keeps the hard event and says what moved
    window.__MAYA_NOW__={iso:MON,minutes:HM(10,5)};
    const h2=await _mayaHandleStructured('איחרתי ב-20 דקות');
    const pend=AI_PENDING_MAYA;
    o.h1_replanProposed=h2===true&&!!pend&&pend.plan.supersedes===planId&&pend.plan.rootId===AI_CURRENT_PLAN.rootId&&calls===1;   // no model call for a replan
    o.h2_hardEventKept=STATE_ACTIVE.constraintsGlobal.events.find(e=>e.id==='tr').startMin===HM(11,20);
    if(pend){_mayaApprove(null);await new Promise(r=>setTimeout(r,20));}
    o.h3_replanCommitted=events().length===2&&AI_CURRENT_PLAN.supersedes===planId&&events().every(e=>e.planId===AI_CURRENT_PLAN.planId)&&events().every(e=>e.startMin>=HM(10,25)||e.status==='done');
    // 6e) a cancellation changes only statuses → applied at once, the entry leaves the calendar
    const h3=await _mayaHandleStructured('ביטלו את בית מדרש');
    o.i1_cancelApplied=h3===true&&AI_PENDING_MAYA===null&&events().length===0&&AI_CURRENT_PLAN.items.every(x=>x.status==='cancelled');   // the drive had no destination left, so it went too
    // 6f) the calendar changed after the proposal → refuse to apply stale advice
    STATE_ACTIVE=mkState(E1,TRAVEL);AI_CURRENT_PLAN=null;AI_PENDING_MAYA=null;window.__MAYA_NOW__={iso:MON,minutes:HM(8)};calls=0;
    await _mayaHandleStructured(SAY);const stale=AI_PENDING_MAYA;
    STATE_ACTIVE=commitState(applyEvent(STATE_ACTIVE,'personal',{type:'ADD_GLOBAL_EVENT',payload:EV('zz','אירוע חדש',HM(16),HM(17))}),'test');
    _mayaApprove(null);
    o.j1_staleRefused=!!stale&&events().length===0&&AI_PENDING_MAYA===null&&AI_CURRENT_PLAN===null;
    // 6g) a question, then the answer: travel time is remembered as a rule and the plan follows
    STATE_ACTIVE=mkState(E1,{});AI_CURRENT_PLAN=null;AI_PENDING_MAYA=null;AI_PENDING_ASK=null;calls=0;
    const q=await _mayaHandleStructured(SAY);
    o.k1_asked=q===true&&!!AI_PENDING_ASK&&AI_PENDING_ASK.field==='travel'&&!AI_PENDING_MAYA;
    const a=await _mayaHandleStructured('40 דקות');
    o.k2_answeredRemembered=a===true&&!!AI_PENDING_MAYA&&AI_PENDING_ASK===null&&calls===1&&travelMinutes(getUserRules(STATE_ACTIVE),'פתח תקווה','אריאל').min===40;
    // 6h) an answer that is not a number is treated as extra detail: one more structured call with both texts
    STATE_ACTIVE=mkState(E1,{});AI_PENDING_MAYA=null;AI_PENDING_ASK=null;calls=0;
    await _mayaHandleStructured(SAY);await _mayaHandleStructured('תלוי בפקקים');
    o.k3_freeTextAnswer=calls===2&&lastUser.indexOf(SAY)>=0&&lastUser.indexOf('תלוי בפקקים')>=0;
    // 6i) the model answers garbage twice → we fall back to normal chat (never crash, never invent a plan)
    STATE_ACTIVE=mkState(E1,TRAVEL);AI_PENDING_MAYA=null;AI_PENDING_ASK=null;calls=0;reply='לא יודעת מה לעשות';
    o.a4_moveWithoutItemsIsValid=intentProblems({op:'move',items:[],filter:{kind:'work'},targetDays:['2026-11-17']}).length===0&&intentProblems({op:'move',items:[]}).length>0;
    const g=await _mayaHandleStructured(SAY);
    o.l1_garbageFallsBack=g===false&&calls===2&&AI_PENDING_MAYA===null;
    // 6j) the model says "this is not a planning request" → chat
    calls=0;reply=JSON.stringify({op:'none',items:[]});
    o.l2_noneFallsBack=(await _mayaHandleStructured(SAY))===false&&calls===1;
    // 6k) first reply invalid, the retry is valid → one repaired round trip
    calls=0;let n=0;_aiCallModel=async()=>{calls++;n++;return n===1?'{"op":"create","items":[]}':JSON.stringify(CHAIN);};
    STATE_ACTIVE=mkState(E1,TRAVEL);
    o.l3_retryWorks=(await _mayaHandleStructured(SAY))===true&&calls===2&&!!AI_PENDING_MAYA;
    // 6l) nothing the user can read contains jargon
    o.m1_allTextsClean=(AI_CHAT_HISTORY||[]).filter(m=>m.role==='assistant').every(m=>lintOk(m.content));
  }catch(e){o.z_threw=String(e&&e.stack||e).slice(0,300);}
  finally{_aiCallModel=savedModel;_aiRoute=savedRoute;STATE_ACTIVE=savedState;AI_CURRENT_PLAN=savedPlan;AI_PENDING_MAYA=null;AI_PENDING_ASK=null;delete window.__MAYA_NOW__;}
  return o;
})
