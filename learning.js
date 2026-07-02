const qs=s=>document.querySelector(s);
const STORAGE_PREFIX="tokurei-fe-20260614";
const STORAGE={
  phase:`${STORAGE_PREFIX}-phase`,
  answers:`${STORAGE_PREFIX}-answers`,
  done:`${STORAGE_PREFIX}-done`,
  report:`${STORAGE_PREFIX}-first-report`,
  retryAnswers:`${STORAGE_PREFIX}-retry-answers`,
  retryChecked:`${STORAGE_PREFIX}-retry-checked`,
  revealed:`${STORAGE_PREFIX}-revealed`
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
  retryChecked:JSON.parse(localStorage.getItem(STORAGE.retryChecked)||"{}"),
  revealed:new Set(JSON.parse(localStorage.getItem(STORAGE.revealed)||"[]")),
  understood:new Set(JSON.parse(localStorage.getItem(STORAGE.done)||"[]")),
  filter:"すべて",
  query:"",
  onlyUnlearned:false
};
if(learningState.phase==="retry"||learningState.phase==="retryReview")learningState.phase="review";

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
  localStorage.setItem(STORAGE.retryChecked,JSON.stringify(learningState.retryChecked));
  localStorage.setItem(STORAGE.revealed,JSON.stringify([...learningState.revealed]));
  localStorage.setItem(STORAGE.done,JSON.stringify([...learningState.understood]));
};
const answeredCount=()=>Object.keys(learningState.answers).length;
const firstScore=()=>QUESTIONS.filter(q=>learningState.answers[q.n]===q.answer).length;
const isReview=()=>learningState.phase==="review";
const currentAnswer=q=>learningState.retryAnswers[q.n]||learningState.answers[q.n];
const wasWrong=q=>learningState.answers[q.n]!==q.answer;
const retryCheckedAnswer=q=>learningState.retryChecked[q.n];
const retryCheckedCorrect=q=>retryCheckedAnswer(q)===q.answer;
const retryWasChecked=q=>Object.prototype.hasOwnProperty.call(learningState.retryChecked,q.n);
const needsRetry=q=>isReview()&&wasWrong(q)&&!retryCheckedCorrect(q);
const retryAnswerCount=()=>QUESTIONS.filter(q=>wasWrong(q)&&learningState.retryAnswers[q.n]).length;
const retryCheckedCorrectCount=()=>QUESTIONS.filter(q=>wasWrong(q)&&retryCheckedCorrect(q)).length;

function visible(q){
  if(!isReview())return true;
  const text=`${q.n} ${q.title} ${q.field} ${q.answerText} ${q.summary} ${q.reasoning.join(" ")}`.toLowerCase();
  return (learningState.filter==="すべて"||q.field===learningState.filter)&&
    (!learningState.query||text.includes(learningState.query.toLowerCase()))&&
    (!learningState.onlyUnlearned||!learningState.understood.has(q.n));
}

function renderLearning(){
  document.body.classList.toggle("review-mode",isReview());
  const root=qs("#questions");
  root.innerHTML="";
  QUESTIONS.forEach(q=>{
    if(!visible(q))return;
    const node=qs("#questionTemplate").content.firstElementChild.cloneNode(true);
    node.id=`q${q.n}`;
    if(learningState.understood.has(q.n))node.classList.add("understood");
    if(needsRetry(q))node.classList.add("retrying");
    if(learningState.revealed.has(q.n))node.classList.add("explanation-open");
    node.querySelector(".number").textContent=`Q${String(q.n).padStart(2,"0")}`;
    node.querySelector(".meta").textContent=q.field;
    node.querySelector("h2").textContent=q.title;
    const revealButton=document.createElement("button");
    revealButton.type="button";
    revealButton.className="explain-toggle";
    revealButton.setAttribute("aria-expanded",learningState.revealed.has(q.n)?"true":"false");
    revealButton.textContent=learningState.revealed.has(q.n)?"解説を閉じる":"解説表示";
    revealButton.onclick=()=>{
      learningState.revealed.has(q.n)?learningState.revealed.delete(q.n):learningState.revealed.add(q.n);
      saveLearning();
      renderLearning();
      document.querySelector(`#q${q.n}`)?.scrollIntoView({block:"center"});
    };
    node.querySelector(".answer-input").after(revealButton);
    const image=node.querySelector(".problem-panel img");
    image.src=`assets/questions/q${String(q.n).padStart(2,"0")}.png`;
    image.alt=`問${q.n}の問題文`;

    node.querySelectorAll(".answer-input input").forEach(input=>{
      input.name=`answer-${q.n}`;
      input.checked=currentAnswer(q)===input.value;
      input.onchange=()=>{
        if(isReview()){
          learningState.retryAnswers[q.n]=input.value;
          delete learningState.retryChecked[q.n];
          saveLearning();
          renderLearning();
          document.querySelector(`#q${q.n}`)?.scrollIntoView({block:"center"});
          return;
        }
        learningState.answers[q.n]=input.value;
        saveLearning();
        updateLearningHeader();
        renderLearningMap();
        updatePhasePanel();
      };
    });

    if(isReview()){
      const line=node.querySelector(".result-line");
      if(wasWrong(q)){
        if(retryWasChecked(q)){
          const ok=retryCheckedCorrect(q);
          line.className=`result-line ${ok?"correct":"wrong"}`;
          line.textContent=ok
            ?`再回答は正解です。解説を確認してください。`
            :`再回答は不正解でした。もう一度考えて選び直してください。`;
        }else{
          line.className="result-line wrong";
          line.textContent=learningState.retryAnswers[q.n]
            ?`初回は不正解でした。再回答を記録しました。正誤はまだ表示していません。「再回答を採点する」を押してください。`
            :`初回は不正解でした。正答と解説は隠しています。もう一度選択肢を選んでください。`;
        }
      }else{
        line.className="result-line correct";
        line.textContent=`正解：あなたの回答 ${learningState.answers[q.n]}`;
      }
    }

    node.querySelector(".answer-strip strong").textContent=q.answer;
    node.querySelector(".answer-strip p").textContent=q.answerText;
    node.querySelector(".answer-strip").hidden=!isReview();
    node.querySelector(".summary").textContent=q.summary;
    node.querySelector(".reasoning").innerHTML=q.reasoning.map(x=>`<li>${x}</li>`).join("");
    node.querySelector(".trap p").textContent=q.trap;
    node.querySelector(".diagram").innerHTML=window.renderRichVisual(q);
    node.querySelector("figcaption").textContent=q.caption;
    const check=node.querySelector(".understand-check input");
    check.checked=learningState.understood.has(q.n);
    check.onchange=()=>{
      check.checked?learningState.understood.add(q.n):learningState.understood.delete(q.n);
      saveLearning();
      renderLearning();
      document.querySelector(`#q${q.n}`)?.scrollIntoView({block:"center"});
    };
    root.appendChild(node);
  });
  qs("#emptyState").hidden=!!root.children.length;
  updatePhasePanel();
  renderLearningMap();
  updateLearningHeader();
}

function updatePhasePanel(){
  const complete=learningState.understood.size===60;
  const unresolved=QUESTIONS.filter(needsRetry).length;
  const retryAnswers=retryAnswerCount();
  const retryCorrect=retryCheckedCorrectCount();
  const totalCorrect=firstScore()+retryCorrect;
  qs("#reviewToolbar").hidden=!isReview();
  document.querySelectorAll("[data-exam-controls]").forEach(el=>el.hidden=isReview());
  qs("#listTitle").textContent=isReview()?"採点結果と解説":"試験問題";
  qs("#phaseMessage").textContent=isReview()
    ?`採点済みです。初回に間違えた問題は選択肢を押して再回答できます。正誤は「再回答を採点する」を押した時だけ表示します。（未解決 ${unresolved}問）`
    :`${answeredCount()}問回答済み。迷った問題は「解説表示」を開いて確認してから、改めて回答できます。60問すべて回答すると採点できます。`;
  document.querySelectorAll(".retry-grade-area").forEach(area=>{
    area.hidden=!isReview()||QUESTIONS.every(q=>!wasWrong(q));
  });
  document.querySelectorAll('[data-action="retry-grade"]').forEach(button=>{
    button.disabled=retryAnswers===0;
  });
  document.querySelectorAll('[data-action="submit"]').forEach(button=>{
    button.textContent="60問を採点する";
    button.disabled=answeredCount()!==60;
  });
  document.querySelectorAll("[data-exam-message]").forEach(message=>{
    message.textContent=answeredCount()===60?"全60問に回答しました。採点できます。":`現在 ${answeredCount()} / 60問回答済みです。`;
  });
  const summary=qs("#scoreSummary");
  summary.hidden=!isReview();
  qs("#answerLegend").hidden=!isReview();
  if(isReview()){
    summary.innerHTML=`<div><strong>${totalCorrect}</strong><span>正解</span></div><div><strong>${60-totalCorrect}</strong><span>不正解</span></div><div><strong>${retryCorrect}</strong><span>再回答での正解</span></div><div><strong>${learningState.understood.size}</strong><span>理解済み</span></div>`;
  }
  document.querySelectorAll("#phaseSteps [data-step]").forEach(el=>{
    el.classList.remove("active","finished");
    const step=el.dataset.step;
    if(!isReview()&&step==="exam")el.classList.add("active");
    if(isReview()&&(step==="exam"||step==="score"))el.classList.add("finished");
    if(isReview()&&!complete&&step==="review")el.classList.add("active");
    if(complete&&step!=="complete")el.classList.add("finished");
    if(complete&&step==="complete")el.classList.add("active");
  });
  if(complete)qs("#phaseMessage").innerHTML=`<div class="completion"><strong>学習完了！</strong>60問すべての理解チェックが付きました。</div>`;
  if(isReview()){
    ensureFirstReport();
    renderFirstReport();
  }else{
    qs("#learningReport").hidden=true;
  }
}

function renderLearningMap(){
  qs("#questionMap").innerHTML=QUESTIONS.map(q=>{
    let cls="";
    if(!isReview()&&learningState.answers[q.n])cls="answered";
    if(isReview())cls=wasWrong(q)?(retryCheckedCorrect(q)?"correct":"wrong"):"correct";
    if(learningState.understood.has(q.n))cls+=" done";
    return `<a href="#q${q.n}" class="${cls}">${q.n}</a>`;
  }).join("");
}

function updateLearningHeader(){
  const count=isReview()?learningState.understood.size:answeredCount();
  qs("#progressText").textContent=isReview()?`理解 ${count} / 60`:`試験 ${count} / 60`;
  qs("#progressBar").style.width=`${count/60*100}%`;
}

function makeFirstReport(){
  const fields={};
  QUESTIONS.forEach(q=>{
    if(!fields[q.field])fields[q.field]={correct:0,total:0};
    fields[q.field].total++;
    if(learningState.answers[q.n]===q.answer)fields[q.field].correct++;
  });
  return {
    gradedAt:new Date().toISOString(),
    score:firstScore(),
    fields,
    wrong:QUESTIONS.filter(q=>learningState.answers[q.n]!==q.answer).map(q=>q.n)
  };
}
function ensureFirstReport(){
  if(!localStorage.getItem(STORAGE.report))localStorage.setItem(STORAGE.report,JSON.stringify(makeFirstReport()));
}
function formatDate(date){
  return new Intl.DateTimeFormat("ja-JP",{year:"numeric",month:"long",day:"numeric",weekday:"short"}).format(date);
}
function renderFirstReport(){
  const report=JSON.parse(localStorage.getItem(STORAGE.report));
  if(!report)return;
  qs("#learningReport").hidden=false;
  const graded=new Date(report.gradedAt),retest=new Date(graded);
  retest.setDate(retest.getDate()+7);
  qs("#reportDate").textContent=`初回採点日：${formatDate(graded)}　総合正答率：${Math.round(report.score/60*100)}%（${report.score}/60問）`;
  const entries=Object.entries(report.fields).map(([field,v])=>({field,...v,rate:Math.round(v.correct/v.total*100)}));
  qs("#fieldStats").innerHTML=entries.map(x=>`<div><span>${x.field}</span><div><i style="width:${x.rate}%"></i></div><b>${x.rate}%</b><small>${x.correct}/${x.total}</small></div>`).join("");
  const max=Math.max(...entries.map(x=>x.rate)),min=Math.min(...entries.map(x=>x.rate));
  const strong=entries.filter(x=>x.rate===max).map(x=>x.field).join("・");
  const weak=entries.filter(x=>x.rate===min).map(x=>x.field).join("・");
  qs("#strengthWeakness").innerHTML=`<div class="strength"><b>得意分野</b><strong>${strong}</strong><span>正答率 ${max}%</span></div><div class="weakness"><b>苦手分野</b><strong>${weak}</strong><span>正答率 ${min}%</span></div><p>${min<60?"苦手分野は、正答の根拠を説明できる状態を目指しましょう。":"全分野で60%以上です。間違えた問題の再現性を重点的に確認しましょう。"}</p>`;
  qs("#retestDate").textContent=`推奨再挑戦日：${formatDate(retest)}（初回採点から7日後）`;
  qs("#retestQuestions").innerHTML=report.wrong.length
    ?report.wrong.map(n=>`<a href="#q${n}">問${n}</a>`).join("")
    :`<span>全問正解でした。60問をもう一度通して定着を確認しましょう。</span>`;
  const groupedTerms=TERMS.reduce((acc,t)=>{
    if(!acc[t.field])acc[t.field]=[];
    acc[t.field].push(t);
    return acc;
  },{});
  qs("#importantWords").innerHTML=Object.entries(groupedTerms).map(([field,terms])=>`<div><b>${field}</b>${terms.map(t=>`<a href="#termLearning" data-term-ref="${t.id}">${t.term}</a>`).join("")}</div>`).join("");
}

function jumpUnanswered(){
  const q=QUESTIONS.find(x=>!learningState.answers[x.n]);
  if(q)document.querySelector(`#q${q.n}`)?.scrollIntoView({behavior:"smooth",block:"start"});
}
function gradeRetryAnswers(){
  QUESTIONS.forEach(q=>{
    if(wasWrong(q)&&learningState.retryAnswers[q.n]){
      learningState.retryChecked[q.n]=learningState.retryAnswers[q.n];
    }
  });
  saveLearning();
  renderLearning();
  qs("#resultsTop").scrollIntoView({behavior:"smooth",block:"start"});
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
  qs("#filters").onclick=e=>{
    if(!e.target.dataset.field)return;
    learningState.filter=e.target.dataset.field;
    document.querySelectorAll("#filters button").forEach(b=>b.classList.toggle("active",b===e.target));
    renderLearning();
  };
  const searchInput=qs("#searchInput");
  if(searchInput)searchInput.oninput=e=>{learningState.query=e.target.value.replace(/^問/,"");renderLearning()};
  qs("#onlyUnlearned").onchange=e=>{learningState.onlyUnlearned=e.target.checked;renderLearning()};
  document.querySelectorAll('[data-action="retry-grade"]').forEach(button=>button.onclick=gradeRetryAnswers);
  document.querySelectorAll('[data-action="unanswered"]').forEach(button=>button.onclick=jumpUnanswered);
  document.querySelectorAll('[data-action="submit"]').forEach(button=>button.onclick=()=>qs("#confirmDialog").showModal());
  document.querySelectorAll('[data-action="reset"]').forEach(button=>button.onclick=resetLearning);
  qs("#cancelSubmit").onclick=()=>qs("#confirmDialog").close();
  qs("#confirmSubmit").onclick=()=>{
    learningState.phase="review";
    learningState.retryAnswers={};
    learningState.retryChecked={};
    learningState.filter="すべて";
    learningState.query="";
    learningState.onlyUnlearned=false;
    saveLearning();
    ensureFirstReport();
    qs("#confirmDialog").close();
    renderLearning();
    qs("#resultsTop").scrollIntoView({behavior:"smooth",block:"start"});
  };
  renderLearning();
}
initLearning();
