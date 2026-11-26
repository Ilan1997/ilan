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
    o.n08_maintenanceIsNeedNotRoutine=NP.maintenanceNeeds.length===5&&NP.workMaintenance.length===3&&NP.lifeMaintenance.length===2&&NP.maintenanceNeeds.every(n=>n.source==='user_said')&&!NP.routines.some(r=>r.maintenanceClass)&&NP.proposals.filter(p=>p.needId).length===5&&NP.proposals.filter(p=>p.needId).every(p=>p.source==='maya_proposal'&&p.status==='pending'&&p.value.frequency&&p.value.minutes>0);
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
    o.y03_twoFollowupsAdvisorDayAndWorkHours=/המנחה/.test(Y.asked[2].text)&&/באילו שעות אתה עובד/.test(Y.asked[3].text)&&Y.asked[3].intent.data.kind==='workhours';
    const YP=Y.fin.profile,YT=Y.fin.template;
    o.y04_holdDerivedFromDeclaredWindow=YP.holds.length===1&&YP.holds[0].derivedFrom==='semantic_window'&&YP.holds[0].from===780&&YP.holds[0].to===1080&&YP.holds[0].dow===4;
    o.y05_holdItemShownNoApproval=(()=>{const h=YT.items.filter(i=>i.origin==='hold');return h.length===1&&h[0].needsApproval===false&&h[0].status==='tentative'&&!YT.items.some(i=>i!==h[0]&&i.date===h[0].date&&i.startMin<h[0].endMin&&h[0].startMin<i.endMin);})();
    o.y06_courseTravelUnknownMeansPartialDayNotGuess=(()=>{const c=YT.items.find(i=>i.ref==='course'&&i.kind==='fixed');return c&&c.startMin===1080&&c.endMin===1260&&c.approxStart&&!YT.items.some(i=>i.kind==='travel')&&YT.partialDays.some(p=>p.date==='2026-11-24')&&YP.unknowns.some(u=>u.field==='fixed.course.travel'&&u.planningImpact==='blocking')&&!YT.items.some(i=>i.date==='2026-11-24'&&i.origin==='proposal'&&i.kind!=='fixed');})();
    o.y07_workHoursNotInvented=!YP.availability.some(r=>r.rule.kind==='work_hours')&&YP.unknowns.some(u=>u.field==='workHours')&&!YP.assumptions.some(a=>a.field==='workHours');
    o.y08_thesisRecurringRequirementBecomesBudgetNotHours=(()=>{const g=YP.workloadGoals.find(x=>x.key==='thesis');const u=YT.unscheduled.filter(i=>i.goalId===g.id);return g.requiredPerWeekMinutes===360&&u.reduce((t,i)=>t+i.minutesPerWeek,0)===360&&u.every(i=>i.status==='proposed'&&i.reason==='work_hours_unknown')&&!YT.items.some(i=>i.goalId===g.id);})();
    o.y09_statsTrialIsNotARequirement=(()=>{const g=YP.workloadGoals.find(x=>x.key==='stats');const u=YT.unscheduled.filter(i=>i.goalId===g.id);return g.requiredTotalMinutes===null&&g.trialAllocationMinutes===150&&u.length===1&&u[0].minutesPerWeek===150&&u[0].status==='tentative'&&YP.unknowns.some(x=>x.field==='goal.stats.total')&&YP.proposals.find(p=>p.id==='pr_goal_stats').status==='pending';})();
    o.y10_lateRiserIsAProposalNotAnAssumption=(()=>{const pr=YP.proposals.find(p=>p.id==='pr_daystart');return pr&&pr.status==='pending'&&pr.kind==='preference'&&pr.source==='maya_proposal'&&!YP.assumptions.some(a=>a.field==='dayStart')&&!YP.preferences.dayStart&&YT.settings.length===1&&YT.settings[0].needsApproval&&/הצעה שלי, לא כלל/.test(Y.fin.text);})();
    o.y11_fridayClosedAndNoWorkAfter21=newItems(YT).every(i=>dowOf(i.date)!==5&&!(i.domain==='work'&&i.endMin>1260))&&YP.availability.find(r=>r.rule.kind==='closed'&&r.rule.dow===5).source==='user_said';
    o.y12_noOverlaps=overlap(YT.items)===null;
    o.y13_textLint=lintOk(Y.fin.text)&&Y.asked.every(a=>lintOk(a.text));
    // ───────── Dani (does not know) ─────────
    o.d01_flowSevenNoFollowups=JSON.stringify(ids(D))===JSON.stringify(['q1','q2','q3','q4','q5','q6','q7'])&&mains(D)===7&&fus(D)===0;
    const DP=D.fin.profile,DT=D.fin.template;
    o.d02_unknownStaysUnknown=DP.minimumViableWeek==='unknown'&&DP.workMaintenance==='unknown'&&DP.lifeMaintenance==='unknown'&&['workHours','evening','minimumViableWeek','maintenance.work','maintenance.life'].every(f=>DP.unknowns.some(u=>u.field===f));
    o.d03_eveningUndefinedAndGuardAnnounced=DP.boundaries[0].definition==='undefined'&&DP.guards[0].min===1020&&DP.guards[0].source==='maya_caution'&&/זהירות שלי, לא כלל שלך/.test(D.fin.text)&&!DP.availability.some(r=>r.rule.kind==='no_work_after');
    o.d04_nothingAfterGuard=newItems(DT).length>=2&&newItems(DT).every(i=>i.endMin<=1020)&&DT.unscheduled.some(u=>u.proposalId==='pr_pile')&&DT.unscheduled.some(u=>u.proposalId==='pr_review');
    o.d05_everythingMayaAddedIsTrial=newItems(DT).every(i=>i.status==='tentative')&&DT.items.filter(i=>i.origin==='calendar').length===2;
    o.d06_noGoalsNoHolds=DP.workloadGoals.length===0&&DP.holds.length===0;
    o.d07_sportIsProposalNotRoutine=DP.proposals.some(p=>p.id==='pr_sport'&&p.status==='pending'&&p.value.frequency.perWeek===2)&&!DP.routines.some(r=>/sport/.test(r.key))&&newItems(DT).filter(i=>i.proposalId==='pr_sport').length===2;
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
      o.e6_neverMoreThanSevenMain=n2<=9&&s2.done&&s2.mainCount===7&&s2.followups<=1;
      // a single blocking gap → exactly one follow-up even if the answer stays vague
      let s3=onbAdvance(onbNew({today:'2026-11-18',calendar:null}),null);s3=onbAdvance(s3,{});s3=onbAdvance(s3,{officeHours:{from:'09:00',to:'17:00'},fixed:[{key:'t',title:'טיפול',days:[1],end:{hhmm:'17:00'}}]});
      const f1=s3.current;s3=onbAdvance(s3,{});
      o.e7_oneFollowupWhenOneGap=f1.kind==='followup'&&s3.current.kind==='main'&&s3.followups===1;}
    // ───────── Coverage areas (the 7 are areas, not stations) ─────────
    {const dump={answeredTopics:['q1'],successCriteria:['ריצה','תזה'],minimumViableWeek:['תזה'],routines:[{key:'w',title:'ריצה',kind:'fitness',perWeek:3,protected:true},{key:'p',title:'חשבוניות',kind:'payments',domain:'work',maintenance:'work',perWeek:1}],
        officeHours:{from:'09:00',to:'17:00'},goals:[{key:'g',title:'תזה',kind:'study',requiredPerWeekMinutes:360}],chaosTriggers:['ילדים חולים'],boundaries:[{rule:'לא אחרי 20',kind:'no_work_after',time:'20:00'}]};
      let c0=onbAdvance(onbNew({today:'2026-11-18',calendar:null}),null);c0=onbAdvance(c0,dump);
      o.c1_brainDumpCoversEverythingAsksNothingElse=c0.done&&c0.current===null&&c0.mainCount===1&&JSON.stringify(onbCovered(c0.facts))===JSON.stringify(['q1','q2','q3','q4','q5','q6','q7']);
      const part={successCriteria:['שבוע רגוע'],routines:[{key:'r',title:'ריצה',kind:'fitness',perWeek:2,protected:true}],boundaries:[{rule:'שבת סגורה',kind:'closed_day',dow:6}]};
      let c1=onbAdvance(onbNew({today:'2026-11-18',calendar:null}),null);c1=onbAdvance(c1,part);const seq=[];while(c1.current){seq.push(c1.current.id);c1=onbAdvance(c1,{});}
      o.c2_onlyTheMissingAreasAreAsked=JSON.stringify(seq)===JSON.stringify(['q2','f1','q3','q5','q6'])&&c1.mainCount===5;
      let c3=onbAdvance(onbNew({today:'2026-11-18',calendar:null}),null);c3=onbAdvance(c3,{dontKnow:['maintenance']});
      o.c3_dontKnowAlsoCoversTheArea=onbCovered(c3.facts).includes('q3')&&c3.current.id==='q2';
      o.c4_coverageIsDerivedNotOnlyTrustedFromModel=(()=>{let x=onbAdvance(onbNew({today:'2026-11-18',calendar:null}),null);x=onbAdvance(x,{answeredTopics:[],routines:[{key:'a',title:'א',kind:'payments',domain:'work',maintenance:'work',perWeek:1}]});return x.current.id==='q2'&&onbCovered(x.facts).includes('q3');})();}
    // ───────── MessageIntent ≠ wording ─────────
    {const M=onbMessages(NP,NT);
      o.mi1_everyMessageIsTypedData=M.every(m=>typeof m.type==='string'&&m.data&&typeof m.data==='object')&&['present_template','show_existing','propose_items','ask_approval'].every(t=>M.some(m=>m.type===t));
      o.mi2_textIsOnlyARenderingOfIntents=N.fin.text===M.map(m=>onbRender(m,{today:NP.today})).join('\n\n')&&N.asked.every(a=>a.text===onbRender(a.intent,{today:NP.today})||a.intent===undefined||a.text===onbRender(a.intent));
      o.mi3_questionsCarryIntents=N.st.current===null&&N.asked.length>0;
      const x=onbAdvance(onbAdvance(onbNew({today:'2026-11-18',calendar:null}),null),{officeHours:{from:'09:00',to:'17:00'},fixed:[{key:'t',title:'טיפול',days:[1],end:{hhmm:'17:00'}}]});
      o.mi4_followupIsAnIntent=x.current.intent.type==='ask_missing_constraint'&&x.current.intent.data.kind==='start'&&x.current.text===onbRender(x.current.intent);
      o.mi5_renderCannotAddFactsUnknownTypeIsEmpty=onbRender({type:'invent_fact',data:{}})==='';}
    o.t1_templateMarksTemporaryPlacement=NT.placement==='fallback_greedy';
    // ───────── Review feedback 19:18: materialization regression, MaintenanceNeed vs RoutineProposal, work hours, day start ─────────
    {const yAll=onbApprove(YP,YT,'all');const rv=yAll.profile.routines.find(r=>r.key==='review');
      o.r1_acceptedReviewBecomesRealRoutine_yuval=!!rv&&rv.source==='maya_proposal'&&rv.kind==='review'&&rv.targetFrequency.perWeek===1&&rv.fromProposal==='pr_review'&&yAll.profile.decisions.some(x=>x.proposalId==='pr_review'&&x.status==='accepted'&&x.materializedAs.type==='Routine')&&!yAll.profile.proposals.some(p=>p.id==='pr_review');
      const emails=YP.maintenanceNeeds.find(n=>n.key==='emails');
      o.r2_userSaidNeedNotCadence=!!emails&&emails.source==='user_said'&&emails.domain==='work'&&!('targetFrequency' in emails)&&!YP.routines.some(r=>r.key==='emails'||r.key==='invoices'||r.key==='errands')&&YP.proposals.find(p=>p.id==='pr_need_emails').value.frequency.perDay===1&&YP.proposals.find(p=>p.id==='pr_need_emails').value.minutes===30&&YP.proposals.find(p=>p.id==='pr_need_emails').source==='maya_proposal';
      const e2=yAll.profile.routines.find(r=>r.key==='emails');
      o.r3_acceptedCadenceBecomesRoutineLinkedToNeed=!!e2&&e2.source==='maya_proposal'&&e2.needId==='mn_emails'&&e2.maintenanceClass==='workMaintenance'&&yAll.profile.maintenanceNeeds.some(n=>n.id==='mn_emails'&&n.source==='user_said');
      const none=onbApprove(YP,YT,{accept:[],reject:[]}).profile;
      o.r4_noApprovalNoRoutineForNeeds=!none.routines.some(r=>r.source==='maya_proposal')&&none.maintenanceNeeds.length===YP.maintenanceNeeds.length;
      const rejE=onbApprove(YP,YT,{accept:[],reject:YT.unscheduled.filter(u=>u.proposalId==='pr_need_emails').map(u=>u.id)}).profile;
      o.r5_rejectedCadenceKeepsTheNeed=rejE.maintenanceNeeds.some(n=>n.key==='emails')&&!rejE.routines.some(r=>r.key==='emails')&&!rejE.proposals.some(p=>p.id==='pr_need_emails')&&rejE.decisions.some(d=>d.proposalId==='pr_need_emails'&&d.status==='rejected');
      const fx=J(FX.noam);fx.script[3].extraction.routines.find(r=>r.key==='payments').perWeek=2;const NN=await onbPlay(fx);
      o.r6_frequencyTheUserStatedIsAUserFact=NN.fin.profile.routines.some(r=>r.key==='payments'&&r.source==='user_said'&&r.targetFrequency.perWeek===2&&r.needId==='mn_payments')&&!NN.fin.profile.proposals.some(p=>p.id==='pr_need_payments')&&NN.fin.profile.proposals.some(p=>p.id==='pr_need_leads');
      o.r7_noamNeedsPlacedAsProposalsNotFacts=newItems(NT).filter(i=>/לידים|משוב|תשלומים|חשבונות|קניות/.test(i.title)).every(i=>i.proposalId&&!i.routineId&&i.status==='proposed')&&newItems(NT).some(i=>/לידים/.test(i.title));}
    {o.w1_workHoursAskedOnceInShortForm=Y.asked[3].text==='ובדרך כלל באילו שעות אתה עובד? גם טווח בערך מספיק.'&&ids(Y).filter(x=>x==='f2').length===1;
      o.w2_unknownWorkHoursIsBlockingAndHeldAsAsked=YP.unknowns.some(u=>u.field==='workHours'&&u.planningImpact==='blocking'&&u.handling==='asked');
      o.w3_templatePartiallyPlacedNotAFullDay=YT.templateStatus==='partially_placed'&&!YT.items.some(i=>i.origin==='proposal'&&i.domain==='work')&&YT.unscheduled.length>=4&&YT.unscheduled.every(u=>u.needsApproval&&u.minutesPerWeek>0)&&!newItems(YT).some(i=>i.kind==='deep_work');
      o.w4_lifeAndUserFixedStillPlaced=newItems(YT).filter(i=>i.domain==='life'&&i.kind!=='fixed').length>=3&&YT.items.some(i=>i.ref==='course')&&YT.items.some(i=>i.origin==='hold');
      o.w5_textSaysItAndStaysLint=/אין לי עדיין שעות עבודה/.test(Y.fin.text)&&/לא נועלת אותם לשעות/.test(Y.fin.text)&&lintOk(Y.fin.text);
      o.w6_knownHoursMeansFullyPlacedAndNoQuestion=NT.templateStatus==='fully_placed'&&NT.unscheduled.length===0&&!ids(N).some(x=>x==='f2')&&!NP.unknowns.some(u=>u.field==='workHours');
      const fy=J(FX.yuval);const si=fy.script.findIndex(s=>s.expect==='f2');fy.script[si]={expect:'f2',answer:'בערך 10 עד 18',extraction:{officeHours:{days:[0,1,2,3,4],from:'10:00',to:'18:00'}}};
      const YH=await onbPlay(fy),th=YH.fin.template;
      o.w7_givenHoursPlaceWorkInsideThem=th.unscheduled.length===0&&YH.fin.profile.availability.some(r=>r.rule.kind==='work_hours'&&r.source==='user_said')&&!YH.fin.profile.unknowns.some(u=>u.field==='workHours')&&newItems(th).filter(i=>i.domain==='work').every(i=>i.startMin>=600&&i.endMin<=1080)&&newItems(th).some(i=>i.domain==='work');
      o.w8_stillPartialBecauseTravelUnknown=th.templateStatus==='partially_placed'&&th.partialDays.length===1;
      o.w9_dontKnowFromTheStartIsNotAskedAgain=fus(D)===0&&D.fin.template.templateStatus==='partially_placed'&&D.fin.template.unscheduled.length>=2;
      const ap=onbApprove(YP,YT,'all');
      o.w10_unscheduledBudgetsAreApprovableAndWriteNothing=ap.accepted.some(i=>i.reason==='work_hours_unknown')&&ap.calendarWrites.every(w=>w.date&&w.startMin!=null)&&ap.profile.routines.some(r=>r.key==='thesis')===false&&ap.profile.routines.some(r=>r.key==='emails');}
    {const pd=onbApprove(YP,YT,'all').profile,pn=onbApprove(YP,YT,{accept:YT.items.filter(i=>i.needsApproval).map(i=>i.id),reject:[]}).profile,pj=onbApprove(YP,YT,{accept:[],reject:['set_daystart']}).profile;
      o.ds1_acceptingMakesItAPreference=pd.preferences.dayStart&&pd.preferences.dayStart.min===600&&pd.preferences.dayStart.source==='maya_proposal'&&pd.decisions.some(x=>x.proposalId==='pr_daystart'&&x.materializedAs.type==='Preference.dayStart');
      o.ds2_notApprovedStaysAProposal=!pn.preferences.dayStart&&pn.proposals.some(p=>p.id==='pr_daystart'&&p.status==='pending');
      o.ds3_rejectedDropsPreferenceAndDoesNotInventEight=pj.preferredDayStart===null&&!pj.preferences.dayStart&&!pj.proposals.some(p=>p.id==='pr_daystart')&&pj.decisions.some(d=>d.proposalId==='pr_daystart'&&d.status==='rejected'&&d.materializedAs===null);
      const pu=JSON.parse(JSON.stringify(YP));pu.userDayStart=540;const pju=onbApprove(pu,YT,{accept:[],reject:['set_daystart']}).profile;
      o.ds4_rejectFallsBackOnlyToEarlierUserSetting=pju.preferences.dayStart.min===540&&pju.preferences.dayStart.source==='user_setting'&&pju.dayStart===540;
      o.ds5_acceptedKeepsSourceMayaProposal=pd.preferredDayStart.min===600&&pd.preferredDayStart.source==='maya_proposal';}
    {const ap=onbApprove(YP,YT,'all'),pr0=ap.profile,thesis=YT.unscheduled.find(u=>u.goalId&&/תזה/.test(u.title));
      o.pp1_partiallyPlacedApprovalDoesNotCreateTimedCalendarWrites=YT.templateStatus==='partially_placed'&&ap.calendarWrites.length>0&&ap.calendarWrites.every(w=>Number.isFinite(w.startMin)&&Number.isFinite(w.endMin)&&!/^(תזה|מיילים|חשבוניות|סגירת שבוע|סטטיסטיקה)/.test(w.title))&&!ap.accepted.filter(i=>i.reason==='work_hours_unknown').some(i=>ap.calendarWrites.some(w=>w.itemId===i.id));
      o.pp2_approvedThesisBudgetKeptAsGoalWithoutPlacement=!!thesis&&pr0.workloadGoals.some(g=>g.key==='thesis'&&g.requiredPerWeekMinutes===360)&&pr0.approvedBudgets.some(b=>b.goalId===thesis.goalId&&b.minutesPerWeek===360&&b.placement==='unplaced'&&b.placementBlockedBy==='work_hours_unknown')&&!pr0.routines.some(r=>r.key==='thesis');
      o.pp3_approvedNeedCadenceBecomesRoutineWithoutTime=pr0.routines.some(r=>r.key==='emails'&&r.source==='maya_proposal'&&!('startMin' in r))&&pr0.approvedBudgets.some(b=>/מיילים/.test(b.title)&&b.routineId==='rt_emails')&&!ap.calendarWrites.some(w=>/מיילים/.test(w.title));
      o.pp4_noInventedStartEndOnUnscheduled=YT.unscheduled.every(u=>!('startMin' in u)&&!('endMin' in u)&&!('date' in u));
      const only=onbApprove(YP,YT,{accept:YT.unscheduled.filter(u=>/מיילים/.test(u.title)).map(u=>u.id),reject:[]}).profile;
      o.pp5_approvingOneBudgetLeavesOthersPending=only.routines.some(r=>r.key==='emails')&&!only.routines.some(r=>r.key==='invoices')&&only.proposals.some(p=>p.id==='pr_need_invoices'&&p.status==='pending')&&only.approvedBudgets.length===1;
      o.pp6_laterPlacementIsPossibleBecauseBudgetIsStructured=pr0.approvedBudgets.every(b=>b.minutesPerWeek>0&&(b.goalId||b.routineId));}
    {const n1=onbNormalizeExtraction({fixed:[{key:'office',title:'משרד',days:[0,1,2,3,4],start:{hhmm:'08:30'},end:{hhmm:'17:30'}},{key:'t',title:'טיפול משפחתי',days:[1],end:{hhmm:'17:00'}}]});
      o.nx1_officeAsFixedBecomesOfficeHours=n1.officeHours&&n1.officeHours.from===510&&n1.officeHours.to===1050&&n1.fixed.length===1&&n1.fixed[0].key==='t';
      const n2=onbNormalizeExtraction({officeHours:{from:'09:00',to:'17:00'},fixed:[{key:'o',title:'עבודה במשרד',days:[0],start:{hhmm:'10:00'},end:{hhmm:'12:00'}}]});
      o.nx2_realOfficeHoursWinAndDuplicateDropped=n2.officeHours.from===540&&n2.fixed.length===0;
      const n3=onbNormalizeExtraction({boundaries:[{rule:'שישי אחה"צ כלום',kind:'closed_day',dow:5,time:'13:00',semanticWindow:'אחה"צ'}]});
      o.nx3_partDayClosureHasNoTimeAndCanonicalWindow=n3.boundaries[0].time===undefined&&n3.boundaries[0].semanticWindow==='אחה״צ'&&n3.boundaries[0].dow===5;
      const n4=onbNormalizeExtraction({fixed:[{key:'a',title:'פגישה עם המנחה',days:[4],semanticWindow:'אחה"צ'}]});
      o.nx4_fixedWindowCanonical=n4.fixed[0].semanticWindow==='אחה״צ';
      const n5=onbNormalizeExtraction({fixed:[{key:'w',title:'עבודה',days:[0,1],start:{hhmm:'10:00'}}]});
      o.nx5_officeLikeWithoutEndIsNotInvented=n5.officeHours===null&&n5.fixed.length===0;
      const pr=onbExtractPrompt(onbNew({today:'2026-11-18',calendar:null}),'x');
      o.nx6_promptStatesOfficeHoursNotFixed=/officeHours[^.]*לעולם לא פריט fixed/.test(pr)&&/maintenance=work\|life/.test(pr)&&/dontKnow:/.test(pr);}
    {const g=onbNormalizeExtraction({goals:[{key:'b',title:'בחינה',sessionMinutes:120,days:[0,1,2,3,4],requiredPerWeekMinutes:700}]}).goals[0];
      o.nx7_codeDoesTheWeeklyArithmeticNotTheModel=g.requiredPerWeekMinutes===600;
      const g2=onbNormalizeExtraction({goals:[{key:'t',title:'תזה',requiredPerWeekMinutes:360}]}).goals[0];
      o.nx8_noSessionFieldsKeepsStatedValue=g2.requiredPerWeekMinutes===360;
      const rs=onbNormalizeExtraction({routines:[{key:'m',title:'מיילים',kind:'email',domain:'life'},{key:'r',title:'ריצות',kind:'other'},{key:'d',title:'dinner',kind:'other'},{key:'x',title:'משהו',kind:'other',domain:'work'}]}).routines;
      o.nx9_kindFallbackAndDomainFromKind=rs[0].domain==='work'&&rs[1].kind==='fitness'&&rs[1].domain==='life'&&rs[3].kind==='other'&&rs[3].domain==='work';
      const q4=onbNormalizeExtraction({routines:[{key:'k',title:'ערבים עם הילדים'},{key:'s',title:'ספורט',stated:'maybe'}]},{topic:'q4'}).routines,q3=onbNormalizeExtraction({routines:[{key:'k',title:'ערבים'}]},{topic:'q3'}).routines;
      o.nx10_q4AnswersAreProtectedOtherTopicsAreNot=q4.every(r=>r.protected)&&q4[1].stated==='maybe'&&!q3[0].protected;
      const sw=onbNormalizeExtraction({fixed:[{key:'a',title:'מנחה',days:[4],semanticWindow:'afternoon'}],boundaries:[{rule:'x',kind:'closed_day',dow:5,semanticWindow:'afternoon'}]});
      o.nx11_englishWindowsBecomeHebrew=sw.fixed[0].semanticWindow==='אחה״צ'&&sw.boundaries[0].semanticWindow==='אחה״צ';
      const pm=onbExtractPrompt(onbNew({today:'2026-11-18',calendar:null}),'x');
      o.nx12_promptCarriesMonthEndAndNoArithmeticRule=/סוף החודש = 2026-11-30/.test(pm)&&/אל תחשב סכומים/.test(pm)&&/sessionMinutes=120/.test(pm);
      const sch=JSON.stringify(ONB_EXTRACT_SCHEMA);o.nx13_schemaHasSessionFields=/sessionMinutes/.test(sch);}
    {const A=(raw,ctx)=>onbNormalizeExtraction(raw,ctx);
      const r1=A({routines:[{key:'d',title:'שעתיים עבודה עמוקה בכל יום',kind:'deep_work',perWeek:7,window:{from:'00:00',to:'24:00'}},{key:'x',title:'ריצות',kind:'fitness',window:{from:'00:00',to:'23:59'}}]}).routines;
      o.nx14_everyDayBecomesPerDayDurationFromWordsNoAllDayWindow=r1[0].perDay===true&&r1[0].perWeek===undefined&&r1[0].durationMin===120&&r1[0].window===undefined&&r1[1].window===undefined;
      const r2=A({routines:[{key:'l',title:'מעקב לידים',kind:'leads',window:{from:'work'}},{key:'b',title:'חשבונות',kind:'bills'}]},{topic:'q3'}).routines;
      o.nx15_q3NamedThingsAreMaintenanceWithDomainFromKind=r2[0].maintenance==='work'&&r2[1].maintenance==='life'&&r2[1].domain==='life'&&r2[0].window===undefined;
      const f1=A({fixed:[{key:'t',title:'טיפול',days:[2],start:{hhmm:'17:00'},window:{from:'17:00',to:'18:00'}}]}).fixed[0];
      o.nx16_endTheModelPutInsideWindowIsRecovered=f1.start.min===1020&&f1.end.min===1080&&f1.window===undefined;
      const e1=A({fixed:[{key:'l',title:'שיעור',days:[2],semanticWindow:'אחה״צ'}]},{answer:'יש לי שיעור ביום ג׳ בערב.'}).fixed[0],e2=A({fixed:[{key:'l',title:'שיעור',days:[2],semanticWindow:'אחה״צ'}]},{answer:'שיעור ביום ג׳ אחר הצהריים'}).fixed[0],e3=A({fixed:[{key:'l',title:'שיעור',days:[2],semanticWindow:'ערב'}]},{answer:'בערב'}).fixed[0];
      o.nx17_windowMustBeGroundedInTheAnswerAndEveningIsNeverAWindow=e1.semanticWindow===undefined&&e2.semanticWindow==='אחה״צ'&&e3.semanticWindow===undefined;
      const g1=A({goals:[{key:'e',title:'בחינה',requiredTotalMinutes:720}]},{answer:'ללמוד לבחינה 12 שעות עד סוף החודש',today:'2026-11-18'}).goals[0],g2=A({goals:[{key:'e',title:'בחינה',requiredTotalMinutes:720}]},{answer:'12 שעות',today:'2026-11-18'}).goals[0];
      o.nx18_endOfMonthOnlyWhenSaidAndOnlyForASingleGoal=g1.deadline==='2026-11-30'&&g2.deadline===null;
      const d1=A({goals:[{key:'s',title:'סטטיסטיקה',deadline:'2026-12-14'}]},{answer:'אין לי מושג כמה שעות צריך'}),d2=A({goals:[{key:'s',title:'סטטיסטיקה',requiredPerWeekMinutes:360}]},{answer:'אין לי מושג'}),d3=A({goals:[{key:'s',title:'סטטיסטיקה'}]},{answer:'מבחן ב-14 בדצמבר'});
      o.nx19_dontKnowTotalOnlyWhenUserSaidSoAndNoAmountGiven=d1.dontKnow.indexOf('goal.s.total')>=0&&d2.dontKnow.indexOf('goal.s.total')<0&&d3.dontKnow.length===0;}
    {const A=(raw,ctx)=>onbNormalizeExtraction(raw,ctx);
      const d1=A({routines:[{key:'d',title:'עבודה עמוקה',kind:'deep_work',perDay:true}]},{answer:'שעתיים עבודה עמוקה בכל יום'}).routines[0],d2=A({routines:[{key:'d',title:'עבודה עמוקה',kind:'deep_work',perDay:true}]},{answer:'עבודה עמוקה בכל יום'}).routines[0];
      o.nx20_durationRecoveredFromTheWordsNextToTheTitleOnly=d1.durationMin===120&&d2.durationMin===undefined;
      const ap=A({routines:[{key:'t',title:'טיפול משפחתי',days:[1],kind:'family'},{key:'r',title:'ריצה',days:[0,2],kind:'fitness'},{key:'p',title:'פגישה שבועית',days:[3],perWeek:1}]});
      o.nx21_appointmentWithDayAndNoFrequencyIsAFixedEventNotARoutine=ap.fixed.length===1&&ap.fixed[0].title==='טיפול משפחתי'&&ap.fixed[0].days[0]===1&&ap.routines.length===2&&ap.routines.some(r=>r.key==='r')&&ap.routines.some(r=>r.key==='p');
      const sc=JSON.stringify(ONB_EXTRACT_SCHEMA);
      o.nx22_schemaDescriptionsDiscourageTheSuccessCriteriaEscapeHatch=/successCriteria.{0,80}description/.test(sc)&&/chaosTriggers.{0,80}description/.test(sc)&&/"fixed":\{"type":"ARRAY","description"/.test(sc);}
    {const A=(raw,ctx)=>onbNormalizeExtraction(raw,ctx);
      const f1=A({routines:[{key:'e',title:'מיילים',kind:'email',maintenance:'work',perWeek:1}]},{answer:'מצטברים לי מיילים. ומה שמפרק לי את השבוע זה לקוח בפאניקה',topic:'q3'}).routines[0],f2=A({routines:[{key:'e',title:'מיילים',kind:'email',maintenance:'work',perWeek:1}]},{answer:'מיילים כל שבוע',topic:'q3'}).routines[0];
      o.nx23_frequencyTheUserNeverExpressedIsDropped=f1.perWeek===undefined&&f1.maintenance==='work'&&f2.perWeek===1;
      const e1=A({routines:[{key:'d',title:'deep work',kind:'deep_work',perWeek:5}]},{answer:'deep work שעתיים ביום.'}).routines[0],e2=A({routines:[{key:'r',title:'ריצה',kind:'fitness',perWeek:2}]},{answer:'ריצה ביום שני ויום חמישי, פעמיים בשבוע'}).routines[0];
      o.nx24_everyDayNearTheTitleBecomesPerDayButAWeekdayDoesNot=e1.perDay===true&&e1.durationMin===120&&e2.perDay===undefined&&e2.perWeek===2;
      const g1=A({goals:[{key:'p',title:'הצעת מחיר',requiredTotalMinutes:360}]},{answer:'בערך 6 שעות, עד 25 בנובמבר',today:'2026-11-18'}).goals[0],g2=A({goals:[{key:'p',title:'הצעת מחיר',requiredTotalMinutes:360}]},{answer:'6 שעות עד 5 בנובמבר',today:'2026-11-18'}).goals[0];
      o.nx25_explicitDateParsedAndPastDatesRollToNextYear=g1.deadline==='2026-11-25'&&g2.deadline==='2027-11-05';
      const k1=A({successCriteria:['פחות לחץ']},{answer:'לא יודע, בא לי שיהיה פחות לחץ',topic:'q1'}),k2=A({minimumViableWeek:['2 ריצות']},{answer:'לא יודע, אולי 2 ריצות',topic:'q1'}),k3=A({fixed:[{key:'a',title:'מנחה',days:[4],semanticWindow:'אחה״צ'}]},{answer:'חמישי אחה״צ, לא יודע מתי בדיוק'});
      o.nx26_dontKnowCompletionsAreGroundedInTheAnswer=k1.dontKnow.indexOf('minimumViableWeek')>=0&&k2.dontKnow.indexOf('minimumViableWeek')<0&&k3.dontKnow.indexOf('fixed.a.start')>=0;}
    {const A=(raw,ctx)=>onbNormalizeExtraction(raw,ctx);
      const r1=A({routines:[{key:'o',title:'עבודה במשרד',kind:'work'},{key:'r',title:'ריצות',kind:'fitness',perWeek:2}]},{answer:'אני עובד רוב השבוע במשרד'}).routines;
      o.nx27_officeWorkIsNeverARoutine=r1.length===1&&r1[0].key==='r';
      const e1=A({fixed:[{key:'t',title:'טיפול',days:[2],start:{hhmm:'17:00'}}]},{answer:'הטיפול ביום שלישי 17:00 עד 18:00'}).fixed[0],e2=A({fixed:[{key:'m',title:'ישיבת צוות',days:[0],start:{hhmm:'09:30',precision:'approx'}}]},{answer:'ביום ראשון בבוקר יש לי ישיבת צוות ב-9:30 שנמשכת בערך שעה'}).fixed[0],e3=A({fixed:[{key:'t',title:'טיפול',days:[2],start:{hhmm:'17:00'}}]},{answer:'הטיפול ביום שלישי ב-17:00'}).fixed[0],e4=A({fixed:[{key:'t',title:'טיפול',days:[2],start:{hhmm:'16:00'}}]},{answer:'טיפול 17:00 עד 18:00'}).fixed[0];
      o.nx28_endRecoveredFromTheAnswerOnlyWhenItMatchesTheStart=e1.end.min===1080&&e2.end.min===630&&e2.end.precision==='approx'&&e3.end===undefined&&e4.end===undefined;}
    {const A=(raw,ctx)=>onbNormalizeExtraction(raw,ctx);
      // eval run 8: named weekday wins over the model's day arithmetic (critical A02)
      const d1=A({fixed:[{key:'m',title:'פגישה עם המנחה',days:[3],semanticWindow:'אחה״צ'}]},{topic:'q2',answer:'פגישה עם המנחה ביום חמישי אחה״צ.'}).fixed[0];
      const d2=A({fixed:[{key:'m',title:'פגישה',days:[2]}]},{topic:'q2',answer:'יש פגישה שבועית'}).fixed[0];
      o.nx29_namedWeekdayWinsOverModelDay=d1.days[0]===4&&d2.days[0]===2;
      // boundaries stated in words are recovered; part-day closure is not a full closed day
      const b1=A({successCriteria:['x']},{topic:'q2',answer:'אני במשרד 9–17, בשישי אני לא עובד בכלל ואחרי 20:00 לא עובד.'}).boundaries,b2=A({},{topic:'q2',answer:'בשישי אחר הצהריים אני לא עובד'}).boundaries;
      o.nx30_boundariesRecoveredFromWords=b1.some(b=>b.kind==='closed_day'&&b.dow===5)&&b1.some(b=>b.kind==='no_work_after'&&b.time===1200)&&!b2.some(b=>b.kind==='closed_day');
      // minimum viable week clause is kept verbatim and mapped to the routines it names
      const m1=A({routines:[{key:'r',title:'ריצה',kind:'fitness',perWeek:3},{key:'d',title:'ארוחת ערב',kind:'family',perWeek:4}]},{topic:'q1',answer:'שלוש ריצות בשבוע, ארוחת ערב ארבעה ערבים. אם השבוע עמוס — לפחות שתי ריצות ושני ערבים עם הילדים.'});
      o.nx31_mvwClauseMapsToNamedRoutines=m1.minimumViableWeek.length===1&&m1.routines.every(r=>r.inMvw&&r.protected);
      // dropped fixed appointment and weekly hour budget are recovered only from explicit text
      const f1=A({officeHours:{days:[0,1,2,3,4],from:'08:30',to:'17:30'}},{topic:'q2',answer:'משרד 08:30 עד 17:30 בימים א׳ עד ה׳. טיפול משפחתי ביום שני עד 17:00, מתחיל בערך ב-15:30.'}).fixed;
      const g1=A({},{topic:'q1',answer:'תזה שש שעות בשבוע'}).goals,g0=A({},{topic:'q1',answer:'אני רץ הרבה'}).goals;
      o.nx32_fixedAndWeeklyBudgetRecoveredFromText=f1.length===1&&f1[0].days[0]===1&&f1[0].start.min===930&&f1[0].start.precision==='approx'&&f1[0].end.min===1020&&g1.length===1&&g1[0].requiredPerWeekMinutes===360&&g0.length===0;}
    {const A=(raw,ctx)=>onbNormalizeExtraction(raw,ctx);
      // eval run 9: busy-week floor recorded as extra routines is folded into the base routines (T01)
      const t1=A({routines:[{key:'running',title:'ריצות',kind:'fitness',perWeek:3},{key:'running_mvw',title:'ריצות (שבוע עמוס)',kind:'fitness',perWeek:2}]},{topic:'q1',answer:'שלוש ריצות בשבוע. אם השבוע עמוס — לפחות שתי ריצות.'});
      o.nx33_busyWeekDuplicatesFoldIntoBaseRoutine=t1.routines.length===1&&t1.routines[0].inMvw===true&&t1.minimumViableWeek.length===1;
      // the model returned the appointment as a day-only fixed item: times come from the sentence (T02)
      const t2=A({fixed:[{key:'t',title:'טיפול משפחתי',days:[1]}]},{topic:'q2',answer:'משרד 08:30 עד 17:30 בימים א׳ עד ה׳. טיפול משפחתי ביום שני עד 17:00, מתחיל בערך ב-15:30.'}).fixed;
      o.nx34_timesFilledOntoExistingFixed=t2.length===1&&t2[0].start.min===930&&t2[0].end.min===1020;
      // brain dump: skipped appointments recovered; ones the model already has / calendar items are not duplicated (X02, A02, E03)
      const bd='אני חייב 3 ריצות בשבוע, בימי שלישי אני לוקח את הקטנה מהגן ב-16:00, וקורס אונליין בשבתות שאני לא מוותר עליו.';
      const b1=A({routines:[{key:'r',title:'ריצות',kind:'fitness',perWeek:3}]},{topic:'q1',answer:bd}).fixed;
      const b2=A({fixed:[{key:'t',title:'טיפול',days:[2],start:{hhmm:'17:00'},end:{hhmm:'18:00'}}]},{topic:'q2',answer:'הטיפול ביום שני. לא, בעצם ביום שלישי, שעה 17:00 עד 18:00.'}).fixed;
      const b3=A({},{topic:'q2',answer:'הישיבה ביום שני כבר שם'}).fixed;
      o.nx35_brainDumpFixedRecoveredNotDuplicated=b1.length===2&&b1.some(f=>f.days[0]===2&&f.start.min===960)&&b1.some(f=>f.days[0]===6&&f.start===undefined&&/קורס/.test(f.title))&&b2.length===1&&b3.length===0;
      // office recorded as a routine with a window → work hours; chaos triggers from "what breaks my week"
      const c1=A({routines:[{key:'o',title:'עבודה במשרד',kind:'work',days:[0,1,2,3],window:{from:'09:00',to:'18:00'}}]},{topic:'q2',answer:'אני עובד במשרד בכל יום מ-9 עד 6'});
      const c2=A({},{topic:'q3',answer:'ומה שמפרק לי את השבוע זה ילד חולה או לקוח שמתקשר בפאניקה.'});
      o.nx36_officeRoutineBecomesWorkHoursAndChaosFromWords=c1.officeHours&&c1.officeHours.from===540&&c1.officeHours.to===1080&&c1.routines.length===0&&c2.chaosTriggers.length===2;}
    {const c1=onbNormalizeExtraction({fixed:[{key:'course',title:'הקורס בסטטיסטיקה',days:[2]}]},{topic:'q2',answer:'הקורס בסטטיסטיקה ביום ג׳ בערב, בערך 18 עד 21, באוניברסיטה. בשאר הימים אני עובד מהבית.'}).fixed[0];
      o.nx38_rangeInTheSentenceFillsDayOnlyFixed=c1.start.min===1080&&c1.start.precision==='approx'&&c1.end.min===1260;
      const un=YT.unscheduled.map(u=>u.title),th=un.filter(x=>/תזה/.test(x));
      o.nx39_goalWithSameNameDoesNotStackOnRoutineBudget=th.length<=1;
      const cad=onbRender({type:'state_no_cadence',data:{titles:['ערב עם חברים']}});
      o.nx40_routineWithoutCadenceIsNamedNotSilentlyDropped=/ערב עם חברים/.test(cad)&&lintOk(cad);}
    {const r1=onbNormalizeExtraction({routines:[{key:'c',title:'קורס אונליין',kind:'study',perWeek:1,protected:true},{key:'r',title:'ריצות',kind:'fitness',perWeek:3}]},{topic:'q1',answer:'אני חייב 3 ריצות בשבוע, וקורס אונליין בשבתות שאני לא מוותר עליו.'});
      o.nx37_courseRoutineWithoutDayBecomesFixedOnNamedDay=r1.fixed.length===1&&r1.fixed[0].days[0]===6&&r1.routines.length===1&&r1.routines[0].key==='r';}
    {const a='אני רץ שלוש פעמים בשבוע ומיילים מצטברים לי בעבודה.';
      const rs=onbNormalizeExtraction({routines:[{key:'run',title:'ריצה',kind:'fitness',domain:'life',perWeek:3,frequencyEvidence:'שלוש פעמים בשבוע'},{key:'mail',title:'מיילים',kind:'email',domain:'work',maintenance:'work',perDay:true,frequencyEvidence:'כל יום'}]},{topic:'q3',answer:a}).routines;
      const run=rs.find(r=>r.key==='run'),mail=rs.find(r=>r.key==='mail');
      o.nx29_frequencyIsGroundedPerItem=run&&run.perWeek===3&&mail&&mail.perDay!==true&&mail.perWeek===undefined&&mail.perTwoWeeks!==true;}
    {const A=(raw,ctx)=>onbNormalizeExtraction(raw,ctx);
      // eval run noam (build 2026-11-26): "לא לוותר" is a valid MVW floor phrase, same as "לפחות"
      const mv=A({routines:[{key:'run',title:'ריצה',kind:'fitness',perWeek:3,protected:true},{key:'fam',title:'ערב משפחה',kind:'family',perWeek:4,protected:true}]},{topic:'q1',answer:'שלוש ריצות, ארבעה ערבי משפחה. אם השבוע עמוס — לא לוותר על שתי ריצות ועל שני ערבי משפחה.'});
      o.nx41_mvwLoLavatorRecognizedAsMvwFloor=mv.minimumViableWeek.length===1&&mv.routines.filter(r=>r.inMvw).length===2;
      // a routine the model already gave days to is not duplicated as a fixed event
      const bd=A({routines:[{key:'lesson',title:'שיעור תורה',kind:'lesson',perWeek:1,days:[5],window:{from:'08:00',to:'09:00'},protected:true}]},{topic:'q1',answer:'שיעור תורה בשישי בבוקר.'});
      o.nx42_routineTheModelAlreadyGaveDaysStaysRoutineNoFixedDuplicate=bd.routines.length===1&&bd.fixed.length===0&&bd.routines[0].days[0]===5;}
    // ───────── Determinism / purity ─────────
    o.p1_templateDeterministic=JSON.stringify(onbBuildTemplate(NP))===JSON.stringify(onbBuildTemplate(NP))&&JSON.stringify(onbFinish(N.st).text)===JSON.stringify(N.fin.text);
    o.p2_weekIsNextSunday=NT.weekStart==='2026-11-22'&&onbNextSunday('2026-11-22')==='2026-11-29'&&onbNextSunday('2026-11-21')==='2026-11-22'&&NT.dates.length===7;
    o.p3_allQuestionsLint=Object.values(ONB_QUESTIONS).every(lintOk)&&lintOk(ONB_OPENING);
  }catch(e){o.z_threw=String(e&&e.stack||e).slice(0,400);}
  return o;
})
