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
