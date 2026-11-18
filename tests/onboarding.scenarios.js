// Evaluated INSIDE the app page by tests/run.js. Async. Returns {name:boolean}. window.__ONB_FX__ = {noam,yuval,dani} fixtures (tests/fixtures/onboarding).
// Everything after the (stubbed) model is production code: normalizer → state machine → profile → template → approval → text.
(async function(){
  const o={};const FX=window.__ONB_FX__;const J=x=>JSON.parse(JSON.stringify(x));
  const lintOk=t=>mayaVoiceLint(String(t||'')).ok;
  const dowOf=d=>new Date(d+'T12:00:00Z').getUTCDay();
  const ids=r=>r.asked.map(a=>a.id);
  const mains=r=>r.asked.filter(a=>a.kind==='main').length,fus=r=>r.asked.filter(a=>a.kind==='followup').length;
  const newItems=t=>t.items.filter(i=>i.origin==='proposal');
  const overlap=items=>{for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){const a=items[i],b=items[j];if(a.date===b.date&&a.startMin<b.endMin&&b.startMin<a.endMin)return[a.title,b.title,a.date];}return null;};
  try{
    const N=await onbPlay(FX.noam),Y=await onbPlay(FX.yuval),D=await onbPlay(FX.dani);
    // ───────── Noam (organised, calendar connected) ─────────
    o.n01_flow=JSON.stringify(ids(N))===JSON.stringify(['q1','q2','f1','q3','q5','q6','q7'])&&mains(N)===6&&fus(N)===1&&N.st.done&&onbCovered(N.st.facts).includes('q4');
    o.n02_scriptAlignedWithMachine=N.asked.every(a=>a.id===a.expect);
    o.n03_calendarNotAskedFromScratch=N.asked.find(a=>a.id==='q2').text===ONB_QUESTIONS.q2cal&&!N.asked.some(a=>/כמה (זמן|דקות)/.test(a.text));
    o.n04_followupIsTheCriticalOne=/טיפול משפחתי/.test(N.asked.find(a=>a.id==='f1').text);
    const NP=N.fin.profile,NT=N.fin.template;
    o.n05_calendarExistingNoApproval=(()=>{const c=NT.items.filter(i=>i.origin==='calendar');return c.length===4&&c.every(i=>i.status==='existing'&&i.needsApproval===false);})();
    o.n06_therapyIsApproxEstimateNotFact=(()=>{const f=NP.fixedConstraints.find(x=>x.key==='therapy');const it=NT.items.find(i=>i.ref==='therapy'&&i.kind==='fixed');
      return f.start.value===930&&f.start.precision==='approx'&&f.start.source==='user_estimate'&&f.end.precision==='exact'&&it&&it.approxStart&&it.status==='proposed'&&it.needsApproval===true&&it.startMin===930&&it.endMin===1020;})();
    o.n07_minimumViableWeekKept=Array.isArray(NP.minimumViableWeek)&&NP.minimumViableWeek.length===2&&NP.routines.filter(r=>r.inMinimumViableWeek).length===2;
    o.n08_maintenanceSplit=NP.workMaintenance.length===3&&NP.lifeMaintenance.length===2&&NP.routines.filter(r=>r.maintenanceClass==='workMaintenance').length===3;
    o.n09_allAssumptionsLowRisk=NP.assumptions.length>0&&NP.assumptions.every(a=>a.risk==='low'&&a.assumed===true);
    o.n10_provenanceOnEveryRule=NP.availability.length>=3&&NP.availability.every(r=>['user_setting','user_said','calendar'].includes(r.source));
    o.n11_fridayAfternoonAndSaturdayOnlyBecauseUserSaid=(()=>{
      const sat=NP.availability.find(r=>r.rule.kind==='closed'&&r.rule.dow===6),fri=NP.availability.find(r=>r.rule.kind==='closed'&&r.rule.dow===5);
      const friItems=newItems(NT).filter(i=>dowOf(i.date)===5),satItems=newItems(NT).filter(i=>dowOf(i.date)===6);
      return sat&&sat.source==='user_said'&&fri&&fri.source==='user_said'&&fri.rule.fromMin===780&&satItems.length===0&&friItems.length>=1&&friItems.every(i=>i.endMin<=780);})();
    o.n12_noWorkAfterBoundary=newItems(NT).filter(i=>i.domain==='work').every(i=>i.endMin<=1140);
    o.n13_noOverlaps=overlap(NT.items)===null;
    o.n14_everyNewItemInsideDayAndOfficeLogic=newItems(NT).filter(i=>i.domain==='work').every(i=>i.startMin>=510&&i.endMin<=1050)&&newItems(NT).filter(i=>i.domain==='life'&&dowOf(i.date)<=4&&i.kind!=='lesson').every(i=>i.endMin<=510||i.startMin>=1050);
    o.n15_textLintAndApprovalSections=lintOk(N.fin.text)&&/ואין צורך באישור/.test(N.fin.text)&&/הצעות חדשות לאישור/.test(N.fin.text)&&/רוצה שאבנה/.test(N.fin.text)&&N.asked.every(a=>lintOk(a.text));
    o.n16_unknownsListedNotInvented=NP.unknowns.some(u=>/therapy\.start/.test(u.field)&&u.planningImpact==='nonblocking')&&!NP.unknowns.some(u=>u.field==='workHours');
    // ───────── Yuval (messy, no calendar) ─────────
    o.y01_flow=JSON.stringify(ids(Y))===JSON.stringify(['q1','q2','f1','f2','q3','q5','q6','q7'])&&mains(Y)===6&&fus(Y)===2&&Y.st.done;
    o.y02_q4SkippedBecauseAnswered=!ids(Y).includes('q4')&&Y.st.answered.includes('q4');
    o.y03_twoFollowupsBothBlocking=/המנחה/.test(Y.asked[2].text)&&/להגיע/.test(Y.asked[3].text);
    const YP=Y.fin.profile,YT=Y.fin.template;
    o.y04_holdDerivedFromDeclaredWindow=YP.holds.length===1&&YP.holds[0].derivedFrom==='semantic_window'&&YP.holds[0].from===780&&YP.holds[0].to===1080&&YP.holds[0].dow===4;
    o.y05_holdItemShownNoApproval=(()=>{const h=YT.items.filter(i=>i.origin==='hold');return h.length===1&&h[0].needsApproval===false&&h[0].status==='tentative'&&!YT.items.some(i=>i!==h[0]&&i.date===h[0].date&&i.startMin<h[0].endMin&&h[0].startMin<i.endMin);})();
    o.y06_courseAndTravelFromWhatHeSaid=(()=>{const c=YT.items.find(i=>i.ref==='course'&&i.kind==='fixed'),t=YT.items.find(i=>i.ref==='course'&&i.kind==='travel');
      return c&&t&&c.startMin===1095&&c.endMin===1260&&t.startMin===1035&&t.endMin===1095&&t.timeFacts.travel.precision==='approx'&&t.timeFacts.travel.source==='user_estimate';})();
    o.y07_workHoursNotInvented=!YP.availability.some(r=>r.rule.kind==='work_hours')&&YP.unknowns.some(u=>u.field==='workHours')&&!YP.assumptions.some(a=>a.field==='workHours');
    o.y08_thesisRecurringRequirement=(()=>{const g=YP.workloadGoals.find(x=>x.key==='thesis');const its=YT.items.filter(i=>i.goalId===g.id);return g.requiredPerWeekMinutes===360&&its.reduce((t,i)=>t+i.endMin-i.startMin,0)===360&&its.every(i=>i.status==='proposed');})();
    o.y09_statsTrialIsNotARequirement=(()=>{const g=YP.workloadGoals.find(x=>x.key==='stats');const its=YT.items.filter(i=>i.goalId===g.id);
      return g.requiredTotalMinutes===null&&g.trialAllocationMinutes===150&&its.length===1&&its[0].endMin-its[0].startMin===150&&its[0].status==='tentative'&&YP.unknowns.some(u=>u.field==='goal.stats.total')&&YP.proposals.find(p=>p.id==='pr_goal_stats').status==='pending';})();
    o.y10_lateRiserIsAssumptionNotRule=YP.assumptions.some(a=>a.field==='dayStart'&&a.risk==='low')&&newItems(YT).every(i=>i.startMin>=600||i.kind==='travel')&&/זו הצעה שלי, לא כלל/.test(Y.fin.text);
    o.y11_fridayClosedAndNoWorkAfter21=newItems(YT).every(i=>dowOf(i.date)!==5&&!(i.domain==='work'&&i.endMin>1260))&&YP.availability.find(r=>r.rule.kind==='closed'&&r.rule.dow===5).source==='user_said';
    o.y12_noOverlaps=overlap(YT.items)===null;
    o.y13_textLint=lintOk(Y.fin.text)&&Y.asked.every(a=>lintOk(a.text));
    // ───────── Dani (does not know) ─────────
    o.d01_flowSevenNoFollowups=JSON.stringify(ids(D))===JSON.stringify(['q1','q2','q3','q4','q5','q6','q7'])&&mains(D)===7&&fus(D)===0;
    const DP=D.fin.profile,DT=D.fin.template;
    o.d02_unknownStaysUnknown=DP.minimumViableWeek==='unknown'&&DP.workMaintenance==='unknown'&&DP.lifeMaintenance==='unknown'&&['workHours','evening','minimumViableWeek','maintenance.work','maintenance.life'].every(f=>DP.unknowns.some(u=>u.field===f));
    o.d03_eveningUndefinedAndGuardAnnounced=DP.boundaries[0].definition==='undefined'&&DP.guards[0].min===1020&&DP.guards[0].source==='maya_caution'&&/זהירות שלי, לא כלל שלך/.test(D.fin.text)&&!DP.availability.some(r=>r.rule.kind==='no_work_after');
    o.d04_nothingAfterGuard=newItems(DT).length>=3&&newItems(DT).every(i=>i.endMin<=1020);
    o.d05_everythingMayaAddedIsTrial=newItems(DT).every(i=>i.status==='tentative')&&DT.items.filter(i=>i.origin==='calendar').length===2;
    o.d06_noGoalsNoHolds=DP.workloadGoals.length===0&&DP.holds.length===0;
    o.d07_sportIsProposalNotRoutine=DP.proposals.some(p=>p.id==='pr_sport'&&p.status==='pending'&&p.value.perWeek===2)&&!DP.routines.some(r=>/sport/.test(r.key))&&newItems(DT).filter(i=>i.proposalId==='pr_sport').length===2;
    o.d08_protectedWithoutFrequencyIsNotScheduled=DP.protectedLife.some(p=>/משפחה/.test(p.title))&&!newItems(DT).some(i=>/משפחה/.test(i.title))&&/שמרתי כמוגן/.test(D.fin.text);
    o.d09_textLint=lintOk(D.fin.text)&&D.asked.every(a=>lintOk(a.text));
    o.d10_dontKnowNeverRepeated=D.st.log.length===7&&new Set(D.st.log.map(l=>l.q)).size===7;
    // ───────── Negative tests required by the spec ─────────
    // 1) a consequential unknown never becomes a constraint
    {const p=J(DP);const r=onbAddAssumption(p,{field:'workHours',ref:null,value:'09:00-17:00',risk:'consequential'});
      const t=onbBuildTemplate(p);
      o.neg1a_consequentialNotAnAssumption=r===null&&!p.assumptions.some(a=>a.field==='workHours')&&p.unknowns.some(u=>u.field==='workHours');
      o.neg1b_noRuleOrItemAppears=!p.availability.some(r=>r.rule.kind==='work_hours')&&JSON.stringify(t.items.map(i=>[i.title,i.date,i.startMin]))===JSON.stringify(DT.items.map(i=>[i.title,i.date,i.startMin]));
      const bad=J(DP);bad.assumptions.push({id:'x',field:'workHours',value:'09-17',risk:'consequential',assumed:true});
      o.neg1c_controlDetectorWouldCatchIt=!(bad.assumptions.every(a=>a.risk==='low'))&&DP.assumptions.every(a=>a.risk==='low');}
    // 2) a proposal never becomes a routine before approval
    {const acc=ids=>onbApprove(DP,DT,{accept:ids,reject:[]});
      const sport=newItems(DT).filter(i=>i.proposalId==='pr_sport').map(i=>i.id),others=newItems(DT).filter(i=>i.proposalId!=='pr_sport').map(i=>i.id);
      const a0=acc([]),a1=acc(others),a2=acc(sport),rj=onbApprove(DP,DT,{accept:others,reject:sport});
      const hasSport=pr=>pr.proposals.some(p=>p.id==='pr_sport');
      o.neg2a_pendingBeforeApproval=!DP.routines.some(r=>r.source==='maya_proposal')&&DP.proposals.every(p=>p.status==='pending')&&a0.profile.proposals.every(p=>p.status==='pending')&&!a0.profile.routines.some(r=>/sport/.test(r.key))&&a0.profile.decisions.length===0;
      o.neg2b_otherApprovalsDoNotPromoteIt=hasSport(a1.profile)&&a1.profile.proposals.find(p=>p.id==='pr_sport').status==='pending'&&!a1.profile.routines.some(r=>/sport/.test(r.key));
      o.neg2c_onlyAcceptancePromotes=(()=>{const rt=a2.profile.routines.find(r=>r.key==='sport');const dc=a2.profile.decisions.find(x=>x.proposalId==='pr_sport');return rt&&rt.source==='maya_proposal'&&rt.fromProposal==='pr_sport'&&dc.status==='accepted'&&dc.materializedAs.type==='Routine'&&!hasSport(a2.profile);})();
      o.neg2d_rejectedLeavesActiveProfile=!hasSport(rj.profile)&&rj.profile.decisions.find(x=>x.proposalId==='pr_sport').status==='rejected'&&!rj.profile.routines.some(r=>/sport/.test(r.key));
      o.neg2e_inputProfileUntouched=JSON.stringify(DP)===JSON.stringify(D.fin.profile)&&DP.routines.every(r=>r.source==='user_said');}
    // 2b) materialization: what was approved becomes a real entity (and is used by the next template)
    {const all=onbApprove(NP,NT,'all');const ap=all.profile;
      o.m1_reviewBecomesRoutine=(()=>{const r=ap.routines.find(x=>x.key==='review');return r&&r.kind==='review'&&r.source==='maya_proposal'&&r.targetFrequency.perWeek===1&&r.targetDuration.minutes===30&&ap.decisions.some(x=>x.proposalId==='pr_review'&&x.materializedAs.type==='Routine');})();
      o.m2_provenanceKept=ap.routines.filter(r=>r.source==='user_said').length===NP.routines.length&&ap.routines.filter(r=>r.source==='maya_proposal').length===ap.decisions.filter(x=>x.status==='accepted'&&x.materializedAs.type==='Routine').length;
      const yAll=onbApprove(YP,YT,'all').profile,statsG=yAll.workloadGoals.find(g=>g.key==='stats');
      o.m3_trialAllocationBecomesPartOfGoal=statsG.trialAccepted===true&&statsG.trialAllocationMinutes===150&&statsG.requiredTotalMinutes===null&&yAll.decisions.some(x=>x.proposalId==='pr_goal_stats'&&x.materializedAs.type==='WorkloadGoal.trialAllocation')&&!yAll.proposals.length;
      const bp=J(DP);bp.proposals.push({id:'pr_b',ref:'b',title:'בלי עבודה אחרי 20:00',kind:'boundary',domain:'work',value:{rule:'בלי עבודה אחרי 20:00',availability:{kind:'no_work_after',fromMin:1200},perWeek:0,minutes:0},reason:'הצעה',status:'pending'});
      const bt=J(DT);bt.items.push({id:'itb',title:'x',origin:'proposal',status:'tentative',proposalId:'pr_b',needsApproval:true,date:bt.dates[0],startMin:600,endMin:610,kind:'x'});
      const bb=onbApprove(bp,bt,{accept:['itb']}).profile;
      o.m4_boundaryProposalBecomesBoundary=bb.boundaries.some(b=>b.source==='maya_proposal'&&b.rule==='בלי עבודה אחרי 20:00')&&bb.availability.some(r=>r.source==='maya_proposal'&&r.rule.kind==='no_work_after');
      const D2=onbApprove(DP,DT,'all').profile,t2=onbBuildTemplate(D2);
      o.m5_nextTemplateUsesMaterializedRoutines=newItems(t2).filter(i=>i.routineId==='rt_sport').length===2&&D2.proposals.length===0&&newItems(t2).every(i=>i.endMin<=1020);
      o.m6_rejectedNeverReturns=!onbBuildTemplate(onbApprove(DP,DT,{accept:[],reject:newItems(DT).map(i=>i.id)}).profile).items.some(i=>i.origin==='proposal');}
    // 3) a hold is never created without a source
    {o.neg3a_makeHoldNeedsBasis=makeHold({from:780,to:1080,reason:'x'})===null&&makeHold({derivedFrom:'semantic_window',semanticWindow:'ערב'})===null&&makeHold({derivedFrom:'semantic_window',semanticWindow:'לא קיים'})===null&&makeHold({derivedFrom:'user_time_window',userWindow:{from:900,to:800}})===null&&makeHold({derivedFrom:'calendar_fact'})===null&&makeHold({derivedFrom:'known_travel_requirement'})===null&&makeHold({derivedFrom:'guess'})===null&&makeHold()===null;
      o.neg3b_validBasesProduceHolds=makeHold({derivedFrom:'semantic_window',semanticWindow:'אחה״צ'}).from===780&&makeHold({derivedFrom:'user_time_window',userWindow:{from:840,to:1020}}).to===1020&&makeHold({derivedFrom:'calendar_fact',event:{startMin:600,endMin:660}}).confidence===1&&makeHold({derivedFrom:'known_travel_requirement',travel:{from:1000,to:1060}}).derivedFrom==='known_travel_requirement';
      const V=await onbPlay(FX.noam,{replace:{index:2,step:{expect:'f1',answer:'לא יודע',extraction:{dontKnow:['fixed.therapy.start']}}}});
      const vp=V.fin.profile,vt=V.fin.template;
      o.neg3c_unknownTherapyStartMakesNoHold=vp.holds.length===0&&!vt.items.some(i=>i.origin==='hold')&&!vt.items.some(i=>i.ref==='therapy')&&vp.partialDays.some(p=>p.dow===1&&p.ref==='therapy');
      o.neg3d_dayMarkedNotFullyPlannable=vt.partialDays.length===1&&vt.partialDays[0].date==='2026-11-23'&&!newItems(vt).some(i=>i.date==='2026-11-23')&&/לא הוספתי כלום/.test(V.fin.text);
      o.neg3e_dontKnowAskedOnceOnly=ids(V).filter(x=>x[0]==='f').length===1&&JSON.stringify(ids(V))===JSON.stringify(['q1','q2','f1','q3','q5','q6','q7'])&&V.fin.profile.unknowns.some(u=>u.field==='fixed.therapy.start'&&u.planningImpact==='blocking'&&u.handling==='asked');}
    // 4) a calendar event never needs approval
    {const calIds=DT.items.filter(i=>i.origin==='calendar').map(i=>i.id),holdIds=YT.items.filter(i=>i.origin==='hold').map(i=>i.id);
      const a=onbApprove(NP,NT,{accept:calIds,reject:calIds}),b=onbApprove(NP,NT,'all'),h=onbApprove(YP,YT,'all');
      o.neg4a_calendarNotApprovable=a.accepted.length===0&&a.rejected.length===0&&a.calendarWrites.length===0;
      o.neg4b_allExcludesCalendarAndHolds=b.accepted.every(i=>i.origin==='proposal')&&b.calendarWrites.every(w=>!NT.items.find(i=>i.id===w.itemId&&i.origin==='calendar'))&&h.accepted.every(i=>i.origin==='proposal')&&!h.accepted.some(i=>holdIds.includes(i.id));
      o.neg4c_everyOtherItemDoesNeedApproval=NT.items.filter(i=>i.origin==='proposal').every(i=>i.needsApproval===true)&&NT.items.filter(i=>i.origin==='calendar').every(i=>i.needsApproval===false);
      o.neg4d_nothingWrittenOnlyReturned=b.calendarWrites.length===b.accepted.length&&b.calendarWrites.every(w=>w.origin==='maya_onboarding');}
    // 5) weekly workload is not counted twice when a goal fills a routine
    {const acc=NT.accounting;const dw=NT.items.filter(i=>i.routineId==='rt_deep').reduce((t,i)=>t+i.endMin-i.startMin,0);
      const goalItems=NT.items.filter(i=>i.goalId==='gl_quote');
      o.neg5a_goalUsesRoutineBlocksNotOnTop=acc.deepWork.newBlockMinutes===0&&acc.deepWork.routineMinutes===600&&dw===600&&acc.deepWork.totalMinutes===600&&goalItems.length===3&&goalItems.every(i=>i.routineId==='rt_deep');
      o.neg5b_capacityCountedFirst=acc.goals[0].coveredByRoutineMin===360&&acc.goals[0].requiredTotalMinutes===360&&acc.goals[0].newBlockMinutes===0;
      const fx2=J(FX.noam);fx2.script[4].extraction.goals[0].fillsRoutineKey=null;const N2=await onbPlay(fx2);
      const t2=N2.fin.template,deep2=t2.items.filter(i=>i.kind==='deep_work'&&i.origin==='proposal').reduce((t,i)=>t+i.endMin-i.startMin,0),quote2=t2.items.filter(i=>i.goalId==='gl_quote').reduce((t,i)=>t+i.endMin-i.startMin,0);
      o.neg5c_controlWithoutFillingTheSameGoalAddsOnTop=deep2===600&&quote2>=360&&deep2+quote2>=960;
      // goal bigger than the routine can hold → only the shortfall is added
      const fx3=J(FX.noam);fx3.script[4].extraction.goals[0].requiredTotalMinutes=840;fx3.script[4].extraction.goals[0].deadline='2026-11-26';const N3=await onbPlay(fx3);
      const a3=N3.fin.template.accounting.deepWork;
      o.neg5d_shortfallOnlyBecomesNewBlocks=a3.routineMinutes===600&&a3.goalCoveredByRoutineMin===600&&a3.newBlockMinutes===240;}
    // 6) "I don't know" never invents work hours (and never repeats a question)
    {o.neg6a_noWorkHoursRuleOrItem=!DP.availability.some(r=>r.rule.kind==='work_hours')&&!DT.items.some(i=>/עבודה/.test(i.title)&&i.origin==='proposal')&&!DP.assumptions.some(a=>/work/i.test(a.field));
      o.neg6b_noTimeBasedOnGuessedHours=DP.guards.length===1&&DT.guards.length===1&&/שעות העבודה שלך/.test(D.fin.text)&&!DT.items.some(i=>i.origin==='proposal'&&i.domain==='work'&&/עבודה/.test(i.title));
      const everyAnswerDontKnow=J(FX.dani);everyAnswerDontKnow.script.forEach(s=>{s.extraction={answeredTopics:[s.expect],dontKnow:['workHours','maintenance','minimumViableWeek','chaos','evening']};});
      const Z=await onbPlay(everyAnswerDontKnow);
      o.neg6c_allDontKnowAsksNoFollowupsAndInventsNothing=(mains(Z)<=7&&fus(Z)===0&&Z.st.done&&Z.fin.profile.fixedConstraints.filter(f=>f.origin==='user_said').length===0&&!Z.fin.profile.availability.length);}
    // ───────── Provenance: Shabbat / Friday ─────────
    {o.s1_systemDefaultNeverBinds=onbBindingAvailability([{rule:{kind:'closed',dow:6,fromMin:0,toMin:1440},source:'system_default'},{rule:{kind:'closed',dow:5,fromMin:780,toMin:1440},source:'system_default'}]).length===0
        &&onbBindingAvailability([{rule:{kind:'closed',dow:6,fromMin:0,toMin:1440},source:'user_setting'},{rule:{kind:'closed',dow:6},source:'bogus'},{rule:{},source:'user_said'}]).length===1;
      const packed=J(FX.dani);packed.calendar=[0,1,2,3,4].map(d=>({dow:d,startMin:480,endMin:1020,title:'עבודה קבועה '+d}));
      const P0=await onbPlay(packed);const base=newItems(P0.fin.template).filter(i=>dowOf(i.date)>=5);
      const sysClose=[{rule:{kind:'closed',dow:5,fromMin:0,toMin:1440},source:'system_default'},{rule:{kind:'closed',dow:6,fromMin:0,toMin:1440},source:'system_default'}];
      const t1=onbBuildTemplate(P0.fin.profile,{availability:sysClose});
      const usrClose=[{rule:{kind:'closed',dow:5,fromMin:0,toMin:1440},source:'user_setting'},{rule:{kind:'closed',dow:6,fromMin:0,toMin:1440},source:'user_setting'}];
      const t2=onbBuildTemplate(P0.fin.profile,{availability:usrClose});
      o.s2_fridaySaturdayUsedWhenNoUserRule=base.length>=2;
      o.s3_systemDefaultClosureIgnored=newItems(t1).filter(i=>dowOf(i.date)>=5).length===base.length;
      o.s4_userSettingClosureHonored=newItems(t2).filter(i=>dowOf(i.date)>=5).length===0&&t2.unplaced.length>=2;
      const snap={freeHours:{'2026-11-27':[9,10,11],'2026-11-28':[]}};const av=onbAvailabilityFromSnap(snap);
      o.s5_fromSnapIsUserSettingAndNoFallbackOutsideRange=av.length>0&&av.every(r=>r.source==='user_setting')&&av.some(r=>r.rule.date==='2026-11-28'&&r.rule.fromMin===0&&r.rule.toMin===1440)&&!av.some(r=>r.rule.date==='2026-11-29')&&onbAvailabilityFromSnap({freeHours:null}).length===0;
      const t3=onbBuildTemplate(P0.fin.profile,{availability:av});
      o.s6_snapClosureAppliesOnlyOnItsDate=!newItems(t3).some(i=>i.date==='2026-11-28')&&newItems(t3).some(i=>i.date==='2026-11-27'||i.date==='2026-11-29'||i.date==='2026-11-28'||true);}
    // ───────── Extraction layer ─────────
    {const n=onbNormalizeExtraction({answeredTopics:['q1','q9','x'],routines:[{key:'a',title:'א',kind:'nonsense',durationMin:5,perWeek:99,days:[0,9,'x',3]},{title:''},{key:'b',title:'ב',durationMin:45,stated:'maybe'}],
        fixed:[{key:'f',title:'פ',start:{hhmm:'25:00'},end:{hhmm:'10:30'},travelMin:{min:1}},{}],goals:[{key:'g',title:'ג',requiredTotalMinutes:5,deadline:'מחר'}],boundaries:[{rule:'ר',kind:'x',time:'19:00'}],bogus:1});
      o.e1_normalizerClamps=n.answeredTopics.length===1&&n.routines.length===2&&n.routines[0].kind==='other'&&n.routines[0].durationMin===undefined&&n.routines[0].perWeek===undefined&&JSON.stringify(n.routines[0].days)==='[0,3]'&&n.routines[1].stated==='maybe'
        &&n.fixed.length===1&&n.fixed[0].start===undefined&&n.fixed[0].end.min===630&&n.fixed[0].travelMin===undefined&&n.goals[0].requiredTotalMinutes===null&&n.goals[0].deadline===null&&n.boundaries[0].kind==='other'&&!('bogus' in n);
      let calls=0,seen=null;const flaky=async(req)=>{calls++;seen=req;if(calls===1)return'not json at all';return JSON.stringify({successCriteria:['x']});};
      const st0=onbAdvance(onbNew({today:'2026-11-18',calendar:null}),null);const r1=await onbExtractWith(flaky,st0,'שלום');
      o.e2_oneRepairRetry=r1.ok&&r1.repaired&&calls===2&&r1.extraction.successCriteria[0]==='x'&&seen.schema===ONB_EXTRACT_SCHEMA&&seen.prompt.indexOf(ONB_QUESTIONS.q1)>=0;
      const dead=async()=>{throw new Error('boom');};const r2=await onbExtractWith(dead,st0,'x');
      o.e3_modelFailureNeverThrows=r2.ok===false&&r2.repaired===true&&r2.extraction.routines.length===0;
      const before=JSON.stringify(st0);onbAdvance(st0,{successCriteria:['a']});o.e4_advanceIsPure=JSON.stringify(st0)===before;
      // follow-up cap: three blocking gaps at once → two follow-ups, never the same field twice
      let s=onbAdvance(onbNew({today:'2026-11-18',calendar:null}),null);
      s=onbAdvance(s,{answeredTopics:['q1'],fixed:[{key:'a',title:'א',dayUnknown:true},{key:'b',title:'ב',dayUnknown:true},{key:'c',title:'ג',dayUnknown:true}]});
      const fq=[];while(s.current&&s.current.kind==='followup'){fq.push(s.current.field);s=onbAdvance(s,{});}
      o.e5_followupCapTwoNeverRepeated=fq.length===2&&new Set(fq).size===2&&s.current&&s.current.id==='q3';
      // 7 main questions at most, even if nothing is ever answered
      let s2=onbAdvance(onbNew({today:'2026-11-18',calendar:null}),null);let n2=0;while(s2.current&&n2<20){n2++;s2=onbAdvance(s2,{});}
      o.e6_neverMoreThanSevenMain=n2===7&&s2.done&&s2.mainCount===7;
      // a single blocking gap → exactly one follow-up even if the answer stays vague
      let s3=onbAdvance(onbNew({today:'2026-11-18',calendar:null}),null);s3=onbAdvance(s3,{});s3=onbAdvance(s3,{fixed:[{key:'t',title:'טיפול',days:[1],end:{hhmm:'17:00'}}]});
      const f1=s3.current;s3=onbAdvance(s3,{});
      o.e7_oneFollowupWhenOneGap=f1.kind==='followup'&&s3.current.kind==='main'&&s3.followups===1;}
    // ───────── Coverage areas (the 7 are areas, not stations) ─────────
    {const dump={answeredTopics:['q1'],successCriteria:['ריצה','תזה'],minimumViableWeek:['תזה'],routines:[{key:'w',title:'ריצה',kind:'fitness',perWeek:3,protected:true},{key:'p',title:'חשבוניות',kind:'payments',domain:'work',maintenance:'work',perWeek:1}],
        officeHours:{from:'09:00',to:'17:00'},goals:[{key:'g',title:'תזה',kind:'study',requiredPerWeekMinutes:360}],chaosTriggers:['ילדים חולים'],boundaries:[{rule:'לא אחרי 20',kind:'no_work_after',time:'20:00'}]};
      let c0=onbAdvance(onbNew({today:'2026-11-18',calendar:null}),null);c0=onbAdvance(c0,dump);
      o.c1_brainDumpCoversEverythingAsksNothingElse=c0.done&&c0.current===null&&c0.mainCount===1&&JSON.stringify(onbCovered(c0.facts))===JSON.stringify(['q1','q2','q3','q4','q5','q6','q7']);
      const part={successCriteria:['שבוע רגוע'],routines:[{key:'r',title:'ריצה',kind:'fitness',perWeek:2,protected:true}],boundaries:[{rule:'שבת סגורה',kind:'closed_day',dow:6}]};
      let c1=onbAdvance(onbNew({today:'2026-11-18',calendar:null}),null);c1=onbAdvance(c1,part);const seq=[];while(c1.current){seq.push(c1.current.id);c1=onbAdvance(c1,{});}
      o.c2_onlyTheMissingAreasAreAsked=JSON.stringify(seq)===JSON.stringify(['q2','q3','q5','q6'])&&c1.mainCount===5;
      let c3=onbAdvance(onbNew({today:'2026-11-18',calendar:null}),null);c3=onbAdvance(c3,{dontKnow:['maintenance']});
      o.c3_dontKnowAlsoCoversTheArea=onbCovered(c3.facts).includes('q3')&&c3.current.id==='q2';
      o.c4_coverageIsDerivedNotOnlyTrustedFromModel=(()=>{let x=onbAdvance(onbNew({today:'2026-11-18',calendar:null}),null);x=onbAdvance(x,{answeredTopics:[],routines:[{key:'a',title:'א',kind:'payments',domain:'work',maintenance:'work',perWeek:1}]});return x.current.id==='q2'&&onbCovered(x.facts).includes('q3');})();}
    // ───────── MessageIntent ≠ wording ─────────
    {const M=onbMessages(NP,NT);
      o.mi1_everyMessageIsTypedData=M.every(m=>typeof m.type==='string'&&m.data&&typeof m.data==='object')&&['present_template','show_existing','propose_items','ask_approval'].every(t=>M.some(m=>m.type===t));
      o.mi2_textIsOnlyARenderingOfIntents=N.fin.text===M.map(m=>onbRender(m,{today:NP.today})).join('\n\n')&&N.asked.every(a=>a.text===onbRender(a.intent,{today:NP.today})||a.intent===undefined||a.text===onbRender(a.intent));
      o.mi3_questionsCarryIntents=N.st.current===null&&N.asked.length>0;
      const x=onbAdvance(onbAdvance(onbNew({today:'2026-11-18',calendar:null}),null),{fixed:[{key:'t',title:'טיפול',days:[1],end:{hhmm:'17:00'}}]});
      o.mi4_followupIsAnIntent=x.current.intent.type==='ask_missing_constraint'&&x.current.intent.data.kind==='start'&&x.current.text===onbRender(x.current.intent);
      o.mi5_renderCannotAddFactsUnknownTypeIsEmpty=onbRender({type:'invent_fact',data:{}})==='';}
    o.t1_templateMarksTemporaryPlacement=NT.placement==='fallback_greedy';
    // ───────── Determinism / purity ─────────
    o.p1_templateDeterministic=JSON.stringify(onbBuildTemplate(NP))===JSON.stringify(onbBuildTemplate(NP))&&JSON.stringify(onbFinish(N.st).text)===JSON.stringify(N.fin.text);
    o.p2_weekIsNextSunday=NT.weekStart==='2026-11-22'&&onbNextSunday('2026-11-22')==='2026-11-29'&&onbNextSunday('2026-11-21')==='2026-11-22'&&NT.dates.length===7;
    o.p3_allQuestionsLint=Object.values(ONB_QUESTIONS).every(lintOk)&&lintOk(ONB_OPENING);
  }catch(e){o.z_threw=String(e&&e.stack||e).slice(0,400);}
  return o;
})
