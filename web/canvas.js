(function(){
'use strict';
let owner=null, records=[], revision=0, controller, current=null;
const copy={
  en:{title:'My Canvas courses',intro:'Connect once to read all courses Canvas marks active. Grades appear here in your existing workspace.',token:'Canvas access token',connect:'Connect & sync all active courses',clear:'Clear imported grades',privacy:'Your token is sent over HTTPS through the StudyGPS backend only to canvas.sydney.edu.au. It is used for this sync and is not saved. Grades stay in this page until sign-out or refresh; they are not shared with teachers or sent to n8n.',limit:'Assignment grades are not automatically topic scores. These imports do not overwrite your saved assessment or generate a personal plan; verified topic mapping is still required.',waiting:'No Canvas grades imported yet.',loading:(i,n)=>`Syncing course ${i} of ${n}…`,done:(s,f)=>`Sync finished: ${s} succeeded, ${f} failed.`,empty:'Canvas returned no active student courses.',error:'Canvas read failed. Check the token and access, or try later.',paused:'Sync paused after an access or rate-limit error. Completed courses remain visible.',none:'No assignments; no zero grades generated.',ungraded:'Ungraded, excluded or outside the supported range',valid:'Grade available; topic mapping pending',table:['Assignment','Score / maximum','Percentage','Status']},
  zh:{title:'我的 Canvas 课程',intro:'连接后自动读取 Canvas 标记为在读的全部课程，成绩直接显示在当前学习空间。',token:'Canvas access token',connect:'连接并自动同步全部在读课程',clear:'清除导入成绩',privacy:'Token 经 HTTPS 通过 StudyGPS 后端，仅发往 canvas.sydney.edu.au，用于本次同步，不保存。成绩仅保留在当前页面，退出或刷新后清除；不与老师共享，不发送到 n8n。',limit:'作业成绩不会自动当成知识点成绩。导入不会覆盖已保存的测评或生成个人计划，仍需经过确认的知识点映射。',waiting:'尚未导入 Canvas 成绩。',loading:(i,n)=>`正在同步第 ${i}/${n} 门课程…`,done:(s,f)=>`同步完成：成功 ${s} 门，失败 ${f} 门。`,empty:'Canvas 未返回在读学生课程。',error:'Canvas 读取失败，请检查 token、权限或稍后重试。',paused:'权限或频率限制导致同步暂停，已完成的课程仍然可见。',none:'无作业，不生成零分。',ungraded:'未评分、不适用或超出有效范围',valid:'成绩可用，待知识点映射',table:['作业','得分 / 满分','百分比','状态']}
};
function el(tag,text){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;}
function clear(){revision++;controller?.abort();owner=null;records=[];current=null;}
function mount(host,{userId,locale,request}){
  if(owner!==userId){clear();owner=userId;}
  revision++;controller?.abort();
  const t=copy[locale]||copy.en, panel=el('section');panel.className='panel';panel.id='canvas-courses';
  panel.append(el('h2',t.title),el('p',t.intro));
  const form=el('form'),label=el('label',t.token),input=el('input'),submit=el('button',t.connect);
  input.type='password';input.id='canvas-token';input.autocomplete='off';input.required=true;label.htmlFor=input.id;
  submit.type='submit';submit.className='button button-dark';form.append(label,input,submit);
  const status=el('p',t.waiting);status.setAttribute('role','status');
  const list=el('div'),remove=el('button',t.clear);remove.type='button';remove.className='button';
  panel.append(form,el('p',t.privacy),status,list,remove,el('p',t.limit));host.prepend(panel);current=panel;
  function renderRecords(){list.replaceChildren();for(const record of records){const block=el('details');block.append(el('summary',record.name));
    if(record.error){block.append(el('p',t.error));list.append(block);continue;}
    if(!record.data.assignments.length){block.append(el('p',t.none));list.append(block);continue;}
    const table=el('table'),head=el('tr');t.table.forEach(v=>head.append(el('th',v)));table.append(head);
    for(const a of record.data.assignments){const row=el('tr');[a.name,`${a.score??'—'} / ${a.points_possible??'—'}`,a.percentage===null?'—':`${a.percentage.toFixed(1)}%`,a.eligible_score===null?t.ungraded:t.valid].forEach(v=>row.append(el('td',v)));table.append(row);}block.append(table);list.append(block);}}
  renderRecords(); if(records.length) status.textContent=t.done(records.filter(r=>!r.error).length,records.filter(r=>r.error).length);
  remove.addEventListener('click',()=>{revision++;controller?.abort();records=[];input.value='';submit.disabled=false;renderRecords();status.textContent=t.waiting;});
  form.addEventListener('submit',async event=>{
    event.preventDefault();const run=++revision;controller?.abort();controller=new AbortController();const signal=controller.signal;
    let canvasToken=input.value.trim();input.value='';submit.disabled=true;records=[];renderRecords();
    const valid=()=>run===revision && owner===userId && current===panel;
    const call=(action,courseId)=>request('/api/canvas',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,canvasToken,...(courseId?{courseId}:{})}),signal});
    let success=0,failed=0;
    try{
      status.textContent=t.loading(0,0);const response=await call('courses');if(!valid())return;
      const courses=[...new Map(response.courses.map(c=>[c.id,c])).values()];if(!courses.length){status.textContent=t.empty;return;}
      for(let i=0;i<courses.length;i++){
        if(!valid())return;const course=courses[i];status.textContent=t.loading(i+1,courses.length);
        try{const data=await call('grades',course.id);if(!valid())return;records.push({name:course.name,data});success++;}
        catch(error){if(!valid())return;records.push({name:course.name,error:true});failed++;if(['CANVAS_401','CANVAS_403','CANVAS_429','AUTH_INVALID','AUTH_REQUIRED'].includes(error.code)){renderRecords();status.textContent=t.paused;return;}}
        renderRecords();
      }status.textContent=t.done(success,failed);
    }catch{if(valid())status.textContent=t.error;}
    finally{canvasToken='';if(valid())submit.disabled=false;}
  });
}
window.StudyGPSCanvas={mount,clear};
})();
