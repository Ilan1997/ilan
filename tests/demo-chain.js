#!/usr/bin/env node
// Demo (step B): "אחרי הפגישה בפתח תקווה תכנן לי נסיעה לאריאל ואז שעה בית מדרש."
// The calendar has a meeting in Petah Tikva 09:00-10:00. Run twice: matrix unknown (one question), then known.
const fs=require('fs'),path=require('path');const {JSDOM,VirtualConsole}=require('jsdom');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',virtualConsole:new VirtualConsole(),beforeParse(w){const m={};w.storage={get:async k=>{if(!(k in m))throw new Error('nf');return{value:m[k]}},set:async(k,v)=>{m[k]=v;return{}},delete:async k=>{delete m[k];return{}}};if(!w.structuredClone)w.structuredClone=o=>JSON.parse(JSON.stringify(o));w.requestAnimationFrame=f=>setTimeout(f,0);w.HTMLElement.prototype.scrollIntoView=()=>{};w.scrollTo=()=>{};}});
setTimeout(()=>{
  const w=dom.window;
  const out=w.eval(`(()=>{
    const L=[];const say=(who,t)=>L.push(who+': '+t);
    const events=[{id:'gcal_m1_2026-11-16',title:'פגישה בפתח תקווה',date:'2026-11-16',startH:9,endH:10,startMin:540,endMin:600,place:'פתח תקווה',attendees:2,source:'gcal',gid:'m1'}];
    const mk=rules=>{const s=structuredClone(STATE_ACTIVE);s.meta.today='2026-11-15';s.constraintsGlobal.events=events;s.userRules=rules||{};return s;};
    // what the MODEL is expected to return for the sentence (see tests/intent-eval)
    const parsed={op:'create',items:[{ref:'i1',title:'נסיעה לאריאל',kind:'travel',place:'אריאל',anchor:{rel:'after',target:{text:'הפגישה בפתח תקווה',date:'2026-11-16'}},confidence:{kind:0.95,place:0.95,anchor:0.9}},{ref:'i2',title:'בית מדרש',kind:'religious',durationMin:60,afterItem:'i1',confidence:{kind:0.85,duration:0.95}}]};
    say('אתה','אחרי הפגישה בפתח תקווה תכנן לי נסיעה לאריאל ואז שעה בית מדרש.');
    let st=mk({});let run=()=>{const sn=buildContextSnapshot(st);const it=normalizeIntent(parsed);return planChainBasic(sn,it,planningGaps(it,getUserRules(st)));};
    let res=run();say('מאיה',chainSummaryText(res));
    if(res.status==='ask'&&res.ask.field==='travel'){say('אתה','40 דקות');
      const patch=travelAnswerPatch(getUserRules(st),res.ask.from,res.ask.to,40);st=mk(patch);res=run();say('מאיה',chainSummaryText(res));}
    say('(פעם הבאה)','הזמן נשמר ב-userRules; בלי שאלה:');st=mk(st.userRules);say('מאיה',chainSummaryText(run()));
    return L.join('\\n\\n');
  })()`);
  console.log(out);process.exit(0);
},1500);
