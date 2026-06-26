const qs=s=>document.querySelector(s);
const STORAGE_PREFIX="tokurei-fe-20260614";
const STORAGE={
  phase:`${STORAGE_PREFIX}-phase`,
  answers:`${STORAGE_PREFIX}-answers`,
  done:`${STORAGE_PREFIX}-done`,
  report:`${STORAGE_PREFIX}-first-report`,
  retryAnswers:`${STORAGE_PREFIX}-retry-answers`
};
// 旧版の保存データがあれば、新しい教材専用キーへ一度だけ引き継ぐ。
[
  ["fe-phase",STORAGE.phase],["fe-answers",STORAGE.answers],
  ["fe-done",STORAGE.done],["fe-first-report",STORAGE.report]
].forEach(([oldKey,newKey])=>{
  if(localStorage.getItem(newKey)===null&&localStorage.getItem(oldKey)!==null){
    localStorage.setItem(newKey,localStorage.getItem(oldKey));
  }
});
const learningState={
  phase:localStorage.getItem(STORAGE.phase)||"exam",
  answers:JSON.parse(localStorage.getItem(STORAGE.answers)||"{}"),
  retryAnswers:JSON.parse(localStorage.getItem(STORAGE.retryAnswers)||"{}"),
  understood:new Set(JSON.parse(localStorage.getItem(STORAGE.done)||"[]")),
  filter:"すべて",query:"",onlyUnlearned:false
};
const reviewFields=["すべて",...new Set(QUESTIONS.map(q=>q.field))];
const IMPORTANT_WORDS=[
  ["基礎理論","情報落ち","マルコフ過程"],["AI","ファインチューニング"],
  ["コンピュータ","A/D変換","MIPS","オーバーフロー","ストライピング","仮想記憶","アクティブLow"],
  ["アルゴリズム","二分探索木","深さ優先探索"],["プログラミング","オーバーロード","継承"],
  ["システム","フェールセーフ","ボトルネック"],
  ["データベース","グラフ型DB","正規化","UNION","ストアドプロシージャ","チェックポイント"],
  ["ネットワーク","OSI参照モデル","5タプル","SNMP","Wi-Fi Direct"],
  ["セキュリティ","ルートキット","暗号の危殆化","FAR・FRR","ファジング","EDR","ゼロトラスト","XSS"],
  ["開発技術","DFD","マイクロサービス","同値分割","TDD"],
  ["マネジメント","プロダクトバックログ","ベースライン","クリティカルパス"],
  ["サービス管理","インシデント管理","可用性","内部監査"],
  ["ストラテジ","BSC","PPM","カニバリゼーション","ビジネスモデルキャンバス","RPA","移動平均"],
  ["IoT","エネルギーハーベスティング"],["品質管理","パレート図"],
  ["会計","特別損失"],["法務","GPL","個人情報の利用目的"]
];
const saveLearning=()=>{
  localStorage.setItem(STORAGE.phase,learningState.phase);
  localStorage.setItem(STORAGE.answers,JSON.stringify(learningState.answers));
  localStorage.setItem(STORAGE.retryAnswers,JSON.stringify(learningState.retryAnswers));
  localStorage.setItem(STORAGE.done,JSON.stringify([...learningState.understood]));
};
const answeredCount=()=>Object.keys(learningState.answers).length;
const score=()=>QUESTIONS.filter(q=>learningState.answers[q.n]===q.answer).length;
const firstReport=()=>JSON.parse(localStorage.getItem(STORAGE.report)||"null");
const retryTargets=()=>firstReport()?.wrong||[];
const retryAnsweredCount=()=>retryTargets().filter(n=>learningState.retryAnswers[n]).length;
const retryScore=()=>retryTargets().filter(n=>learningState.retryAnswers[n]===QUESTIONS.find(q=>q.n===n)?.answer).length;
const isReview=()=>learningState.phase==="review"||learningState.phase==="retryReview";
const isRetry=()=>learningState.phase==="retry";
const isRetryFlow=()=>learningState.phase==="retry"||learningState.phase==="retryReview";
function visible(q){
  if(learningState.phase==="exam")return true;
  if(isRetryFlow())return retryTargets().includes(q.n);
  const text=`${q.n} ${q.title} ${q.field} ${q.answerText} ${q.summary} ${q.reasoning.join(" ")}`.toLowerCase();
  return (learningState.filter==="すべて"||q.field===learningState.filter)&&(!learningState.query||text.includes(learningState.query.toLowerCase()))&&(!learningState.onlyUnlearned||!learningState.understood.has(q.n));
}
function renderLearning(){
  document.body.classList.toggle("review-mode",isReview());
  document.body.classList.toggle("retry-mode",isRetry());
  const root=qs("#questions");root.innerHTML="";
  QUESTIONS.forEach(q=>{
    if(!visible(q))return;
    const node=qs("#questionTemplate").content.firstElementChild.cloneNode(true);
    node.id=`q${q.n}`;if(learningState.understood.has(q.n))node.classList.add("understood");
    node.querySelector(".number").textContent=`Q${String(q.n).padStart(2,"0")}`;
    node.querySelector(".meta").textContent=q.field;
    node.querySelector("h2").textContent=q.title;
    const image=node.querySelector(".problem-panel img");
    image.src=`assets/questions/q${String(q.n).padStart(2,"0")}.png`;image.alt=`問${q.n}の問題文`;
    node.querySelectorAll(".answer-input input").forEach(input=>{
      const answerStore=isRetryFlow()?learningState.retryAnswers:learningState.answers;
      input.name=`answer-${isRetryFlow()?"retry-":""}${q.n}`;input.checked=answerStore[q.n]===input.value;
      input.onchange=()=>{
        if(isRetry())learningState.retryAnswers[q.n]=input.value;
        else learningState.answers[q.n]=input.value;
        saveLearning();
        updateLearningHeader();renderLearningMap();updatePhasePanel();
      };
    });
    if(isReview()){
      const userAnswer=isRetryFlow()?learningState.retryAnswers[q.n]:learningState.answers[q.n];
      const correct=userAnswer===q.answer;
      const line=node.querySelector(".result-line");line.className=`result-line ${correct?"correct":"wrong"}`;
      line.textContent=correct?`正解：あなたの回答 ${userAnswer}`:`不正解：あなたの回答 ${userAnswer||"未回答"} ／ 正答 ${q.answer}`;
    }
    node.querySelector(".answer-strip strong").textContent=q.answer;
    node.querySelector(".answer-strip p").textContent=q.answerText;
    node.querySelector(".summary").textContent=q.summary;
    node.querySelector(".reasoning").innerHTML=q.reasoning.map(x=>`<li>${x}</li>`).join("");
    node.querySelector(".trap p").textContent=q.trap;
    node.querySelector(".diagram").innerHTML=window.renderRichVisual(q);
    node.querySelector("figcaption").textContent=q.caption;
    const check=node.querySelector(".understand-check input");check.checked=learningState.understood.has(q.n);
    check.onchange=()=>{
      check.checked?learningState.understood.add(q.n):learningState.understood.delete(q.n);
      saveLearning();renderLearning();document.querySelector(`#q${q.n}`)?.scrollIntoView({block:"center"});
    };
    root.appendChild(node);
  });
  qs("#emptyState").hidden=!!root.children.length;
  updatePhasePanel();renderLearningMap();updateLearningHeader();
}
function updatePhasePanel(){
  const review=isReview(),complete=learningState.understood.size===60;
  const retry=isRetry(),retryReview=learningState.phase==="retryReview",targets=retryTargets();
  qs("#reviewToolbar").hidden=!review||retryReview;
  document.querySelectorAll("[data-exam-controls]").forEach(el=>el.hidden=review&&!retry);
  qs("#listTitle").textContent=retry?"間違えた問題の再挑戦":retryReview?"再挑戦の採点結果と解説":review?"採点結果と解説":"試験問題";
  qs("#phaseMessage").textContent=retry?`間違えた${targets.length}問だけ再挑戦中です。正答と解説は隠しています。すべて回答すると再採点できます。`:retryReview?"再挑戦を採点しました。解説を確認し、理解できた問題にチェックを入れてください。":review?"採点済みです。解説を読み、理解できた問題にチェックを入れてください。":`${answeredCount()}問回答済み。60問すべて回答すると採点できます。`;
  document.querySelectorAll('[data-action="submit"]').forEach(button=>{
    button.textContent=retry?"再挑戦を採点する":"60問を採点する";
    button.disabled=retry?retryAnsweredCount()!==targets.length:answeredCount()!==60;
  });
  document.querySelectorAll("[data-exam-message]").forEach(message=>{
    message.textContent=retry?(retryAnsweredCount()===targets.length?`再挑戦 ${targets.length}問に回答しました。採点できます。`:`現在 ${retryAnsweredCount()} / ${targets.length}問回答済みです。`):(answeredCount()===60?"全60問に回答しました。採点すると解答は変更できません。":`現在 ${answeredCount()} / 60問回答済みです。`);
  });
  const summary=qs("#scoreSummary");summary.hidden=!review;
  qs("#answerLegend").hidden=!review;
  if(review)summary.innerHTML=retryReview?`<div><strong>${retryScore()}</strong><span>再挑戦で正解</span></div><div><strong>${targets.length-retryScore()}</strong><span>再挑戦で不正解</span></div><div><strong>${learningState.understood.size}</strong><span>理解済み</span></div>`:`<div><strong>${score()}</strong><span>正解</span></div><div><strong>${60-score()}</strong><span>不正解</span></div><div><strong>${learningState.understood.size}</strong><span>理解済み</span></div>`;
  document.querySelectorAll("#phaseSteps [data-step]").forEach(el=>{
    el.classList.remove("active","finished");const step=el.dataset.step;
    if(learningState.phase==="exam"&&step==="exam")el.classList.add("active");
    if((review||retry)&&(step==="exam"||step==="score"))el.classList.add("finished");
    if((review||retry)&&!complete&&step==="review")el.classList.add("active");
    if(complete&&step!=="complete")el.classList.add("finished");
    if(complete&&step==="complete")el.classList.add("active");
  });
  if(complete)qs("#phaseMessage").innerHTML=`<div class="completion"><strong>学習完了！</strong>60問すべての理解チェックが付きました。</div>`;
  if((review&&!retryReview)||retry){ensureFirstReport();renderFirstReport()}else qs("#learningReport").hidden=true;
}
function renderLearningMap(){
  qs("#questionMap").innerHTML=QUESTIONS.map(q=>{
    let cls="";
    if(isRetryFlow()&&!retryTargets().includes(q.n))cls="hidden-map";
    if(isRetry()&&learningState.retryAnswers[q.n])cls+=" answered";
    if(learningState.phase==="exam"&&learningState.answers[q.n])cls="answered";
    if(isReview()&&(!isRetryFlow()||retryTargets().includes(q.n)))cls+=(isRetryFlow()?learningState.retryAnswers[q.n]:learningState.answers[q.n])===q.answer?" correct":" wrong";
    if(learningState.understood.has(q.n))cls+=" done";
    return `<a href="#q${q.n}" class="${cls}">${q.n}</a>`;
  }).join("");
}
function updateLearningHeader(){
  const targets=retryTargets();
  const count=isReview()?learningState.understood.size:isRetry()?retryAnsweredCount():answeredCount();
  qs("#progressText").textContent=isReview()?`理解 ${count} / 60`:isRetry()?`再挑戦 ${count} / ${targets.length}`:`試験 ${count} / 60`;
  qs("#progressBar").style.width=`${count/(isRetry()?Math.max(targets.length,1):60)*100}%`;
}
function makeFirstReport(){
  const fields={};
  QUESTIONS.forEach(q=>{
    if(!fields[q.field])fields[q.field]={correct:0,total:0};
    fields[q.field].total++;
    if(learningState.answers[q.n]===q.answer)fields[q.field].correct++;
  });
  return {gradedAt:new Date().toISOString(),score:score(),fields,wrong:QUESTIONS.filter(q=>learningState.answers[q.n]!==q.answer).map(q=>q.n)};
}
function ensureFirstReport(){
  if(!localStorage.getItem(STORAGE.report))localStorage.setItem(STORAGE.report,JSON.stringify(makeFirstReport()));
}
function formatDate(date){
  return new Intl.DateTimeFormat("ja-JP",{year:"numeric",month:"long",day:"numeric",weekday:"short"}).format(date);
}
function renderFirstReport(){
  const report=JSON.parse(localStorage.getItem(STORAGE.report));if(!report)return;
  qs("#learningReport").hidden=false;
  const graded=new Date(report.gradedAt),retest=new Date(graded);retest.setDate(retest.getDate()+7);
  qs("#reportDate").textContent=`初回採点日：${formatDate(graded)}　総合正答率：${Math.round(report.score/60*100)}%（${report.score}/60問）`;
  const entries=Object.entries(report.fields).map(([field,v])=>({field,...v,rate:Math.round(v.correct/v.total*100)}));
  qs("#fieldStats").innerHTML=entries.map(x=>`<div><span>${x.field}</span><div><i style="width:${x.rate}%"></i></div><b>${x.rate}%</b><small>${x.correct}/${x.total}</small></div>`).join("");
  const max=Math.max(...entries.map(x=>x.rate)),min=Math.min(...entries.map(x=>x.rate));
  const strong=entries.filter(x=>x.rate===max).map(x=>x.field).join("・");
  const weak=entries.filter(x=>x.rate===min).map(x=>x.field).join("・");
  qs("#strengthWeakness").innerHTML=`<div class="strength"><b>得意分野</b><strong>${strong}</strong><span>正答率 ${max}%</span></div><div class="weakness"><b>苦手分野</b><strong>${weak}</strong><span>正答率 ${min}%</span></div><p>${min<60?"苦手分野は、正答の根拠を説明できる状態を目指しましょう。":"全分野で60%以上です。間違えた問題の再現性を重点的に確認しましょう。"}</p>`;
  qs("#retestDate").textContent=`推奨再挑戦日：${formatDate(retest)}（初回採点から7日後）`;
  qs("#retestQuestions").innerHTML=report.wrong.length?`${report.wrong.map(n=>`<a href="#q${n}">問${n}</a>`).join("")}<button type="button" id="retryWrongBtn" class="retry-wrong-btn">間違えた問題だけ再挑戦する</button>`:`<span>全問正解でした。60問をもう一度通して定着を確認しましょう。</span>`;
  const retryButton=qs("#retryWrongBtn");
  if(retryButton)retryButton.onclick=startRetry;
  qs("#importantWords").innerHTML=IMPORTANT_WORDS.map(([field,...words])=>`<div><b>${field}</b>${words.map(w=>`<span>${w}</span>`).join("")}</div>`).join("");
}
function startRetry(){
  ensureFirstReport();
  learningState.phase="retry";
  learningState.retryAnswers={};
  saveLearning();
  renderLearning();
  qs("#questions").scrollIntoView({behavior:"smooth",block:"start"});
}
function jumpUnanswered(){
  const q=isRetry()?QUESTIONS.find(x=>retryTargets().includes(x.n)&&!learningState.retryAnswers[x.n]):QUESTIONS.find(x=>!learningState.answers[x.n]);
  if(q)document.querySelector(`#q${q.n}`)?.scrollIntoView({behavior:"smooth",block:"start"});
}
function resetLearning(){
  if(confirm("解答・採点結果・理解チェックをすべて消して最初からやり直しますか？")){
    Object.values(STORAGE).forEach(k=>localStorage.removeItem(k));
    ["fe-phase","fe-answers","fe-done","fe-first-report"].forEach(k=>localStorage.removeItem(k));
    location.reload();
  }
}
function initLearning(){
  qs("#filters").innerHTML=reviewFields.map((f,i)=>`<button type="button" data-field="${f}" class="${i===0?"active":""}">${f}</button>`).join("");
  qs("#filters").onclick=e=>{if(!e.target.dataset.field)return;learningState.filter=e.target.dataset.field;document.querySelectorAll("#filters button").forEach(b=>b.classList.toggle("active",b===e.target));renderLearning()};
  qs("#searchInput").oninput=e=>{learningState.query=e.target.value.replace(/^問/,"");renderLearning()};
  qs("#onlyUnlearned").onchange=e=>{learningState.onlyUnlearned=e.target.checked;renderLearning()};
  document.querySelectorAll('[data-action="unanswered"]').forEach(button=>button.onclick=jumpUnanswered);
  document.querySelectorAll('[data-action="submit"]').forEach(button=>button.onclick=()=>{
    const title=qs("#confirmDialog h2"),text=qs("#confirmDialog p"),confirm=qs("#confirmSubmit");
    if(isRetry()){
      title.textContent="再挑戦を採点しますか？";
      text.textContent="採点後は解説と正答を表示します。もう一度考える場合は戻って回答を変更できます。";
      confirm.textContent="再挑戦を採点する";
    }else{
      title.textContent="60問を採点しますか？";
      text.textContent="採点後は解答を変更できません。解説と理解チェックが表示されます。";
      confirm.textContent="採点する";
    }
    qs("#confirmDialog").showModal();
  });
  document.querySelectorAll('[data-action="reset"]').forEach(button=>button.onclick=resetLearning);
  qs("#cancelSubmit").onclick=()=>qs("#confirmDialog").close();
  qs("#confirmSubmit").onclick=()=>{
    learningState.phase=isRetry()?"retryReview":"review";saveLearning();ensureFirstReport();
    qs("#confirmDialog").close();renderLearning();
    qs("#resultsTop").scrollIntoView({behavior:"smooth",block:"start"});
  };
  renderLearning();
}
initLearning();
