const DEMO = {
  crypto: {
    BTC:{name:"Bitcoin",price:104520,change:2.4,history:[101,103,100,104,102,105,104,106,105,108,107,109,108,110]},
    ETH:{name:"Ethereum",price:3420,change:1.1,history:[3.1,3.0,3.15,3.08,3.2,3.25,3.18,3.3,3.28,3.36,3.4,3.38,3.42]},
    SOL:{name:"Solana",price:185,change:4.8,history:[160,164,158,170,166,175,171,180,177,183,179,188,185]}
  },
  stock: {
    NVDA:{name:"NVIDIA",price:178.42,change:2.1,history:[165,168,164,170,172,169,175,173,178,176,181,179,177,178]},
    TSLA:{name:"Tesla",price:342.15,change:-0.8,history:[350,346,351,344,348,355,349,345,347,341,344,340,343,342]},
    MSFT:{name:"Microsoft",price:512.30,change:.4,history:[498,501,505,502,507,509,506,511,508,514,510,513,511,512]}
  }
};

const defaultWatch = [
  {symbol:"BTC",type:"crypto",min:95000,max:110000},
  {symbol:"ETH",type:"crypto",min:3000,max:3800},
  {symbol:"SOL",type:"crypto",min:150,max:210},
  {symbol:"NVDA",type:"stock",min:155,max:190},
  {symbol:"TSLA",type:"stock",min:300,max:390}
];

const DEMO_NEWS = [
  {asset:"NVDA",impact:"FORT",direction:"buy",title:"L'IA reste un moteur majeur pour le secteur des semi-conducteurs",text:"Information favorable à surveiller.",sentiment:1},
  {asset:"TSLA",impact:"MOYEN",direction:"neutral",title:"Automobile : annonces produits et production à surveiller",text:"Les annonces de nouveaux véhicules peuvent provoquer une volatilité importante.",sentiment:0},
  {asset:"BTC",impact:"FORT",direction:"buy",title:"Crypto : le marché reste sensible aux annonces macroéconomiques",text:"Surveille les taux, la liquidité et les flux institutionnels.",sentiment:1},
  {asset:"ETH",impact:"MOYEN",direction:"neutral",title:"Ethereum : activité réseau et écosystème à suivre",text:"Indicateurs de démonstration pour la V1.",sentiment:0}
];

const DEMO_EVENTS = [
  {date:"12 août",asset:"NVDA",title:"Événement technologique / actualité produit",kind:"Technologie",impact:"FORT",direction:"buy"},
  {date:"18 août",asset:"TSLA",title:"Annonce automobile à surveiller",kind:"Automobile",impact:"FORT",direction:"neutral"},
  {date:"22 août",asset:"BTC",title:"Échéance / événement macro à surveiller",kind:"Crypto",impact:"MOYEN",direction:"neutral"},
  {date:"28 août",asset:"TSLA",title:"Actualité potentielle autour d'un nouveau véhicule",kind:"Automobile",impact:"FORT",direction:"buy"},
  {date:"3 sept.",asset:"ETH",title:"Événement écosystème crypto",kind:"Crypto",impact:"MOYEN",direction:"buy"}
];

let watch = JSON.parse(localStorage.getItem("mw_watch") || "null") || defaultWatch;
let settings = JSON.parse(localStorage.getItem("mw_settings") || "{}");
let data = structuredClone(DEMO);


const FINNHUB_API_KEY = window.MARKET_WATCH_FINNHUB_KEY || "";
const FINNHUB_BASE = "https://finnhub.io/api/v1";
let realDataEnabled = false;
let realDataError = "";

function realSymbol(a){
  if(a.type==="crypto"){
    return a.symbol==="BTC"?"BINANCE:BTCUSDT":
           a.symbol==="ETH"?"BINANCE:ETHUSDT":
           a.symbol==="SOL"?"BINANCE:SOLUSDT":a.symbol;
  }
  return a.symbol;
}

async function finnhub(path, params={}){
  const u=new URL(FINNHUB_BASE+path);
  Object.entries(params).forEach(([k,v])=>u.searchParams.set(k,v));
  u.searchParams.set("token",FINNHUB_API_KEY);
  const r=await fetch(u.toString(),{cache:"no-store"});
  if(!r.ok) throw new Error(`Finnhub HTTP ${r.status}`);
  const data=await r.json();
  if(data?.error) throw new Error(data.error);
  return data;
}

function applyRealQuote(a,q){
  if(!q || typeof q.c!=="number" || !q.c) return false;
  a.price=q.c;
  a.change=typeof q.dp==="number" ? q.dp : 0;
  if(!Array.isArray(a.history)) a.history=[];
  a.history=[...a.history.slice(-13),a.price];
  return true;
}

async function refreshRealData(){
  if(!FINNHUB_API_KEY){
    realDataEnabled=false;
    realDataError="Clé Finnhub absente";
    updateDataStatus();
    return false;
  }
  try{
    let ok=0;
    for(const a of watch){
      const q=await finnhub("/quote",{symbol:realSymbol(a)});
      if(applyRealQuote(a,q)) ok++;
    }
    if(ok===0) throw new Error("Aucun cours réel reçu");
    realDataEnabled=true;
    realDataError="";
    renderDashboard();
    renderWatchlist();
    applyScoreColors();
    updateDataStatus();
    return true;
  }catch(e){
    realDataEnabled=false;
    realDataError=e.message;
    updateDataStatus();
    return false;
  }
}

function updateDataStatus(){
  const u=document.querySelector("#updated");
  if(!u) return;
  if(realDataEnabled){
    u.textContent="🟢 DONNÉES RÉELLES · FINNHUB · "+new Date().toLocaleTimeString("fr-FR");
    u.classList.add("real-status");
    u.classList.remove("demo-status");
  }else{
    u.textContent="🟠 DÉMO · FINNHUB INDISPONIBLE";
    u.classList.add("demo-status");
    u.classList.remove("real-status");
  }
}

function realSymbol(a){
  if(a.type==="crypto") return a.symbol==="BTC"?"BINANCE:BTCUSDT":a.symbol==="ETH"?"BINANCE:ETHUSDT":a.symbol==="SOL"?"BINANCE:SOLUSDT":a.symbol;
  return a.symbol;
}
function applyRealQuote(a,q){
  if(!q || typeof q.c!=="number" || !q.c) return false;
  const old=a.price;
  a.price=q.c;
  a.change=typeof q.dp==="number" ? q.dp : (old ? ((q.c-old)/old*100) : 0);
  if(!Array.isArray(a.history)) a.history=[];
  a.history=[...a.history.slice(-13),a.price];
  return true;
}
async function refreshRealData(){
  try{
    const r=await fetch(`${API_BASE}/market`,{cache:"no-store"});
    if(!r.ok) throw new Error(`API ${r.status}`);
    const data=await r.json();
    for(const a of watch){
      const key=realSymbol(a);
      const q=(a.type==="crypto"?data.crypto[key]:data.stocks[key]);
      if(applyRealQuote(a,q)) realDataEnabled=true;
    }
    realDataError="";
    renderDashboard();
    renderWatchlist();
    applyScoreColors();
    const u=document.querySelector("#updated");
    if(u) u.textContent="Données réelles • Finnhub • "+new Date().toLocaleTimeString("fr-FR");
  }catch(e){
    realDataError=e.message;
    const u=document.querySelector("#updated");
    if(u) u.textContent="Données de démonstration • API réelle indisponible";
  }
}

function save(){localStorage.setItem("mw_watch",JSON.stringify(watch))}
function money(v,type){return type==="crypto" ? new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:v<10?2:0}).format(v) : "$"+v.toFixed(2)}
function esc(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function assetInfo(a){return data[a.type]?.[a.symbol] || {name:a.symbol,price:0,change:0,history:[0,1,0,1,0,1]}}
function zone(a){
  const p=assetInfo(a).price;
  if(p<a.min)return {label:"Sous ton mini",cls:"red",state:"below"};
  if(p>a.max)return {label:"Au-dessus du maxi",cls:"green",state:"above"};
  return {label:"Dans ta zone",cls:"none",state:"inside"};
}
function updateThreshold(i, field, value){
  const n = Number(value);
  if(!Number.isFinite(n)) return;
  watch[i][field] = n;
  if(field==="min" && watch[i].max < n) watch[i].max = n;
  if(field==="max" && watch[i].min > n) watch[i].min = n;
  save();
  renderDashboard();
  renderWatchlist();
  applyScoreColors();
  const active=document.querySelector(".screen.active")?.id;
  if(active==="detail") renderDetail(watch[i].type, watch[i].symbol);
}
function level(score){
  if(score<30) return {label:"Faible intérêt",icon:"🔵",cls:"blue"};
  if(score<50) return {label:"Intérêt modéré",icon:"🟡",cls:"yellow"};
  if(score<70) return {label:"À surveiller",icon:"🟠",cls:"orange"};
  if(score<85) return {label:"Intéressant",icon:"🟢",cls:"green"};
  return {label:"Très fort potentiel",icon:"🔥",cls:"hot"};
}
function score(a){ return analysis(a).buy.score; }
function analysis(a){
  const x=assetInfo(a), p=x.price, range=Math.max(a.max-a.min,0.000001);
  const pos=Math.max(0,Math.min(1,(p-a.min)/range));
  const midpoint=(a.min+a.max)/2;

  // 50% = reference price / user's position.
  // At exactly 50%, BUY and SELL are both 0.
  // Below 50%, only BUY gets a price score.
  // Above 50%, only SELL gets a price score.
  const buyBase=Math.round(Math.max(0,(0.5-pos)/0.5)*100);
  const sellBase=Math.round(Math.max(0,(pos-0.5)/0.5)*100);

  const news=DEMO_NEWS.filter(n=>n.asset===a.symbol);
  const events=DEMO_EVENTS.filter(e=>e.asset===a.symbol);
  const sentiment=news.reduce((v,n)=>v+(n.sentiment||0),0);

  // Contextual factors modulate the opportunity, but can never create
  // an opportunity on their own. Therefore 50% remains exactly 0/100.
  const buyContext=Math.max(0.75,Math.min(1.15,1+(sentiment*0.06)+(events.some(e=>e.direction==="buy")?0.06:0)));
  const sellContext=Math.max(0.75,Math.min(1.15,1-(sentiment*0.06)+(events.some(e=>e.direction==="sell")?0.06:0)));

  const buy=Math.round(Math.min(100,buyBase*buyContext));
  const sell=Math.round(Math.min(100,sellBase*sellContext));

  const buyZone =
    p<=a.min ? "sous ton minimum" :
    pos<.25 ? "très proche de ton minimum" :
    pos<.5 ? "sous ton point de référence (50 %)" :
    "au-dessus de ton point de référence : pas d'achat";

  const sellZone =
    p>=a.max ? "au-dessus de ton maximum" :
    pos>.75 ? "très proche de ton maximum" :
    pos>.5 ? "au-dessus de ton point de référence (50 %)" :
    "sous ton point de référence : pas de vente";

  const trendText=x.change>1?"positive":x.change< -1?"négative":"stable";

  return {
    reference:midpoint,
    position:pos*100,
    buy:{
      score:buy,level:level(buy),
      reasons:[
        `📍 Prix : ${buyZone}`,
        `🎯 Point de référence : ${money(midpoint,a.type)} (50 % de ta zone)`,
        `📈 Tendance : ${trendText} (${x.change>=0?"+":""}${x.change.toFixed(2)} %)`,
        `📰 Actualités : ${news.length?(sentiment>0?"plutôt favorables":"à surveiller"):"aucune information importante"}`,
        `📅 Événement : ${events.length?"un événement majeur est à surveiller":"aucun événement majeur proche"}`
      ]
    },
    sell:{
      score:sell,level:level(sell),
      reasons:[
        `📍 Prix : ${sellZone}`,
        `🎯 Point de référence : ${money(midpoint,a.type)} (50 % de ta zone)`,
        `📉 Tendance : ${trendText} (${x.change>=0?"+":""}${x.change.toFixed(2)} %)`,
        `📰 Actualités : ${news.length?(sentiment<0?"plutôt défavorables":"peu favorables à une vente"):"aucune information importante"}`,
        `📅 Événement : ${events.length?"un événement majeur est à surveiller":"aucun événement majeur proche"}`
      ]
    },
    news,events
  };
}

function chartSvg(history,large=false){
  const w=large?900:240,h=large?190:58,p=10,min=Math.min(...history),max=Math.max(...history),range=max-min||1;
  const pts=history.map((v,i)=>`${p+i*(w-2*p)/(history.length-1)},${h-p-(v-min)*(h-2*p)/range}`).join(" ");
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="${large?4:3}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
function card(a){
  const index=watch.indexOf(a), x=assetInfo(a), z=zone(a), s=score(a);
  const pct=Math.max(0,Math.min(100,(x.price-a.min)/(a.max-a.min||1)*100));
  const border=z.state==="below" ? "threshold-below" : z.state==="above" ? "threshold-above" : "";
  const status=z.state==="below" ? "🔴 Sous le mini" : z.state==="above" ? "🟢 Au-dessus du maxi" : "Dans ta zone";
  return `<article class="asset-card ${border}" data-detail="${a.type}:${a.symbol}">
    <div class="asset-top">
      <div><span class="ticker">${esc(a.symbol)}</span><div class="name">${esc(x.name)}</div></div>
      <span class="badge ${z.state==="below"?"red":z.state==="above"?"green":"neutral"}">${status}</span>
    </div>
    <div class="asset-price">
      <div><div class="price">${money(x.price,a.type)}</div><span class="${x.change>=0?"positive":"negative"}">${x.change>=0?"+":""}${x.change.toFixed(2)} %</span></div>
      <div class="quick-opportunities" aria-label="Scores achat et vente">
      <span title="Opportunité d'achat"><b class="av-icon score-buy" data-score="${analysis(a).buy.score}" style="${scoreStyle(analysis(a).buy.score)}">Ⓐ</b><strong class="score-number score-buy" data-score="${analysis(a).buy.score}" style="${scoreStyle(analysis(a).buy.score)}">${analysis(a).buy.score}</strong></span>
      <span title="Opportunité de vente"><b class="av-icon score-sell" data-score="${analysis(a).sell.score}" style="${scoreStyle(analysis(a).sell.score)}">Ⓥ</b><strong class="score-number score-sell" data-score="${analysis(a).sell.score}" style="${scoreStyle(analysis(a).sell.score)}">${analysis(a).sell.score}</strong></span>
    </div>
    </div>
    <div class="mini-chart">${chartSvg(x.history)}</div>
    <div class="range"><span>${money(a.min,a.type)}</span><span>${money(a.max,a.type)}</span></div>
    <div class="range-bar"><div class="range-fill" style="width:${pct}%"></div></div>
    
  </article>`;
}
function renderDashboard(){
  const cs=watch.filter(a=>a.type==="crypto"), ss=watch.filter(a=>a.type==="stock");
  document.querySelector("#cryptoCards").innerHTML=cs.length?cs.map(card).join(""):`<p class="muted">Aucune crypto surveillée.</p>`;
  document.querySelector("#stockCards").innerHTML=ss.length?ss.map(card).join(""):`<p class="muted">Aucune action surveillée.</p>`;
  document.querySelector("#alerts").innerHTML="";
  const avg=watch.length?Math.round(watch.reduce((n,a)=>n+score(a),0)/watch.length):0;
  document.querySelector("#marketPulse").textContent=avg+"/100";
  document.querySelector("#watchNow").innerHTML=[...DEMO_NEWS].sort((a,b)=>a.impact==="FORT"?-1:1).slice(0,3).map(newsItem).join("");
  document.querySelector("#updated").textContent=settings.demoMode===false?"Dernière actualisation : "+new Date().toLocaleTimeString("fr-FR"):"Mode démonstration • "+new Date().toLocaleTimeString("fr-FR");
}
  applyScoreColors();

function newsItem(n){return `<article class="news-item"><span class="impact">${n.impact}</span><div class="meta">${esc(n.asset)} · Actualité</div><h3>${esc(n.title)}</h3><p>${esc(n.text)}</p></article>`}
function renderWatchlist(){
  document.querySelector("#watchlistRows").innerHTML=watch.map((a,i)=>{const x=assetInfo(a);return `<div class="watch-row">
    <div><b>${esc(a.symbol)}</b><div class="name">${a.type==="crypto"?"Crypto":"Action"}</div></div>
    <div>${money(x.price,a.type)} <span class="${x.change>=0?"positive":"negative"}">${x.change>=0?"+":""}${x.change}%</span></div>
    <label class="limit"><span class="name">Mini</span><input data-i="${i}" data-field="min" type="number" value="${a.min}"></label>
    <label class="limit"><span class="name">Maxi</span><input data-i="${i}" data-field="max" type="number" value="${a.max}"></label>
    <button class="remove" data-remove="${i}">Suppr.</button>
  </div>`}).join("");
}
  applyScoreColors();

function renderNews(){document.querySelector("#newsList").innerHTML=DEMO_NEWS.map(newsItem).join("")}
function renderEvents(){document.querySelector("#eventList").innerHTML=DEMO_EVENTS.map(e=>`<article class="event"><div class="date-box"><b>${esc(e.date.split(" ")[0])}</b><span>${esc(e.date.split(" ").slice(1).join(" "))}</span></div><div class="event-body"><span class="impact">${esc(e.impact)}</span><div class="meta">${esc(e.asset)} · ${esc(e.kind)}</div><h3>${esc(e.title)}</h3><p>Événement de démonstration — les sources réelles seront branchées via API.</p></div></article>`).join("")}
function renderDetail(type,symbol){
  const a=watch.find(x=>x.type===type&&x.symbol===symbol)||{type,symbol,min:0,max:0};
  const x=assetInfo(a), an=analysis(a), z=zone(a), index=watch.indexOf(a);
  const border=z.state==="below" ? "threshold-below" : z.state==="above" ? "threshold-above" : "";
  const status=z.state==="below" ? "🔴 Sous le mini" : z.state==="above" ? "🟢 Au-dessus du maxi" : "Dans ta zone";
  const root=document.querySelector("#detailContent");
  root.className=`detail-page ${border}`;
  const reasons=arr=>arr.map(r=>`<li>${esc(r)}</li>`).join("");
  const newsHtml=an.news.length?an.news.map(n=>`<article class="news-item"><span class="impact">${esc(n.impact)}</span><div class="meta">${esc(n.asset)} · Actualité</div><h3>${esc(n.title)}</h3><p>${esc(n.text)}</p></article>`).join(""):`<p class="empty-state">📰 Aucune information importante.</p>`;
  const eventsHtml=an.events.length?an.events.map(e=>`<article class="event compact"><div class="date-box"><b>${esc(e.date.split(" ")[0])}</b><span>${esc(e.date.split(" ").slice(1).join(" "))}</span></div><div class="event-body"><span class="impact">${esc(e.impact)}</span><div class="meta">${esc(e.kind)}</div><h3>${esc(e.title)}</h3></div></article>`).join(""):`<p class="empty-state">📅 Aucun événement majeur proche.</p>`;
  root.innerHTML=`
    <div class="detail-head"><div><div class="eyebrow">${type==="crypto"?"CRYPTO":"BOURSE"}</div><h1>${esc(symbol)} · ${esc(x.name)}</h1></div><span class="badge ${z.state==="below"?"red":z.state==="above"?"green":"neutral"}">${status}</span></div>
    <div class="detail-price">${money(x.price,type)} <span class="${x.change>=0?"positive":"negative"}" style="font-size:18px">${x.change>=0?"+":""}${x.change.toFixed(2)} %</span></div>
    <div class="big-chart">${chartSvg(x.history,true)}</div>
    <div class="metrics">
      <div class="metric"><span class="muted">Mini</span><input class="metric-input" type="number" inputmode="decimal" step="any" data-threshold-index="${index}" data-threshold-field="min" value="${a.min}"></div>
      <div class="metric"><span class="muted">Maxi</span><input class="metric-input" type="number" inputmode="decimal" step="any" data-threshold-index="${index}" data-threshold-field="max" value="${a.max}"></div>
      <div class="metric"><span class="muted">Référence 50 %</span><b>${money(an.reference,a.type)}</b></div>
    </div>
    <section class="analysis-section"><div class="section-head"><h2>🧠 Analyse automatique</h2><p class="analysis-explain">🎯 <b>50 % = ton point de référence.</b> À ce niveau, achat et vente sont à 0. Sous 50 %, l'opportunité d'achat augmente ; au-dessus de 50 %, l'opportunité de vente augmente.</p></div>
      <div class="opportunity-grid">
        <article class="opportunity buy"><div class="opp-title">ACHAT</div><div class="opp-score score-number score-buy" data-score="${an.buy.score}" style="${scoreStyle(an.buy.score)}">${an.buy.score}/100</div><div class="opp-level">${an.buy.level.icon} ${an.buy.level.label}</div><ul>${reasons(an.buy.reasons)}</ul></article>
        <article class="opportunity sell"><div class="opp-title">VENTE</div><div class="opp-score score-number score-sell" data-score="${an.sell.score}" style="${scoreStyle(an.sell.score)}">${an.sell.score}/100</div><div class="opp-level">${an.sell.level.icon} ${an.sell.level.label}</div><ul>${reasons(an.sell.reasons)}</ul></article>
      </div>
    </section>
    <section class="analysis-section"><div class="section-head"><h2>📰 Actualités</h2></div>${newsHtml}</section>
    <section class="analysis-section"><div class="section-head"><h2>📅 Événements</h2></div>${eventsHtml}</section>
    <p class="analysis-note">Les scores sont des indicateurs d'analyse et ne constituent pas une recommandation financière.</p>`;
}


function scoreColor(score){
  const v=Math.max(0,Math.min(100,Number(score)||0));
  if(v <= 50){
    const t=v/50;
    return `rgb(255, ${Math.round(70+185*t)}, ${Math.round(80+175*t)})`;
  }
  const t=(v-50)/50;
  return `rgb(${Math.round(255-175*t)}, 255, ${Math.round(255-145*t)})`;
}
function scoreStyle(score){
  return `color:${scoreColor(score)} !important;-webkit-text-fill-color:${scoreColor(score)} !important`;
}

function applyScoreColors(){
  document.querySelectorAll(".score-number[data-score],.av-icon[data-score]").forEach(el=>{
    const style=scoreStyle(el.dataset.score);
    el.setAttribute("style",`${style};${el.getAttribute("style")||""}`);
  });
}
  applyScoreColors();

function show(screen){
  document.querySelectorAll(".screen").forEach(s=>s.classList.toggle("active",s.id===screen));
  document.querySelectorAll(".nav").forEach(n=>n.classList.toggle("active",n.dataset.open===screen));
  if(screen==="dashboard")renderDashboard();
  if(screen==="watchlist")renderWatchlist();
  if(screen==="news")renderNews();
  if(screen==="events")renderEvents();
}


document.addEventListener("click",e=>{
  const open=e.target.closest("[data-open]");
  if(open){show(open.dataset.open);return}
  const detail=e.target.closest("[data-detail]");
  if(detail){
    const [type,symbol]=detail.dataset.detail.split(":");
    show("detail");
    renderDetail(type,symbol);
    applyScoreColors();
    return;
  }
  const rem=e.target.closest("[data-remove]");
  if(rem){watch.splice(+rem.dataset.remove,1);save();renderWatchlist();renderDashboard()}
});

document.addEventListener("change",e=>{
  if(!e.target.matches("[data-threshold-index]")) return;
  const i=+e.target.dataset.thresholdIndex;
  const f=e.target.dataset.thresholdField;
  const n=Number(e.target.value);
  if(!Number.isFinite(n) || n<0) return;
  watch[i][f]=n;
  if(watch[i].min>=watch[i].max){
    if(f==="min") watch[i].max=n+1;
    else watch[i].min=Math.max(0,n-1);
  }
  save();
  const active=document.querySelector(".screen.active")?.id;
  if(active==="detail"){ renderDetail(watch[i].type,watch[i].symbol); applyScoreColors(); }
  else if(active==="watchlist") renderWatchlist();
  else if(active==="dashboard") renderDashboard();
});
document.querySelector("#addAssetBtn").onclick=()=>{
  const symbol=document.querySelector("#assetInput").value.trim().toUpperCase(),type=document.querySelector("#assetType").value;
  if(!symbol)return;
  if(!watch.some(a=>a.symbol===symbol&&a.type===type)){
    const x=data[type][symbol]||{price:0}; const min=x.price?Math.round(x.price*.9*100)/100:0,max=x.price?Math.round(x.price*1.1*100)/100:0;
    watch.push({symbol,type,min,max});save();renderWatchlist();renderDashboard();
  }
  document.querySelector("#assetInput").value="";
};
document.querySelector("#refreshBtn").onclick=()=>{renderDashboard();document.querySelector("#updated").textContent="Actualisé à "+new Date().toLocaleTimeString("fr-FR")};
document.querySelector("#saveSettings").onclick=()=>{
  settings.cgKey=document.querySelector("#cgKey").value.trim();settings.fhKey=document.querySelector("#fhKey").value.trim();
  localStorage.setItem("mw_settings",JSON.stringify(settings));alert("Réglages enregistrés sur cet appareil.");
};
document.querySelector("#cgKey").value=settings.cgKey||"";document.querySelector("#fhKey").value=settings.fhKey||"";

let demoTick=0;
function simulateMarket(){
  demoTick++;
  Object.values(data).forEach(group=>{
    Object.values(group).forEach(x=>{
      const last=x.price;
      const amplitude=Math.max(last*0.035, 0.01);
      const wave=Math.sin(demoTick*0.9 + x.name.length)*amplitude;
      const jitter=Math.cos(demoTick*1.7 + x.name.length)*amplitude*0.35;
      x.price=Math.max(0.01,last + wave + jitter);
      x.change=((x.price-last)/last)*100;
      x.history=[...x.history.slice(-13),x.price];
    });
  });

  // Do not rebuild the dashboard while a threshold field is focused.
  // This keeps the input editable while the demo prices continue moving.
  const editing=document.activeElement?.matches("[data-threshold-index]");
  const active=document.querySelector(".screen.active")?.id;

  if(!editing){
    if(active==="dashboard") renderDashboard();
    else if(active==="watchlist") renderWatchlist();
    else if(active==="detail"){
      const title=document.querySelector("#detailContent h1")?.textContent||"";
      const symbol=title.split(" · ")[0];
      const a=watch.find(v=>v.symbol===symbol);
      if(a) renderDetail(a.type,a.symbol);
    }
  }

  document.querySelector("#updated").textContent="Démonstration V2.1 • valeurs simulées • "+new Date().toLocaleTimeString("fr-FR");
}
refreshRealData();
setInterval(refreshRealData,60000);

if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(()=>{});
renderDashboard();


document.addEventListener("blur",e=>{
  if(!e.target.matches("[data-threshold-index]")) return;
  const i=+e.target.dataset.thresholdIndex, f=e.target.dataset.thresholdField, n=Number(e.target.value);
  if(!Number.isFinite(n)||n<0) return;
  watch[i][f]=n;
  if(watch[i].min>=watch[i].max){
    if(f==="min") watch[i].max=n+1;
    else watch[i].min=Math.max(0,n-1);
  }
  save();
},true);

document.addEventListener("DOMContentLoaded",()=>{
  const buttons=[...document.querySelectorAll("button")];
  const refresh=buttons.find(b=>b.textContent.includes("↻")||b.getAttribute("aria-label")==="Actualiser");
  if(refresh) refresh.addEventListener("click",()=>refreshRealData());
  updateDataStatus();
});
