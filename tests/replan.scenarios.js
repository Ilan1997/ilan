// Evaluated INSIDE the app page by tests/run.js (and reused by tests/demo-replan.js). Returns {name:boolean}.
(function(){
  const o={};const MON='2026-11-16';const HM=(h,m)=>h*60+(m||0);
  const mkState=(events,rules)=>{const s=structuredClone(STATE_ACTIVE);s.meta.today=MON;s.constraintsGlobal.events=structuredClone(events);s.userRules=rules||{};return s;};
  const EV=(id,title,sm,em,x)=>({id,title,date:MON,startH:Math.floor(sm/60),endH:Math.ceil(em/60),startMin:sm,endMin:em,attendees:2,...(x||{})});
  const PI=(ref,title,kind,sm,em,x)=>({ref,title,kind,place:null,date:MON,startMin:sm,endMin:em,origDurationMin:em-sm,rigidity:'flexible',canMove:true,canShorten:false,canDrop:false,minDurationMin:null,earliest:null,latest:null,bufferMin:0,inTravel:false,chain:null,chainIdx:null,chainAnchor:null,...(x||{})});
  const base=[EV('m','פגישת צוות',HM(15),HM(16))];
  const mkItems=()=>[
    PI('x','סיכום בוקר','deep_work',HM(8,30),HM(9,30)),
    PI('a','לימודים','study',HM(10),HM(11),{canShorten:true,minDurationMin:30}),
    PI('b','טפסים','admin',HM(11),HM(12)),
    PI('c','סידורים','errand',HM(12,30),HM(13,30)),
    PI('d','קניות','shopping',HM(16,30),HM(17,15),{rigidity:'optional',canDrop:true})];
  const snapOf=(events)=>buildContextSnapshot(mkState(events,{}),{engine:false});
  const sn0=snapOf(base);const plan0=makePlan(sn0,mkItems());
  const T=(plan)=>Object.fromEntries(plan.items.map(x=>[x.itemId,x.startMin+'-'+x.endMin+':'+x.status]));
  const ctx=(nowMin)=>({today:MON,nowMin});
  const before=JSON.stringify(plan0);const sigBefore=sn0.sig;

  // 1) delay 20 → only what is after the change moves, by the minimum
  {const r=replan(plan0,{type:'delay',minutes:20},sn0,ctx(HM(10)));const t=T(r.plan);
   o.a1_delayMinimal=r.status==='repaired'||r.status==='ok';
   o.a2_delayShiftsOnlyAfter=t.a==='620-680:planned'&&t.b==='680-740:planned'&&t.c==='750-810:planned'&&t.d==='990-1035:planned';
   o.a3_pastUntouched=t.x==='510-570:planned';
   o.a4_hardEventUntouched=sn0.events.length===1&&sn0.events[0].startMin===HM(15);
   o.a5_noCutNoDrop=r.changes.every(c=>c.type==='moved')&&r.changes.length===2;
   o.a6_disruptionSmall=r.disruptionCost>0&&r.disruptionCost<2*(REPLAN_DISRUPTION.shiftBase+3);
   o.a7_newPlanIdLinked=r.plan.planId!==plan0.planId&&r.plan.supersedes===plan0.planId&&r.plan.items.every(x=>x.planId===r.plan.planId);
   o.a8_notesMentionPast=r.notes.some(n=>/כבר עבר/.test(n));
   o.a9_textPlain=mayaVoiceLint(replanSummaryText(r)).ok&&/זז מ/.test(replanSummaryText(r));}
  // 1b) a bigger delay that reaches the next hard event: still no touching of hard items, flexible ones are repaired
  {const r=replan(plan0,{type:'delay',minutes:180},sn0,ctx(HM(10)));
   o.b1_bigDelayHardSafe=r.plan.items.every(x=>x.status==='cancelled'||!(x.date===MON&&x.startMin<HM(16)&&x.endMin>HM(15)))&&r.status!=='error';}
  // 1c) delay while an item is actually in progress → it runs over, the rest ripples after it
  {const p=makePlan(sn0,mkItems().map(x=>x.ref==='a'?{...x,status:'started'}:x));const r=replan(p,{type:'delay',minutes:20},sn0,ctx(HM(10,50)));const t=T(r.plan);
   o.c1_startedRunsOver=t.a==='600-680:started'&&t.b==='680-740:planned'&&t.c==='750-810:planned';}
  // 2) a new HARD event in the middle: flexible items arrange around it; nothing else changes
  {const ev2=base.concat([EV('n','בדיקה רפואית',HM(11,30),HM(12,30))]);const sn=snapOf(ev2);
   const r=replan(plan0,{type:'new_event',eventId:'n'},sn,ctx(HM(10)));const t=T(r.plan);
   o.d1_repairedAround=r.status==='repaired'&&r.validation.ok;
   o.d2_onlyConflictingMoved=r.changes.length>=1&&r.changes.every(c=>c.itemId==='b'||c.itemId==='c');
   o.d3_noDrop=r.changes.every(c=>c.type!=='dropped')&&t.d==='990-1035:planned';
   o.d4_untouched=t.x==='510-570:planned'&&t.a==='600-660:planned';
   o.d5_hardEventsUnmoved=sn.events.length===2&&sn.events.every(e=>e.id==='m'?e.startMin===HM(15):e.startMin===HM(11,30));
   o.d6_mentionsEvent=r.notes.some(n=>/בדיקה רפואית/.test(n));}
  // 3) finished early → suggest using the time, never auto-move
  {const r=replan(plan0,{type:'item_done',itemId:'a',actualEnd:MON+'T10:30'},sn0,ctx(HM(10,30)));const t=T(r.plan);
   o.e1_doneRecorded=t.a==='600-630:done'&&r.plan.items.find(x=>x.itemId==='a').actual.endMin===630;
   o.e2_noAutoMove=r.changes.length===0&&t.b==='660-720:planned'&&r.disruptionCost===0;
   const op=r.opportunities[0];o.e3_suggestsPullForward=!!op&&op.type==='pull_forward'&&op.itemId==='b'&&op.gainMin===30&&op.to.startMin===630;
   o.e4_textAsks=/רוצה שאקדים/.test(replanSummaryText(r))&&mayaVoiceLint(replanSummaryText(r)).ok;}
  // 3b) finished late → ripples like a delay
  {const r=replan(plan0,{type:'item_done',itemId:'a',actualEnd:MON+'T11:20'},sn0,ctx(HM(11,20)));const t=T(r.plan);
   o.f1_doneLateRipples=t.a==='600-680:done'&&t.b==='680-740:planned'&&t.c==='750-810:planned';}
  // 4) cancelled → rest of the day untouched
  {const r=replan(plan0,{type:'item_cancelled',itemId:'b'},sn0,ctx(HM(10)));const t=T(r.plan);
   o.g1_restUntouched=r.changes.length===0&&r.disruptionCost===0&&t.a==='600-660:planned'&&t.c==='750-810:planned'&&t.b==='660-720:cancelled';
   o.g2_freeTimeOffered=r.opportunities.length>=1;}
  // 4b) cancelling a chain member detaches the rest in place
  {const ch=[PI('i1','נסיעה','travel',HM(10),HM(10,40),{chain:'c1',chainIdx:0,chainAnchor:{rel:'after',min:HM(10)}}),PI('i2','בית מדרש','religious',HM(10,40),HM(11,40),{chain:'c1',chainIdx:1,chainAnchor:{rel:'after',min:HM(10)}})];
   const r=replan(makePlan(sn0,ch),{type:'item_cancelled',itemId:'i1'},sn0,ctx(HM(9)));const i2=r.plan.items.find(x=>x.itemId==='i2');
   o.h1_chainDetached=i2.chain===null&&i2.startMin===HM(10,40)&&r.changes.length===0;}
  // 4c) a drive whose destinations are all cancelled goes away too; a drive that still has a destination stays
  {const mk=(sm)=>[PI('i1','נסיעה','travel',sm,sm+40,{chain:'c1',chainIdx:0,chainAnchor:{rel:'after',min:sm}}),PI('i2','בית מדרש','religious',sm+40,sm+100,{chain:'c1',chainIdx:1,chainAnchor:{rel:'after',min:sm}}),PI('i3','קניות','shopping',sm+100,sm+130,{chain:'c1',chainIdx:2,chainAnchor:{rel:'after',min:sm}})];
   const r1=replan(makePlan(sn0,mk(HM(10))),{type:'item_cancelled',itemId:'i2'},sn0,ctx(HM(9)));
   o.h2_driveStaysWhileDestinationLeft=r1.plan.items.find(x=>x.itemId==='i1').status==='planned';
   const r2=replan(makePlan(sn0,mk(HM(10)).slice(0,2)),{type:'item_cancelled',itemId:'i2'},sn0,ctx(HM(9)));
   o.h3_orphanDriveCancelled=r2.plan.items.find(x=>x.itemId==='i1').status==='cancelled'&&r2.changes.length===0&&r2.disruptionCost===0&&r2.notes.some(n=>/אין יותר לאן/.test(n));}
  // 5) "don't move the studies" → lockedByUser; a conflict with a locked item needs a decision, an unlocked one just moves
  {const r1=replan(plan0,{type:'user_request',text:'את הלימודים אל תזיז'},sn0,ctx(HM(9)));
   o.i1_locked=r1.plan.items.find(x=>x.itemId==='a').lockedByUser===true&&r1.plan.items.filter(x=>x.lockedByUser).length===1&&r1.changes.length===0;
   const ev2=base.concat([EV('n','בדיקה',HM(10,30),HM(11,30))]);const sn=snapOf(ev2);
   const rL=replan(r1.plan,{type:'new_event',eventId:'n'},sn,ctx(HM(9)));
   o.i2_lockedConflictAsks=rL.status==='needs_decision'&&rL.decisions.length>=1&&T(rL.plan).a==='600-660:planned';
   const rU=replan(plan0,{type:'new_event',eventId:'n'},sn,ctx(HM(9)));
   o.i3_unlockedMoves=rU.status==='repaired'&&rU.changes.some(c=>c.itemId==='a');
   o.i4_unknownText=replan(plan0,{type:'user_request',text:'תעשי לי סדר'},sn0,ctx(HM(9))).status==='needs_interpretation';
   o.i5_ambiguousAsks=replan(plan0,{type:'user_request',text:'אל תזיז את ה'},sn0,ctx(HM(9))).status==='needs_decision';}
  // 6) started / done / past items never move, whatever happens
  {const p=makePlan(sn0,mkItems().map(x=>x.ref==='b'?{...x,status:'started'}:x));
   const ev2=base.concat([EV('n','אירוע',HM(11,30),HM(12,30))]);const sn=snapOf(ev2);
   const r=replan(p,{type:'new_event',eventId:'n'},sn,ctx(HM(11,20)));
   o.j1_startedNeverMoves=T((r.plan||p)).b==='660-720:started'&&r.status==='needs_decision';
   const p2=makePlan(sn0,mkItems().map(x=>x.ref==='a'?{...x,status:'done'}:x));const r2=replan(p2,{type:'delay',minutes:30},sn0,ctx(HM(10,30)));
   o.j2_doneNeverMoves=T(r2.plan).a==='600-660:done'&&T(r2.plan).x==='510-570:planned';
   const rp=replan(plan0,{type:'calendar_changed'},snapOf(base.concat([EV('z','אירוע ערב',HM(19),HM(20))])),ctx(HM(14)));
   o.j3_pastNeverMoves=T(rp.plan).x==='510-570:planned'&&T(rp.plan).a==='600-660:planned'&&T(rp.plan).b==='660-720:planned';}
  // 6b) items on days that already passed are never touched, even if the calendar now collides with them
  {const prev='2026-11-15';const st=mkState(base.concat([{...EV('old','אירוע שהוסיפו אחורה',HM(10,30),HM(11,30)),date:prev}]));st.meta.today=prev;const sn=buildContextSnapshot(st,{engine:false});
   const p=makePlan(sn0,mkItems().concat([PI('y','משימה מאתמול','admin',HM(10),HM(11),{date:prev})]));
   const r=replan(p,{type:'calendar_changed'},sn,ctx(HM(9)));
   o.j4_pastDayUntouched=sn.events.some(e=>e.date===prev)&&r.plan.items.find(x=>x.itemId==='y').startMin===HM(10)&&r.plan.items.find(x=>x.itemId==='y').date===prev&&r.plan.items.find(x=>x.itemId==='y').status==='planned';}
  // 6c) an item already under way (never marked started): its start stays, its tail may be trimmed; if it can't be trimmed it is fixed
  {const evN=base.concat([EV('n','תור',HM(10,45),HM(11,30))]);const sn=snapOf(evN);
   const r=replan(plan0,{type:'new_event',eventId:'n'},sn,ctx(HM(10,20)));const a=r.plan.items.find(x=>x.itemId==='a');
   o.n1_inProgressTrimmed=r.status!=='needs_decision'&&a.startMin===HM(10)&&a.endMin<=HM(10,45)&&a.endMin-a.startMin>=45;
   const p2=makePlan(sn0,mkItems().map(x=>x.ref==='a'?{...x,canShorten:false}:x));const r2=replan(p2,{type:'new_event',eventId:'n'},sn,ctx(HM(10,20)));
   o.n2_inProgressUntrimmableAsks=r2.status==='needs_decision'&&T(r2.plan).a==='600-660:planned';}
  // 3c) a suggestion must fit inside the time that actually opened up, and prefer a real task over an optional one
  {const it=[PI('a','לימודים','study',HM(10),HM(11)),PI('f','תור קבוע','personal',HM(11,30),HM(12),{rigidity:'hard',canMove:false}),PI('b','טפסים ארוכים','admin',HM(12),HM(14)),PI('d','קניות','shopping',HM(14,30),HM(15),{rigidity:'optional',canDrop:true})];
   const p=makePlan(sn0,it);
   const rNo=replan(makePlan(sn0,it.filter(x=>x.ref!=='d')),{type:'item_done',itemId:'a',actualEnd:MON+'T10:30'},sn0,ctx(HM(10,30)));   // 30 min freed, nothing fits in it
   o.o1_noImpossibleSuggestion=rNo.opportunities.every(x=>x.type==='free_time');
   const rYes=replan(p,{type:'item_cancelled',itemId:'a'},sn0,ctx(HM(9)));                       // 10:00–11:30 is free: the 30-min optional fits, the 2h task doesn't
   o.o2_fitsAndPrefers=rYes.opportunities.length===1&&rYes.opportunities[0].itemId==='d'&&rYes.opportunities[0].to.startMin>=HM(10)&&rYes.opportunities[0].to.endMin<=HM(11);}
  // 7) nothing happened → unchanged; same input → same output; inputs not mutated
  {const r=replan(plan0,{type:'calendar_changed'},sn0,ctx(HM(9)));
   o.k1_unchanged=r.status==='unchanged'&&r.changes.length===0&&r.disruptionCost===0;
   const r1=replan(plan0,{type:'delay',minutes:20},sn0,ctx(HM(10))),r2=replan(plan0,{type:'delay',minutes:20},sn0,ctx(HM(10)));
   o.k2_deterministic=JSON.stringify(r1)===JSON.stringify(r2);
   o.k3_inputsIntact=JSON.stringify(plan0)===before&&sn0.sig===sigBefore&&Object.isFrozen(sn0)&&sn0.events.length===1;
   o.k4_badInput=replan(plan0,{type:'delay',minutes:-5},sn0,ctx(HM(10))).status==='error'&&replan(plan0,{type:'zzz'},sn0,ctx(HM(10))).status==='error'&&replan(null,{type:'delay',minutes:5},sn0,ctx(10)).status==='error';}
  // 8) disruption cost orders things the way a person would
  {const D=planDisruptionCost,A=[{itemId:'q',kind:'admin',date:MON,startMin:600,endMin:660,status:'planned'}];
   const sh=D(A,[{...A[0],startMin:620,endMin:680}]).total,cut=D(A,[{...A[0],endMin:630}]).total,dr=D(A,[{...A[0],status:'cancelled'}]).total,dy=D(A,[{...A[0],date:'2026-11-17'}]).total;
   o.l1_order=D(A,A).total===0&&sh>0&&sh<cut&&cut<dr&&sh<dy&&D([{...A[0],kind:'study'}],[{...A[0],kind:'study',status:'cancelled'}]).total>dr;}
  // 9) the pseudo "past" block: repairs never place anything before now
  {const ev2=base.concat([EV('n','בדיקה',HM(10),HM(12))]);const r=replan(makePlan(sn0,mkItems().filter(x=>x.ref!=='x').map(x=>x.ref==='a'?{...x,startMin:HM(10),endMin:HM(11)}:x)),{type:'new_event',eventId:'n'},snapOf(ev2),ctx(HM(10)));
   o.m1_nothingBeforeNow=r.status==='needs_decision'||r.plan.items.every(x=>x.status==='cancelled'||x.date!==MON||x.startMin>=HM(10)||x.status==='done');}
  return o;
})
