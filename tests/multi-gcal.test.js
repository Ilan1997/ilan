// Multi-account Google Calendar regression tests. No network.
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const errs=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(String(e.message||e)));
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',virtualConsole:vc,beforeParse(w){
  w.__MAYA_TEST__=true;const m={};
  w.storage={get:async k=>{if(!(k in m))throw new Error('nf');return{value:m[k]}},set:async(k,v)=>{m[k]=v;return{}},delete:async k=>{delete m[k];return{}}};
  if(!w.structuredClone)w.structuredClone=o=>JSON.parse(JSON.stringify(o));
  w.requestAnimationFrame=f=>setTimeout(f,0);w.HTMLElement.prototype.scrollIntoView=()=>{};w.scrollTo=()=>{};
}});
const w=dom.window;
(async()=>{
  await new Promise(r=>setTimeout(r,1400));
  const checks=[];const ok=(name,v,detail)=>{checks.push([name,!!v,detail]);};
  try{
    const out=w.eval(`(()=>{
      const item={id:'same-google-id',summary:'אותה פגישה',start:{dateTime:'2026-11-25T10:00:00+02:00'},end:{dateTime:'2026-11-25T11:00:00+02:00'}};
      const a={id:'ga_personal',email:'personal@example.com'},b={id:'ga_work',email:'work@example.com'};
      const A=gcalItemsToBlocks([item],false,a),B=gcalItemsToBlocks([item],false,b),both=A.concat(B);
      const base=structuredClone(STATE);base.meta.today='2026-11-22';base.meta.startDate='2026-11-01';base.meta.endDate='2027-02-01';base.constraintsGlobal.events=[];
      const st=applyEvent(base,'personal',{type:'REPLACE_GCAL_EVENTS',events:both});
      const ctx=contextEvents(st);
      _gcalSaveStore({v:GCAL_MULTI_VERSION,accounts:[{...a,label:'אישי',count:1,hideTitles:false},{...b,label:'עבודה',count:1,hideTitles:false}],writeAccountId:'ga_work'});
      return {
        distinctIds:A.length===1&&B.length===1&&A[0].id!==B[0].id,
        provenance:A[0].gAccountId==='ga_personal'&&B[0].gAccountId==='ga_work'&&A[0].gAccountEmail==='personal@example.com',
        bothStored:(st.constraintsGlobal.events||[]).filter(e=>e.source==='gcal').length===2,
        bothInContext:ctx.filter(e=>e.source==='gcal'&&e.title==='אותה פגישה').length===2,
        prefs:_gcalPrefs(),
        ui:_gcalBlockHTML('padding:4px;')
      };
    })()`);
    ok('same Google event in two accounts gets two ids',out.distinctIds);
    ok('each imported event keeps account provenance',out.provenance);
    ok('REPLACE_GCAL_EVENTS keeps both account copies',out.bothStored);
    ok('context layer does not dedupe Google-vs-Google',out.bothInContext);
    ok('aggregate prefs count both connected accounts',out.prefs.accounts.length===2&&out.prefs.count===2&&out.prefs.writeAccountId==='ga_work');
    ok('account UI shows both emails and add-another action',out.ui.includes('personal@example.com')&&out.ui.includes('work@example.com')&&out.ui.includes('חבר יומן גוגל נוסף'));
  }catch(e){ok('multi-account test executed',false,e&&e.stack||String(e));}
  if(errs.length)ok('no jsdom load errors',false,errs.slice(0,3).join(' | '));
  const bad=checks.filter(x=>!x[1]);
  checks.forEach(x=>console.log((x[1]?'PASS ':'FAIL ')+x[0]+(x[2]?' — '+x[2]:'')));
  if(bad.length){console.error('\n'+bad.length+' multi-gcal checks failed');process.exit(1);}
  console.log('\n'+checks.length+' multi-gcal checks passed');process.exit(0);
})().catch(e=>{console.error(e);process.exit(1);});
