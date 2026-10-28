/* 源格｜採購基礎全真模擬考 V1.3。獨立於既有練習流程。 */
(function(){
'use strict';
const PARTS=[
 {name:'第一節｜法規課程',minutes:80,courses:[
  [10,2,4],[11,14,28],[12,2,4],[13,5,10]]},
 {name:'第二節｜採購實務',minutes:80,courses:[
  [0,6,12],[1,6,12],[2,6,12],[3,6,12]]},
 {name:'第三節｜其他課程',minutes:80,courses:[
  [4,2,4],[5,4,8],[6,4,8],[7,3,6],[8,4,8],[9,2,4]]}
];
const VERSION='115年公開三節制參考方案';
let ctx=null;
const esc=v=>ctx.E(v);
const getState=()=>ctx.getState();
const save=()=>ctx.save();
const bank=()=>ctx.BANK;
const now=()=>Date.now();
const sectionMax=part=>part.courses.reduce((s,c)=>s+c[1]+2*c[2],0);
function examState(){let s=getState();if(!s.examV13||typeof s.examV13!=='object')s.examV13={active:null,history:[]};if(!Array.isArray(s.examV13.history))s.examV13.history=[];return s.examV13;}
const current=()=>examState().active;
function rng(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}}
function shuffle(source,seed){let a=source.slice(),random=rng(seed);for(let i=a.length-1;i>0;i--){let j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function valid(q,kind){return !!q&&q[1]===kind&&(kind===0?['O','X'].includes(String(q[3])):(Array.isArray(q[5])&&q[5].length===4&&['1','2','3','4'].includes(String(q[3]))));}
function buildPart(p,seed){let ids=[];for(let [cat,tf,ch] of p.courses){for(let [type,n] of [[0,tf],[1,ch]]){let pool=bank().items.map((q,i)=>q[0]===cat&&valid(q,type)?i:-1).filter(i=>i>=0);if(pool.length<n)throw Error(`${bank().categories[cat]} 缺少可用的 ${type===0?'是非':'選擇'}題（需要 ${n} 題，僅有 ${pool.length} 題）`);ids.push(...shuffle(pool,seed+cat*251+type*57).slice(0,n));}}return shuffle(ids,seed+98701);}
function randSeed(){try{if(window.crypto&&crypto.getRandomValues){let arr=new Uint32Array(1);crypto.getRandomValues(arr);return arr[0]>>>0;}}catch(e){}return Math.floor(Math.random()*4294967296);}
function create(mode,one=0){let old=current();if(old&&!old.finishedAt&&!confirm('目前已有進行中的模擬考。確定要放棄舊考卷並重新抽題？這會清除舊考卷的作答狀態。'))return;
 let seed=randSeed(), parts=(mode==='full'?PARTS.map((p,i)=>({...p,index:i})): [{...PARTS[one],index:one}]);
 let sections=[];try{sections=parts.map((p,i)=>({index:p.index,name:p.name,ids:buildPart(p,seed+i*100003),answers:{},flags:{},cursor:0,status:'pending',startedAt:null,deadline:null,submittedAt:null,timedOut:false}));}catch(e){alert('無法建立考卷：'+e.message);return;}
 let ex={version:'v1.3',scheme:VERSION,mode,seed,createdAt:now(),sections,finishedAt:null,reviewPage:0,reviewFilter:'wrong',examKind:mode};
 examState().active=ex;save();startNext();}
function startNext(){let ex=current();if(!ex)return;let part=ex.sections.find(x=>x.status==='pending');if(!part){ctx.setRoute('exam-report');return;}if(ex.sections.some(s=>s.status==='running')){ctx.setRoute('exam-paper');return;}
 part.status='running';part.startedAt=now();part.deadline=now()+80*60000;save();ctx.setRoute('exam-paper');}
function activePart(ex=current()){return ex&&ex.sections.find(x=>x.status==='running');}
const answered=p=>p.ids.filter(i=>p.answers[i]!==undefined).length;
function countTime(p){return Math.max(0,p.deadline-now());}
function timeText(ms){let s=Math.ceil(ms/1000);return `${String(Math.floor(s/3600)).padStart(2,'0')}:${String(Math.floor((s%3600)/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}
function right(q,a){return String(a??'')===String(q[3]);}
function detailsFor(p){let out=[];for(const id of p.ids){let q=bank().items[id],a=p.answers[id],pt=q[1]===0?1:2;out.push({id,cat:q[0],a,ok:right(q,a),possible:pt,score:right(q,a)?pt:0,unanswered:a===undefined});}return out;}
function report(ex=current()){let rows=(ex?.sections||[]).filter(p=>p.status==='submitted').flatMap(p=>detailsFor(p)),points=rows.reduce((s,x)=>s+x.score,0),max=(ex?.sections||[]).reduce((s,p)=>s+sectionMax(PARTS[p.index]),0),topic={};
 for(const r of rows){let v=topic[r.cat]||(topic[r.cat]={score:0,max:0,wrong:0});v.score+=r.score;v.max+=r.possible;if(!r.ok)v.wrong++;}
 return {rows,points,max,topic,answered:rows.filter(x=>!x.unanswered).length,wrong:rows.filter(x=>!x.ok),pct:max?points/max*100:0,noZero:Object.values(topic).every(t=>t.score>0)};}
function seal(p,timedOut=false){if(!p||p.status!=='running')return;let ex=current();p.status='submitted';p.submittedAt=now();p.timedOut=!!timedOut;p.deadline=null; if(ex.sections.every(s=>s.status==='submitted')){ex.finishedAt=now();let r=report(ex);let hist={createdAt:ex.createdAt,finishedAt:ex.finishedAt,mode:ex.mode,sections:ex.sections.map(s=>s.index),points:r.points,max:r.max,pct:Math.round(r.pct*10)/10,wrong:r.wrong.length};examState().history.unshift(hist);examState().history=examState().history.slice(0,12);}save();}
function sync(){let ex=current();if(!ex)return false;let p=activePart(ex);if(p&&countTime(p)<=0){seal(p,true);return true;}return false;}
function clickSelect(id,opt){let ex=current(),p=activePart(ex);if(!p||countTime(p)<=0){sync();ctx.render();return;}let q=bank().items[id];if(!p.ids.includes(id)||!valid(q,q[1]))return;p.answers[id]=q[1]===0?(opt===0?'O':'X'):String(opt+1);save();
 document.querySelectorAll('[data-ex-choice]').forEach(btn=>btn.classList.toggle('selected',Number(btn.dataset.exChoice)===opt));
 let cnt=document.querySelector('#ex-answered');if(cnt)cnt.textContent=String(answered(p));let mark=document.querySelector('[data-ex-dot="'+p.cursor+'"]');if(mark)mark.classList.add('answered');}
function submitUser(){let p=activePart();if(!p)return;let blank=p.ids.length-answered(p),flags=Object.keys(p.flags).filter(x=>p.flags[x]).length;
 if(!confirm(`確定交卷「${p.name}」？\n已作答 ${answered(p)}／${p.ids.length} 題，未答 ${blank} 題，標記待檢查 ${flags} 題。\n交卷後無法更改答案。`))return;seal(p);ctx.setRoute('exam');}
function jump(idx){let p=activePart();if(!p||idx<0||idx>=p.ids.length)return;p.cursor=idx;save();ctx.render();}
function flag(){let p=activePart();if(!p)return;let id=p.ids[p.cursor];if(p.flags[id])delete p.flags[id];else p.flags[id]=true;save();ctx.render();}
function addWrong(){let ex=current();if(!ex||!ex.finishedAt){alert('請先完成模擬考，再匯入錯題。');return;}let r=report(ex),v=getState().v12;v.wrong=v.wrong||{};for(const x of r.wrong){v.wrong[x.id]=Math.max(1,v.wrong[x.id]||0);}save();alert(`已將 ${r.wrong.length} 題加入原本「錯題回補」，未修改既有答題次數。`);}
function home(){let ex=current(),html=`<section class="card exam-hero"><span class="badge">YUANGE EXAM SIMULATOR · V1.3</span><h1>全真模擬考｜三節計時</h1><p class="sub">依 115 年公開三節制考試方案抽取《全部題庫》原題。考試中隱藏標準答案、解析與口訣；交卷後提供分節、分科成績與錯題回補。</p><div class="exam-metrics"><div><strong>198 題</strong><small>是非 66 ＋ 選擇 132</small></div><div><strong>3 × 80 分</strong><small>每節獨立倒數</small></div><div><strong>330 分</strong><small>231 分達 70% 門檻</small></div></div><p class="tiny">是非每題 1 分、選擇每題 2 分；總分達 70% 且依課程分別考試時不得有課程零分。實際節次安排仍以同事當期通知為準。</p></section>`;
 if(ex){sync();ex=current();let p=activePart(ex);html+=`<section class="card"><div class="row"><b>${ex.mode==='full'?'目前的三節模擬考':'目前的單節模擬考'}</b><span class="badge">${ex.finishedAt?'已完成':'已建立考卷'}</span></div>${ex.sections.map(s=>`<div class="exam-section"><div><b>${esc(s.name)}</b><small>${s.ids.length} 題 · ${sectionMax(PARTS[s.index])} 分</small></div><span class="badge">${s.status==='submitted'?(s.timedOut?'時間到・已交卷':'已交卷'):s.status==='running'?`作答中 ${answered(s)}/${s.ids.length}`:'尚未開始'}</span></div>`).join('')}`;
 if(ex.finishedAt){let r=report(ex);html+=`<p class="sub">最近本次成績：${r.points}／${r.max}（${r.pct.toFixed(1)}%）</p><button class="btn wide" data-ex-action="report">查看成績與錯題</button>`;}
 else if(p)html+=`<div class="warn">考試已開始，離開頁面後倒數仍持續；重新開啟 iPhone 主畫面 App 會按剩餘時間接續。</div><button class="btn wide" data-ex-action="continue">繼續作答｜${timeText(countTime(p))}</button>`;
 else html+=`<p class="sub">上一節已交卷。點選下一節時才開始新的 80 分鐘倒數；三節全部交卷後公布總成績。</p><button class="btn wide" data-ex-action="next-section">開始下一節（80 分鐘）</button>`;
 html+=`</section>`;
 }
 if(!ex||ex.finishedAt){html+=`<section class="card"><h2>開始一份新考卷</h2><button class="btn wide" data-ex-action="full">開始三節全真模擬（198 題）</button><h3 class="spaced">先練單節（每節 80 分鐘）</h3><div class="exam-part-grid">${PARTS.map((p,i)=>`<button class="tile" data-ex-action="single" data-ex-index="${i}"><b>${esc(p.name)}</b><small>${p.courses.reduce((s,c)=>s+c[1]+c[2],0)} 題 · ${sectionMax(p)} 分 · 80 分鐘</small></button>`).join('')}</div></section>`;}
 html+=`<section class="card"><h3>考試規則與提醒</h3><p class="sub">本系統為練習模擬，並非官方考試平台。未作答的題目按零分計；可上一題、下一題、標記疑問及快速跳題。交卷前可修改答案；時間到自動交卷。計時以手機當地時鐘計算，無伺服器監考功能。</p><details class="more"><summary>查看每科配置（公開參考方案）</summary><table class="exam-table"><thead><tr><th>課程</th><th>是非</th><th>選擇</th><th>分數</th></tr></thead><tbody>${PARTS.flatMap((p)=>p.courses.map(c=>`<tr><td>${esc(bank().categories[c[0]])}</td><td>${c[1]}</td><td>${c[2]}</td><td>${c[1]+c[2]*2}</td></tr>`)).join('')}</tbody></table></details><p class="tiny">正式考試時段與科目分組仍應以聯合營建發展基金會第 5 期考試通知為準。本站採用 115 年其他公開實施計畫的三節考試方案作為參考配置。</p></section>`;
 let hist=examState().history;if(hist.length){html+=`<section class="card"><h3>近期模考紀錄</h3>${hist.slice(0,5).map(h=>`<div class="exam-section"><span>${new Date(h.finishedAt).toLocaleDateString('zh-TW')} · ${h.mode==='full'?'全真三節':'單節'}</span><b>${h.points}/${h.max}（${h.pct}%）</b></div>`).join('')}</section>`;}
 return html;
}
function paper(){sync();let ex=current(),p=activePart(ex);if(!p)return `<section class="card"><h2>目前沒有進行中的考試</h2><button class="btn" data-ex-action="to-home">返回模擬考首頁</button></section>`;
 let id=p.ids[p.cursor],q=bank().items[id],tf=q[1]===0,choices=tf?['正確（O）','錯誤（X）']:q[5],ans=p.answers[id],displayed=choices.map((label,i)=>{let value=tf?(i===0?'O':'X'):String(i+1);return `<button class="option exam-opt ${ans===value?'selected':''}" data-ex-choice="${i}" data-ex-id="${id}">${tf?'':String.fromCharCode(65+i)+'．'}${esc(label)}</button>`}).join('');
 let prev=p.cursor===0?'disabled':'',next=p.cursor===p.ids.length-1?'disabled':'';
 return `<div class="exam-sticky"><div><small>${esc(p.name)}</small><strong id="exam-timer">${timeText(countTime(p))}</strong></div><div><span>已作答 <b id="ex-answered">${answered(p)}</b> / ${p.ids.length}</span><span>第 ${p.cursor+1} 題</span></div><div class="meter"><div style="width:${100*answered(p)/p.ids.length}%"></div></div></div>
 <section class="card"><div class="row"><span class="badge">${tf?'是非題 · 1 分':'選擇題 · 2 分'}</span><span class="tiny">第 ${p.cursor+1}/${p.ids.length} 題</span></div><p class="tiny">${esc(bank().categories[q[0]])}｜題庫原題 ${q[2]}｜PDF 第 ${q[6]} 頁</p><h2 class="spaced">${esc(q[4])}</h2>${displayed}<div class="exam-paper-controls"><button class="btn soft" ${prev} data-ex-action="prev">← 上一題</button><button class="btn ghost" data-ex-action="flag">${p.flags[id]?'★ 取消標記':'☆ 標記疑問'}</button><button class="btn soft" ${next} data-ex-action="next">下一題 →</button></div><details class="more"><summary>題號導覽（藍色已答、黃色標記）</summary><div class="exam-palette">${p.ids.map((qid,j)=>`<button data-ex-action="jump" data-ex-index="${j}" data-ex-dot="${j}" class="exam-dot ${p.answers[qid]!==undefined?'answered':''} ${p.flags[qid]?'flagged':''} ${p.cursor===j?'active':''}">${j+1}</button>`).join('')}</div></details><div class="warn">正式模考模式：作答期間不顯示正確答案、解析或口訣。未作答題目記 0 分。</div><button class="btn wide" data-ex-action="submit">確認本節交卷</button></section>`;
}
function gradeText(p){let rows=detailsFor(p),score=rows.reduce((s,x)=>s+x.score,0),max=sectionMax(PARTS[p.index]);return `${score} / ${max} 分`;}
function reportPage(){let ex=current();if(!ex)return home();sync();if(!ex.finishedAt)return `<section class="card"><h2>尚未完成模擬考</h2><p>全真三節模式需三節都交卷後才會顯示答案。請返回考卷繼續作答。</p><button class="btn" data-ex-action="to-home">返回模擬考</button></section>`;
 let r=report(ex),full=ex.mode==='full',pass=full&&r.points>=231&&r.noZero;
 let summary=`<section class="card exam-hero"><span class="badge">模擬考成績單 · 已交卷</span><h1>${r.points} / ${r.max} 分</h1><p>${r.pct.toFixed(1)}%｜${full?(pass?'達到模擬及格條件':'未完全達到模擬及格條件'):'單節成績（不得直接判定總分及格）'}</p><p class="sub">已作答 ${r.answered}/${r.rows.length} 題，答錯或未作答 ${r.wrong.length} 題。</p>${full?`<div class="${pass?'lesson':'warn'}">總分門檻：231 / 330 分，且各課程分數不得為 0；${r.points>=231?'總分已達標':'總分未達標'}，${r.noZero?'各課程均有得分':'部分課程為 0 分，需特別留意'}。此為參考方案的模擬判定。</div>`:'<p class="tiny">若要練整體 70% 門檻，請完成三節全真模考。</p>'}</section>`;
 summary+=`<section class="card"><h3>分節成績</h3>${ex.sections.map(s=>`<div class="exam-section"><div><b>${esc(s.name)}</b><small>${s.timedOut?'80 分鐘已到，自動交卷':'手動交卷'}｜${answered(s)}/${s.ids.length} 題已答</small></div><strong>${gradeText(s)}</strong></div>`).join('')}<h3 class="spaced">分科診斷</h3><div style="overflow-x:auto"><table class="exam-table"><thead><tr><th>課程</th><th>得分</th><th>失分題</th></tr></thead><tbody>${Object.entries(r.topic).map(([cat,t])=>`<tr><td>${esc(bank().categories[cat])}</td><td>${t.score}/${t.max} ${t.score===0?'<span class="stop">零分提醒</span>':''}</td><td>${t.wrong}</td></tr>`).join('')}</tbody></table></div></section>`;
 let filt=ex.reviewFilter||'wrong',list=r.rows.filter(v=>filt==='all'||(filt==='wrong'&&!v.ok)||(filt==='blank'&&v.unanswered)||(filt==='numeric'&&!v.ok&&/(?:\d|[零一二三四五六七八九十百]+(?:元|日|天|家|年|月|%))/.test(bank().items[v.id][4])));
 const page=Math.max(0,Math.min(ex.reviewPage||0,Math.ceil(list.length/8)-1)),shown=list.slice(page*8,(page+1)*8);
 summary+=`<section class="card"><h3>考後錯題回補</h3><p class="sub">考試中不顯示答案；以下是交卷後的解析。所有題目保留原題庫答案，部分有教材短解析或逐項解析，未校核者仍顯示速讀提示。</p><div class="row wraprow" style="gap:6px"><button class="btn soft" data-ex-action="filter" data-ex-filter="wrong">答錯／未答 (${r.wrong.length})</button><button class="btn soft" data-ex-action="filter" data-ex-filter="blank">未作答 (${r.rows.filter(x=>x.unanswered).length})</button><button class="btn soft" data-ex-action="filter" data-ex-filter="numeric">數字錯題</button><button class="btn soft" data-ex-action="filter" data-ex-filter="all">全部題目</button></div><p class="tiny">目前篩選：${{wrong:'答錯／未答',blank:'未作答',numeric:'數字錯題',all:'全部題目'}[filt]} · 共 ${list.length} 題</p>${shown.map((row,i)=>{let q=bank().items[row.id],a=row.a===undefined?'未作答':(q[1]===0?row.a:`${row.a}．${q[5][Number(row.a)-1]||''}`),correct=q[1]===0?(q[3]==='O'?'正確（O）':'錯誤（X）'):`${q[3]}．${q[5][Number(q[3])-1]||''}`;let explain=ctx.getExplanation(q);return `<details class="more"><summary>${row.ok?'✓':'✕'}｜${esc(q[4].slice(0,65))}${q[4].length>65?'…':''}</summary><p class="tiny">${esc(bank().categories[q[0]])}｜原題 ${q[2]}｜PDF 第 ${q[6]} 頁</p><p>${esc(q[4])}</p>${q[1]===1?`<div class="sub">${q[5].map((s,j)=>`${String.fromCharCode(65+j)}．${esc(s)}`).join('<p>')}</div>`:''}<div class="lesson"><b>你的答案：</b>${esc(a)}<p><b>題庫標準答案：</b>${esc(correct)}</p></div>${explain}</details>`;}).join('')||'<div class="lesson">這個篩選條件目前沒有題目。</div>'}<div class="exam-paper-controls"><button class="btn soft" data-ex-action="page-prev" ${page===0?'disabled':''}>上一頁</button><span class="tiny">${list.length?page+1:0} / ${Math.ceil(list.length/8)} 頁</span><button class="btn soft" data-ex-action="page-next" ${page>=(Math.ceil(list.length/8)-1)?'disabled':''}>下一頁</button></div><button class="btn wide" data-ex-action="backfill">把錯題加入既有回補清單</button><button class="btn ghost wide" data-ex-action="to-home">返回模擬考首頁</button></section>`;
 return summary;
}
function handleClick(e){let el=e.target.closest('[data-ex-action], [data-ex-choice]');if(!el)return false;
 if(el.hasAttribute('data-ex-choice')){clickSelect(Number(el.dataset.exId),Number(el.dataset.exChoice));return true;}
 let act=el.dataset.exAction,ex=current(),p=activePart(ex);switch(act){
 case 'full':create('full');break;
 case 'single':create('single',Number(el.dataset.exIndex));break;
 case 'continue':ctx.setRoute('exam-paper');break;
 case 'next-section':startNext();break;
 case 'to-home':ctx.setRoute('exam');break;
 case 'report':ctx.setRoute('exam-report');break;
 case 'prev':jump(p.cursor-1);break;
 case 'next':jump(p.cursor+1);break;
 case 'jump':jump(Number(el.dataset.exIndex));break;
 case 'flag':flag();break;
 case 'submit':submitUser();break;
 case 'filter':if(ex){ex.reviewFilter=el.dataset.exFilter;ex.reviewPage=0;save();ctx.render();}break;
 case 'page-prev':if(ex){ex.reviewPage=Math.max(0,(ex.reviewPage||0)-1);save();ctx.render();}break;
 case 'page-next':if(ex){ex.reviewPage=(ex.reviewPage||0)+1;save();ctx.render();}break;
 case 'backfill':addWrong();break;
 default:return false;
 }return true;
}
function heartbeat(){let updated=sync();if(updated&&location.hash==='#exam-paper'){ctx.setRoute('exam');return;}
 let p=activePart();let timer=document.querySelector('#exam-timer');if(timer&&p){let t=countTime(p);timer.textContent=timeText(t);timer.classList.toggle('exam-low',t<600000);}}
let started=false;
function init(context){ctx=context;if(started)return;started=true;setInterval(heartbeat,1000);window.addEventListener('pageshow',heartbeat);document.addEventListener('visibilitychange',()=>{if(!document.hidden)heartbeat();});}
window.YG_EXAM={init,home,paper,reportPage,handleClick,sync,PARTS,create,report,version:VERSION};
})();
