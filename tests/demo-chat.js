#!/usr/bin/env node
// Demo (step F): a real-looking chat. The model is STUBBED with the JSON it would return; everything else is the app's own code.
// Shows who writes what: the model only interprets; Maya's words, times, repairs and approvals come from code.
const fs=require('fs'),path=require('path');const {JSDOM,VirtualConsole}=require('jsdom');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',virtualConsole:new VirtualConsole(),beforeParse(w){w.__MAYA_TEST__=true;const m={};w.storage={get:async k=>{if(!(k in m))throw new Error('nf');return{value:m[k]}},set:async(k,v)=>{m[k]=v;return{}},delete:async k=>{delete m[k];return{}}};if(!w.structuredClone)w.structuredClone=o=>JSON.parse(JSON.stringify(o));w.requestAnimationFrame=f=>setTimeout(f,0);w.HTMLElement.prototype.scrollIntoView=()=>{};w.scrollTo=()=>{};}});
setTimeout(async()=>{
  const out=await dom.window.eval(`(async()=>{
    const L=[];const MON='2026-11-16';const HM=(h,m)=>h*60+(m||0);
    const EV=(id,title,sm,em,x)=>({id,title,date:MON,startH:Math.floor(sm/60),endH:Math.ceil(em/60),startMin:sm,endMin:em,attendees:2,...(x||{})});
    const s=structuredClone(STATE_ACTIVE);s.meta.today=MON;s.userRules={};
    s.constraintsGlobal.events=[EV('pt','פגישה בפתח תקווה',HM(9),HM(10),{place:'פתח תקווה'}),EV('tr','טיפול',HM(11,20),HM(12,20),{attendees:1})];
    STATE_ACTIVE=s;_aiRoute=async()=>'proxy';
    let modelReply='';let modelCalls=0;_aiCallModel=async()=>{modelCalls++;return modelReply;};
    _mayaSay=(t,b)=>{L.push('מאיה:   '+mayaPolish(t).split('\\n').join('\\n         ')+(b&&b.length?'\\n         ['+b.map(x=>x.label).join('] [')+']':''));};
    const you=async(t,now,reply)=>{window.__MAYA_NOW__={iso:MON,minutes:now};if(reply!==undefined)modelReply=reply;const c0=modelCalls;L.push('\\nאתה ('+_fmtMin(now)+'): '+t);const h=await _mayaHandleStructured(t);L.push('   · '+(h?'טופל בקוד':'עובר לשיחה רגילה')+' · קריאות למודל: '+(modelCalls-c0));};
    const tap=async(label)=>{L.push('\\n   >> לוחץ "'+label+'"');if(label==='אשר'||label==='עדכן')_mayaApprove(null);await new Promise(r=>setTimeout(r,20));};
    const CHAIN=JSON.stringify({op:'create',items:[{ref:'i1',title:'נסיעה לאריאל',kind:'travel',place:'אריאל',anchor:{rel:'after',target:{text:'הפגישה בפתח תקווה',date:MON}},confidence:{kind:0.95,place:0.95,anchor:0.9}},{ref:'i2',title:'בית מדרש',kind:'religious',durationMin:60,afterItem:'i1',confidence:{kind:0.85,duration:0.95}}]});
    L.push('(מה שהמודל מחזיר הוא JSON בלבד — הטקסט שמאיה כותבת נבנה בקוד)');
    await you('אחרי הפגישה בפתח תקווה תכנן לי נסיעה לאריאל ואז שעה בית מדרש',HM(8),CHAIN);
    await you('40 דקות',HM(8));
    await tap('אשר');
    L.push('   ביומן עכשיו: '+STATE_ACTIVE.constraintsGlobal.events.filter(e=>String(e.id).indexOf('mplan:')===0).map(e=>_fmtMin(e.startMin)+'–'+_fmtMin(e.endMin)+' '+e.title).join(' | '));
    await you('איחרתי ב-20 דקות',HM(10,5));
    await tap('עדכן');
    L.push('   ביומן עכשיו: '+STATE_ACTIVE.constraintsGlobal.events.filter(e=>String(e.id).indexOf('mplan:')===0).map(e=>_fmtMin(e.startMin)+'–'+_fmtMin(e.endMin)+' '+e.title).join(' | '));
    await you('ביטלו את בית מדרש',HM(10,30));
    L.push('   ביומן עכשיו: '+STATE_ACTIVE.constraintsGlobal.events.filter(e=>String(e.id).indexOf('mplan:')===0).map(e=>_fmtMin(e.startMin)+'–'+_fmtMin(e.endMin)+' '+e.title).join(' | '));
    await you('מה דעתך על שבוע הבא?',HM(10,31),'{"op":"none","items":[]}');
    await you('סדר לי את מחר',HM(10,32),'לא יודעת');
    return L.join('\\n');
  })()`);
  console.log(out);process.exit(0);
},1500);
