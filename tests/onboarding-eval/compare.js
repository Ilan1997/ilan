// Compare an ACTUAL (normalized) onboarding extraction with the EXPECTED spec of a case. Errors have a type and a severity.
// critical = an invented / wrong CONSEQUENTIAL fact (a time, day, hours, total, deadline, boundary time); major = wrong or missed fact; minor = detail / coverage.
const hm=s=>{const m=/^(\d{1,2}):(\d\d)$/.exec(s||'');return m?+m[1]*60+ +m[2]:null;};
const ERROR_TYPES=['invented_consequential_fact','wrong_consequential_value','missed_fact','invented_fact','wrong_domain','wrong_rigidity','missed_minimum_viable_week','dontknow_missed','unnecessary_followup','missed_followup','wrong_value','coverage_miss'];
const SEV={invented_consequential_fact:'critical',wrong_consequential_value:'critical',missed_fact:'major',invented_fact:'major',wrong_domain:'major',wrong_rigidity:'major',missed_minimum_viable_week:'major',dontknow_missed:'major',unnecessary_followup:'major',missed_followup:'major',wrong_value:'minor',coverage_miss:'minor'};
const RANK={pass:0,minor:1,major:2,critical:3};
const find=(arr,m)=>(arr||[]).find(t=>m.some(s=>String(t.title||'').includes(s)||String(t.key||'').includes(s)||String(t.rule||'').includes(s)));
const sameSet=(a,b)=>JSON.stringify((a||[]).slice().sort())===JSON.stringify((b||[]).slice().sort());
function compareExtraction(A,c,meta){
  const E=c.expect||{},errs=[];const add=(type,detail)=>errs.push({type,severity:SEV[type],detail});
  const usedR=new Set(),usedF=new Set(),usedG=new Set(),usedB=new Set();
  (E.routines||[]).forEach(e=>{const a=find(A.routines,e.m);if(!a){add('missed_fact','routine: '+e.m[0]);return;}usedR.add(a.key);
    if(e.domain&&a.domain!==e.domain)add('wrong_domain',e.m[0]+': '+a.domain+' במקום '+e.domain);
    if(e.maintenance&&a.maintenance!==e.maintenance)add('wrong_domain',e.m[0]+': maintenance '+a.maintenance+' במקום '+e.maintenance);
    ['perWeek','durationMin'].forEach(k=>{if(e[k]!==undefined&&a[k]!==e[k])add('wrong_value',e.m[0]+'.'+k+'='+a[k]+' במקום '+e[k]);});
    ['perDay','perTwoWeeks'].forEach(k=>{if(e[k]!==undefined&&!!a[k]!==e[k])add('wrong_value',e.m[0]+'.'+k);});
    if(e.kind&&a.kind!==e.kind)add('wrong_value',e.m[0]+'.kind='+a.kind);
    ['protected','inMvw'].forEach(k=>{if(e[k]!==undefined&&!!a[k]!==e[k])add('wrong_rigidity',e.m[0]+'.'+k+'='+!!a[k]);});
    if(e.stated&&a.stated!==e.stated)add('wrong_rigidity',e.m[0]+'.stated='+a.stated+' במקום '+e.stated);
    if(e.perWeek===undefined&&e.perDay===undefined&&e.perTwoWeeks===undefined&&a.perWeek!==undefined&&!e.extraAttrOk)add('wrong_value',e.m[0]+': תדירות שלא נאמרה ('+a.perWeek+')');
    if(e.durationMin===undefined&&a.durationMin!==undefined&&!e.extraAttrOk)add('wrong_value',e.m[0]+': משך שלא נאמר ('+a.durationMin+')');});
  if(!E.extraRoutinesOk)(A.routines||[]).forEach(a=>{if(!usedR.has(a.key))add('invented_fact','routine שלא נאמר: '+a.title);});
  (E.fixed||[]).forEach(e=>{const a=find(A.fixed,e.m);if(!a){add('missed_fact','fixed: '+e.m[0]);return;}usedF.add(a.key);
    if(e.days&&!sameSet(a.days,e.days))add('wrong_consequential_value',e.m[0]+'.days='+JSON.stringify(a.days||[])+' במקום '+JSON.stringify(e.days));
    if(!e.days&&(a.days||[]).length)add('invented_consequential_fact',e.m[0]+': יום שלא נאמר');
    const t=(k,v)=>{const got=a[k]?a[k].min:null,want=hm(v);if(want==null){if(got!=null)add('invented_consequential_fact',e.m[0]+'.'+k+' שלא נאמר: '+got);}else if(got==null)add('missed_fact',e.m[0]+'.'+k);else if(got!==want)add('wrong_consequential_value',e.m[0]+'.'+k+'='+got+' במקום '+want);};
    t('start',e.noTimes?null:e.start);t('end',e.noTimes?null:e.end);
    if(e.startPrecision&&a.start&&a.start.precision!==e.startPrecision)add('wrong_value',e.m[0]+'.start.precision');
    if(e.travelMin!==undefined&&(!a.travelMin||a.travelMin.min!==e.travelMin))add('wrong_consequential_value',e.m[0]+'.travelMin');
    if(e.travelMin===undefined&&a.travelMin&&!e.travelOk)add('invented_consequential_fact',e.m[0]+': זמן נסיעה שלא נאמר');
    if(e.semanticWindow&&a.semanticWindow!==e.semanticWindow)add('wrong_value',e.m[0]+'.semanticWindow='+a.semanticWindow);});
  (A.fixed||[]).forEach(a=>{if(usedF.has(a.key))return;
    if((E.forbidFixed||[]).some(s=>String(a.title||a.key).includes(s)))add('invented_fact','כבר ביומן, חולץ שוב: '+(a.title||a.key));
    else if(!E.fixedOk){add(a.start||a.end||(a.days||[]).length?'invented_consequential_fact':'invented_fact','fixed שלא נאמר: '+(a.title||a.key));}});
  if(E.officeHours===null&&A.officeHours)add('invented_consequential_fact','officeHours שלא נאמרו: '+A.officeHours.from+'–'+A.officeHours.to);
  if(E.officeHours){if(!A.officeHours)add('missed_fact','officeHours');else{if(A.officeHours.from!==hm(E.officeHours.from)||A.officeHours.to!==hm(E.officeHours.to))add('wrong_consequential_value','officeHours '+A.officeHours.from+'–'+A.officeHours.to);}}
  (E.goals||[]).forEach(e=>{const a=find(A.goals,e.m);if(!a){add('missed_fact','goal: '+e.m[0]);return;}usedG.add(a.key);
    const tot=e.total===undefined?null:e.total,pw=e.perWeek===undefined?null:e.perWeek,dl=e.deadline===undefined?null:e.deadline;
    const chk=(name,got,want)=>{if(want===null){if(got!=null)add('invented_consequential_fact',e.m[0]+'.'+name+' שלא נאמר: '+got);}else if(got==null)add('missed_fact',e.m[0]+'.'+name);else if(got!==want)add('wrong_consequential_value',e.m[0]+'.'+name+'='+got+' במקום '+want);};
    chk('total',a.requiredTotalMinutes,tot);chk('perWeek',a.requiredPerWeekMinutes,pw);chk('deadline',a.deadline,dl);});
  (A.goals||[]).forEach(a=>{if(!usedG.has(a.key))add(a.requiredTotalMinutes||a.requiredPerWeekMinutes||a.deadline?'invented_consequential_fact':'invented_fact','goal שלא נאמר: '+a.title);});
  (E.boundaries||[]).forEach(e=>{const a=(A.boundaries||[]).find(b=>(!e.kind||b.kind===e.kind)&&(e.dow===undefined||b.dow===e.dow)&&(!e.m||e.m.some(s=>String(b.rule).includes(s)||e.kind==='closed_day'||e.kind==='no_work_evening'||e.kind==='no_work_after')));
    if(!a){add('missed_fact','boundary: '+(e.m?e.m[0]:e.kind));return;}usedB.add(a);
    if(e.time&&a.time!==hm(e.time))add('wrong_consequential_value','boundary.time='+a.time+' במקום '+e.time);
    if(e.defined===false&&a.defined!==false)add('wrong_value','boundary.defined');
    if(e.semanticWindow&&a.semanticWindow!==e.semanticWindow)add('wrong_value','boundary.semanticWindow='+a.semanticWindow);});
  (A.boundaries||[]).forEach(b=>{if(usedB.has(b))return;if((E.boundaries||[]).length||E.noTimedBoundary||E.boundaries===undefined&&false)add(b.time!=null||b.dow!==undefined?'invented_consequential_fact':'invented_fact','boundary שלא נאמר: '+b.rule);});
  if(E.noTimedBoundary&&(A.boundaries||[]).some(b=>b.time!=null&&b.kind==='no_work_after'&&!(E.boundaries||[]).some(e=>e.time)))add('invented_consequential_fact','boundary עם שעה שלא נאמרה');
  if(E.mvw===true&&!(A.minimumViableWeek||[]).length)add('missed_minimum_viable_week','minimumViableWeek חסר');
  if(E.mvw===false&&(A.minimumViableWeek||[]).length)add('invented_fact','minimumViableWeek שלא נאמר');
  (E.dontKnow||[]).forEach(k=>{if(!(A.dontKnow||[]).some(d=>d===k||d.indexOf(k)===0))add('dontknow_missed','dontKnow: '+k);});
  if(E.chaos!==undefined&&(A.chaosTriggers||[]).length<E.chaos)add('missed_fact','chaosTriggers '+(A.chaosTriggers||[]).length+'/'+E.chaos);
  if(meta){
    if(meta.gaps>0&&!c.followup)add('unnecessary_followup','נשאלה שאלת המשך מיותרת ('+meta.gaps+' פערים)');
    if(meta.gaps===0&&c.followup)add('missed_followup','לא זוהה פער שחייב שאלה');
    (c.covers||[]).forEach(t=>{if((meta.covered||[]).indexOf(t)<0&&(A.answeredTopics||[]).indexOf(t)<0)add('coverage_miss','נושא '+t+' לא זוהה כמכוסה');});
  }
  const sev=errs.reduce((m,e)=>RANK[e.severity]>RANK[m]?e.severity:m,'pass');
  return{errors:errs,severity:sev,pass:sev==='pass'};
}
// expected spec → raw extraction (harness self-check: replaying the expectation must score pass)
function toRaw(c){const E=c.expect||{};const tf=(v,p)=>v?{hhmm:v,precision:p||'exact'}:undefined;const raw={answeredTopics:c.covers||[]};
  raw.routines=(E.routines||[]).map(r=>({key:r.m[0],title:r.m[0],kind:r.kind,domain:r.domain,maintenance:r.maintenance,stated:r.stated,perWeek:r.perWeek,perDay:r.perDay,perTwoWeeks:r.perTwoWeeks,durationMin:r.durationMin,protected:r.protected,inMvw:r.inMvw}));
  raw.fixed=(E.fixed||[]).map(f=>{const cx=((c.ctx||{}).fixed||[]).find(x=>f.m.some(s=>String(x.title).includes(s)));return{key:cx?cx.key:f.m[0],title:f.m[0],days:f.days,start:f.noTimes?undefined:tf(f.start,f.startPrecision),end:f.noTimes?undefined:tf(f.end),travelMin:f.travelMin?{min:f.travelMin,precision:'approx'}:undefined,semanticWindow:f.semanticWindow};});
  if(E.officeHours)raw.officeHours={days:[0,1,2,3,4],from:E.officeHours.from,to:E.officeHours.to};
  raw.goals=(E.goals||[]).map(g=>({key:g.m[0],title:g.m[0],requiredTotalMinutes:g.total==null?undefined:g.total,requiredPerWeekMinutes:g.perWeek==null?undefined:g.perWeek,deadline:g.deadline==null?undefined:g.deadline}));
  raw.boundaries=(E.boundaries||[]).map(b=>({rule:(b.m?b.m[0]:b.kind)+' בלי',kind:b.kind,time:b.time,dow:b.dow,semanticWindow:b.semanticWindow,defined:b.defined}));
  if(E.mvw)raw.minimumViableWeek=['חשוב'];raw.successCriteria=['x'];raw.dontKnow=(E.dontKnow||[]).map(k=>k.endsWith('.')?(k==='fixed.'&&c.field?c.field:k+'x'):k);
  if(E.chaos)raw.chaosTriggers=Array.from({length:E.chaos},(_,i)=>'גורם '+(i+1));
  return raw;}
function summarize(results){const by={};ERROR_TYPES.forEach(t=>by[t]=0);results.forEach(r=>r.errors.forEach(e=>by[e.type]++));
  const sev={pass:0,minor:0,major:0,critical:0};results.forEach(r=>sev[r.severity]++);
  return{cases:results.length,bySeverity:sev,byError:by,criticalCases:results.filter(r=>r.severity==='critical').map(r=>r.id),
    metrics:{inventedConsequential:by.invented_consequential_fact,wrongConsequential:by.wrong_consequential_value,missedFacts:by.missed_fact,inventedFacts:by.invented_fact,wrongDomain:by.wrong_domain,wrongRigidity:by.wrong_rigidity,missedMvw:by.missed_minimum_viable_week,
      unnecessaryFollowups:by.unnecessary_followup,missedFollowups:by.missed_followup,dontKnowMissed:by.dontknow_missed}};}
module.exports={compareExtraction,toRaw,summarize,ERROR_TYPES,SEV,RANK,hm};
