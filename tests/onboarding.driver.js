// Shared driver (evaluated inside the app's jsdom window): plays a fixture's scripted answers through the REAL state machine with a stubbed model.
// The stub returns the fixture's raw extraction for each answer — so everything after the model (normalizer, state machine, profile, template, text) is the production code.
async function onbPlay(fx,o){
  o=o||{};let st=onbNew({today:fx.today,calendar:fx.calendar});st=onbAdvance(st,null);
  const script=fx.script.slice();if(o.replace)script[o.replace.index]=o.replace.step;
  const asked=[];let i=0;const model=async()=>script[i].extraction;
  while(st.current&&i<script.length+1){
    if(i>=script.length){asked.push({id:st.current.id,overrun:true});break;}
    asked.push({id:st.current.id,kind:st.current.kind,text:st.current.text,intent:st.current.intent,expect:script[i].expect,answer:script[i].answer});
    const r=await onbExtractWith(model,st,script[i].answer);st=onbAdvance(st,r.raw);i++;
  }
  return{st,asked,fin:st.done?onbFinish(st):null};
}
