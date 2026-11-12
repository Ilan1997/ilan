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
      else chk('pref_'+k,ap[k]===expected.preference[k],k+' '+ap[k]+' ≠ '+expected.preference[k]);
    });
  }
  const failed=f.filter(x=>!x.ok);
  return{pass:failed.length===0,checks:f,failed};
}
// Aggregate: per-check-type accuracy over many results.
function summarize(results){
  const by={};let pass=0;
  results.forEach(r=>{if(r.pass)pass++;r.checks.forEach(c=>{const b=by[c.k]=by[c.k]||{ok:0,n:0};b.n++;if(c.ok)b.ok++;});});
  return{cases:results.length,pass,byCheck:by};
}
module.exports={compareIntent,summarize,toks,overlap};
