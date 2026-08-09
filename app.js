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
  {asset:"NVDA",impact:"FORT",title:"L'IA reste un moteur majeur pour le secteur des semi-conducteurs",text:"Actualité de démonstration à remplacer par une source d'actualité configurée."},
  {asset:"TSLA",impact:"MOYEN",title:"Automobile : annonces produits et production à surveiller",text:"Les annonces de nouveaux véhicules peuvent provoquer une volatilité importante."},
  {asset:"BTC",impact:"FORT",title:"Crypto : le marché reste sensible aux annonces macroéconomiques",text:"Surveille les taux, la liquidité et les flux institutionnels."},
  {asset:"ETH",impact:"MOYEN",title:"Ethereum : activité réseau et écosystème à suivre",text:"Indicateurs de démonstration pour la V1."}
];

const DEMO_EVENTS = [
  {date:"12 août",asset:"NVDA",title:"Événement technologique / actualité produit",kind:"Technologie",impact:"FORT"},
  {date:"18 août",asset:"TSLA",title:"Annonce automobile à surveiller",kind:"Automobile",impact:"FORT"},
  {date:"22 août",asset:"BTC",title:"Échéance / événement macro à surveiller",kind:"Crypto",impact:"MOYEN"},
  {date:"28 août",asset:"TSLA",title:"Actualité potentielle autour d'un nouveau véhicule",kind:"Automobile",impact:"FORT"},
  {date:"3 sept.",asset:"ETH",title:"Événement écosystème crypto",kind:"Crypto",impact:"MOYEN"}
];

let watch = JSON.parse(localStorage.getItem("mw_watch") || "null") || defaultWatch;
let settings = JSON.parse(localStorage.getItem("mw_settings") || "{}");
let data = structuredClone(DEMO);

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
  const active=document.querySelector(".screen.active")?.id;
  if(active==="detail") renderDetail(watch[i].type, watch[i].symbol);
}
function score(a){
  const x=assetInfo(a), z=zone(a);
  let s=50 + Math.min(20,Math.abs(x.change)*4);
  if(z.cls==="green")s+=20;
  if(Math.abs(x.change)>=4)s+=10;
  if(x.change<0)s-=5;
  return Math.max(0,Math.min(100,Math.round(s)));
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
      <div class="badge">⭐ ${s}/100</div>
    </div>
    <div class="mini-chart">${chartSvg(x.history)}</div>
    <div class="threshold-edit">
      <label>Mini <input type="number" step="any" data-threshold-index="${index}" data-threshold-field="min" value="${a.min}"></label>
      <label>Maxi <input type="number" step="any" data-threshold-index="${index}" data-threshold-field="max" value="${a.max}"></label>
    </div>
    <div class="range"><span>${money(a.min,a.type)}</span><span>${money(a.max,a.type)}</span></div>
    <div class="range-bar"><div class="range-fill" style="width:${pct}%"></div></div>
  </article>`;
}
function renderDashboard(){
  const cs=watch.filter(a=>a.type==="crypto"), ss=watch.filter(a=>a.type==="stock");
  document.querySelector("#cryptoCards").innerHTML=cs.length?cs.map(card).join(""):`<p class="muted">Aucune crypto surveillée.</p>`;
  document.querySelector("#stockCards").innerHTML=ss.length?ss.map(card).join(""):`<p class="muted">Aucune action surveillée.</p>`;
  const alerts=watch.filter(a=>zone(a).cls==="red").map(a=>`<div class="alert">⚠️ <b>${esc(a.symbol)}</b> — ${zone(a).label} (${money(assetInfo(a).price,a.type)}). Vérifie ton seuil personnalisé.</div>`);
  document.querySelector("#alerts").innerHTML=alerts.join("");
  const avg=watch.length?Math.round(watch.reduce((n,a)=>n+score(a),0)/watch.length):0;
  document.querySelector("#marketPulse").textContent=avg+"/100";
  document.querySelector("#watchNow").innerHTML=[...DEMO_NEWS].sort((a,b)=>a.impact==="FORT"?-1:1).slice(0,3).map(newsItem).join("");
  document.querySelector("#updated").textContent=settings.demoMode===false?"Dernière actualisation : "+new Date().toLocaleTimeString("fr-FR"):"Mode démonstration • "+new Date().toLocaleTimeString("fr-FR");
}
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
function renderNews(){document.querySelector("#newsList").innerHTML=DEMO_NEWS.map(newsItem).join("")}
function renderEvents(){document.querySelector("#eventList").innerHTML=DEMO_EVENTS.map(e=>`<article class="event"><div class="date-box"><b>${esc(e.date.split(" ")[0])}</b><span>${esc(e.date.split(" ").slice(1).join(" "))}</span></div><div class="event-body"><span class="impact">${esc(e.impact)}</span><div class="meta">${esc(e.asset)} · ${esc(e.kind)}</div><h3>${esc(e.title)}</h3><p>Événement de démonstration — les sources réelles seront branchées via API.</p></div></article>`).join("")}
function renderDetail(type,symbol){
  const a=watch.find(x=>x.type===type&&x.symbol===symbol)||{type,symbol,min:0,max:0},x=assetInfo(a),s=score(a),z=zone(a);
  document.querySelector("#detailContent").innerHTML=`<div class="detail-head"><div><div class="eyebrow">${type==="crypto"?"CRYPTO":"BOURSE"}</div><h1>${esc(symbol)} · ${esc(x.name)}</h1></div><span class="badge ${z.cls}">${z.label}</span></div>
  <div class="detail-price">${money(x.price,type)} <span class="${x.change>=0?"positive":"negative"}" style="font-size:18px">${x.change>=0?"+":""}${x.change}%</span></div>
  <div class="big-chart">${chartSvg(x.history,true)}</div>
  <div class="metrics"><div class="metric"><span class="muted">Score</span><b>${s}/100</b></div><div class="metric"><span class="muted">Mini</span><b>${money(a.min,type)}</b></div><div class="metric"><span class="muted">Maxi</span><b>${money(a.max,type)}</b></div></div>
  <div class="settings-card" style="margin-top:12px"><h3>🧠 Analyse automatique</h3><p>Score basé sur la position dans ta zone, la variation récente et la volatilité disponible dans la V1.</p><p><b>${s>=75?"🔥 Intérêt élevé":s>=55?"🟠 À surveiller":"🔵 Calme"}</b> — cette indication ne constitue pas un conseil financier.</p></div>`;
}
function show(screen){
  document.querySelectorAll(".screen").forEach(s=>s.classList.toggle("active",s.id===screen));
  document.querySelectorAll(".nav").forEach(n=>n.classList.toggle("active",n.dataset.open===screen));
  if(screen==="dashboard")renderDashboard();
  if(screen==="watchlist")renderWatchlist();
  if(screen==="news")renderNews();
  if(screen==="events")renderEvents();
}
document.addEventListener("click",e=>{
  const open=e.target.closest("[data-open]"); if(open){show(open.dataset.open);return}
  const detail=e.target.closest("[data-detail]"); if(detail){const [type,symbol]=detail.dataset.detail.split(":");show("detail");renderDetail(type,symbol)}
  const rem=e.target.closest("[data-remove]"); if(rem){watch.splice(+rem.dataset.remove,1);save();renderWatchlist();renderDashboard()}
});
document.addEventListener("change",e=>{
  if(e.target.matches("[data-field]")){
    const i=+e.target.dataset.i,f=e.target.dataset.field;
    updateThreshold(i,f,e.target.value);
  }
  if(e.target.matches("[data-threshold-index]")){
    const i=+e.target.dataset.thresholdIndex,f=e.target.dataset.thresholdField;
    updateThreshold(i,f,e.target.value);
  }
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
  renderDashboard();
  const active=document.querySelector(".screen.active")?.id;
  if(active==="watchlist") renderWatchlist();
  if(active==="detail"){
    const title=document.querySelector("#detailContent h1")?.textContent||"";
    const symbol=title.split(" · ")[0];
    const a=watch.find(v=>v.symbol===symbol);
    if(a) renderDetail(a.type,a.symbol);
  }
  document.querySelector("#updated").textContent="Démonstration • valeurs simulées • "+new Date().toLocaleTimeString("fr-FR");
}
setInterval(simulateMarket,5000);

if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(()=>{});
renderDashboard();
