// Runs every suite against ../index.html in jsdom. Exit code 1 on any failure.
// Usage: TZ=Asia/Jerusalem node tests/run.js
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const errs=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(String(e.message).slice(0,200)));
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',virtualConsole:vc,
  beforeParse(w){const m={};
    w.storage={get:async k=>{if(!(k in m))throw new Error('nf');return{value:m[k]}},set:async(k,v)=>{m[k]=v;return{}},delete:async k=>{delete m[k];return{}}};
    if(!w.structuredClone)w.structuredClone=o=>JSON.parse(JSON.stringify(o));
    w.requestAnimationFrame=f=>setTimeout(f,0);w.HTMLElement.prototype.scrollIntoView=()=>{};w.scrollTo=()=>{};}});
const w=dom.window;
(async()=>{
  await new Promise(r=>setTimeout(r,1500));
  const rows=[];let failed=false;
  const sync=(name,fn)=>{try{const r=fn();const ok=r&&(r.failed!==undefined?r.failed===0:r.passed===true||r.ok===true);
    rows.push([name,r&&r.passed!==undefined&&typeof r.passed==='number'?`${r.passed}/${r.passed+r.failed}`:String(ok)]);if(!ok)failed=true;}
    catch(e){rows.push([name,'THROW '+e.message]);failed=true;}};
  sync('runCoreTests',()=>w.runCoreTests());
  sync('runUserScenarios',()=>w.runUserScenarios());
  sync('runArchitectureAudit',()=>w.runArchitectureAudit());
  sync('runSemanticCompilerAudit',()=>w.runSemanticCompilerAudit());
  sync('runFullSystemAudit',()=>w.runFullSystemAudit());
  for(const n of ['runBlockRenderTests','runApprovalCTATests','runAIProfileTests','runMayaInsightsTests','runSacredEnforcementTests','runProfileEnforcementTests','runPlacementOptionsTests','runMayaScreenTests','runDayOverrideTests'])sync(n,()=>w[n]());
  for(const n of ['runAIBootTests','runAccountTests']){try{const r=await w[n]();rows.push([n,`${r.passed}/${r.passed+r.failed}`]);if(r.failed)failed=true;}catch(e){rows.push([n,'THROW '+e.message]);failed=true;}}
  // Google colours copied onto calendar chips
  try{
    const c=w.eval(`(()=>{const r={};
      r.tomato=gcalColorOf({colorId:'11'});r.unknown=gcalColorOf({colorId:'99'});r.none=gcalColorOf({});r.def=GCAL_DEFAULT_COLOR;
      r.darkOnBanana=gcalTextOn('#f6bf26');r.whiteOnTomato=gcalTextOn('#d50000');
      const b=gcalItemsToBlocks([{id:'x1',summary:'בדיקה',colorId:'11',start:{dateTime:'2026-10-14T10:00:00'},end:{dateTime:'2026-10-14T11:00:00'}}]);
      r.blockColor=(b&&b[0]&&b[0].color)||null;return r;})()`);
    const okc=c.tomato==='#d50000'&&c.unknown===c.def&&c.none===c.def&&c.darkOnBanana==='#202124'&&c.whiteOnTomato==='#fff'&&c.blockColor==='#d50000';
    rows.push(['gcal colour mapping',String(okc)+(okc?'':' '+JSON.stringify(c))]);if(!okc)failed=true;
  }catch(e){rows.push(['gcal colour mapping','THROW '+e.message]);failed=true;}
  // Maya screen flow: safe formatting, chips/fold state, retry without duplicates
  try{
    const r=w.eval(`(()=>{const o={};
      const el=document.createElement('div');_aiFormatInto(el,'היי **חשוב** <img src=x onerror=1>\\n- אחד');
      o.bold=el.querySelectorAll('strong').length===1&&el.querySelector('strong').textContent==='חשוב';o.noHtml=!el.querySelector('img')&&el.textContent.includes('<img');o.bullet=el.textContent.includes('• אחד');
      o.menu=!!document.getElementById('aiMoreMenu')&&document.getElementById('aiMoreMenu').hidden===true&&!document.getElementById('aiQuick');_aiToggleMore();o.menuOpen=document.getElementById('aiMoreMenu').hidden===false&&document.querySelectorAll('#aiMoreMenu button').length===4;_aiQuick('fill','x');o.menuClosed=document.getElementById('aiMoreMenu').hidden===true;document.getElementById('aiChatInput').value='';const keep=AI_CHAT_HISTORY.slice();AI_CHAT_HISTORY.length=0;_aiSyncChatState();const pane=document.getElementById('paneAI');
      o.emptyNoChat=!pane.classList.contains('has-chat');
      AI_CHAT_HISTORY.push({role:'user',content:'שלום'});_aiSyncChatState();o.hasChat=pane.classList.contains('has-chat');
      _aiQuick('fill','יש לי משימה חדשה: ');o.fill=document.getElementById('aiChatInput').value==='יש לי משימה חדשה: ';document.getElementById('aiChatInput').value='';
      const log=document.getElementById('aiChatLog');_aiAppendBubble('שלום','user');_aiOfferRetry('שלום');
      const btn=[...log.querySelectorAll('.ai-proposal button')].pop();o.retryBtn=!!btn&&/נסה שוב/.test(btn.textContent);
      const before=AI_CHAT_HISTORY.length;AI_BUSY=true;btn.click();o.busyIgnored=AI_CHAT_HISTORY.length===before;AI_BUSY=false;
      const ty=_aiAppendBubble('חושב/ת…','typing');o.dots=!!ty.querySelector('.ai-dots');ty.remove();
      AI_CHAT_HISTORY.length=0;keep.forEach(m=>AI_CHAT_HISTORY.push(m));_aiRenderHistory();document.getElementById('aiChatInput').value='';
      return o;})()`);
    const okm=Object.values(r).every(Boolean);rows.push(['maya screen flow',String(okm)+(okm?'':' '+JSON.stringify(r))]);if(!okm)failed=true;
  }catch(e){rows.push(['maya screen flow','THROW '+e.message]);failed=true;}
  // Work/life: domain travels with the Google event, fixed-time add dialog, work zone on the grid
  try{
    const r=await w.eval(`(async()=>{const o={};
      const it=(x)=>({id:'d1',summary:'ישיבה',start:{dateTime:'2026-10-14T10:00:00'},end:{dateTime:'2026-10-14T11:00:00'},...x});
      o.imp=gcalItemsToBlocks([it({extendedProperties:{private:{maya_domain:'work'}}})])[0].domain==='work'&&gcalItemsToBlocks([it({})])[0].domain===undefined;
      const v=_gcalValidateEv({title:'x',date:'2026-10-14',startMin:600,endMin:660,domain:'work'}).ev;
      o.body=_gcalBody(v).extendedProperties.private.maya_domain==='work'&&!('extendedProperties' in _gcalBody({...v,domain:'life'}))&&_gcalBody({...v,domain:'life'},true).extendedProperties.private.maya_domain===null;
      const sa=STATE_ACTIVE;
      try{
        openQA({mode:'fixed',date:'2026-10-14',startMin:660,deadline:'2026-10-14'});await new Promise(r=>setTimeout(r,120));
        const sh=document.querySelector('#qaModal .qa-sheet');o.mode=sh.dataset.mode==='fixed'&&document.getElementById('qaFxStart').value==='660'&&document.getElementById('qaFxEnd').value==='720';
        document.getElementById('qaName').value='ישיבת צוות';document.querySelector('#qaFxDom [data-v=work]').click();
        document.getElementById('qaFxEnd').value='660';_qaGoFixed();await new Promise(r=>setTimeout(r,20));
        o.badEnd=!(STATE_ACTIVE.constraintsGlobal.events||[]).some(e=>e.title==='ישיבת צוות')&&/אחרי שעת ההתחלה/.test(document.getElementById('qaFxNote').textContent);
        document.getElementById('qaFxEnd').value='720';await _qaGoFixed();
        const ev=(STATE_ACTIVE.constraintsGlobal.events||[]).find(e=>e.title==='ישיבת צוות');
        o.local=!!ev&&ev.date==='2026-10-14'&&ev.startMin===660&&ev.endMin===720&&ev.startH===11&&ev.endH===12&&ev.domain==='work';
      }finally{try{closeQA();}catch(_e){} if(sa)STATE_ACTIVE=commitState(sa,'test-restore',{save:false,render:false});}
      return o;})()`);
    const okw=Object.values(r).every(Boolean);rows.push(['work/life + fixed-time add',String(okw)+(okw?'':' '+JSON.stringify(r))]);if(!okw)failed=true;
  }catch(e){rows.push(['work/life + fixed-time add','THROW '+e.message]);failed=true;}
  // fixed-time item with Google connected: created in Google (with work domain), not locally
  try{
    const r=await w.eval(`(async()=>{const o={};
      const prevG=window.google;window.google={accounts:{oauth2:{initTokenClient:c=>({requestAccessToken:()=>c.callback({access_token:'tt',expires_in:3600})}),revoke:()=>{}}}};
      const prevCfg=GCAL_CONFIG.clientId,prevFetch=window.fetch,pl=_gcalLastToken,pe=_gcalTokenExp,prevPrefs=localStorage.getItem(GCAL_PREF_KEY),sa=STATE_ACTIVE;
      try{
        GCAL_CONFIG.clientId='cid.apps.googleusercontent.com';_gcalSavePrefs({on:true,consent:'x',write:true,writeConsent:'x',hideTitles:false});_gcalLastToken='tt';_gcalTokenExp=Date.now()+3600000;
        const calls=[];window.fetch=async(u,op)=>{calls.push({u:String(u),m:(op&&op.method)||'GET',b:op&&op.body});return{ok:true,status:200,json:async()=>({id:'n1',items:[]})};};
        openQA({mode:'fixed',date:'2026-10-14',startMin:600,deadline:'2026-10-14'});await new Promise(r=>setTimeout(r,120));
        o.visible=document.getElementById('qaFxGWrap').style.display!=='none'&&document.getElementById('qaFxG').checked;
        document.getElementById('qaName').value='פגישת לקוח';document.querySelector('#qaFxDom [data-v=work]').click();
        await _qaGoFixed();
        const post=calls.find(c=>c.m==='POST'),b=post&&JSON.parse(post.b);
        o.google=!!post&&b.summary==='פגישת לקוח'&&b.start.dateTime==='2026-10-14T10:00:00'&&b.extendedProperties.private.maya_domain==='work';
        o.noLocal=!(STATE_ACTIVE.constraintsGlobal.events||[]).some(e=>e.title==='פגישת לקוח'&&!String(e.id).startsWith('gcal_'));
      }finally{try{closeQA();}catch(_e){}GCAL_CONFIG.clientId=prevCfg;window.fetch=prevFetch;if(prevG)window.google=prevG;else delete window.google;_gcalLastToken=pl;_gcalTokenExp=pe;try{if(prevPrefs)localStorage.setItem(GCAL_PREF_KEY,prevPrefs);else localStorage.removeItem(GCAL_PREF_KEY);}catch(_e){} if(sa)STATE_ACTIVE=commitState(sa,'test-restore',{save:false,render:false});}
      return o;})()`);
    const okg=Object.values(r).every(Boolean);rows.push(['fixed-time add -> Google',String(okg)+(okg?'':' '+JSON.stringify(r))]);if(!okg)failed=true;
  }catch(e){rows.push(['fixed-time add -> Google','THROW '+e.message]);failed=true;}
  // calendar header: no "empty board" banner, no week X/Y; a Google sync hint only while not synced
  try{
    const r=w.eval(`(()=>{const o={};
      o.noOld=!document.getElementById('emptyCalendarHint')&&!document.documentElement.innerHTML.includes('הלוח הזה עדיין ריק');
      const wk=document.getElementById('hnWeek');recalcAndRender();o.noWeek=!/שבוע|\\//.test((wk.textContent||'').replace(/\\d{1,2}\\.\\d{1,2}/g,''))&&/\\d/.test(wk.textContent||'');
      const prevCfg=GCAL_CONFIG.clientId,prevPrefs=localStorage.getItem(GCAL_PREF_KEY);
      try{GCAL_CONFIG.clientId='cid.apps.googleusercontent.com';localStorage.removeItem(GCAL_PREF_KEY);_gcalHintSync();const h=document.getElementById('gcalSyncHint');
        o.shown=h.style.display==='flex';_gcalSavePrefs({on:true,consent:'x',last:new Date().toISOString()});_gcalHintSync();o.hidden=h.style.display==='none';
        GCAL_CONFIG.clientId='';localStorage.removeItem(GCAL_PREF_KEY);_gcalHintSync();o.noClient=h.style.display==='none';
      }finally{GCAL_CONFIG.clientId=prevCfg;if(prevPrefs)localStorage.setItem(GCAL_PREF_KEY,prevPrefs);else localStorage.removeItem(GCAL_PREF_KEY);_gcalHintSync();}
      return o;})()`);
    const okh=Object.values(r).every(Boolean);rows.push(['header + gcal sync hint',String(okh)+(okh?'':' '+JSON.stringify(r))]);if(!okh)failed=true;
  }catch(e){rows.push(['header + gcal sync hint','THROW '+e.message]);failed=true;}
  // small-task pool: internal score, reminders, once-a-day "still relevant?" batch, answers, extractor
  try{
    const r=await w.eval(`(async()=>{const o={};const T='2026-10-18';
      const mk=(id,title,x)=>({id,title,category:'כללי',doneWeeks:[],createdAt:'2026-10-18',...x});
      const imp=mk('a','להתקשר לרואה חשבון',{important:true}),plain=mk('b','לסדר מגירה'),old=mk('c','לקנות מתנה',{createdAt:'2026-09-20'}),oldImp=mk('d','לשלם ארנונה',{createdAt:'2026-09-01',important:true});
      o.score=smallScore(imp,T)>smallScore(plain,T)&&smallScore(plain,T)<55&&smallScore(imp,T)>=55&&smallScore(mk('x','x',{due:'2026-10-19'}),T)>smallScore(plain,T);
      o.kw=smallImportantFromText('להתקשר, זה חשוב')&&!smallImportantFromText('לא חשובים לי הדברים')===false||true;
      o.kw=smallImportantFromText('זה דחוף!')&&!smallImportantFromText('לסדר את המחסן');
      o.defer=smallScore(mk('y','y',{deferrals:3}),T)<smallScore(plain,T);
      o.top=smallTop([plain,imp,old],T,'W',2)[0].id==='a';
      o.rem=smallReminders([plain,imp,old],T,'W',3).map(t=>t.id).join()==='a';
      const ci=smallCheckIn([plain,imp,old,oldImp],T,'W',3);o.ci=ci.length===1&&ci[0].id==='c';
      const later=smallApplyAnswer(old,'later',T);o.later=smallCheckIn([later],T,'W',3).length===0&&later.snoozedUntil==='2026-10-25'&&later.deferrals===1&&smallSnoozed(later,T);
      const kept=smallApplyAnswer(old,'keep',T);o.keep=smallCheckIn([kept],T,'W',3).length===0&&smallCheckIn([kept],'2026-10-29','W',3).length===1;
      const dr=smallApplyAnswer(old,'drop',T);o.drop=dr.archived===true&&!smallIsOpen(dr,'W')&&smallIsOpen(smallApplyAnswer(dr,'restore',T),'W');
      o.done=!smallIsOpen(smallApplyAnswer(plain,'done',T),'W');
      const st=smallEnsureMeta({meta:{today:T},microTasks:{tasks:[{id:'l',title:'ישן',doneWeeks:[]}]}});o.stamp=st.microTasks.tasks[0].createdAt===T&&smallEnsureMeta(st)===st;
      const ex=_aiExtractSmallAdd('כן\\n\`\`\`SMALL_ADD\\n{"tasks":["לקנות חלב",{"title":"  לשלם  ","important":true},{"title":""},5]}\\n\`\`\`');
      o.ext=ex.length===2&&ex[0].title==='לקנות חלב'&&ex[1].title==='לשלם'&&ex[1].important===true&&_aiExtractSmallAdd('אין').length===0&&_aiExtractSmallAdd('\`\`\`SMALL_ADD\\nלא json\\n\`\`\`').length===0;
      o.hidden=_aiStripHidden('שלום\\n\`\`\`SMALL_ADD\\n{"tasks":["x"]}\\n\`\`\`').trim()==='שלום';
      const sa=STATE_ACTIVE;
      try{
        const s0=structuredClone(STATE_ACTIVE);s0.meta.onboarded=true;s0.microTasks={categories:['כללי'],tasks:[]};STATE_ACTIVE=commitState(s0,'t',{save:false,render:false});
        const a1=smallAdd('לקנות מתנה לאמא, חשוב');o.add=!!a1&&a1.important===true&&a1.createdAt===STATE_ACTIVE.meta.today&&smallAdd('לקנות מתנה לאמא, חשוב')===null;
        smallAdd('משהו ישן');_smallMutate(mt=>{mt.tasks[1].createdAt='2026-01-01';},'t');
        try{localStorage.removeItem(SMALL_BATCH_KEY);}catch(_e){}
        switchTab('ai');renderMayaScreen();const box=document.getElementById('mayaInsights');
        o.cardAsk=!!box.querySelector('.maya-ask')&&/משהו ישן/.test(box.querySelector('.maya-ask').textContent)&&box.querySelectorAll('.maya-ask .ms-q').length===1;
        smallBatchDismiss();o.dismiss=!document.getElementById('mayaInsights').querySelector('.maya-ask');
        switchTab('board');renderTaskBoard();o.pool=document.querySelectorAll('#smallPoolList .sp-row').length===2&&document.querySelector('#smallPoolList .sp-row').textContent.includes('מתנה');
        smallAnswer(STATE_ACTIVE.microTasks.tasks[1].id,'drop');renderSmallPool();o.arch=document.querySelectorAll('#smallPoolList .sp-row').length===1&&/ארכיון \\(1\\)/.test(document.getElementById('smallPoolList').textContent);
      }finally{if(sa)STATE_ACTIVE=commitState(sa,'test-restore',{save:false,render:false});try{localStorage.removeItem(SMALL_BATCH_KEY);}catch(_e){}}
      return o;})()`);
    const oks=Object.values(r).every(Boolean);rows.push(['small-task pool',String(oks)+(oks?'':' '+JSON.stringify(r))]);if(!oks)failed=true;
  }catch(e){rows.push(['small-task pool','THROW '+e.message]);failed=true;}
  // step 2: Maya places a meeting — pure suggester + request extractor + one-click create + undo
  try{
    const r=await w.eval(`(async()=>{const o={};const T='2026-10-19';
      const free=(d,a,b)=>{const x=[];for(let h=a;h<b;h++)x.push(h);return x;};
      const fh={'2026-10-19':free(0,8,20),'2026-10-20':free(0,8,20),'2026-10-21':free(0,8,20),'2026-10-22':[9,10]};
      const busy={'2026-10-19':[[600,660],[720,780],[840,900]],'2026-10-20':[]};
      const A=()=>suggestSlots({today:T,nowMin:0,durationMin:60,freeHours:fh,busy,days:7,count:3});
      const a=A();
      o.three=a.length===3&&JSON.stringify(a)===JSON.stringify(A());
      o.noOverlap=a.every(x=>!(busy[x.date]||[]).some(b=>x.startMin<b[1]&&x.endMin>b[0]));
      o.freeOnly=a.every(x=>{for(let h=Math.floor(x.startMin/60);h<Math.ceil(x.endMin/60);h++)if(!fh[x.date].includes(h))return false;return true;});
      o.variety=new Set(a.map(x=>x.date)).size===3;
      o.quietFirst=a.some(x=>x.date==='2026-10-20'&&x.reason==='יום בלי אירועים אחרים');
      const pn=suggestSlots({today:T,nowMin:15*60,durationMin:60,freeHours:fh,busy:{},days:1,count:3});
      o.future=pn.length===1&&pn[0].startMin>=15*60+30;
      const pd=suggestSlots({today:T,nowMin:0,durationMin:60,freeHours:fh,busy,days:7,count:2,preferDate:'2026-10-21'});
      o.prefer=pd.some(x=>x.date==='2026-10-21'&&x.reason==='ביום שביקשת');
      const af=suggestSlots({today:T,nowMin:0,durationMin:60,freeHours:fh,busy:{},days:1,count:1,afterMin:16*60});
      o.after=af.length===1&&af[0].startMin>=16*60;
      o.tooLong=suggestSlots({today:T,nowMin:0,durationMin:180,freeHours:{'2026-10-22':[9,10]},busy:{},days:7}).length===0;
      o.badToday=suggestSlots({today:'x',freeHours:fh}).length===0;
      const ex=_aiExtractMeeting('בודקת\\n\`\`\`MEETING_REQUEST\\n{"title":"  רואה חשבון ","durationMin":45,"domain":"work","date":"2026-10-21","after":"14:30"}\\n\`\`\`');
      o.ext=ex&&ex.title==='רואה חשבון'&&ex.durationMin===45&&ex.domain==='work'&&ex.date==='2026-10-21'&&ex.afterMin===870;
      const ex2=_aiExtractMeeting('\`\`\`MEETING_REQUEST\\n{"title":"x","durationMin":99999,"domain":"?","date":"נכשל","after":"25:00"}\\n\`\`\`');
      o.extClamp=ex2.durationMin===480&&ex2.domain==='life'&&ex2.date===null&&ex2.afterMin===null;
      o.extBad=_aiExtractMeeting('אין')===null&&_aiExtractMeeting('\`\`\`MEETING_REQUEST\\nלא json\\n\`\`\`')===null&&_aiExtractMeeting('\`\`\`MEETING_REQUEST\\n{"title":""}\\n\`\`\`')===null;
      o.hidden=_aiStripHidden('בודקת\\n\`\`\`MEETING_REQUEST\\n{"title":"x"}\\n\`\`\`').trim()==='בודקת';
      o.prompt=AI_SYSTEM_PROMPT_BASE.includes('MEETING_REQUEST');
      {const f2={'2026-10-19':free(0,8,20)},b2={'2026-10-19':[[600,660]]};
        const nt=suggestSlots({today:T,nowMin:0,durationMin:60,freeHours:f2,busy:b2,days:1,count:5,travelMin:0}),tv=suggestSlots({today:T,nowMin:0,durationMin:60,freeHours:f2,busy:b2,days:1,count:1,travelMin:40});
        o.travelPad=tv.length===1&&(tv[0].endMin<=600-40||tv[0].startMin>=660+40);
        const ft=suggestSlots({today:T,nowMin:0,durationMin:60,freeHours:{'2026-10-19':[11]},busy:{'2026-10-19':[[600,660,0]]},days:1,count:3,travelMin:0});
        o.adjacentOk=ft.length===1&&ft[0].startMin===660;
        const ft2=suggestSlots({today:T,nowMin:0,durationMin:60,freeHours:{'2026-10-19':[11]},busy:{'2026-10-19':[[600,660,0]]},days:1,count:3,travelMin:30});
        o.adjacentBlocked=ft2.length===0;
        const nb=suggestSlots({today:T,nowMin:0,durationMin:60,freeHours:{'2026-10-19':[10,11,12,13]},busy:{'2026-10-19':[[600,660,45]]},days:1,count:3,travelMin:0});
        o.neighbourTravel=nb.length>0&&nb.every(x=>x.startMin>=660+45);
        const e3=_aiExtractMeeting('\`\`\`MEETING_REQUEST\\n{"title":"רופא","travelMin":35}\\n\`\`\`');o.extTravel=e3.travelMin===35&&_aiExtractMeeting('\`\`\`MEETING_REQUEST\\n{"title":"x","travelMin":-5}\\n\`\`\`').travelMin===0;
        o.gcalBodyTravel=_gcalBody({title:'x',date:'2026-10-20',startMin:600,endMin:660,travelMin:30,domain:'work'}).extendedProperties.private.maya_travel==='30'&&_gcalValidateEv({title:'x',date:'2026-10-20',startMin:600,endMin:660,travelMin:30}).ev.travelMin===30;
        o.gcalReadTravel=(gcalItemsToBlocks([{id:'q',summary:'a',start:{dateTime:'2026-10-20T10:00:00'},end:{dateTime:'2026-10-20T11:00:00'},extendedProperties:{private:{maya_travel:'25'}}}],false)||[])[0]?.travelMin===25;
      }
      {const evs=[];for(let i=0;i<9;i++)evs.push({title:(i%2?'נסיעה ':'פעילות ')+i,date:'2026-10-19',start:(9+i)+':00',end:(9+i)+':45',kind:i%2?'travel':'event'});
        const ex9=_aiExtractCalCreate('\`\`\`CAL_CREATE\\n'+JSON.stringify({events:evs})+'\\n\`\`\`');
        o.multi=ex9.length===9&&ex9[1].colorId==='5'&&ex9[0].colorId==='9';
        o.max12=_aiExtractCalCreate('\`\`\`CAL_CREATE\\n'+JSON.stringify({events:Array.from({length:15},(_,i)=>({title:'x'+i,date:'2026-10-19',start:'08:00',end:'09:00'}))})+'\\n\`\`\`').length===12;
        o.bodyColor=_gcalBody({title:'x',date:'2026-10-19',startMin:540,endMin:600,colorId:'9'}).colorId==='9'&&_gcalBody({title:'x',date:'2026-10-19',startMin:540,endMin:600}).colorId===undefined;
        o.promptCal=AI_SYSTEM_PROMPT_BASE.includes('עד 12 אירועים')&&AI_SYSTEM_PROMPT_BASE.includes('travel');
        o.intakeLow=_aiProfileContext(emptyAIProfile()).includes('עדיפות נמוכה');}
      const sa=STATE_ACTIVE,prevPrefs=localStorage.getItem(GCAL_PREF_KEY);
      try{
        localStorage.removeItem(GCAL_PREF_KEY);
        const s0=structuredClone(STATE_ACTIVE);s0.meta.onboarded=true;STATE_ACTIVE=commitState(s0,'t',{save:false,render:false});
        switchTab('ai');
        const before=(STATE_ACTIVE.constraintsGlobal.events||[]).length;
        const card=_aiOfferMeeting({title:'פגישת בדיקה',durationMin:60,domain:'work',date:null,afterMin:null});
        const bs=card?[...card.querySelectorAll('button')]:[];
        o.card=!!card&&bs.length>=2&&/פגישת בדיקה/.test(card.textContent);
        bs[0].click();await new Promise(r=>setTimeout(r,20));
        const evs=STATE_ACTIVE.constraintsGlobal.events||[];
        const ne=evs.find(e=>e.title==='פגישת בדיקה');
        o.created=evs.length===before+1&&!!ne&&Number.isInteger(ne.startMin)&&ne.domain==='work'&&ne.endMin-ne.startMin===60;
        const ub=[...card.querySelectorAll('button')].find(b=>/בטל/.test(b.textContent));
        o.undoBtn=!!ub;
        ub.click();await new Promise(r=>setTimeout(r,20));
        o.undone=(STATE_ACTIVE.constraintsGlobal.events||[]).length===before&&!(STATE_ACTIVE.constraintsGlobal.events||[]).some(e=>e.title==='פגישת בדיקה');
        {const evs2=[{title:'קניות',date:'2026-10-21',start:'10:00',end:'11:30',kind:'event'},{title:'נסיעה לחווה',date:'2026-10-21',start:'11:30',end:'12:10',kind:'travel'}];
          const ex=_aiExtractCalCreate('\`\`\`CAL_CREATE\\n'+JSON.stringify({events:evs2})+'\\n\`\`\`');
          const n0=(STATE_ACTIVE.constraintsGlobal.events||[]).length;
          const cc=_aiOfferCalCreate(ex);o.localOffer=!!cc&&/ליומן באפליקציה/.test(cc.textContent);
          cc.querySelectorAll('button')[0].click();await new Promise(r=>setTimeout(r,20));
          const ev3=(STATE_ACTIVE.constraintsGlobal.events||[]).filter(e=>e.title==='קניות'||e.title==='נסיעה לחווה');
          o.localAdded=ev3.length===2&&(STATE_ACTIVE.constraintsGlobal.events||[]).length===n0+2&&ev3.find(e=>e.title==='קניות').color==='#3f51b5'&&ev3.find(e=>e.title==='נסיעה לחווה').color==='#f6bf26';
          const ub2=[...cc.querySelectorAll('button')].find(b=>/בטל/.test(b.textContent));ub2.click();await new Promise(r=>setTimeout(r,20));
          o.localUndo=(STATE_ACTIVE.constraintsGlobal.events||[]).length===n0;}
        {_aiLastIntakeTopic='peak';const pr0=AI_PROFILE;const inp=document.getElementById('aiChatInput');
          if(inp){AI_BUSY=true;AI_BUSY=false;}
          const r0=applyProfileUpdate(AI_PROFILE||emptyAIProfile(),{peak:'none'},'לא יודע',8,23);o.skipApplies=r0.accepted.includes('peak');AI_PROFILE=pr0;}
        const c2=_aiOfferMeeting({title:'עוד',durationMin:60,domain:'life',date:null,afterMin:null});
        [...c2.querySelectorAll('button')].pop().click();
        o.dismiss=!c2.querySelector('button')&&/לא קבעתי/.test(c2.textContent);
      }finally{if(sa)STATE_ACTIVE=commitState(sa,'test-restore',{save:false,render:false});if(prevPrefs)localStorage.setItem(GCAL_PREF_KEY,prevPrefs);}
      return o;})()`);
    const okm=Object.values(r).every(Boolean);rows.push(['maya meeting placement',String(okm)+(okm?'':' '+JSON.stringify(r))]);if(!okm)failed=true;
  }catch(e){rows.push(['maya meeting placement','THROW '+e.message]);failed=true;}
  // judgment layer: kinds, places, batching suggestions, overload
  try{
    const r=await w.eval(`(async()=>{const o={};const T='2026-10-19';
      o.kinds=taskKindOf('להתקשר לרואה חשבון')==='phone_call'&&taskKindOf('לקנות חלב')==='errand'&&taskKindOf('לשלם ארנונה')==='admin'&&taskKindOf('פגישה עם דנה')==='meeting'&&taskKindOf('ללמוד לסטטיסטיקה')==='study'&&taskKindOf('לחכות לתשובה מהבנק')==='waiting_for_response'&&taskKindOf('משהו כללי')==='personal';
      o.travel=taskTravelCompatible({title:'להתקשר לאמא'})&&!taskTravelCompatible({title:'לקנות חלב'});
      o.place=taskPlaceOf('בנק בתלפיות')==='תלפיות'&&taskPlaceOf('לקנות חלב בבוקר')===''&&taskPlaceOf('לקחת חבילה ב-אריאל')==='אריאל'&&taskPlaceOf('להתקשר')==='';
      const mk=(id,title)=>({id,title,category:'כללי',doneWeeks:[],createdAt:T});
      const b=smallBatches([mk('1','להתקשר לרואה חשבון'),mk('2','להתקשר לרופא'),mk('3','בנק בתלפיות'),mk('4','לקחת חבילה בתלפיות'),mk('5','לשלם ארנונה'),mk('6','לעדכן ביטוח'),mk('7','לסדר מסמכים')],T,'W');
      o.batchCalls=b.some(x=>x.type==='calls'&&x.ids.length===2&&/2 שיחות/.test(x.text));
      o.batchPlace=b.some(x=>x.type==='place'&&x.place==='תלפיות'&&/2 דברים בתלפיות/.test(x.text));
      o.batchAdmin=b.some(x=>x.type==='admin'&&x.ids.length===3);
      o.noBatchSingle=smallBatches([mk('1','להתקשר לרופא'),mk('3','בנק בתלפיות')],T,'W').length===0;
      o.snoozedIgnored=smallBatches([mk('1','להתקשר לרופא'),{...mk('2','להתקשר לאמא'),snoozedUntil:'2026-12-01'}],T,'W').length===0;
      o.overFull=dayOverloadVerdict({busyMin:600,addMin:30,capacityMin:720}).level==='full'&&dayOverloadVerdict({busyMin:400,addMin:300,capacityMin:720}).level==='swap'&&dayOverloadVerdict({busyMin:120,addMin:60,capacityMin:720}).level==='ok';
      const fh={'2026-10-19':[8,9,10,11,12,13,14,15,16,17,18,19],'2026-10-20':[8,9,10,11,12,13,14,15,16,17,18,19]};
      const full=suggestSlots({today:T,nowMin:0,durationMin:60,freeHours:fh,busy:{'2026-10-19':[[480,1020]]},days:2,count:3});
      o.fullDaySkipped=full.length===1&&full[0].date==='2026-10-20';
      o.fullDayIfAsked=suggestSlots({today:T,nowMin:0,durationMin:60,freeHours:fh,busy:{'2026-10-19':[[480,1020]]},days:2,count:3,preferDate:'2026-10-19'}).some(x=>x.date==='2026-10-19');
      o.promptJudg=['שיקול דעת','היום הזה כבר מלא','שמתי שעה','Brain Dump','מצומצמת'].every(k=>AI_SYSTEM_PROMPT_BASE.includes(k));
      const sa=STATE_ACTIVE;
      try{
        const s0=structuredClone(STATE_ACTIVE);s0.meta.onboarded=true;s0.microTasks={categories:['כללי'],tasks:[]};STATE_ACTIVE=commitState(s0,'t',{save:false,render:false});
        const a=smallAdd('להתקשר לרואה חשבון');smallAdd('להתקשר לרופא');
        o.kindStored=a.kind==='phone_call';
        switchTab('ai');renderMayaScreen();
        o.card=/אפשר לרכז/.test(document.getElementById('mayaInsights').textContent)&&/2 שיחות/.test(document.getElementById('mayaInsights').textContent);
      }finally{if(sa)STATE_ACTIVE=commitState(sa,'test-restore',{save:false,render:false});}
      return o;})()`);
    const okj=Object.values(r).every(Boolean);rows.push(['judgment layer',String(okj)+(okj?'':' '+JSON.stringify(r))]);if(!okj)failed=true;
  }catch(e){rows.push(['judgment layer','THROW '+e.message]);failed=true;}
  // planning model (step A) + real-conversation fixtures
  try{
    const fx=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures','scenarios.json'),'utf8'));
    const r=await w.eval(`(async()=>{const FX=${JSON.stringify(fx)};const o={};const fails=[];
      const sub=(a,b)=>Object.keys(b).every(k=>b[k]&&typeof b[k]==='object'?(a&&a[k]&&sub(a[k],b[k])):a&&a[k]===b[k]);
      let pending=0,checked=0;
      FX.scenarios.forEach(sc=>{
        const E=sc.expect||{};Object.keys(E).forEach(st=>{if(st!=='A'&&E[st].status==='pending')pending++;});
        const A=E.A;if(!A)return;checked++;
        const rules=normalizeUserRules(sc.rules);const intent=normalizeIntent(sc.parsed);const g=planningGaps(intent,rules);
        const bad=(m)=>fails.push(sc.id+': '+m);
        const askSet=g.ask.map(a=>a.ref+'.'+a.field).sort().join();
        if(A.ask&&askSet!==A.ask.slice().sort().join())bad('ask '+askSet+' vs '+A.ask);
        const it=ref=>g.items.find(x=>x.ref===ref);
        if(A.duration)Object.keys(A.duration).forEach(k=>{const x=it(k);if(!x||x.duration.min!==A.duration[k])bad('duration '+k+'='+(x&&x.duration.min));});
        if(A.assumedDuration){const got=g.assumptions.filter(a=>a.field==='duration').map(a=>a.ref).sort().join();if(got!==A.assumedDuration.slice().sort().join())bad('assumedDuration '+got);}
        if(A.durationSource)Object.keys(A.durationSource).forEach(k=>{if(!it(k)||it(k).duration.source!==A.durationSource[k])bad('durationSource '+k);});
        if(A.rigidity)Object.keys(A.rigidity).forEach(k=>{if(!it(k)||it(k).rigidityResolved.value!==A.rigidity[k])bad('rigidity '+k+'='+(it(k)&&it(k).rigidityResolved.value));});
        if(A.buffer)Object.keys(A.buffer).forEach(k=>{if(!it(k)||it(k).buffer.min!==A.buffer[k])bad('buffer '+k);});
        if(A.departureOffset!=null&&(!g.items[0]||g.items[0].departureOffsetMin!==A.departureOffset))bad('departureOffset');
        if(A.assumptionTextContains)Object.keys(A.assumptionTextContains).forEach(k=>{if(!g.assumptions.some(a=>a.ref===k&&a.field==='duration'&&a.text.includes(A.assumptionTextContains[k])))bad('text '+k);});
        if(A.rulesPatch&&!sub(g.rulesPatch,A.rulesPatch))bad('rulesPatch '+JSON.stringify(g.rulesPatch));
        if(A.calendarRigidity)Object.keys(A.calendarRigidity).forEach(id=>{const ev=sc.calendar.find(e=>e.id===id);if(inferRigidity(ev).rigidity!==A.calendarRigidity[id])bad('calRigidity '+id+'='+inferRigidity(ev).rigidity);});
        // every assumption must say where it came from
        g.assumptions.forEach(a=>{if(!a.source||!a.text)bad('assumption without source/text '+a.ref+'.'+a.field);});
      });
      o.fixtures=fails.length===0;o.fixturesFails=fails;o.nScen=FX.scenarios.length>=15;o.checked=checked;o.pending=pending;
      // unit-level
      const g0=normalizeUserRules('garbage');o.defaults=g0.lateBiasMin===0&&g0.bufferBeforeMin===null&&g0.maxLoadMin===null&&g0.assertiveness==='normal'&&g0.travelCompatibleKinds.join()==='phone_call'&&Object.keys(g0.dayModes).length===0;
      const nr=normalizeUserRules({dayModes:{1:'light',2:'bogus',9:'work'},anchors:[{type:'prayer',days:[0,1],startMin:480,endMin:540},{type:'x',days:[],startMin:1,endMin:2},{days:[1],startMin:600,endMin:500}],durationDefaults:{errand:45,bogus:9,study:99999},bufferBeforeMin:500,colorMap:{meeting:'9',work:'99'},zones:[{id:'a',name:'מרכז'},{id:'b',name:'אריאל'},{name:' '}],travelMatrix:{'b|a':40,'a|zz':5},evil:1});
        o.normalize=nr.dayModes[1]==='light'&&!nr.dayModes[2]&&!nr.dayModes[9]&&nr.anchors.length===1&&nr.anchors[0].rigidity==='hard'&&nr.durationDefaults.errand===45&&!nr.durationDefaults.bogus&&nr.durationDefaults.study===480&&nr.bufferBeforeMin===120&&nr.colorMap.meeting==='9'&&!nr.colorMap.work&&nr.zones.length===2&&nr.travelMatrix['a|b']===40&&Object.keys(nr.travelMatrix).length===1&&!('evil' in nr);
      o.idempotent=JSON.stringify(normalizeUserRules(nr))===JSON.stringify(nr);
      let lr=normalizeUserRules(null);o.dur1=resolveDuration('errand',lr).source==='system_default'&&resolveDuration('errand',lr,30).source==='user_said'&&resolveDuration('errand',lr,30).assumed===false;
      lr=learnDuration(lr,'errand',60);lr=learnDuration(lr,'errand',60);o.learn2=resolveDuration('errand',lr).source==='system_default';
      lr=learnDuration(lr,'errand',90);o.learn3=resolveDuration('errand',lr).source==='learned'&&resolveDuration('errand',lr).min===70;
      lr=normalizeUserRules({...lr,durationDefaults:{errand:25}});o.userWins=resolveDuration('errand',lr).source==='user_default'&&resolveDuration('errand',lr).min===25;
      o.buf=resolveBuffer('meeting',normalizeUserRules(null)).min===10&&resolveBuffer('meeting',normalizeUserRules({bufferBeforeMin:30})).min===30&&resolveBuffer('meeting',normalizeUserRules({bufferBeforeMin:30,bufferByKind:{meeting:5}})).min===5;
      const R1=inferRigidity({title:'ישיבה',attendees:3}),R2=inferRigidity({title:'משהו',transparency:'transparent'}),R3=inferRigidity({title:'משהו'}),R4=inferRigidity({title:'תור לרופא',transparency:'transparent'}),R5=inferRigidity({title:'פגישה',rigidity:'flexible',rigiditySource:'explicit_user'});
      o.rigid=R1.rigidity==='hard'&&R1.source==='inferred'&&R2.rigidity==='flexible'&&R3.rigidity==='unknown'&&R3.source==='calendar_default'&&R4.rigidity==='hard'&&R5.rigidity==='flexible'&&R5.source==='explicit_user';
      const rl=normalizeUserRules(null);
      o.mobHard=!mobilityFor('meeting','hard',rl).canMove&&!mobilityFor('study','hard',rl).canShorten;
      o.mobUnknown=(()=>{const m=mobilityFor('study','unknown',rl);return !m.canMove&&!m.canShorten&&!m.canDrop&&m.needsConfirm===true;})();
      o.mobStudy=(()=>{const m=mobilityFor('study','flexible',rl);return m.canMove&&!m.canDrop&&m.canShorten;})();
      o.mobShop=(()=>{const m=mobilityFor('shopping','flexible',rl);return m.canShorten&&m.minDurationMin===20;})();
      o.mobFitness=mobilityFor('fitness','flexible',rl).minDurationMin===30;
      o.mobOptional=(()=>{const m=mobilityFor('admin','optional',rl);return m.canDrop&&m.canMove;})();
      o.mobOverride=mobilityFor('study','flexible',normalizeUserRules({mobilityByKind:{study:{canDrop:true}}})).canDrop===true;
      o.mobWindow=mobilityFor('errand','flexible',rl,{earliest:'10:00',latest:'14:00'}).latest==='14:00';
      o.confDefaults=(()=>{const it=normalizeParsedItem({title:'x',kind:'errand'},0);return it.confidence.kind===0.7&&it.confidence.duration===null&&it.confidence.place===null;})();
      o.badKind=normalizeParsedItem({title:'x',kind:'wizard'},0).confidence.kind===0;
      o.intentEmpty=normalizeIntent(null).op==='create'&&normalizeIntent({items:[{title:''}]}).items.length===0;
      o.reducer=(()=>{const st=applyEvent(structuredClone(STATE_ACTIVE),'personal',{type:'SET_USER_RULES',patch:{lateBiasMin:20,dayModes:{1:'light'}}});const st2=applyEvent(st,'personal',{type:'SET_USER_RULES',patch:{bufferBeforeMin:30}});const u=getUserRules(st2);return u.lateBiasMin===20&&u.dayModes[1]==='light'&&u.bufferBeforeMin===30&&STATE_ACTIVE.userRules!==st.userRules;})();
      o.stateHasRules=typeof STATE_ACTIVE.userRules==='object';
      return o;})()`);
    const okp=Object.entries(r).every(([k,v])=>k==='fixturesFails'||k==='checked'||k==='pending'||v===true)&&(r.fixturesFails||[]).length===0;
    rows.push(['planning model (A) + '+r.checked+' fixtures ('+r.pending+' later-stage contracts pending)',String(okp)+(okp?'':' '+JSON.stringify(r))]);if(!okp)failed=true;
  }catch(e){rows.push(['planning model (A)','THROW '+e.message]);failed=true;}
  // step B: realistic calendar -> immutable context snapshot, resolveAnchor, travel matrix, demo chain
  try{
    const cal=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures','calendar_realistic.json'),'utf8'));
    const r=await w.eval(`(async()=>{const CAL=${JSON.stringify(cal)};const o={};
      const mkState=(events,rules)=>{const s=structuredClone(STATE_ACTIVE);s.meta.today=CAL.today;s.constraintsGlobal.events=structuredClone(events);s.userRules=rules||{};return s;};
      const st=mkState(CAL.events);const snap=buildContextSnapshot(st);
      const at=(date,t)=>({rel:'after',target:{text:t,date}});
      // context
      const dups=snap.events.filter(e=>e.date==='2026-11-16'&&e.startMin===540);
      o.dedupe=dups.length===1&&dups[0].source==='gcal'&&dups[0].mergedLocal.includes('ev_local_dup');
      o.unified=snap.events.some(e=>e.source==='local')===false&&snap.events.length===CAL.events.length-1;
      o.fields=(()=>{const e=snap.events.find(x=>x.gid==='g1');return e.place==='פתח תקווה'&&e.attendees===2&&e.rigidity.rigidity==='hard'&&e.rigidity.source==='inferred';})();
      o.rigidKinds=snap.events.find(x=>x.gid==='g5').rigidity.rigidity==='unknown'&&snap.events.find(x=>x.gid==='g6').rigidity.rigidity==='flexible'&&snap.events.find(x=>x.gid==='g4').rigidity.rigidity==='hard';
      // immutable
      o.frozen=Object.isFrozen(snap)&&Object.isFrozen(snap.events)&&Object.isFrozen(snap.events[0])&&Object.isFrozen(snap.rules);
      try{snap.events[0].title='HACK';snap.events.push({});}catch(_e){}
      o.immutable=snap.events[0].title!=='HACK'&&snap.events.length===CAL.events.length-1;
      o.notStale=contextIsStale(snap,st)===false;
      const st2=mkState(CAL.events.concat([{id:'new1',title:'חדש',date:'2026-11-16',startH:10,endH:11,startMin:600,endMin:660}]));
      o.stale=contextIsStale(snap,st2)===true;
      // resolveAnchor
      const a1=resolveAnchor(snap,at('2026-11-16','הפגישה בפתח תקווה'));
      o.exact=a1.status==='resolved'&&a1.event.gid==='g1'&&a1.anchorMin===600&&a1.confidence>=0.85;
      const a2=resolveAnchor(snap,{rel:'after',target:{text:'הפגישה בפתח תקווה',date:null}});
      o.ambiguous=a2.status==='ambiguous'&&a2.candidates.length===2&&/איזו/.test(a2.question)&&a2.question.includes('09:00');
      const a3=resolveAnchor(snap,at('2026-11-17','הזום'));o.online=a3.status==='resolved'&&a3.event.gid==='g3';
      const a4=resolveAnchor(snap,at('2026-11-18','הטיפול'));o.treat=a4.status==='resolved'&&a4.event.gid==='g4'&&a4.anchorMin===1020;
      const a4b=resolveAnchor(snap,{rel:'before',target:{text:'הטיפול',date:'2026-11-18'}});o.before=a4b.status==='resolved'&&a4b.anchorMin===960;
      const a5=resolveAnchor(snap,{rel:'after',target:{text:'הפגישה עם ארז',date:null}});o.person=a5.status==='resolved'&&a5.event.gid==='g7';
      const a6=resolveAnchor(snap,at('2026-11-17','האירוע של 12'));o.timeRef=a6.status==='resolved'&&a6.event.gid==='g9';
      const a7=resolveAnchor(snap,at('2026-11-16','הפגישה עם דנה'));o.notFound=a7.status==='not_found'&&/לא מצאתי/.test(a7.message)&&!a7.event;
      const a8=resolveAnchor(snap,{rel:'while_in',target:{text:'כשאני כבר באריאל',date:null}});o.placeOnly=a8.status==='place_only'&&a8.place==='אריאל';
      const a9=resolveAnchor(snap,at('2026-11-16','הפגישה'));o.genericTwo=a9.status==='ambiguous';
      const a10=resolveAnchor(snap,at('2026-11-18','משהו'));o.noLocationEvent=a10.status==='resolved'&&a10.event.gid==='g5';
      o.noAnchor=resolveAnchor(snap,null).status==='not_found';
      // hidden titles
      const hs=mkState(CAL.events.filter(e=>e.id!=='ev_local_dup').map(e=>e.id.startsWith('gcal_')?{...e,title:'תפוס (יומן גוגל)',place:'',descr:''}:e));const hsnap=buildContextSnapshot(hs);
      const hr=resolveAnchor(hsnap,at('2026-11-16','הפגישה בפתח תקווה'));o.hidden=hr.status==='not_found'&&/מוסתרות/.test(hr.message)&&hsnap.hiddenTitles>0;
      // travel matrix
      const R0=normalizeUserRules(null);
      o.noMatrix=travelMinutes(R0,'פתח תקווה','אריאל').min===null&&travelMinutes(R0,'אריאל','אריאל').min===0;
      const patch=travelAnswerPatch(R0,'פתח תקווה','אריאל',40);const R1=normalizeUserRules({...R0,...patch});
      o.matrix=travelMinutes(R1,'פתח תקווה','אריאל').min===40&&travelMinutes(R1,'אריאל','פתח תקווה').min===40&&travelMinutes(R1,'ירושלים','אריאל').min===null;
      // the demo
      const parsed={op:'create',items:[{ref:'i1',title:'נסיעה לאריאל',kind:'travel',place:'אריאל',anchor:{rel:'after',target:{text:'הפגישה בפתח תקווה',date:'2026-11-16'}},confidence:{kind:0.95,place:0.95,anchor:0.9}},{ref:'i2',title:'בית מדרש',kind:'religious',durationMin:60,afterItem:'i1',confidence:{kind:0.85,duration:0.95}}]};
      const run=(rules)=>{const stx=mkState(CAL.events,rules);const sn=buildContextSnapshot(stx);const intent=normalizeIntent(parsed);const g=planningGaps(intent,getUserRules(stx));return{res:planChainBasic(sn,intent,g),sn,stx};};
      const d1=run({});
      o.demoAsks=d1.res.status==='ask'&&d1.res.ask.field==='travel'&&d1.res.ask.question.includes('פתח תקווה')&&d1.res.ask.question.includes('אריאל');
      const d2=run(patch);
      o.demoOk=d2.res.status==='ok'&&d2.res.anchor.title==='פגישה בפתח תקווה'&&d2.res.anchor.endMin===600&&d2.res.items.length===2&&d2.res.items[0].startMin===600&&d2.res.items[0].endMin===640&&d2.res.items[0].durationSource==='matrix'&&d2.res.items[1].startMin===640&&d2.res.items[1].endMin===700&&d2.res.items[1].date==='2026-11-16';
      const txt=chainSummaryText(d2.res);o.demoText=txt.includes('שעת סיום 10:00')&&txt.includes('10:00–10:40')&&txt.includes('לפי המטריצה')&&txt.includes('10:40–11:40');
      o.demoNoConflict=d2.res.conflicts.length===0&&d2.res.snapshotSig===d2.sn.sig;
      // ambiguous / not found stop the chain with one question and never invent
      const parsedAmb=JSON.parse(JSON.stringify(parsed));parsedAmb.items[0].anchor.target.date=null;
      {const stx=mkState(CAL.events,patch);const sn=buildContextSnapshot(stx);const g=planningGaps(normalizeIntent(parsedAmb),getUserRules(stx));const rr=planChainBasic(sn,normalizeIntent(parsedAmb),g);o.chainAmb=rr.status==='ask'&&rr.ask.field==='anchor'&&!rr.items;}
      {const pnf=JSON.parse(JSON.stringify(parsed));pnf.items[0].anchor.target.text='הפגישה עם דנה';const stx=mkState(CAL.events,patch);const sn=buildContextSnapshot(stx);const rr=planChainBasic(sn,normalizeIntent(pnf),planningGaps(normalizeIntent(pnf),getUserRules(stx)));o.chainNotFound=rr.status==='not_found'&&!rr.items;}
      // conflict + revalidate
      {const stx=mkState(CAL.events.concat([{id:'blk',title:'חוסם',date:'2026-11-16',startH:10,endH:11,startMin:630,endMin:660}]),patch);const sn=buildContextSnapshot(stx);const rr=planChainBasic(sn,normalizeIntent(parsed),planningGaps(normalizeIntent(parsed),getUserRules(stx)));o.conflictFound=rr.status==='ok'&&rr.conflicts.length===2&&rr.conflicts.every(c=>c.title==='חוסם');}
      {const rv0=revalidatePlan(d2.sn,d2.stx,d2.res);o.revalFresh=rv0.stale===false&&rv0.ok===true;
       const changed=mkState(CAL.events.concat([{id:'late',title:'התווסף',date:'2026-11-16',startH:10,endH:11,startMin:620,endMin:680}]),patch);
       const rv1=revalidatePlan(d2.sn,changed,d2.res);o.revalStale=rv1.stale===true&&rv1.ok===false&&rv1.conflicts[0].title==='התווסף';}
      // same-place implicit travel + window
      {const p2={op:'create',items:[{ref:'a',title:'קניות',kind:'shopping',place:'אריאל',anchor:{rel:'after',target:{text:'הפגישה בפתח תקווה',date:'2026-11-16'}},confidence:{kind:0.9,place:0.9}},{ref:'b',title:'תורה בחווה',kind:'religious',place:'אריאל',window:{from:'18:00',to:'22:00'},confidence:{kind:0.8,place:0.8}}]};
       const stx=mkState(CAL.events,patch);const sn=buildContextSnapshot(stx);const rr=planChainBasic(sn,normalizeIntent(p2),planningGaps(normalizeIntent(p2),getUserRules(stx)));
       o.implicitTravel=rr.status==='ok'&&rr.items[0].implicit===true&&rr.items[0].endMin===640&&rr.items[1].title==='קניות'&&rr.items[1].startMin===640&&rr.items[2].startMin===1080;}
      // google import: new context fields, privacy
      {const it=[{id:'q1',summary:'פגישה',location:'חיפה',description:'<b>פרטים</b> זום',attendees:[{self:true},{email:'a@x'},{email:'r@x',resource:true}],hangoutLink:'x',start:{dateTime:'2026-11-16T09:00:00'},end:{dateTime:'2026-11-16T10:00:00'}},{id:'q2',summary:'שקוף',transparency:'transparent',start:{dateTime:'2026-11-16T11:00:00'},end:{dateTime:'2026-11-16T12:00:00'}}];
       const vis=gcalItemsToBlocks(it,false),hid=gcalItemsToBlocks(it,true);
       o.importFields=vis.length===1&&vis[0].place==='חיפה'&&vis[0].attendees===1&&vis[0].online===true&&vis[0].descr==='פרטים זום';
       o.importPrivacy=hid.length===1&&!hid[0].place&&!hid[0].descr&&!hid[0].online&&hid[0].attendees===1&&hid[0].title==='תפוס (יומן גוגל)';
       o.transparentSkipped=vis.every(b=>b.gid!=='q2');}
      return o;})()`);
    const okb=Object.values(r).every(v=>v===true);
    rows.push(['context + anchors + demo chain (B)',String(okb)+(okb?'':' '+JSON.stringify(Object.fromEntries(Object.entries(r).filter(([k,v])=>v!==true))))]);if(!okb)failed=true;
  }catch(e){rows.push(['context + anchors + demo chain (B)','THROW '+e.message]);failed=true;}
  // intent-eval harness self-check (NOT model quality — that needs a live run, see tests/intent-eval/README.md)
  try{
    const {compareIntent,summarize}=require('./intent-eval/compare.js');
    const cases=JSON.parse(fs.readFileSync(path.join(__dirname,'intent-eval','cases.json'),'utf8')).cases;
    const golden=JSON.parse(fs.readFileSync(path.join(__dirname,'intent-eval','mock_golden.json'),'utf8'));
    const o={};
    o.enough=cases.length>=25&&new Set(cases.map(c=>c.id)).size===cases.length;
    o.goldenAll=summarize(cases.map(c=>compareIntent(golden[c.id],c.expected))).pass===cases.length;
    const mut=(id,fn)=>{const c=cases.find(x=>x.id===id);const a=JSON.parse(JSON.stringify(golden[id]));fn(a);return compareIntent(a,c.expected);};
    o.catchKind=!mut('S01_after_meeting_chain',a=>{a.items[1].kind='errand';}).pass;
    o.catchInventedDuration=!mut('S01_after_meeting_chain',a=>{a.items[2].durationMin=120;}).pass;
    o.catchInventedAnchor=!mut('S09_when_best',a=>{a.items[0].anchor={rel:'after',target:{text:'משהו'}};}).pass;
    o.catchMissingAnchor=!mut('S01_after_meeting_chain',a=>{delete a.items[0].anchor;}).pass;
    o.catchWrongRel=!mut('E18_before_treatment',a=>{a.items[0].anchor.rel='after';}).pass;
    o.catchWrongOp=!mut('S04_no_time_what_drops',a=>{a.op='create';}).pass;
    o.catchScope=!mut('S06_arrive_early',a=>{a.scope='global';}).pass;
    o.catchDay=!mut('E21_meeting_with_place',a=>{a.items[0].date='2026-11-19';}).pass;
    o.tolerant=mut('S01_after_meeting_chain',a=>{a.items[0].anchor.target.text='הפגישה שבפתח תקווה';a.items[1].durationMin=62;}).pass;
    const r=await w.eval(`(()=>{const o={};const c=${JSON.stringify(cases)};
      o.prompt=AI_INTENT_PROMPT.includes('לעולם אל תחשבי שעות')&&PLAN_KINDS.every(k=>AI_INTENT_PROMPT.includes(k));
      o.system=buildIntentSystem('2026-11-15').includes('"מחר" = 2026-11-16')&&buildIntentSystem('2026-11-15').includes('יום ראשון');
      o.normalizes=c.every(x=>{const it=normalizeIntent(x.expected);return it.items.length===(x.expected.items||[]).length;});
      return o;})()`);
    Object.assign(o,r);
    const oki=Object.values(o).every(v=>v===true);
    rows.push(['intent-eval harness self-check ('+cases.length+' cases)',String(oki)+(oki?'':' '+JSON.stringify(Object.fromEntries(Object.entries(o).filter(([k,v])=>v!==true))))]);if(!oki)failed=true;
  }catch(e){rows.push(['intent-eval harness self-check','THROW '+e.message]);failed=true;}
  // static checks on the server-side proxy files
  try{const ts=fs.readFileSync(path.join(__dirname,'..','cloud','functions','maya-ai','index.ts'),'utf8');const sql=fs.readFileSync(path.join(__dirname,'..','cloud','ai_proxy.sql'),'utf8');
    const okp=/auth\.getUser\(/.test(ts)&&/bump_ai_usage/.test(ts)&&/DAILY_LIMIT/.test(ts)&&!/AIza[0-9A-Za-z_-]{20,}/.test(ts+sql+html)&&/GEMINI_API_KEY/.test(ts)&&/AbortSignal\.timeout\(/.test(ts)&&/TOTAL_BUDGET_MS/.test(ts)&&/status === 429\) break|status === 401 \|\| r\.status === 403\) break/.test(ts)&&/enable row level security/i.test(sql)&&/revoke all on function public\.bump_ai_usage/i.test(sql);
    rows.push(['proxy static checks',String(okp)]);if(!okp)failed=true;}catch(e){rows.push(['proxy static checks','THROW '+e.message]);failed=true;}
  // static: legal page + delete-account SQL
  try{const pv=fs.readFileSync(path.join(__dirname,'..','privacy.html'),'utf8');const dsql=fs.readFileSync(path.join(__dirname,'..','cloud','delete_account.sql'),'utf8');
    const okl=/תנאי שימוש/.test(pv)&&/מדיניות פרטיות/.test(pv)&&/Gemini/.test(pv)&&/User Data Policy/.test(pv)&&/מחיקת חשבון/.test(pv)&&/delete_my_account/.test(dsql)&&/auth\.uid\(\)/.test(dsql)&&/security definer/i.test(dsql)&&/revoke all/i.test(dsql);
    rows.push(['legal page + delete SQL',String(okl)]);if(!okl)failed=true;}catch(e){rows.push(['legal page + delete SQL','THROW '+e.message]);failed=true;}
  // regression: an EXISTING user whose stored plan needs a boot migration (horizon extension) must boot without TDZ errors, and the account button must work
  try{
    const st=JSON.parse(JSON.stringify(w.eval('STATE_ACTIVE')));st.meta.onboarded=true;
    const d=new Date(Date.now()+10*86400000);st.meta.endDate=d.toISOString().slice(0,10);
    const sv=w.eval('SCHEMA_VERSION'),key=w.eval('LS_KEY');const e2=[];const vc2=new VirtualConsole();vc2.on('jsdomError',e=>e2.push(String(e.message).slice(0,160)));vc2.on('error',(...a)=>e2.push('console.error: '+a.join(' ').slice(0,160)));vc2.on('warn',(...a)=>{const t=a.join(' ');if(/failed|before initialization/i.test(t))e2.push('console.warn: '+t.slice(0,160));});
    const dom2=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',virtualConsole:vc2,
      beforeParse(w2){const m={};w2.storage={get:async k=>{if(!(k in m))throw new Error('nf');return{value:m[k]}},set:async(k,v)=>{m[k]=v;return{}},delete:async k=>{delete m[k];return{}}};
        w2.localStorage.setItem(key,JSON.stringify({schemaVersion:sv,state:st}));if(!w2.structuredClone)w2.structuredClone=o=>JSON.parse(JSON.stringify(o));
        w2.requestAnimationFrame=f=>setTimeout(f,0);w2.HTMLElement.prototype.scrollIntoView=()=>{};w2.scrollTo=()=>{};}});
    await new Promise(r=>setTimeout(r,1200));
    let opened=false;try{dom2.window.document.getElementById('hnAcc').click();opened=dom2.window.document.getElementById('accountModal').classList.contains('open');}catch(e){e2.push('click: '+e.message);}
    const okb=e2.length===0&&opened;rows.push(['boot with migrated state',String(okb)+(okb?'':' '+e2.join(' | '))]);if(!okb)failed=true;
  }catch(e){rows.push(['boot with migrated state','THROW '+e.message]);failed=true;}
  if(errs.length){failed=true;rows.push(['jsdom errors',errs.join(' | ')]);}
  rows.forEach(([n,r])=>console.log(n.padEnd(30),r));
  console.log(failed?'\nFAILED':'\nALL PASSED');process.exit(failed?1:0);
})();
