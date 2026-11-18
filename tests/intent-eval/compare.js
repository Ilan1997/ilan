// Pure comparison of a model Intent against an expected Intent. No network, no DOM.
const norm=s=>String(s||'').toLowerCase().replace(/[֑-ׇ]/g,'').replace(/וו/g,'ו').replace(/יי/g,'י').replace(/["'׳״`.,!?()\-–—:;/]/g,' ').replace(/\s+/g,' ').trim();
const STOP=new Set(['את','של','עם','על','אל','לי','אני','כבר','זה','הזה']);
const toks=s=>norm(s).split(' ').filter(Boolean).map(w=>w.replace(/^(ה|ב|ל|ו|ש|מ|כ)(?=[א-ת]{3,})/,'')).filter(w=>w.length>=2&&!STOP.has(w));
const overlap=(a,b)=>{const A=toks(a),B=new Set(toks(b));if(!A.length)return 1;return A.filter(t=>B.has(t)).length/A.length;};
function compareIntent(actual,expected){
  const f=[];const chk=(k,ok,msg)=>f.push({k,ok:!!ok,msg:ok?'':msg});
  actual=actual&&typeof actual==='object'?actual:{};expected=expected||{};
  chk('op',(actual.op||'create')===(expected.op||'create'),'op '+actual.op+' ≠ '+expected.op);
  const A=Array.isArray(actual.items)?actual.items:[],E=Array.isArray(expected.items)?expected.items:[];
  chk('itemCount',A.length===E.length,'items '+A.length+' ≠ '+E.length);
  E.forEach((e,i)=>{
    const a=A[i];const tag='#'+(i+1)+' '+(e.title||'');
    if(!a){chk('item',false,tag+' חסר');return;}
    chk('kind',a.kind===e.kind,tag+' kind '+a.kind+' ≠ '+e.kind);
    chk('title',overlap(e.title,a.title)>=0.5,tag+' כותרת "'+a.title+'"');
    if(e.durationMin!=null)chk('duration',Math.abs((+a.durationMin||-999)-e.durationMin)<=5,tag+' משך '+a.durationMin+' ≠ '+e.durationMin);
    else chk('noInventedDuration',a.durationMin==null||!!e.durationUnknown||false,tag+' המציא משך '+a.durationMin);
    if(e.durationUnknown)chk('durationUnknown',a.durationUnknown===true,tag+' לא סימן durationUnknown');
    if(e.place)chk('place',overlap(e.place,a.place)>=0.5,tag+' מקום "'+a.place+'" ≠ "'+e.place+'"');
    if(e.date)chk('date',a.date===e.date||(a.anchor&&a.anchor.target&&a.anchor.target.date===e.date),tag+' תאריך '+a.date+' ≠ '+e.date);
    if(e.window&&e.window.from)chk('window',a.window&&a.window.from===e.window.from,tag+' שעה '+(a.window&&a.window.from)+' ≠ '+e.window.from);
    if(e.afterItem)chk('afterItem',a.afterItem===e.afterItem,tag+' afterItem '+a.afterItem);
    if(e.anchor){
      const ok=a.anchor&&a.anchor.rel===e.anchor.rel&&overlap(e.anchor.target.text,a.anchor.target&&a.anchor.target.text)>=0.6;
      chk('anchor',ok,tag+' עוגן '+JSON.stringify(a.anchor)+' ≠ '+JSON.stringify(e.anchor));
      if(e.anchor.target&&e.anchor.target.date)chk('anchorDate',a.anchor&&a.anchor.target&&a.anchor.target.date===e.anchor.target.date,tag+' תאריך עוגן '+(a.anchor&&a.anchor.target&&a.anchor.target.date));
    }else chk('noInventedAnchor',!a.anchor,tag+' המציא עוגן '+JSON.stringify(a.anchor));
  });
  if(expected.filter)chk('filter',actual.filter&&actual.filter.kind===expected.filter.kind,'filter '+JSON.stringify(actual.filter));
  if(expected.targetDays)chk('targetDays',JSON.stringify([...(actual.targetDays||[])].sort())===JSON.stringify([...expected.targetDays].sort()),'targetDays '+JSON.stringify(actual.targetDays));
  if('scope' in expected)chk('scope',(actual.scope||null)===(expected.scope||null),'scope '+actual.scope);
  else chk('noInventedScope',!actual.scope||actual.op!=='preference',' המציא scope '+actual.scope);
  if(expected.preference){
    const ap=actual.preference||{};
    Object.keys(expected.preference).forEach(k=>{
      if(k==='dayRule')chk('dayRule',ap.dayRule&&ap.dayRule.dow===expected.preference.dayRule.dow&&ap.dayRule.mode===expected.preference.dayRule.mode,'dayRule '+JSON.stringify(ap.dayRule));
      else if(k==='preferredWindow'){const e=expected.preference.preferredWindow,w=ap.preferredWindow||{};chk('prefWindow',w.kind===e.kind&&w.from===e.from&&w.to===e.to,'preferredWindow '+JSON.stringify(ap.preferredWindow));}
      else chk('pref_'+k,ap[k]===expected.preference[k],k+' '+ap[k]+' ≠ '+expected.preference[k]);
    });
  }
  if(expected.goals){
    const AG=Array.isArray(actual.goals)?actual.goals:[];
    chk('goalCount',AG.length===expected.goals.length,'goals '+AG.length+' ≠ '+expected.goals.length);
    expected.goals.forEach((e,i)=>{const g=AG[i];if(!g){chk('goal',false,'יעד '+(i+1)+' חסר');return;}const tag='יעד '+(i+1);
      chk('goalMinutes',Math.abs((+g.totalMinutes||-999)-e.totalMinutes)<=5,tag+' totalMinutes '+g.totalMinutes+' ≠ '+e.totalMinutes);
      chk('goalDeadline',g.deadline===e.deadline,tag+' deadline '+g.deadline+' ≠ '+e.deadline);
      if(e.kind)chk('goalKind',g.kind===e.kind,tag+' kind '+g.kind+' ≠ '+e.kind);
      if(e.maxSessionMin!=null)chk('goalMaxSession',+g.maxSessionMin===e.maxSessionMin,tag+' maxSession '+g.maxSessionMin+' ≠ '+e.maxSessionMin);
      else chk('noInventedSession',g.maxSessionMin==null&&g.minSessionMin==null,tag+' המציא אורך מפגש '+g.minSessionMin+'/'+g.maxSessionMin);
    });
  }else if(expected.op!=='goal')chk('noInventedGoal',!(Array.isArray(actual.goals)&&actual.goals.length),'המציא יעד שעות');
  const failed=f.filter(x=>!x.ok);
  return{pass:failed.length===0,checks:f,failed};
}
// Aggregate: per-check-type accuracy over many results.
function summarize(results){
  const by={};let pass=0;
  results.forEach(r=>{if(r.pass)pass++;r.checks.forEach(c=>{const b=by[c.k]=by[c.k]||{ok:0,n:0};b.n++;if(c.ok)b.ok++;});});
  return{cases:results.length,pass,byCheck:by};
}
// Map a failed check to an error type (the categories the product owner asked to see).
const ERROR_TYPES={
  'missed planning request':'הבקשה לתכנון לא זוהתה (op=none/שגוי כשצריך תכנון)',
  'false planning request':'זוהתה בקשת תכנון בשיחה רגילה',
  'wrong op':'op שגוי',
  'wrong kind':'סוג פעילות שגוי',
  'wrong sequence':'סדר/רצף שגוי',
  'anchor resolution error':'עוגן לא נפתר נכון (יחס/יעד/תאריך)',
  'hallucinated detail':'פרט שהומצא (משך/עוגן/יעד/scope)',
  'wrong value':'ערך שגוי (תאריך/משך/שעה/מקום/כותרת/כמות)',
  'unnecessary question':'שאלה מיותרת',
  'missing question':'לא נשאלה שאלה שנדרשה',
  'call/JSON error':'כשל קריאה או JSON לא תקין'
};
function classifyCheck(c,actual,expected){
  const k=c.k;
  if(k==='call')return'call/JSON error';
  if(k==='op'){const a=(actual&&actual.op)||'create',e=(expected&&expected.op)||'create';if(e!=='none'&&a==='none')return'missed planning request';if(e==='none'&&a!=='none')return'false planning request';return'wrong op';}
  if(k==='kind'||k==='goalKind')return'wrong kind';
  if(k==='afterItem'||k==='itemCount'&&false)return'wrong sequence';
  if(k==='anchor'||k==='anchorDate')return'anchor resolution error';
  if(/^noInvented|^durationUnknown$/.test(k))return'hallucinated detail';
  return'wrong value';
}
// Does the app need to ASK something for this Intent?  (injected from the app: planningGaps)
function summarizeByError(results){
  const by={};results.forEach(r=>{(r.errors||[]).forEach(e=>{const b=by[e.type]=by[e.type]||{n:0,cases:new Set()};b.n++;b.cases.add(r.id);});});
  return Object.fromEntries(Object.entries(by).map(([k,v])=>[k,{n:v.n,cases:[...v.cases]}]));
}
// Severity of a failed check: minor (name-level), major (the system could assume/recover, or product annoyance), critical (wrong action or plan).
const SEVERITY_RANK={pass:0,minor:1,major:2,critical:3};
function severityOf(c,errType){
  const k=c.k;
  if(['op','anchor','anchorDate','afterItem','itemCount','call','goalMinutes','goalDeadline','goalCount','targetDays','filter','goal'].indexOf(k)>=0)return'critical';
  if(errType==='missed planning request'||errType==='false planning request')return'critical';
  if(k==='title')return'minor';
  return'major';
}
function caseSeverity(errors){return errors.reduce((m,e)=>SEVERITY_RANK[e.severity]>SEVERITY_RANK[m]?e.severity:m,'pass');}
module.exports={severityOf,caseSeverity,SEVERITY_RANK,compareIntent,summarize,toks,overlap,classifyCheck,summarizeByError,ERROR_TYPES};
