const TERM_STORAGE_KEY="tokurei-fe-20260614-term-progress";
const termState={
  filter:"すべて",
  query:"",
  active:0,
  flipped:false,
  progress:JSON.parse(localStorage.getItem(TERM_STORAGE_KEY)||"{}")
};
const termFields=["すべて",...new Set(TERMS.map(t=>t.field))];
const termStatusLabel={known:"覚えた",shaky:"あやしい",weak:"覚えていない"};
const termStatusClass={known:"known",shaky:"shaky",weak:"weak"};
const termStatusRank={weak:0,shaky:1,known:2};
const termEsc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const termRegexEsc=s=>String(s).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");

function maskedMeaning(term){
  let text=term.meaning;
  const masks=[
    term.term,
    term.term.replace(/[・･].*$/,""),
    ...(term.tags||[]).filter(tag=>tag!==term.field)
  ].filter(Boolean).sort((a,b)=>b.length-a.length);
  [...new Set(masks)].forEach(word=>{
    if(word.length<2)return;
    text=text.replace(new RegExp(termRegexEsc(word),"g"),"【　　　】");
  });
  return text;
}

function saveTermProgress(){
  localStorage.setItem(TERM_STORAGE_KEY,JSON.stringify(termState.progress));
}
function termStatus(term){
  return termState.progress[term.id]?.status||"";
}
function termAnswered(term){
  return !!termStatus(term);
}
function filteredTerms(){
  return TERMS.slice().sort((a,b)=>{
    const as=termStatus(a),bs=termStatus(b);
    if(as!==bs)return (termStatusRank[as]??-1)-(termStatusRank[bs]??-1);
    return a.q-b.q;
  });
}
function weakTermsFromAnswers(){
  const answers=JSON.parse(localStorage.getItem("tokurei-fe-20260614-answers")||"{}");
  if(typeof QUESTIONS==="undefined")return [];
  return TERMS.filter(t=>{
    const q=QUESTIONS.find(x=>x.n===t.q);
    return q&&answers[t.q]&&answers[t.q]!==q.answer;
  });
}
function setActiveTerm(index){
  const list=filteredTerms();
  termState.active=Math.max(0,Math.min(index,list.length-1));
  termState.flipped=false;
  renderTerms();
}
function jumpToTerm(termId){
  const target=TERMS.find(t=>t.id===termId);
  if(!target)return;
  const index=filteredTerms().findIndex(t=>t.id===termId);
  setActiveTerm(index<0?0:index);
}
function markTerm(status){
  const list=filteredTerms();
  const term=list[termState.active];
  if(!term)return;
  termState.progress[term.id]={status,updatedAt:new Date().toISOString()};
  saveTermProgress();
  const next=Math.min(termState.active+1,Math.max(0,list.length-1));
  termState.active=next;
  termState.flipped=false;
  renderTerms();
}
function renderTerms(){
  const section=document.querySelector("#termLearning");
  if(!section)return;
  const list=filteredTerms();
  if(termState.active>=list.length)termState.active=0;
  const active=list[termState.active];
  const known=TERMS.filter(t=>termStatus(t)==="known").length;
  const shaky=TERMS.filter(t=>termStatus(t)==="shaky").length;
  const weak=TERMS.filter(t=>termStatus(t)==="weak").length;
  const wrongWeak=weakTermsFromAnswers();
  document.querySelector("#termStats").innerHTML=[
    ["全用語",TERMS.length],
    ["覚えた",known],
    ["あやしい",shaky],
    ["覚えていない",weak]
  ].map(([label,value])=>`<div><strong>${value}</strong><span>${label}</span></div>`).join("");
  const filters=document.querySelector("#termFilters");
  if(filters)filters.innerHTML="";
  const card=document.querySelector("#termCard");
  if(!active){
    card.innerHTML=`<p class="term-empty">条件に一致する用語がありません。</p>`;
  }else{
    const status=termStatus(active);
    card.className=`term-card ${termState.flipped?"flipped":""} ${termStatusClass[status]||""}`;
    card.innerHTML=`
      <div class="term-card-top">
        <span>${termEsc(active.field)}</span>
        <a href="#q${active.q}">問${active.q}</a>
      </div>
      <button class="term-flip" type="button" aria-expanded="${termState.flipped}">
        <span class="term-face front">
          <small>この説明に当てはまる重要用語は？</small>
          <strong class="term-question">${termEsc(maskedMeaning(active))}</strong>
          <em>クリックして答えを見る</em>
        </span>
        <span class="term-face back">
          <small>重要用語</small>
          <strong>${termEsc(active.term)}</strong>
          <b>${termEsc(active.cue)}</b>
          <p>${termEsc(active.meaning)}</p>
          <i>${termEsc(active.trap)}</i>
        </span>
      </button>
      <div class="term-tags">${active.tags.map(tag=>`<span>${termEsc(tag)}</span>`).join("")}</div>
      <div class="term-grade">
        <button type="button" data-term-status="known">覚えた</button>
        <button type="button" data-term-status="shaky">あやしい</button>
        <button type="button" data-term-status="weak">覚えていない</button>
      </div>
      ${status?`<p class="term-current">現在：${termStatusLabel[status]}</p>`:""}
    `;
  }
  const termList=document.querySelector("#termList");
  if(termList)termList.innerHTML=list.map((t,i)=>{
    const status=termStatus(t);
    return `<button type="button" class="${i===termState.active?"active":""} ${termStatusClass[status]||""}" data-term-index="${i}">
      <b>${termEsc(t.term)}</b><span>問${t.q}</span>
    </button>`;
  }).join("");
  document.querySelector("#termWeakLinks").innerHTML=wrongWeak.length
    ?wrongWeak.map(t=>`<a href="#termLearning" data-term-jump="${t.id}">${termEsc(t.term)}<span>問${t.q}</span></a>`).join("")
    :`<span>採点後に間違えた問題の用語がここに出ます。</span>`;
  document.querySelector("#termPosition").textContent=list.length?`${termState.active+1} / ${list.length}`:"0 / 0";
}
function initTerms(){
  const section=document.querySelector("#termLearning");
  if(!section)return;
  document.querySelector("#termCard").onclick=e=>{
    if(e.target.closest("[data-term-status]")){
      markTerm(e.target.closest("[data-term-status]").dataset.termStatus);
      return;
    }
    if(e.target.closest(".term-flip")){
      termState.flipped=!termState.flipped;
      renderTerms();
    }
  };
  const termList=document.querySelector("#termList");
  if(termList)termList.onclick=e=>{
    const button=e.target.closest("[data-term-index]");
    if(button)setActiveTerm(Number(button.dataset.termIndex));
  };
  document.querySelector("#termWeakLinks").onclick=e=>{
    const link=e.target.closest("[data-term-jump]");
    if(!link)return;
    jumpToTerm(link.dataset.termJump);
  };
  document.addEventListener("click",e=>{
    const link=e.target.closest("[data-term-ref]");
    if(!link)return;
    jumpToTerm(link.dataset.termRef);
  });
  document.querySelector("#termPrev").onclick=()=>setActiveTerm(termState.active-1);
  document.querySelector("#termNext").onclick=()=>setActiveTerm(termState.active+1);
  document.querySelector("#termReset").onclick=()=>{
    if(confirm("用語カードの覚えた/あやしい/覚えていないの記録を消しますか？")){
      termState.progress={};
      saveTermProgress();
      renderTerms();
    }
  };
  renderTerms();
}
initTerms();
