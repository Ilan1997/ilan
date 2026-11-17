// Runs every suite against ../index.html in jsdom. Exit code 1 on any failure.
// Usage: TZ=Asia/Jerusalem node tests/run.js
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const errs=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(String(e.message).slice(0,200)));
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',virtualConsole:vc,
  beforeParse(w){w.__MAYA_TEST__=true;const m={};
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
  // step C: planChain (before / departure) + scheduleSet
  try{
    const cal=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures','calendar_realistic.json'),'utf8'));
    const r=await w.eval(`(async()=>{const CAL=${JSON.stringify(cal)};const o={};
      const R0=normalizeUserRules(null);
      const mkState=(events,rules)=>{const s=structuredClone(STATE_ACTIVE);s.meta.today='2026-11-15';s.constraintsGlobal.events=structuredClone(events);s.userRules=rules||{};return s;};
      const ev=(id,title,date,sm,em,x)=>({id,title,date,startH:Math.floor(sm/60),endH:Math.ceil(em/60),startMin:sm,endMin:em,...(x||{})});
      const mat=(a,b,m,base)=>({...(base||{}),...travelAnswerPatch(normalizeUserRules(base||{}),a,b,m)});
      // ---- planChain: before ----
      const beforeIntent=(extra)=>({op:'create',context:extra,items:[{ref:'t',title:'נסיעה',kind:'travel',anchor:{rel:'before',target:{text:'הפגישה בפתח תקווה',date:'2026-11-16'}},confidence:{kind:0.95,anchor:0.9}}]});
      const chain=(rules,intentRaw)=>{const st=mkState(CAL.events,rules);const sn=buildContextSnapshot(st,{engine:false});const it=normalizeIntent(intentRaw);return planChain(sn,it,planningGaps(it,getUserRules(st)));};
      {const rules=mat('אריאל','פתח תקווה',40);const b=chain(rules,beforeIntent({currentPlace:'אריאל'}));
       o.beforeOk=b.status==='ok'&&b.direction==='before'&&b.arriveBy===530&&b.items[0].startMin===490&&b.items[0].endMin===530&&b.items[0].departAt===490&&b.items[0].place==='פתח תקווה'&&b.conflicts.length===0;
       const b2=chain({...rules,lateBiasMin:15},beforeIntent({currentPlace:'אריאל'}));o.beforeLate=b2.status==='ok'&&b2.arriveBy===515&&b2.items[0].endMin===515&&b2.items[0].startMin===475&&b2.assumptions.some(a=>a.field==='lateBias');
       const b3=chain({...rules,bufferByKind:{meeting:30}},beforeIntent({currentPlace:'אריאל'}));o.beforeBuf=b3.arriveBy===510;
       const multi=chain(rules,{op:'create',items:[{ref:'i1',title:'בית מדרש',kind:'religious',durationMin:60,place:'אריאל',anchor:{rel:'before',target:{text:'הפגישה בפתח תקווה',date:'2026-11-16'}},confidence:{kind:0.9}},{ref:'i2',title:'נסיעה',kind:'travel',afterItem:'i1',confidence:{kind:0.9}}]});
       o.beforeMulti=multi.status==='ok'&&multi.items.length===2&&multi.items[0].startMin===430&&multi.items[0].endMin===490&&multi.items[1].startMin===490&&multi.items[1].endMin===530;
       o.beforeText=chainSummaryText(b).includes('08:10–08:50')||chainSummaryText(b).includes('08:10');}
      {const a1=chain({},beforeIntent({currentPlace:'אריאל'}));o.beforeAsksTravel=a1.status==='ask'&&a1.ask.field==='travel'&&a1.ask.to==='פתח תקווה';
       const a2=chain(mat('אריאל','פתח תקווה',40),beforeIntent(null));o.beforeAsksOrigin=a2.status==='ask'&&a2.ask.field==='origin';
       const a3=chain({},{op:'create',context:{currentPlace:'אריאל'},items:[{ref:'t',title:'נסיעה',kind:'travel',anchor:{rel:'before',target:{text:'הטיפול',date:'2026-11-18'}},confidence:{kind:0.95}}]});o.beforeAsksPlace=a3.status==='ask'&&a3.ask.field==='place';
       const a4=chain(mat('אריאל','פתח תקווה',40),{op:'create',context:{currentPlace:'אריאל'},items:[{ref:'t',title:'נסיעה',kind:'travel',anchor:{rel:'before',target:{text:'הפגישה בפתח תקווה'}},confidence:{kind:0.95}}]});o.beforeAmbiguous=a4.status==='ask'&&a4.ask.field==='anchor';
       const a5=chain(mat('אריאל','פתח תקווה',40),{op:'create',context:{currentPlace:'אריאל'},items:[{ref:'t',title:'נסיעה',kind:'travel',anchor:{rel:'before',target:{text:'הפגישה עם דנה',date:'2026-11-16'}},confidence:{kind:0.95}}]});o.beforeNotFound=a5.status==='not_found'&&!a5.items;}
      o.aliasKept=planChain===planChainBasic;
      // ---- departure time ----
      {const sn=buildContextSnapshot(mkState([],mat('בית','בנק',25,{bufferByKind:{meeting:20},lateBiasMin:15})),{engine:false});
       const d=departureFor(sn,{kind:'meeting',origin:'בית',place:'בנק',startMin:600});o.depart=d.status==='ok'&&d.departAt===540&&d.travelMin===25&&d.bufferMin===20&&d.lateBiasMin===15&&d.arriveAt===565;
       const sn2=buildContextSnapshot(mkState([],{}),{engine:false});o.departAsks=departureFor(sn2,{kind:'meeting',origin:'בית',place:'בנק',startMin:600}).ask.field==='travel'&&departureFor(sn2,{kind:'meeting',place:'בנק',startMin:600}).ask.field==='origin';}
      // ---- scheduleSet ----
      const run=(items,x)=>{x=x||{};const st=mkState(x.events||[],x.rules||{});const sn=buildContextSnapshot(st,{engine:!!x.engine});
        const intent=normalizeIntent({op:x.op||'arrange',items,targetDays:x.targetDays||[],context:x.context||null});const g=planningGaps(intent,getUserRules(st));
        return scheduleSet(sn,intent,g,{existing:x.existing});};
      const it=(ref,title,kind,x)=>({ref,title,kind,confidence:{kind:0.9,place:0.9},...(x||{})});
      const overlaps=(pl)=>pl.some((a,i)=>pl.some((b,j)=>j>i&&a.date===b.date&&a.startMin<b.endMin&&b.startMin<a.endMin));
      const inDay=(pl)=>pl.every(p=>p.startMin>=480&&p.endMin<=1200);
      {const items=[it('i1','זום','meeting'),it('i2','בית מדרש','religious'),it('i3','קניות','shopping'),it('i4','תורה בחווה','religious',{place:'חווה'})];
       const A=run(items,{events:CAL.events.filter(e=>e.id!=='ev_local_dup')}),B=run(items,{events:CAL.events.filter(e=>e.id!=='ev_local_dup')});
       o.setAll=A.placed.length===4&&A.unplaced.length===0&&A.order[0]==='i1';
       o.setNoOverlap=!overlaps(A.placed)&&inDay(A.placed);
       o.setNoEventClash=A.placed.every(p=>!CAL.events.some(e=>e.date===p.date&&p.startMin<e.endMin&&p.endMin>e.startMin));
       o.setDeterministic=JSON.stringify(A.placed)===JSON.stringify(B.placed);
       o.setReasons=A.placed.every(p=>p.reason&&p.reason.length>2);
       o.setNotShabbat=A.placed.every(p=>new Date(p.date+'T12:00:00Z').getUTCDay()!==6);}
      {const A=run([it('i1','לסיים דוח','work',{durationMin:60}),it('i2','קניות','shopping')],{rules:{dayModes:{0:'rest',1:'work'}},targetDays:['2026-11-15','2026-11-16']});
       o.dayMode=A.placed.length===2&&A.placed.every(p=>p.date==='2026-11-16');
       const B=run([it('i1','לסיים דוח','work',{durationMin:60})],{rules:{dayModes:{0:'rest'}},targetDays:['2026-11-15']});o.dayModeUnplaced=B.placed.length===0&&B.unplaced[0].why==='day_mode';}
      {const A=run([1,2,3].map(i=>it('i'+i,'משימה '+i,'admin',{durationMin:60})),{rules:{maxLoadMin:120},targetDays:['2026-11-16']});o.loadCap=A.placed.length===2&&A.unplaced.length===1&&A.unplaced[0].why==='load_cap';
       const L=run([1,2,3,4,5].map(i=>it('i'+i,'משימה '+i,'admin',{durationMin:60})),{rules:{maxLoadMin:480,dayModes:{1:'light'}},targetDays:['2026-11-16']});o.lightDay=L.placed.length===4&&L.unplaced.length===1;}
      {const A=run([it('i1','בנק','errand',{place:'תלפיות'}),it('i2','אופנוע','errand',{place:'תלפיות'})],{context:{currentPlace:'תלפיות'},targetDays:['2026-11-16']});
       const s=A.placed.slice().sort((a,b)=>a.startMin-b.startMin);o.cluster=A.placed.length===2&&s[1].startMin-s[0].endMin<=15&&s[1].startMin>=s[0].endMin;}
      {const E=[ev('m','פגישה בפתח תקווה','2026-11-16',540,600,{place:'פתח תקווה'})];
       const A=run([it('i1','סידור באריאל','errand',{place:'אריאל'})],{events:E,targetDays:['2026-11-16']});
       o.askTravel=A.questions.length===1&&A.questions[0].field==='travel'&&A.questions[0].from==='פתח תקווה'&&A.questions[0].to==='אריאל';
       const B=run([it('i1','סידור באריאל','errand',{place:'אריאל'})],{events:E,rules:mat('פתח תקווה','אריאל',40),targetDays:['2026-11-16']});
       o.respectTravel=B.placed.length===1&&(B.placed[0].startMin>=640||B.placed[0].endMin<=500||B.placed[0].startMin-600>=120)&&B.questions.length===0;}
      {const E=[ev('tr','נסיעה לסופר','2026-11-15',600,645)];
       const A=run([1,2,3].map(i=>it('c'+i,'שיחה '+i,'phone_call',{durationMin:20})),{events:E,targetDays:['2026-11-15']});
       const byRef=Object.fromEntries(A.placed.map(p=>[p.ref,p]));
       o.callsInTravel=byRef.c1.inTravel&&byRef.c1.startMin===600&&byRef.c2.inTravel&&byRef.c2.startMin===620&&!byRef.c3.inTravel&&byRef.c3.reason!=='בזמן הנסיעה';}
      {const E=[ev('x','פגישה בפתח תקווה','2026-11-16',540,600)];
       const ok=run([it('i1','פגישה','meeting',{durationMin:60,date:'2026-11-16',window:{from:'12:00'}})],{events:E});
       o.fixedOk=ok.placed.length===1&&ok.placed[0].startMin===720&&ok.placed[0].endMin===780;
       const bad=run([it('i1','פגישה','meeting',{durationMin:60,date:'2026-11-16',window:{from:'09:30'}})],{events:E});
       o.fixedConflict=bad.placed.length===0&&bad.unplaced[0].why==='conflict'&&bad.unplaced[0].with[0]==='פגישה בפתח תקווה';}
      {const E=CAL.events.filter(e=>e.id!=='ev_local_dup');
       const items=[it('w1','עבודה א','work',{durationMin:60}),it('w2','עבודה ב','work',{durationMin:60}),it('w3','עבודה קשיחה','work',{durationMin:60,rigidity:'hard',confidence:{kind:0.9,rigidity:0.95}})];
       const M=run(items,{op:'move',events:E,targetDays:['2026-11-17','2026-11-18'],existing:{w1:{date:'2026-11-15',startMin:600},w2:{date:'2026-11-19',startMin:540},w3:{date:'2026-11-16',startMin:840}}});
       o.moveOnly=M.placed.length===2&&M.moves.length===2&&M.placed.every(p=>p.date==='2026-11-17'||p.date==='2026-11-18')&&M.kept.length===1&&M.kept[0].ref==='w3'&&M.kept[0].date==='2026-11-16'&&!overlaps(M.placed);
       o.moveNoClash=M.placed.every(p=>!E.some(e=>e.date===p.date&&p.startMin<e.endMin&&p.endMin>e.startMin));}
      {const E=[ev('big','יום מלא','2026-11-16',480,1080)];
       const A=run([it('i1','לימוד סטטיסטיקה','study')],{events:E});
       o.findAvoidsFull=A.placed.length===1&&A.placed[0].date!=='2026-11-16'&&new Date(A.placed[0].date+'T12:00:00Z').getUTCDay()!==6;
       o.findGoodHours=A.placed[0].startMin>=540&&A.placed[0].startMin<720;}
      {const E=[ev('tr','נסיעה לסופר','2026-11-15',600,645)];
       const A=run([it('i1','לשלם ארנונה','admin'),it('i2','להתקשר לרופא','phone_call'),it('i3','ללכת לסופר','shopping'),it('i4','לסיים דוח','deep_work'),it('i5','להתאמן','fitness')],{events:E,targetDays:['2026-11-15','2026-11-16']});
       const by=Object.fromEntries(A.placed.map(p=>[p.ref,p]));
       o.fiveAll=A.placed.length===5&&A.unplaced.length===0&&!overlaps(A.placed)&&inDay(A.placed);
       o.fiveCall=by.i2.inTravel===true;o.fiveDeep=by.i4.startMin>=540&&by.i4.startMin<720&&by.i4.endMin-by.i4.startMin===90;}
      {const A=run([{ref:'t',title:'נסיעה לאריאל',kind:'travel',place:'אריאל',confidence:{kind:0.95}}],{targetDays:['2026-11-16']});o.travelPending=A.placed.length===0&&A.unplaced[0].why==='needs_travel_info';}
      // ---- engine-legal hours (Shabbat / Friday) ----
      {const A=run([it('i1','קניות','shopping')],{engine:true,targetDays:['2026-11-21']});o.engineSaturday=A.placed.length===0&&A.unplaced[0].why==='no_room';
       const B=run([it('i1','קניות','shopping')],{engine:true,targetDays:['2026-11-20']});o.engineFriday=B.placed.length===0||B.placed[0].endMin<=840;
       const st=mkState([]);const sn=buildContextSnapshot(st);o.snapshotHasEngine=sn.freeHours&&Object.isFrozen(sn.freeHours)&&!!sn.freeHours['2026-11-16'];o.staleWithEngine=contextIsStale(sn,st)===false;}
      return o;})()`);
    const okc=Object.values(r).every(v=>v===true);
    rows.push(['plan: before-chain, departure, scheduleSet (C)',String(okc)+(okc?'':' '+JSON.stringify(Object.fromEntries(Object.entries(r).filter(([k,v])=>v!==true))))]);if(!okc)failed=true;
  }catch(e){rows.push(['plan: before-chain, departure, scheduleSet (C)','THROW '+e.message]);failed=true;}
  // ---- step D: validatePlan + proposeCuts (acceptance tests 1–8 + validation checks) ----
  try{
    const r=await w.eval(`(async()=>{const o={};
      const mk=(events,rules)=>{const s=structuredClone(STATE_ACTIVE);s.meta.today='2026-11-15';s.constraintsGlobal.events=structuredClone(events);s.userRules=rules||{};return s;};
      const ev=(id,title,date,sm,em,x)=>({id,title,date,startH:Math.floor(sm/60),endH:Math.ceil(em/60),startMin:sm,endMin:em,...(x||{})});
      const snapOf=(events,rules)=>buildContextSnapshot(mk(events,rules),{engine:false});
      const P=(ref,title,kind,date,sm,em,x)=>({ref,title,kind,place:null,date,startMin:sm,endMin:em,origDurationMin:em-sm,rigidity:'flexible',canMove:true,canShorten:false,canDrop:false,minDurationMin:null,earliest:null,latest:null,bufferMin:0,inTravel:false,chain:null,chainIdx:null,chainAnchor:null,...(x||{})});
      const MON='2026-11-16',TUE='2026-11-17';
      const HARD=(id,title,sm,em,x)=>ev(id,title,MON,sm,em,{attendees:2,...(x||{})});
      const mat=(a,b,m,base)=>({...(base||{}),...travelAnswerPatch(normalizeUserRules(base||{}),a,b,m)});
      const blocksOf=(v)=>v.blocks.map(b=>b.code);
      const clean=(res)=>res.options.every(op=>validatePlan(snapOf([],{}),[]).ok);
      // ===== 1. overloaded day → optional items leave first, flexible untouched =====
      {const E=[HARD('m','פגישה',540,660)];
       const items=[P('s','לימוד','study',MON,720,840,{canShorten:true,minDurationMin:30}),P('sh','קניות','shopping',MON,840,900,{rigidity:'optional',canDrop:true}),P('ad','אדמין','admin',MON,900,960,{rigidity:'optional',canDrop:true,canShorten:true,minDurationMin:15}),P('w','עבודה','work',MON,960,1140,{canShorten:true,minDurationMin:45})];
       const sn=snapOf(E,{maxLoadMin:480});const v=validatePlan(sn,items);
       o.t1_detects=!v.ok&&blocksOf(v).join()==='load_exceeded'&&v.blocks[0].data.load===540&&v.blocks[0].data.cap===480;
       const res=proposeCuts(sn,items);
       o.t1_repaired=res.status==='repaired'&&res.best.steps.length===1&&res.best.steps[0].type==='drop';
       o.t1_optionalFirst=res.best.steps[0].ref==='sh'&&res.best.plan.some(x=>x.ref==='s')&&res.best.plan.some(x=>x.ref==='w')&&res.best.plan.length===3;
       o.t1_cost=res.best.steps[0].costScore<PLAN_REPAIR_COST.shorten;
       o.t1_alt=res.options.length>=2&&res.options[1].totalCost>=res.options[0].totalCost&&res.options[1].steps[0].ref!=='sh'&&res.options[1].complete;}
      // ===== 2. fitness 90 does not fit → offer 30 if allowed =====
      {const E=[HARD('a','פגישה א',540,600),HARD('b','פגישה ב',630,720)];
       const mkFit=x=>[P('f','כושר','fitness',MON,600,690,{canShorten:true,minDurationMin:30,...(x||{})})];
       const sn=snapOf(E,{});const v=validatePlan(sn,mkFit());
       o.t2_detects=blocksOf(v).join()==='overlap';
       const res=proposeCuts(sn,mkFit());const st=res.best&&res.best.steps[0];
       o.t2_shorten30=res.status==='repaired'&&st.type==='shorten'&&st.to.endMin-st.to.startMin===30&&st.from.endMin-st.from.startMin===90&&/90/.test(st.text)&&/30/.test(st.text);
       o.t2_cheapestIsShorten=res.options[0].steps[0].type==='shorten';
       const noShort=proposeCuts(sn,mkFit({canShorten:false}));
       o.t2_notAllowed=noShort.status==='repaired'&&noShort.options.every(op=>op.steps.every(s=>s.type!=='shorten'));
       const minHigh=proposeCuts(sn,mkFit({minDurationMin:45}));
       o.t2_minRespected=minHigh.options.every(op=>op.steps.every(s=>s.type!=='shorten'||(s.to.endMin-s.to.startMin)>=45));}
      // ===== 3. study does not fit → move to another day, never delete =====
      {const E=[HARD('a','אימון קבוע',480,600),HARD('b','פגישות',620,1200)];
       const items=[P('st','לימוד','study',MON,600,690,{canShorten:true,minDurationMin:30})];
       const sn=snapOf(E,{});const res=proposeCuts(sn,items);
       o.t3_moveNotDelete=res.status==='repaired'&&res.best.steps.length===1&&res.best.steps[0].type==='move_day'&&res.best.steps[0].to.date!==MON&&res.best.plan.length===1&&res.options.every(op=>op.steps.every(s=>s.type!=='drop'));
       o.t3_validDay=new Date(res.best.steps[0].to.date+'T12:00:00Z').getUTCDay()!==6&&res.best.steps[0].costScore>=PLAN_REPAIR_COST.move_day;}
      // ===== 4. "must be home by 21:00" (hard) → every plan ending later is blocked =====
      {const rules=mat('פתח תקווה','בית',40,{anchors:[{id:'home',type:'family',title:'בבית ב-21:00',mode:'curfew',days:[0,1,2,3,4,5,6],startMin:1260,enforcement:'hard'}]});
       const sn=snapOf([],rules);
       o.t4_anchorModel=sn.rules.anchors[0].mode==='curfew'&&sn.rules.anchors[0].enforcement==='hard'&&sn.rules.anchors[0].endMin===1440;
       const late=[P('e','סידור','errand',MON,1170,1290,{canShorten:true,minDurationMin:15})];
       const v=validatePlan(sn,late);o.t4_blocksLate=!v.ok&&blocksOf(v).join()==='curfew'&&v.blocks[0].data.enforcement==='hard';
       const withTravel=[P('e','סידור','errand',MON,1110,1230,{place:'פתח תקווה',canShorten:true,minDurationMin:15})];
       const v2=validatePlan(sn,withTravel);o.t4_countsDriveHome=!v2.ok&&blocksOf(v2).join()==='curfew'&&v2.blocks[0].data.backMin===40;
       const early=[P('e','סידור','errand',MON,1080,1140,{canShorten:true,minDurationMin:15})];o.t4_okEarly=validatePlan(sn,early).ok;
       const res=proposeCuts(sn,late);
       o.t4_repairsWithin=res.status==='repaired'&&res.options.every(op=>validatePlan(sn,op.plan).ok&&op.plan.every(x=>x.endMin<=1260));
       const fixedLate=[P('t','טיפול','personal',MON,1200,1290,{rigidity:'hard',canMove:false})];
       const r2=proposeCuts(sn,fixedLate);o.t4_fixedAskUser=r2.status==='needs_decision'&&r2.options.length===0&&r2.decisions.length===1&&r2.decisions[0].code==='curfew'&&fixedLate[0].startMin===1200;}
      // ===== 5. "prefer to be home by 21:00" (soft) → warning, not a block =====
      {const rules={anchors:[{id:'home',type:'family',title:'מעדיף בבית ב-21:00',mode:'curfew',days:[0,1,2,3,4,5,6],startMin:1260,enforcement:'soft'}]};
       const sn=snapOf([],rules);const late=[P('e','סידור','errand',MON,1170,1290)];
       const v=validatePlan(sn,late);o.t5_warnNotBlock=v.ok&&v.warnings.some(x=>x.code==='curfew'&&x.severity==='warn');
       const res=proposeCuts(sn,late);o.t5_okWithWarning=res.status==='ok'&&res.options.length===0&&/21:00/.test(repairSummaryText(res));
       const dflt=normalizeUserRules({anchors:[{id:'x',days:[1],startMin:900,endMin:960}]}).anchors[0];o.t5_defaults=dflt.enforcement==='hard'&&dflt.mode==='busy';
       const soft=normalizeUserRules({anchors:[{id:'x',days:[1],startMin:900,endMin:960,enforcement:'soft'}]}).anchors[0];o.t5_softKept=soft.enforcement==='soft';
       // busy anchor: hard (therapy 15:00) blocks, soft warns; scheduleSet only avoids HARD anchors
       const th=(enf)=>snapOf([],{anchors:[{id:'th',type:'therapy',title:'טיפול',days:[1],startMin:900,endMin:960,enforcement:enf}]});
       const it=[P('x','עבודה','work',MON,870,930,{canShorten:true,minDurationMin:15})];
       o.t5_busyHard=!validatePlan(th('hard'),it).ok&&validatePlan(th('hard'),it).blocks[0].code==='anchor_conflict';
       o.t5_busySoft=validatePlan(th('soft'),it).ok&&validatePlan(th('soft'),it).warnings[0].code==='anchor_conflict';
       const free=(enf)=>ctxFreeIntervals(th(enf),MON,[]).some(iv=>iv[0]<900&&iv[1]>960||iv[1]>=960&&iv[0]<=900);
       o.t5_freeAvoidsHardOnly=ctxFreeIntervals(th('hard'),MON,[]).every(iv=>iv[1]<=900||iv[0]>=960)&&ctxFreeIntervals(th('soft'),MON,[]).some(iv=>iv[0]<=900&&iv[1]>=960);}
      // ===== 6. two hard events overlap → no auto fix, user decides =====
      {const E=[HARD('t','טיפול',900,960),HARD('p','פגישה עם דנה',930,990)];
       const items=[P('x','סידור','errand',MON,540,570,{canShorten:true,minDurationMin:15})];
       const sn=snapOf(E,{});const v=validatePlan(sn,items);
       o.t6_detects=!v.ok&&blocksOf(v).join()==='hard_conflict';
       const res=proposeCuts(sn,items);
       o.t6_needsUser=res.status==='needs_decision'&&res.best===null&&res.options.length===0&&res.decisions.length===1&&res.decisions[0].choices.map(c=>c.id).join()==='move_a,move_b,keep_overlap'&&/טיפול/.test(res.decisions[0].choices[0].label);
       o.t6_noEventMoved=JSON.stringify(sn.events.map(e=>[e.id,e.startMin,e.endMin]))===JSON.stringify(E.map(e=>[e.id,e.startMin,e.endMin]));
       // a HARD plan item over a hard event is the same: never auto-moved
       const hardItem=[P('h','ישיבה','meeting',MON,900,960,{rigidity:'hard',canMove:false})];
       const r2=proposeCuts(snapOf([HARD('t','טיפול',900,960)],{}),hardItem);o.t6_hardItemVsEvent=r2.status==='needs_decision'&&r2.options.length===0;}
      // ===== 7. a chain with travel that does not fit → shorten, or shift_chain =====
      {const E=[ev('pt','פגישה בפתח תקווה',MON,540,600,{place:'פתח תקווה',attendees:2}),HARD('tr','טיפול',680,740)];
       const intentRaw={op:'create',items:[{ref:'i1',title:'נסיעה לאריאל',kind:'travel',place:'אריאל',anchor:{rel:'after',target:{text:'הפגישה בפתח תקווה',date:MON}},confidence:{kind:0.95,place:0.95,anchor:0.9}},{ref:'i2',title:'בית מדרש',kind:'religious',durationMin:60,afterItem:'i1',confidence:{kind:0.85,duration:0.95}}]};
       const run=(rules)=>{const st=mk(E,mat('פתח תקווה','אריאל',40,rules));const sn=buildContextSnapshot(st,{engine:false});const it=normalizeIntent(intentRaw);const g=planningGaps(it,getUserRules(st));const ch=planChain(sn,it,g);return{sn,ch,items:planItemsFrom(sn,g,ch,{chain:true})};};
       const A=run({});
       o.t7_planned=A.ch.status==='ok'&&A.items.length===2&&A.items[0].startMin===600&&A.items[1].endMin===700&&A.items[0].chain==='c1'&&A.items[0].chainAnchor.rel==='after'&&A.items[0].chainAnchor.min===600;
       const v=validatePlan(A.sn,A.items);o.t7_detects=!v.ok&&blocksOf(v).join()==='overlap'&&v.blocks[0].refs.indexOf('i2')>=0;
       const res=proposeCuts(A.sn,A.items);const st=res.best.steps[0];
       o.t7_shortens=res.status==='repaired'&&st.type==='shorten'&&st.ref==='i2'&&st.to.endMin===680&&(st.to.endMin-st.to.startMin)>=30&&res.best.plan.every((x,i,a)=>i===0||x.startMin===a[i-1].endMin);
       const alt=res.options.find(op=>op.steps[0].type==='shift_chain');
       o.t7_altShiftChain=!!alt&&alt.complete&&validatePlan(A.sn,alt.plan).ok&&alt.plan[0].startMin>=600&&alt.plan[0].endMin===alt.plan[0].startMin+40&&alt.plan[1].startMin===alt.plan[0].endMin&&alt.steps[0].costScore>st.costScore;
       const B=run({mobilityByKind:{religious:{canShorten:false}}});
       const rb=proposeCuts(B.sn,B.items);
       o.t7_noShortenShiftChain=rb.status==='repaired'&&rb.best.steps.length===1&&rb.best.steps[0].type==='shift_chain'&&rb.best.plan[0].startMin>=740&&rb.best.plan[0].startMin>=600&&rb.best.plan[1].startMin===rb.best.plan[0].endMin&&rb.best.plan[1].endMin-rb.best.plan[1].startMin===60&&rb.best.steps[0].costScore>=PLAN_REPAIR_COST.shift_chain;
       // travel that does not fit between two places (no explicit travel item)
       const sn2=snapOf([],mat('פתח תקווה','אריאל',40,{}));
       const two=[P('a','פגישה א','errand',MON,540,600,{place:'פתח תקווה',canShorten:true,minDurationMin:15}),P('b','סידור','errand',MON,620,680,{place:'אריאל',canShorten:true,minDurationMin:15})];
       const v2=validatePlan(sn2,two);o.t7_travelGap=blocksOf(v2).join()==='travel_gap'&&v2.blocks[0].data.need===40&&v2.blocks[0].data.gap===20;
       const r2=proposeCuts(sn2,two);o.t7_travelGapRepaired=r2.status==='repaired'&&validatePlan(sn2,r2.best.plan).ok;
       const sn3=snapOf([],{});const v3=validatePlan(sn3,two);o.t7_travelUnknownWarns=v3.ok&&v3.warnings.some(x=>x.code==='travel_unknown'&&x.data.from==='פתח תקווה');
       // explicit travel item shorter than the known drive
       const shortTrip=[P('p','פגישה','errand',MON,540,600,{place:'פתח תקווה'}),P('t','נסיעה לאריאל','travel',MON,600,620,{place:'אריאל',canMove:true})];
       o.t7_travelTooShort=blocksOf(validatePlan(sn2,shortTrip)).indexOf('travel_too_short')>=0;
       // broken chain
       const mkc=(g)=>[P('c1','נסיעה','travel',MON,600,640,{chain:'c',chainIdx:0,place:'אריאל'}),P('c2','בית מדרש','religious',MON,640+g,700+g,{chain:'c',chainIdx:1,canShorten:true,minDurationMin:30})];
       const vb=validatePlan(sn3,mkc(60));o.t7_chainBroken=blocksOf(vb).indexOf('chain_broken')>=0;
       const rc=proposeCuts(sn3,mkc(60));o.t7_chainRepaired=rc.status==='repaired'&&rc.best.plan[1].startMin===640&&rc.best.steps[0].type==='shift_chain';
       const vd=validatePlan(sn3,[P('c1','נסיעה','travel',MON,600,640,{chain:'c',chainIdx:0}),P('c2','בית מדרש','religious',TUE,640,700,{chain:'c',chainIdx:1})]);o.t7_chainSplitDays=blocksOf(vd).indexOf('chain_broken')>=0;
       const vm=validatePlan(sn3,[P('c1','נסיעה','travel',MON,600,640,{chain:'c',chainIdx:0}),P('c3','סיום','religious',MON,640,700,{chain:'c',chainIdx:2})]);o.t7_chainMissing=blocksOf(vm).indexOf('chain_broken')>=0;}
      // ===== 8. an item outside its window → block =====
      {const sn=snapOf([],{});const it=[P('w','שיחה עם הבנק','errand',MON,780,840,{earliest:540,latest:720,canShorten:true,minDurationMin:15})];
       const v=validatePlan(sn,it);o.t8_blocks=!v.ok&&blocksOf(v).join()==='outside_window';
       const res=proposeCuts(sn,it);o.t8_repairInWindow=res.status==='repaired'&&res.options.every(op=>op.plan.every(x=>x.startMin>=540&&x.endMin<=720)&&validatePlan(sn,op.plan).ok);
       const busy=snapOf([HARD('m','פגישה',540,720)],{});const r2=proposeCuts(busy,it);
       o.t8_noRoomSameDay=r2.status==='repaired'&&r2.best.steps[0].type==='move_day'&&r2.best.plan[0].date!==MON&&r2.best.plan[0].startMin>=540&&r2.best.plan[0].endMin<=720;
       const inWin=[P('w','x','errand',MON,600,660,{earliest:540,latest:720})];o.t8_okInside=validatePlan(sn,inWin).ok;}
      // ===== other validation: min duration, buffers, late bias, technical overlap, load/soft =====
      {const sn=snapOf([],{});
       const tooShort=[P('s','לימוד','study',MON,600,620,{origDurationMin:90,canShorten:true,minDurationMin:30})];o.v_belowMin=blocksOf(validatePlan(sn,tooShort)).join()==='below_min_duration';
       const noShort=[P('m','פגישה','meeting',MON,600,630,{origDurationMin:60,canShorten:false})];o.v_shortenNotAllowed=blocksOf(validatePlan(sn,noShort)).join()==='shorten_not_allowed';
       const ok=[P('s','לימוד','study',MON,600,640,{origDurationMin:90,canShorten:true,minDurationMin:30})];o.v_shortenOkAboveMin=validatePlan(sn,ok).ok;
       const sn2=snapOf([ev('x','קפה',MON,540,600)],{});
       const clash=[P('a','סידור','errand',MON,570,630)];const vc=validatePlan(sn2,clash);o.v_overlapEvent=blocksOf(vc).join()==='overlap'&&vc.blocks[0].refs.indexOf('ev:x')>=0;
       const buf=[P('m','פגישה','meeting',MON,605,665,{rigidity:'hard',canMove:false,bufferMin:10})];const vb=validatePlan(sn2,buf);o.v_bufferWarn=vb.ok&&vb.warnings.map(x=>x.code).join()==='buffer_before'&&vb.warnings[0].data.gap===5;
       const sn3=snapOf([],{lateBiasMin:10});
       const lb=[P('t','נסיעה','travel',MON,540,580,{place:'אריאל'}),P('m','פגישה','meeting',MON,590,650,{place:'אריאל',rigidity:'hard',canMove:false,bufferMin:10})];
       const vl=validatePlan(sn3,lb);o.v_lateBiasWarn=vl.ok&&vl.warnings.map(x=>x.code).join()==='late_bias'&&vl.warnings[0].data.need===20;
       const lb2=[P('t','נסיעה','travel',MON,540,570,{place:'אריאל'}),P('m','פגישה','meeting',MON,590,650,{place:'אריאל',rigidity:'hard',canMove:false,bufferMin:10})];o.v_lateBiasSatisfied=validatePlan(sn3,lb2).warnings.length===0;
       const day=[P('a','א','work',MON,480,780,{canShorten:true,minDurationMin:30}),P('b','ב','work',MON,780,1080,{canShorten:true,minDurationMin:30})];
       const lc=validatePlan(snapOf([],{maxLoadMin:480}),day);o.v_load=blocksOf(lc).join()==='load_exceeded';
       const ls=validatePlan(snapOf([],{maxLoadMin:480,assertiveness:'soft'}),day);o.v_loadSoft=ls.ok&&ls.warnings[0].code==='load_exceeded';
       const lightCap=validatePlan(snapOf([],{maxLoadMin:480,dayModes:{1:'light'}}),[P('a','א','work',MON,480,780)]);o.v_lightHalvesCap=blocksOf(lightCap).join()==='load_exceeded';
       const dm=validatePlan(snapOf([],{dayModes:{1:'rest'}}),[P('a','עבודה','work',MON,600,660)]);o.v_dayModeWarn=dm.ok&&dm.warnings[0].code==='day_mode';
       // calls placed inside a travel block are NOT overlaps
       const inT=[P('c','שיחה','phone_call',MON,600,620,{inTravel:true})];const sn4=snapOf([ev('tr','נסיעה לסופר',MON,600,645)],{});o.v_callInTravelOk=validatePlan(sn4,inT).ok;}
      // ===== repair invariants: hard never moved, inputs untouched, deterministic, ranked by cost =====
      {const E=[HARD('m','פגישה',540,660)];
       const items=[P('h','טיפול','personal',MON,700,760,{rigidity:'hard',canMove:false}),P('s','לימוד','study',MON,720,840,{canShorten:true,minDurationMin:30}),P('sh','קניות','shopping',MON,840,900,{rigidity:'optional',canDrop:true}),P('w','עבודה','work',MON,900,1140,{canShorten:true,minDurationMin:45})];
       const sn=snapOf(E,{maxLoadMin:420});const before=JSON.stringify(items),sig=sn.sig;
       const a=proposeCuts(sn,items),b=proposeCuts(sn,items);
       o.i_inputUntouched=JSON.stringify(items)===before&&sn.sig===sig&&Object.isFrozen(sn);
       o.i_deterministic=JSON.stringify(a)===JSON.stringify(b);
       o.i_hardStays=a.options.length>0&&a.options.every(op=>{const h=op.plan.find(x=>x.ref==='h');return h&&h.date===MON&&h.startMin===700&&h.endMin===760;})&&a.options.every(op=>op.steps.every(s=>s.ref!=='h'));
       o.i_rankedByCost=a.options.every((op,i,arr)=>i===0||arr[i-1].complete!==op.complete||arr[i-1].totalCost<=op.totalCost);
       o.i_stepsHaveCosts=a.options.every(op=>op.steps.every(s=>s.costScore>0&&s.text&&s.fixes)&&op.totalCost===op.steps.reduce((t,s)=>t+s.costScore,0));
       o.i_ladder=PLAN_REPAIR_COST.drop<PLAN_REPAIR_COST.shorten&&PLAN_REPAIR_COST.shorten<PLAN_REPAIR_COST.shift&&PLAN_REPAIR_COST.shift<PLAN_REPAIR_COST.shift_chain&&PLAN_REPAIR_COST.shift_chain<PLAN_REPAIR_COST.move_day&&PLAN_REPAIR_COST.move_day<PLAN_REPAIR_COST.ask_user;
       o.i_noDropOfNonOptional=a.options.every(op=>op.steps.every(s=>s.type!=='drop'||s.ref==='sh'));}
      // chain tied to a calendar event never moves to another day (a day before the meeting is nonsense)
      {const st=mk([{id:'pt',title:'פגישה בפתח תקווה',date:MON,startH:9,endH:10,startMin:540,endMin:600,place:'פתח תקווה',attendees:2},{id:'tr',title:'טיפול',date:MON,startH:11,endH:13,startMin:680,endMin:740,attendees:1}],mat('פתח תקווה','אריאל',40));
       const sn=buildContextSnapshot(st,{engine:false});const it=normalizeIntent({op:'create',items:[{ref:'i1',title:'נסיעה לאריאל',kind:'travel',place:'אריאל',anchor:{rel:'after',target:{text:'הפגישה בפתח תקווה',date:MON}},confidence:{kind:0.95,place:0.95,anchor:0.9}},{ref:'i2',title:'בית מדרש',kind:'religious',durationMin:60,afterItem:'i1',confidence:{kind:0.85,duration:0.95}}]});
       const g=planningGaps(it,getUserRules(st));const ch=planChain(sn,it,g);const items=planItemsFrom(sn,g,ch,{chain:true});const res=proposeCuts(sn,items);
       o.j_anchoredChainNoMoveDay=res.options.length>=2&&res.options.every(op=>op.steps.every(s=>s.type!=='move_day'))&&res.options.every(op=>op.plan.every(x=>x.date===MON));}
      // ===== FULL: Intent → Context → Plan → Validate → Repair (and the calendar changing after the plan) =====
      {const E=[HARD('m','פגישה',540,720)];
       const st=mk(E,mat('בית','אריאל',30,{maxLoadMin:540}));const sn=buildContextSnapshot(st,{engine:false});
       const it=normalizeIntent({op:'arrange',targetDays:[MON],items:[
         {ref:'a',title:'ללמוד סטטיסטיקה',kind:'study',durationMin:120,confidence:{kind:0.9,duration:0.9}},
         {ref:'b',title:'קניות',kind:'shopping',durationMin:60,rigidity:'optional',confidence:{kind:0.9,rigidity:0.9}},
         {ref:'c',title:'לסדר מסמכים',kind:'admin',durationMin:45,rigidity:'optional',confidence:{kind:0.9,rigidity:0.9}},
         {ref:'d',title:'עבודה על הדוח',kind:'deep_work',durationMin:120,confidence:{kind:0.9,duration:0.9}}]});
       const g=planningGaps(it,getUserRules(st));const sc=scheduleSet(sn,it,g);
       const items=planItemsFrom(sn,g,sc);
       o.f_planned=sc.placed.length===4&&items.length===4&&validatePlan(sn,items).ok&&items.find(x=>x.ref==='b').canDrop===true&&items.find(x=>x.ref==='a').canDrop===false;
       // a new hard meeting lands in the calendar after the plan was made
       const E2=E.concat([HARD('new','ישיבת הנהלה',780,960)]);const st2=mk(E2,st.userRules);const sn2=buildContextSnapshot(st2,{engine:false});
       o.f_stale=contextIsStale(sn,st2)===true;
       const v=validatePlan(sn2,items);const res=proposeCuts(sn2,items);
       o.f_blocksOnNewCalendar=!v.ok&&res.status==='repaired'&&res.best.complete&&validatePlan(sn2,res.best.plan).ok;
       o.f_hardEventsUntouched=sn2.events.length===E2.length&&res.options.every(op=>op.plan.every(x=>!x.isEvent));
       o.f_textSaysWhat=/הוצא|לקצר|להזיז|להעביר/.test(repairSummaryText(res))&&/הצעה/.test(repairSummaryText(res));
       // regression: a partial relief of an overload counts as progress, so the plan is NOT repaired with a dozen 15-minute trims
       const best=res.best;o.f_fewSteps=best.steps.length<=4&&best.totalCost<=150;
       o.f_noRepeatedTrims=best.steps.every((s,i,a)=>a.filter(t=>t.ref===s.ref&&t.type===s.type).length===1);
       o.f_optionalLeaveFirst=best.steps.filter(s=>s.type==='drop').every(s=>s.ref==='b'||s.ref==='c')&&best.steps.some(s=>s.type==='drop');}
      return o;})()`);
    const okd=Object.values(r).every(v=>v===true);
    rows.push(['validate + proposeCuts (D)',String(okd)+(okd?'':' '+JSON.stringify(Object.fromEntries(Object.entries(r).filter(([k,v])=>v!==true))))]);if(!okd)failed=true;
  }catch(e){rows.push(['validate + proposeCuts (D)','THROW '+e.message]);failed=true;}
  // ---- AI preview: prompt does not let the model state days/hours; simulatePlan takes live "now" ----
  try{
    const r=await w.eval(`(()=>{const o={};
      o.a_promptRule=AI_SYSTEM_PROMPT_BASE.indexOf('אל תציין/י בטקסט ימים, שעות או חלוקה')>=0&&AI_SYSTEM_PROMPT_BASE.indexOf('המנוע הוא שמחליט איפה לשבץ')>=0;
      o.a2_personaRule=AI_SYSTEM_PROMPT_BASE.indexOf('מזכירה אישית, לא מערכת')>=0&&/דדליין, שיבוץ, משימה/.test(AI_SYSTEM_PROMPT_BASE);
      o.a3_hoursRule=AI_SYSTEM_PROMPT_BASE.indexOf('שעות מועדפות')>=0&&AI_SYSTEM_PROMPT_BASE.indexOf('שאלה אחת קצרה')>=0&&AI_SYSTEM_PROMPT_BASE.length<24000;
      const s=structuredClone(STATE_ACTIVE);s.meta.today='2026-11-17';
      const pay={id:'t1',title:'עבודה להגשה',requiredUnits:8,deadline:'2026-11-23',priorityWeight:1,splitMode:'flexible',type:'generic',calendarId:'personal',location:''};
      const a=simulatePlan(s,'personal',pay),b=simulatePlan(s,'personal',pay,{}),c=simulatePlan(s,'personal',pay,{nowMinutes:1130});
      const sig=x=>JSON.stringify(Object.keys(x.result.assignments).sort());
      o.b_defaultUnchanged=sig(a)===sig(b)&&Object.keys(a.result.assignments).length>0;
      o.c_acceptsNow=!!c&&c.result&&Object.keys(c.result.assignments).length===Object.keys(a.result.assignments).length;
      o.d_previewFromSimulation=(()=>{const cp={tasks:[{title:'עבודה להגשה',hours:8,deadline:'2026-11-23',calendar:'personal',split:'flexible',priority:1}],events:[]};const sim=_simulateCompiledPlan(s,cp);const pv=_buildAIPlanPreview(cp,sim);return /כל 8 השעות/.test(pv.text)&&/יום [א-ת]+ [0-9]+[.][0-9]+: [0-9][0-9]:00–[0-9][0-9]:00/.test(pv.text)&&!/דדליין|סיכון|שיבוץ:|העדפת|משימה/.test(pv.text);})();
      return o;})()`);
    const okp=Object.values(r).every(v=>v===true);
    rows.push(['AI preview consistency',String(okp)+(okp?'':' '+JSON.stringify(r))]);if(!okp)failed=true;
  }catch(e){rows.push(['AI preview consistency','THROW '+e.message]);failed=true;}
  // ---- hours already gone today are not offered (live callers only; the engine itself stays clock-free) ----
  try{
    const r=await w.eval(`(()=>{const o={};
      const pay={id:'t1',title:'עבודה להגשה',requiredUnits:8,deadline:'2026-11-23',priorityWeight:1,splitMode:'flexible',type:'generic',calendarId:'personal',location:''};
      const mk=(manual)=>{const s=structuredClone(STATE_ACTIVE);s.meta.today='2026-11-17';s.meta.todayIsManual=!!manual;return s;};
      const hoursOn=(r,d)=>Object.keys(r.result.assignments).filter(k=>k.split('T')[0]===d&&r.result.assignments[k].taskId==='t1').map(k=>+k.split('T')[1]);
      const total=r=>Object.keys(r.result.assignments).filter(k=>r.result.assignments[k].taskId==='t1').length;
      try{
        window.__MAYA_NOW__={minutes:1130,iso:'2026-11-17'};   // Tuesday 18:50
        const s=mk(false),opts=_liveEngineOpts(s);
        o.a_optsOn=opts.elapsedToday===true&&opts.nowMinutes===1130;
        const r=simulatePlan(s,'personal',pay,opts);
        o.b_noElapsedHours=hoursOn(r,'2026-11-17').every(h=>h>=18)&&total(r)===8;
        o.c_pushedForward=hoursOn(simulatePlan(s,'personal',pay),'2026-11-17').some(h=>h<18);   // without the live input the old behaviour (morning hours today) is unchanged
        o.d_deterministic=JSON.stringify(Object.keys(r.result.assignments).sort())===JSON.stringify(Object.keys(simulatePlan(s,'personal',pay,opts).result.assignments).sort());
        const sm=mk(true);o.e_manualTodayNoElapsed=_liveEngineOpts(sm).elapsedToday!==true;
        const other=mk(false);other.meta.today='2026-11-18';o.f_otherDayNoElapsed=_liveEngineOpts(other).elapsedToday!==true;
        window.__MAYA_NOW__={minutes:30,iso:'2026-11-17'};   // 00:30 — nothing has ended yet
        const early=simulatePlan(s,'personal',pay,_liveEngineOpts(s));o.g_earlyMorningUnchanged=hoursOn(early,'2026-11-17').some(h=>h<10);
        window.__MAYA_NOW__={minutes:1439,iso:'2026-11-17'};   // 23:59 — the whole day is gone
        const late=simulatePlan(s,'personal',pay,_liveEngineOpts(s));o.h_lateNightNothingToday=hoursOn(late,'2026-11-17').every(h=>h>=23)&&total(late)===8;
      }finally{delete window.__MAYA_NOW__;}
      o.i_testRunsStayClockFree=_liveEngineOpts(mk(false)).elapsedToday!==true;   // window.__MAYA_TEST__ is set in this harness
      return o;})()`);
    const oke=Object.values(r).every(v=>v===true);
    rows.push(['elapsed hours today',String(oke)+(oke?'':' '+JSON.stringify(r))]);if(!oke)failed=true;
  }catch(e){rows.push(['elapsed hours today','THROW '+e.message]);failed=true;}
  // ---- Step E: replan (minimal disruption) ----
  try{
    const body=require('fs').readFileSync(require('path').join(__dirname,'replan.scenarios.js'),'utf8');
    const r=await w.eval(body.trim()+'()');
    const okr=Object.values(r).every(v=>v===true);
    rows.push(['replan (E)',String(okr)+' ('+Object.keys(r).length+')'+(okr?'':' '+JSON.stringify(Object.fromEntries(Object.entries(r).filter(([k,v])=>v!==true))))]);if(!okr)failed=true;
  }catch(e){rows.push(['replan (E)','THROW '+e.message]);failed=true;}
  // ---- Maya's voice: enforced in code (polish + lint over real samples and every UI string) ----
  try{
    const samples=JSON.parse(require('fs').readFileSync(require('path').join(__dirname,'fixtures','voice_samples.json'),'utf8')).samples;
    const r=await w.eval(`(()=>{const o={};const SAMPLES=${JSON.stringify(samples)};
      SAMPLES.forEach(sm=>{const out=mayaPolish(sm.raw);
        o['sample_'+sm.id+'_clean']=mayaVoiceLint(out).ok&&sm.mustContain.every(x=>out.indexOf(x)>=0)&&sm.mustNotContain.every(x=>out.indexOf(x)<0);
        o['sample_'+sm.id+'_wasDirty']=!mayaVoiceLint(sm.raw).ok;});
      o.a_idempotent=SAMPLES.every(sm=>mayaPolish(mayaPolish(sm.raw))===mayaPolish(sm.raw));
      o.b_plainHebrewUntouched=mayaPolish('בסדר גמור, קבעתי לך שעתיים ביום רביעי.')==='בסדר גמור, קבעתי לך שעתיים ביום רביעי.';
      o.c_lintCatchesInternals=!mayaVoiceLint('שובצו 8/8 שעות — רמת סיכון: בטוחה').ok&&!mayaVoiceLint('יצירת משימה: x').ok&&!mayaVoiceLint('undefined').ok&&!mayaVoiceLint('SEMANTIC_PLAN').ok;
      // every text the user reads that code produces must pass the lint
      const s=structuredClone(STATE_ACTIVE);s.meta.today='2026-11-17';
      const cp={tasks:[{title:'עבודה להגשה בלימודים',hours:8,deadline:'2026-11-23',calendar:'personal',split:'flexible',priority:1},{title:'פגישה',hours:1,deadline:'2026-11-20',calendar:'work',split:'strict_contiguous',priority:1}],events:[{title:'בחינה',date:'2026-11-19',startHour:9,endHour:12}],capacity:{days:[1,3],startHour:9,endHour:17}};
      const pv=_buildAIPlanPreview(cp,_simulateCompiledPlan(s,cp));
      o.d_previewLint=mayaVoiceLint(pv.text).ok;
      o.e_intakeLint=Object.values(AI_INTAKE_QUESTION).every(q=>mayaVoiceLint(q).ok)&&mayaVoiceLint(AI_GREETING_BASE).ok;
      o.f_errorMessagesFound=true;o.g_errorMessagesLint=true;
      return o;})()`);
    const srcHtml=require('fs').readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
    const msgs=[...srcHtml.matchAll(/userMessage\s*=\s*(?:[^'"\n;]*\?\s*)?'([^'\n]{8,})'/g)].map(m=>m[1]);
    r.f_errorMessagesFound=msgs.length>=3;
    r.g_errorMessagesLint=(await w.eval('(ms=>ms.every(m=>mayaVoiceLint(m).ok))('+JSON.stringify(msgs)+')'))===true;
    const okv=Object.values(r).every(v=>v===true);
    rows.push(['Maya voice (polish + lint)',String(okv)+(okv?'':' '+JSON.stringify(Object.fromEntries(Object.entries(r).filter(([k,v])=>v!==true))))]);if(!okv)failed=true;
  }catch(e){rows.push(['Maya voice (polish + lint)','THROW '+e.message]);failed=true;}
  // ---- build stamp + stale-version detection ----
  try{
    const r=await w.eval(`(()=>{const o={};
      o.a_stamp=/^[0-9]{4}-[0-9]{2}-[0-9]{2}[.][0-9]+$/.test(APP_BUILD);
      o.b_parse=_parseBuild("x const APP_BUILD='2030-01-01.9'; y")==='2030-01-01.9'&&_parseBuild('nothing')===null;
      o.c_shownOnScreen=(document.getElementById('navRange')||{textContent:''}).textContent.indexOf(APP_BUILD)>=0;
      o.d_noBannerInTests=(()=>{_verBannerShown=false;return _checkForNewVersion(true);})()instanceof Promise;
      o.e_bannerText=(()=>{_verBannerShown=false;_showNewVersionBanner();const b=document.getElementById('newVersionBanner');const ok=!!b&&/גרסה חדשה/.test(b.textContent)&&mayaVoiceLint(b.textContent).ok;if(b)b.remove();_verBannerShown=false;return ok;})();
      return o;})()`);
    const okb=Object.values(r).every(v=>v===true);
    rows.push(['build stamp + new-version banner',String(okb)+(okb?'':' '+JSON.stringify(r))]);if(!okb)failed=true;
  }catch(e){rows.push(['build stamp + new-version banner','THROW '+e.message]);failed=true;}
  // ---- token refresh: single-flight, transient failures, other-tab race ----
  try{
    const r=await w.eval(`(async()=>{const o={};
      const real=window.fetch,rs=localStorage.getItem(CLOUD_SESSION_KEY),saved=CLOUD_SESSION;
      const now=()=>Math.floor(Date.now()/1000);
      const sess=(exp,rt)=>({access_token:'at-'+rt,refresh_token:rt,expires_at:exp,user:{id:'u1',email:'a@b.c',name:'x'}});
      const reply=(status,body)=>({ok:status>=200&&status<300,status,json:async()=>body});
      try{
        // 1) two callers at once → ONE refresh request (rotation would otherwise kill the 2nd)
        let calls=0;_cloudStoreSession(sess(now()+10,'rt1'));
        window.fetch=async()=>{calls++;await new Promise(r=>setTimeout(r,30));return reply(200,{access_token:'at2',refresh_token:'rt2',expires_in:3600,user:{id:'u1',email:'a@b.c'}});};
        const rr=await Promise.all([_cloudEnsureFresh(),_cloudEnsureFresh(),_cloudEnsureFresh()]);
        o.a_singleFlight=calls===1&&rr.every(x=>x===true)&&CLOUD_SESSION.refresh_token==='rt2';
        // 2) server error once → retried → success
        let n=0;_cloudStoreSession(sess(now()+10,'rt3'));
        window.fetch=async()=>{n++;return n===1?reply(503,{}):reply(200,{access_token:'at4',refresh_token:'rt4',expires_in:3600,user:{id:'u1'}});};
        o.b_retryOk=(await _cloudEnsureFresh())===true&&n===2&&CLOUD_SESSION.refresh_token==='rt4';
        // 3) network down but the access token is still valid for 30s → carry on, stay signed in
        _cloudStoreSession(sess(now()+30,'rt5'));window.fetch=async()=>{throw new Error('offline');};
        o.c_networkTokenStillValid=(await _cloudEnsureFresh())===true&&cloudSignedIn();
        // 4) network down and the token already expired → false, but NOT signed out (can retry)
        _cloudStoreSession(sess(now()-5,'rt6'));
        o.d_networkExpiredStaysSignedIn=(await _cloudEnsureFresh())===false&&cloudSignedIn();
        // 5) refresh token rejected (400) but another tab stored a newer session → adopt it, don't sign out
        _cloudStoreSession(sess(now()+10,'rt7'));
        window.fetch=async()=>{localStorage.setItem(CLOUD_SESSION_KEY,JSON.stringify(sess(now()+3600,'rt8')));return reply(400,{error:'invalid_grant'});};
        o.e_otherTabWins=(await _cloudEnsureFresh())===true&&cloudSignedIn()&&CLOUD_SESSION.refresh_token==='rt8';
        // 6) refresh token really dead (400, nothing newer) → signed out
        _cloudStoreSession(sess(now()+10,'rt9'));window.fetch=async()=>reply(400,{error:'invalid_grant'});
        o.f_deadSignsOut=(await _cloudEnsureFresh())===false&&!cloudSignedIn();
        // 7) fresh token → no request at all
        _cloudStoreSession(sess(now()+3000,'rt10'));let c7=0;window.fetch=async()=>{c7++;return reply(200,{});};
        o.g_freshNoRequest=(await _cloudEnsureFresh())===true&&c7===0;
      }finally{window.fetch=real;CLOUD_SESSION=saved;try{if(rs===null)localStorage.removeItem(CLOUD_SESSION_KEY);else localStorage.setItem(CLOUD_SESSION_KEY,rs);}catch(_e){}}
      return o;})()`);
    const oka=Object.values(r).every(v=>v===true);
    rows.push(['token refresh (single-flight)',String(oka)+(oka?'':' '+JSON.stringify(r))]);if(!oka)failed=true;
  }catch(e){rows.push(['token refresh (single-flight)','THROW '+e.message]);failed=true;}
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
      beforeParse(w2){w2.__MAYA_TEST__=true;const m={};w2.storage={get:async k=>{if(!(k in m))throw new Error('nf');return{value:m[k]}},set:async(k,v)=>{m[k]=v;return{}},delete:async k=>{delete m[k];return{}}};
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
