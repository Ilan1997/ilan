#!/usr/bin/env node
// Harness self-test: the comparator must FLAG each known flaw (otherwise a green eval means nothing). Pure node — no page, no model.
const {compareExtraction,toRaw}=require('./compare.js');const cases=JSON.parse(require('fs').readFileSync(__dirname+'/cases.json','utf8')).cases;const byId=Object.fromEntries(cases.map(c=>[c.id,c]));
const hhmm=s=>{const [h,m]=s.split(':').map(Number);return h*60+m;};
// normalized-actual builder mirroring onbNormalizeExtraction's output shape (sparse)
const norm=raw=>({routines:(raw.routines||[]).map(r=>Object.assign({key:r.key,title:r.title,kind:r.kind||'other',domain:r.domain||'life',stated:r.stated||'fact',protected:!!r.protected,inMvw:!!r.inMvw},r.maintenance?{maintenance:r.maintenance}:{},r.perWeek?{perWeek:r.perWeek}:{},r.perDay?{perDay:true}:{},r.perTwoWeeks?{perTwoWeeks:true}:{},r.durationMin?{durationMin:r.durationMin}:{})),
  fixed:(raw.fixed||[]).map(f=>Object.assign({key:f.key,title:f.title},f.days?{days:f.days}:{},f.start?{start:{min:hhmm(f.start.hhmm),precision:f.start.precision||'exact'}}:{},f.end?{end:{min:hhmm(f.end.hhmm),precision:'exact'}}:{},f.travelMin?{travelMin:f.travelMin}:{},f.semanticWindow?{semanticWindow:f.semanticWindow}:{})),
  officeHours:raw.officeHours?{days:raw.officeHours.days,from:hhmm(raw.officeHours.from),to:hhmm(raw.officeHours.to)}:null,
  goals:(raw.goals||[]).map(g=>({key:g.key,title:g.title,requiredTotalMinutes:g.requiredTotalMinutes==null?null:g.requiredTotalMinutes,requiredPerWeekMinutes:g.requiredPerWeekMinutes==null?null:g.requiredPerWeekMinutes,deadline:g.deadline||null})),
  boundaries:(raw.boundaries||[]).map(b=>Object.assign({rule:b.rule,kind:b.kind,defined:b.defined!==false},b.time?{time:hhmm(b.time)}:{},b.dow!=null?{dow:b.dow}:{},b.semanticWindow?{semanticWindow:b.semanticWindow}:{})),
  minimumViableWeek:raw.minimumViableWeek||[],chaosTriggers:raw.chaosTriggers||[],dontKnow:raw.dontKnow||[],answeredTopics:raw.answeredTopics||[]});
const run=(id,mut,meta)=>{const c=byId[id];const A=norm(toRaw(c));mut&&mut(A);return compareExtraction(A,c,meta||{gaps:c.followup?1:0,covered:c.covers});};
const T=[
 ['clean replay passes',()=>run('T02'),r=>r.pass],
 ['invented office hours when "I do not know" → critical',()=>run('K02',A=>{A.officeHours={days:[0,1,2,3,4],from:540,to:1020};}),r=>r.severity==='critical'&&r.errors.some(e=>e.type==='invented_consequential_fact')],
 ['invented time for "Tuesday evening" → critical',()=>run('A01',A=>{A.fixed[0].start={min:1080,precision:'exact'};}),r=>r.severity==='critical'],
 ['invented goal total when unknown → critical',()=>run('W03',A=>{A.goals[0].requiredTotalMinutes=600;}),r=>r.severity==='critical'],
 ['invented deadline → critical',()=>run('W01',A=>{A.goals[0].deadline='2026-12-31';}),r=>r.severity==='critical'],
 ['wrong office hours (kept first version) → critical',()=>run('C01',A=>{A.officeHours.from=540;A.officeHours.to=1020;}),r=>r.severity==='critical'&&r.errors.some(e=>e.type==='wrong_consequential_value')],
 ['wrong day → critical',()=>run('X02',A=>{A.fixed[0].days=[1];}),r=>r.severity==='critical'],
 ['invented boundary time for undefined "evening" → critical',()=>run('K04',A=>{A.boundaries.push({rule:'אחרי 19',kind:'no_work_after',time:1140,defined:true});}),r=>r.severity==='critical'],
 ['calendar event extracted again → major',()=>run('E01',A=>{A.fixed.push({key:'meeting',title:'ישיבת צוות',days:[1]});}),r=>r.severity==='major'&&r.errors.some(e=>e.type==='invented_fact')],
 ['missed routine → major',()=>run('T01',A=>{A.routines.shift();}),r=>r.severity==='major'&&r.errors.some(e=>e.type==='missed_fact')],
 ['wrong domain (work maintenance as life) → major',()=>run('B02',A=>{A.routines[0].maintenance='life';A.routines[0].domain='life';}),r=>r.errors.some(e=>e.type==='wrong_domain')],
 ['"maybe" turned into a fact → wrong_rigidity',()=>run('P01',A=>{A.routines.find(x=>x.title==='ספורט').stated='fact';}),r=>r.errors.some(e=>e.type==='wrong_rigidity')],
 ['missed minimumViableWeek',()=>run('T01',A=>{A.minimumViableWeek=[];}),r=>r.errors.some(e=>e.type==='missed_minimum_viable_week')],
 ['"לא יודע" not recorded',()=>run('K03',A=>{A.dontKnow=[];}),r=>r.errors.some(e=>e.type==='dontknow_missed')],
 ['invented routine out of nowhere',()=>run('N01',A=>{A.routines.push({key:'x',title:'ריצה',domain:'life'});}),r=>r.errors.some(e=>e.type==='invented_fact')],
 ['unnecessary follow-up measured',()=>run('T02',null,{gaps:2,covered:['q2']}),r=>r.errors.some(e=>e.type==='unnecessary_followup')],
 ['missed follow-up measured',()=>run('A01',null,{gaps:0,covered:['q2']}),r=>r.errors.some(e=>e.type==='missed_followup')],
 ['coverage miss measured',()=>run('M01',A=>{A.answeredTopics=[];},{gaps:0,covered:['q1']}),r=>r.errors.some(e=>e.type==='coverage_miss')],
 ['invented travel time → critical',()=>run('T02',A=>{A.fixed[0].travelMin={min:30,precision:'approx'};}),r=>r.severity==='critical'],
];
let bad=0;T.forEach(([n,f,ok])=>{const r=f();const good=!!ok(r);if(!good){bad++;console.log('SELFTEST FAIL:',n,JSON.stringify(r.errors));}});
console.log(bad?bad+' of '+T.length+' self-tests FAILED':'onboarding-eval self-test: '+T.length+'/'+T.length+' flaws detected');process.exit(bad?1:0);
