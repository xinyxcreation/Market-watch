const defaultWatch = [
  {symbol:"BTC",type:"crypto",min:95000,max:110000},
  {symbol:"ETH",type:"crypto",min:3000,max:3800},
  {symbol:"SOL",type:"crypto",min:150,max:210},
  {symbol:"NVDA",type:"stock",min:155,max:190},
  {symbol:"TSLA",type:"stock",min:300,max:390}
];

let marketNews = [];
let marketEvents = [];

let watch = JSON.parse(localStorage.getItem("mw_watch") || "null") || defaultWatch;
let settings = JSON.parse(localStorage.getItem("mw_settings") || "{}");
let data = {
  crypto:{BTC:{name:"Bitcoin",price:0,change:0,history:[]},ETH:{name:"Ethereum",price:0,change:0,history:[]},SOL:{name:"Solana",price:0,change:0,history:[]}},
  stock:{NVDA:{name:"NVIDIA",price:0,change:0,history:[]},TSLA:{name:"Tesla",price:0,change:0,history:[]},MSFT:{name:"Microsoft",price:0,change:0,history:[]}}
};


const FINNHUB_API_KEY = window.MARKET_WATCH_FINNHUB_KEY || "";
const FINNHUB_BASE = "https://finnhub.io/api/v1";
const COINGECKO_BASE = "https://api.coingecko.com/api/v3";
const COIN_IDS = {
  BTC:"bitcoin", ETH:"ethereum", SOL:"solana", XRP:"ripple", ADA:"cardano",
  DOGE:"dogecoin", BNB:"binancecoin", AVAX:"avalanche-2", DOT:"polkadot",
  LINK:"chainlink"
};
const STOCK_HISTORY_KEY = "mw_stock_session_history";
let realDataEnabled = false;
let cryptoDataEnabled = false;
let stockDataEnabled = false;
let realDataError = "";
let detailChartRange = "7";
let detailChartToken = 0;

const ASSET_SUGGESTIONS = {
  crypto:[
    ["BTC","Bitcoin"],["ETH","Ethereum"],["SOL","Solana"],["XRP","XRP"],
    ["ADA","Cardano"],["DOGE","Dogecoin"],["BNB","BNB"],["AVAX","Avalanche"],
    ["DOT","Polkadot"],["LINK","Chainlink"]
  ],
  stock:[
    ["NVDA","NVIDIA"],["TSLA","Tesla"],["AAPL","Apple"],["MSFT","Microsoft"],
    ["AMZN","Amazon"],["GOOGL","Alphabet"],["META","Meta"],["AMD","AMD"],
    ["NFLX","Netflix"],["ORCL","Oracle"]
  ]
};
function renderAssetSuggestions(){
  const box=document.querySelector("#assetSuggestions");
  const input=document.querySelector("#assetInput");
  const type=document.querySelector("#assetType");
  if(!box||!input||!type)return;
  const q=input.value.trim().toUpperCase();
  const items=ASSET_SUGGESTIONS[type.value]
    .filter(([sym,name])=>!watch.some(a=>a.symbol===sym&&a.type===type.value))
    .filter(([sym,name])=>!q || sym.includes(q) || name.toUpperCase().includes(q))
    .slice(0,8);
  box.innerHTML=items.length ? items.map(([sym,name])=>
    `<button type="button" class="asset-suggestion" data-suggest-symbol="${sym}">
      <b>${esc(sym)}</b><span>${esc(name)}</span>
    </button>`).join("") :
    `<div class="suggestion-empty">Aucun actif correspondant</div>`;
  box.hidden=false;
}
function hideAssetSuggestions(){
  const box=document.querySelector("#assetSuggestions");
  if(box)box.hidden=true;
}
function realSymbol(a){ return a.type === "stock" ? a.symbol : a.symbol; }
function coinId(symbol){ return COIN_IDS[symbol]; }

async function finnhub(path, params={}){
  const u=new URL(FINNHUB_BASE+path);
  Object.entries(params).forEach(([k,v])=>u.searchParams.set(k,v));
  u.searchParams.set("token",FINNHUB_API_KEY);
  const r=await fetch(u.toString(),{cache:"no-store"});
  if(!r.ok) throw new Error(`Finnhub HTTP ${r.status}`);
  const json=await r.json();
  if(json?.error) throw new Error(json.error);
  return json;
}

async function gecko(path, params={}){
  const u=new URL(COINGECKO_BASE+path);
  Object.entries(params).forEach(([k,v])=>u.searchParams.set(k,v));
  const r=await fetch(u.toString(),{cache:"no-store"});
  if(!r.ok) throw new Error(`CoinGecko HTTP ${r.status}`);
  return r.json();
}

function loadStockHistory(){
  try{return JSON.parse(localStorage.getItem(STOCK_HISTORY_KEY)||"{}")||{};}catch{return {};}
}
function saveStockHistory(h){localStorage.setItem(STOCK_HISTORY_KEY,JSON.stringify(h));}
function pushStockPoint(symbol,price,ts=Date.now()){
  if(!Number.isFinite(price)||price<=0)return;
  const h=loadStockHistory();
  const arr=Array.isArray(h[symbol])?h[symbol]:[];
  const last=arr[arr.length-1];
  if(last && Math.abs(ts-last.t)<20000){arr[arr.length-1]={t:ts,v:price};}
  else arr.push({t:ts,v:price});
  h[symbol]=arr.slice(-720);
  saveStockHistory(h);
}
function stockHistory(symbol){
  const h=loadStockHistory();
  return Array.isArray(h[symbol])?h[symbol]:[];
}

function applyStockQuote(a,q){
  if(!q || typeof q.c!=="number" || !q.c) return false;
  const x=data.stock[a.symbol] ||= {name:a.symbol,price:q.c,change:0,history:[]};
  x.price=q.c;
  x.change=typeof q.dp==="number" ? q.dp : (typeof q.d==="number" && q.pc ? q.d/q.pc*100 : 0);
  pushStockPoint(a.symbol,q.c,typeof q.t==="number"?q.t*1000:Date.now());
  const hist=stockHistory(a.symbol);
  x.history=hist.length?hist.map(p=>p.v):[q.c];
  return true;
}

async function refreshCrypto(){
  const ids=Object.values(COIN_IDS).join(",");
  const q=await gecko("/simple/price",{ids,vs_currencies:"eur",include_24hr_change:"true",include_last_updated_at:"true"});
  let ok=0;
  for(const a of watch.filter(x=>x.type==="crypto")){
    const id=coinId(a.symbol), item=q[id];
    if(!item || typeof item.eur!=="number")continue;
    const x=data.crypto[a.symbol] ||= {name:a.symbol,price:item.eur,change:0,history:[]};
    x.price=item.eur;
    x.change=typeof item.eur_24h_change==="number"?item.eur_24h_change:0;
    x.lastUpdated=item.last_updated_at?item.last_updated_at*1000:Date.now();
    try{
      const hist=await gecko(`/coins/${id}/market_chart`,{vs_currency:"eur",days:"7"});
      x.chartHistory={"7":(hist.prices||[]).map(p=>({t:p[0],v:p[1]})).filter(p=>Number.isFinite(p.v))};
      x.history=x.chartHistory["7"].map(p=>p.v);
    }catch{
      if(!Array.isArray(x.history))x.history=[];
      x.history=[...x.history.slice(-119),x.price];
    }
    ok++;
  }
  cryptoDataEnabled=ok>0;
  return ok;
}

async function refreshStocks(){
  if(!FINNHUB_API_KEY)throw new Error("Clé Finnhub absente");
  let ok=0;
  const now=Math.floor(Date.now()/1000), from=now-8*86400;
  await Promise.all(watch.filter(x=>x.type==="stock").map(async a=>{
    try{
      const q=await finnhub("/quote",{symbol:realSymbol(a)});
      if(applyStockQuote(a,q))ok++;
      try{
        const c=await finnhub("/stock/candle",{symbol:a.symbol,resolution:"D",from,to:now});
        if(c?.s==="ok" && Array.isArray(c.c) && Array.isArray(c.t)){
          data.stock[a.symbol].chartHistory={"7":c.c.map((v,i)=>({t:c.t[i]*1000,v})).filter(p=>Number.isFinite(p.v))};
          data.stock[a.symbol].history=data.stock[a.symbol].chartHistory["7"].map(p=>p.v);
        }
      }catch{}
    }catch{}
  }));
  if(ok===0)throw new Error("Aucun cours action reçu");
  stockDataEnabled=true;
  return ok;
}

function isoDate(d){return d.toISOString().slice(0,10)}
function newsImpact(n){
  const text=((n.headline||"")+" "+(n.summary||"")).toLowerCase();
  if(/earnings|results|guidance|approval|launch|deal|acquisition|partnership|upgrade|downgrade|lawsuit|recall|hack|etf|regulation|sec/.test(text)) return "FORT";
  return "MOYEN";
}
function newsAsset(n){
  const hay=((n.related||"")+" "+(n.headline||"")).toUpperCase();
  const hit=watch.find(a=>a.type==="stock" && hay.includes(a.symbol));
  if(hit)return hit.symbol;
  for(const a of watch.filter(x=>x.type==="crypto")){
    const names={BTC:["BTC","BITCOIN"],ETH:["ETH","ETHEREUM"],SOL:["SOL","SOLANA"]}[a.symbol]||[a.symbol];
    if(names.some(k=>hay.includes(k)))return a.symbol;
  }
  return n.category==="crypto" ? "CRYPTO" : "MARCHÉ";
}
function newsToModel(n){
  const asset=newsAsset(n);
  const text=((n.headline||"")+" "+(n.summary||"")).toLowerCase();
  const sentiment=/fall|drop|decline|bear|negative|lawsuit|recall|hack|downgrade|miss/.test(text)?-1:/rise|gain|bull|positive|approval|launch|upgrade|beat|record|growth/.test(text)?1:0;
  return {asset,impact:newsImpact(n),direction:sentiment>0?"buy":sentiment<0?"sell":"neutral",sentiment,title:n.headline||"Actualité marché",text:n.summary||"",source:n.source||"",url:n.url||"",datetime:(n.datetime||0)*1000,category:n.category||"general"};
}
async function refreshNews(){
  if(!FINNHUB_API_KEY){marketNews=[];return 0}
  const today=new Date(), from=new Date(today.getTime()-7*86400000);
  const requests=[
    finnhub("/news",{category:"general"}),
    finnhub("/news",{category:"crypto"}),
    ...watch.filter(a=>a.type==="stock").map(a=>finnhub("/company-news",{symbol:a.symbol,from:isoDate(from),to:isoDate(today)}))
  ];
  const results=await Promise.allSettled(requests);
  const rows=[];
  for(const r of results){if(r.status==="fulfilled" && Array.isArray(r.value))rows.push(...r.value)}
  const seen=new Set();
  marketNews=rows.map(newsToModel).filter(n=>{
    const key=n.url||n.title; if(seen.has(key))return false; seen.add(key);
    return true;
  }).sort((a,b)=>b.datetime-a.datetime).slice(0,30);
  return marketNews.length;
}
async function refreshEvents(){
  if(!FINNHUB_API_KEY){marketEvents=[];return 0}
  const now=new Date(), end=new Date(now.getTime()+45*86400000);
  const events=[];
  const earnings=await Promise.allSettled(watch.filter(a=>a.type==="stock").map(a=>finnhub("/calendar/earnings",{from:isoDate(now),to:isoDate(end),symbol:a.symbol,international:"false"})));
  for(const r of earnings){
    if(r.status!=="fulfilled")continue;
    for(const e of (r.value?.earningsCalendar||[])) events.push({date:e.date,asset:e.symbol,title:`Résultats ${e.symbol}`,kind:"Résultats",impact:"FORT",direction:"neutral",detail:`Publication ${e.hour||""}`.trim()});
  }
  try{
    const ipo=await finnhub("/calendar/ipo",{from:isoDate(now),to:isoDate(end)});
    for(const e of (ipo?.ipoCalendar||[]).slice(0,30)) events.push({date:e.date,asset:"IPO",title:`IPO : ${e.name||e.symbol||"Nouvelle cotation"}`,kind:e.exchange||"Introduction en bourse",impact:"FORT",direction:"neutral",detail:e.symbol?`Symbole ${e.symbol}`:""});
  }catch{}
  marketEvents=events.sort((a,b)=>String(a.date).localeCompare(String(b.date))).slice(0,30);
  return marketEvents.length;
}

async function refreshRealData(){
  const results=await Promise.allSettled([refreshCrypto(),refreshStocks(),refreshNews(),refreshEvents()]);
  cryptoDataEnabled=results[0].status==="fulfilled" && results[0].value>0;
  stockDataEnabled=results[1].status==="fulfilled" && results[1].value>0;
  realDataEnabled=cryptoDataEnabled || stockDataEnabled;
  realDataError=[results[0],results[1],results[2],results[3]].filter(r=>r.status==="rejected").map(r=>r.reason?.message||"Erreur").join(" · ");

  renderDashboard();
  renderWatchlist();
  renderNews();
  renderEvents();
  applyScoreColors();
  const active=document.querySelector(".screen.active")?.id;
  if(active==="detail"){
    const title=document.querySelector("#detailContent h1")?.textContent||"";
    const symbol=title.split(" · ")[0];
    const a=watch.find(v=>v.symbol===symbol);
    if(a)renderDetail(a.type,a.symbol);
  }
  updateDataStatus();
  return realDataEnabled;
}

function updateDataStatus(){
  const u=document.querySelector("#updated");
  if(!u)return;
  const parts=[];
  parts.push(cryptoDataEnabled?"🟢 CRYPTO RÉEL · CoinGecko":"🔴 CRYPTO indisponible");
  parts.push(stockDataEnabled?"🟢 BOURSE RÉELLE · Finnhub":"🔴 BOURSE indisponible");
  parts.push(marketNews.length?`📰 ${marketNews.length} actus`:"📰 0 actus");
  parts.push(marketEvents.length?`📅 ${marketEvents.length} événements`:"📅 0 événement");
  u.textContent=parts.join("  ·  ")+" · "+new Date().toLocaleTimeString("fr-FR");
  u.classList.toggle("real-status",realDataEnabled);
  u.classList.toggle("demo-status",!realDataEnabled);
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

  const news=marketNews.filter(n=>n.asset===a.symbol);
  const events=marketEvents.filter(e=>e.asset===a.symbol);
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
  const w=large?960:320,h=large?280:72,p=large?28:8;
  const vals=(history||[]).map(v=>typeof v==="object"?v.v:v).filter(Number.isFinite);
  if(vals.length<2){
    return `<div class="chart-no-data">7J · historique indisponible</div>`;
  }
  // Keep the actual 7-day series, only downsample visually if necessary.
  const maxPoints=large?500:90;
  let series=vals;
  if(series.length>maxPoints){
    const step=(series.length-1)/(maxPoints-1);
    series=Array.from({length:maxPoints},(_,i)=>series[Math.round(i*step)]);
  }
  const min=Math.min(...series),max=Math.max(...series),range=max-min||Math.max(1,max*0.001);
  const pts=series.map((v,i)=>{
    const x=p+i*(w-2*p)/Math.max(1,series.length-1);
    const y=h-p-(v-min)*(h-2*p)/range;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-label="Évolution réelle sur 7 jours">
    <polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="${large?3:2.5}" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}
function weeklyHomeChart(a){
  const points=a.chartHistory?.["7"];
  if(!Array.isArray(points)||points.length<2) return `<div class="chart-no-data">7J · historique indisponible</div>`;
  const vals=points.map(p=>p.v).filter(Number.isFinite);
  return `<div class="weekly-home-chart">
    ${chartSvg(vals,false)}
    <div class="weekly-home-axis"><span>7 jours</span><span>${money(Math.min(...vals),a.type)} → ${money(Math.max(...vals),a.type)}</span></div>
  </div>`;
}

function formatChartDate(ts,range){
  const d=new Date(ts);
  if(range==="1")return d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
  return d.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:range==="365"?"2-digit":undefined});
}
function chartRangeLabel(r){return ({"1":"1J","7":"1S","30":"1M","180":"6M","365":"1A"})[r]||r;}
function chartPointsFromHistory(a,range){
  if(a.type==="stock"){
    if(a.chartHistory?.[range]?.length) return a.chartHistory[range];
    const hist=stockHistory(a.symbol);
    if(!hist.length)return [];
    const cutoff=Date.now()-Number(range)*86400000;
    return hist.filter(p=>p.t>=cutoff);
  }
  return a.chartHistory?.[range]||[];
}
function interactiveChart(a){
  const points=chartPointsFromHistory(a,detailChartRange);
  if(!points.length){
    return `<div class="chart-shell"><div class="chart-empty">${a.type==="stock"?"📈 Le graphique réel commence à se construire avec les relevés Finnhub toutes les 60 secondes.":"📈 Chargement de l'historique réel…"}</div></div>`;
  }
  const w=960,h=300,p={l:62,r:18,t:18,b:34};
  const vals=points.map(p=>p.v), min=Math.min(...vals),max=Math.max(...vals),range=max-min||Math.max(1,max*0.001);
  const x=i=>p.l+i*(w-p.l-p.r)/Math.max(1,points.length-1);
  const y=v=>h-p.b-(v-min)*(h-p.t-p.b)/range;
  const line=points.map((pt,i)=>`${x(i).toFixed(1)},${y(pt.v).toFixed(1)}`).join(" ");
  const circles=points.map((pt,i)=>`<circle class="chart-point" cx="${x(i).toFixed(1)}" cy="${y(pt.v).toFixed(1)}" r="${points.length>250?3:5}" data-index="${i}" data-ts="${pt.t}" data-price="${pt.v}" tabindex="0" aria-label="${esc(formatChartDate(pt.t,detailChartRange))} · ${esc(money(pt.v,a.type))}"/>`).join("");
  const grid=[0,.25,.5,.75,1].map(t=>{
    const yy=p.t+t*(h-p.t-p.b), val=max-(max-min)*t;
    return `<line x1="${p.l}" x2="${w-p.r}" y1="${yy}" y2="${yy}" class="chart-grid"/><text x="${p.l-8}" y="${yy+4}" text-anchor="end" class="chart-axis">${esc(money(val,a.type))}</text>`;
  }).join("");
  const ticks=[0,.25,.5,.75,1].map(t=>{const i=Math.round(t*(points.length-1));return `<text x="${x(i)}" y="${h-8}" text-anchor="middle" class="chart-axis">${esc(formatChartDate(points[i].t,detailChartRange))}</text>`}).join("");
  const last=points[points.length-1];
  return `<div class="chart-shell" data-chart-symbol="${esc(a.symbol)}">
    <div class="chart-toolbar"><div class="chart-readout" aria-live="polite"><b>${money(last.v,a.type)}</b><span>${formatChartDate(last.t,detailChartRange)}</span></div><div class="chart-ranges">${["1","7","30","180","365"].map(r=>`<button type="button" class="chart-range ${detailChartRange===r?"active":""}" data-chart-range="${r}">${chartRangeLabel(r)}</button>`).join("")}</div></div>
    <div class="chart-viewport"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Graphique historique ${esc(a.symbol)}"><g>${grid}${ticks}</g><polyline points="${line}" class="chart-line"/><g>${circles}</g></svg><div class="chart-tooltip" hidden></div></div>
    <div class="chart-help">Clique ou touche un point pour afficher précisément le prix et l'heure.</div>
  </div>`;
}
async function loadDetailHistory(a){
  const token=++detailChartToken;
  if(a.type!=="crypto")return;
  a.chartHistory ||= {};
  if(a.chartHistory[detailChartRange])return;
  try{
    const q=await gecko(`/coins/${coinId(a.symbol)}/market_chart`,{vs_currency:"eur",days:detailChartRange});
    if(token!==detailChartToken)return;
    a.chartHistory[detailChartRange]=(q.prices||[]).map(p=>({t:p[0],v:p[1]})).filter(p=>Number.isFinite(p.v));
    renderDetail(a.type,a.symbol,false);
  }catch(e){
    if(token!==detailChartToken)return;
    a.chartHistory[detailChartRange]=[];
    renderDetail(a.type,a.symbol,false);
  }
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
    <div class="mini-chart">${chartSvg(x.chartHistory?.["7"]?.map(p=>p.v)||x.history)}</div>
    <div class="range"><span>${money(a.min,a.type)}</span><span>${money(a.max,a.type)}</span></div>
    <div class="range-bar"><div class="range-fill" style="width:${pct}%"></div></div>
    
  </article>`;
}
function dashboardRow(a){
  const x=assetInfo(a), z=zone(a), an=analysis(a);
  const border=z.state==="below"?"threshold-below":z.state==="above"?"threshold-above":"";
  const status=z.state==="below"?"🔴 Sous le mini":z.state==="above"?"🟢 Au-dessus du maxi":"Dans ta zone";
  return `<article class="asset-list-row ${border}" data-detail="${a.type}:${a.symbol}">
    <div class="asset-list-main"><div><b class="ticker">${esc(a.symbol)}</b><div class="name">${esc(x.name)} · ${a.type==="crypto"?"Crypto":"Action"}</div></div><span class="badge ${z.state==="below"?"red":z.state==="above"?"green":"neutral"}">${status}</span></div>
    <div class="asset-list-price"><strong>${money(x.price,a.type)}</strong><span class="${x.change>=0?"positive":"negative"}">${x.change>=0?"+":""}${x.change.toFixed(2)} %</span></div>
    <div class="asset-list-scores"><span class="av-score" title="Achat"><b class="av-icon" style="${scoreStyle(an.buy.score)}">Ⓐ</b> <strong style="${scoreStyle(an.buy.score)}">${an.buy.score}%</strong></span><span class="av-score" title="Vente"><b class="av-icon" style="${scoreStyle(an.sell.score)}">Ⓥ</b> <strong style="${scoreStyle(an.sell.score)}">${an.sell.score}%</strong></span></div>
    <div class="asset-list-chart">${weeklyHomeChart(x)}</div>
    <div class="asset-list-range"><span>${money(a.min,a.type)}</span><span>${money(a.max,a.type)}</span></div>
  </article>`;
}
function renderDashboard(){
  const crypto=watch.filter(a=>a.type==="crypto");
  const stocks=watch.filter(a=>a.type==="stock");
  const group=(title,items,cls)=>items.length
    ? `<div class="asset-group ${cls}">
         <div class="asset-group-head"><h3>${title}</h3><span>${items.length} actif${items.length>1?"s":""}</span></div>
         <div class="asset-list">${items.map(dashboardRow).join("")}</div>
       </div>`
    : "";

  document.querySelector("#assetList").innerHTML =
    (group("₿ Crypto",crypto,"crypto-group") +
     group("📈 Bourse",stocks,"stock-group")) ||
    `<p class="empty-state">Aucun actif surveillé.</p>`;

  document.querySelector("#alerts").innerHTML="";
  const avg=watch.length?Math.round(watch.reduce((n,a)=>n+score(a),0)/watch.length):0;
  document.querySelector("#marketPulse").textContent=avg+"/100";

  const watchItems=[
    ...marketNews.map(data=>({kind:"news",data})),
    ...marketEvents.map(data=>({kind:"event",data}))
  ].sort((a,b)=>{
    const ta=a.kind==="news"?a.data.datetime:new Date(`${a.data.date}T12:00:00`).getTime();
    const tb=b.kind==="news"?b.data.datetime:new Date(`${b.data.date}T12:00:00`).getTime();
    return a.kind==="event" && b.kind==="news" ? ta-tb :
           b.kind==="event" && a.kind==="news" ? tb-ta : tb-ta;
  }).slice(0,5);

  document.querySelector("#watchNow").innerHTML=watchItems.map(watchItem).join("") ||
    `<p class="empty-state">📰 Aucune information importante.</p>`;
  updateDataStatus();
}

function newsItem(n){return `<article class="news-item"><span class="impact">${n.impact}</span><div class="meta">${esc(n.asset)} · ${esc(n.source||"Actualité")}</div><h3>${esc(n.title)}</h3><p>${esc(n.text)}</p>${n.url?`<a class="news-link" href="${esc(n.url)}" target="_blank" rel="noopener">Lire la source ↗</a>`:""}</article>`}
function watchItem(item){
  if(item.kind==="news") return newsItem(item.data);
  const e=item.data;
  return `<article class="news-item watch-event"><span class="impact">${esc(e.impact)}</span><div class="meta">📅 ${esc(e.asset)} · ${esc(e.kind)}</div><h3>${esc(e.title)}</h3><p>${esc(e.detail||"Événement à venir")}</p></article>`;
}
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

function renderNews(){
  document.querySelector("#newsList").innerHTML=marketNews.map(newsItem).join("") || `<p class="empty-state">📰 Aucune information importante.</p>`;
}
function renderEvents(){
  document.querySelector("#eventList").innerHTML=marketEvents.map(e=>{
    const d=new Date(`${e.date}T12:00:00`);
    const day=Number.isNaN(d.getTime())?String(e.date).slice(-2):d.toLocaleDateString("fr-FR",{day:"2-digit"});
    const month=Number.isNaN(d.getTime())?String(e.date).slice(5,7):d.toLocaleDateString("fr-FR",{month:"short"});
    return `<article class="event"><div class="date-box"><b>${esc(day)}</b><span>${esc(month)}</span></div><div class="event-body"><span class="impact">${esc(e.impact)}</span><div class="meta">${esc(e.asset)} · ${esc(e.kind)}</div><h3>${esc(e.title)}</h3><p>${esc(e.detail||"")}</p></div></article>`;
  }).join("") || `<p class="empty-state">📅 Aucun événement majeur proche.</p>`;
}
function renderDetail(type,symbol){
  const a=watch.find(x=>x.type===type&&x.symbol===symbol)||{type,symbol,min:0,max:0};
  const x=assetInfo(a), an=analysis(a), z=zone(a), index=watch.indexOf(a);
  const border=z.state==="below" ? "threshold-below" : z.state==="above" ? "threshold-above" : "";
  const status=z.state==="below" ? "🔴 Sous le mini" : z.state==="above" ? "🟢 Au-dessus du maxi" : "Dans ta zone";
  const root=document.querySelector("#detailContent");
  root.className=`detail-page ${border}`;
  const reasons=arr=>arr.map(r=>`<li>${esc(r)}</li>`).join("");
  const newsHtml=an.news.length?an.news.map(n=>`<article class="news-item"><span class="impact">${esc(n.impact)}</span><div class="meta">${esc(n.asset)} · ${esc(n.source||"Actualité")}</div><h3>${esc(n.title)}</h3><p>${esc(n.text)}</p>${n.url?`<a class="news-link" href="${esc(n.url)}" target="_blank" rel="noopener">Lire la source ↗</a>`:""}</article>`).join(""):`<p class="empty-state">📰 Aucune information importante.</p>`;
  const eventsHtml=an.events.length?an.events.map(e=>`<article class="event compact"><div class="date-box"><b>${esc(e.date.split(" ")[0])}</b><span>${esc(e.date.split(" ").slice(1).join(" "))}</span></div><div class="event-body"><span class="impact">${esc(e.impact)}</span><div class="meta">${esc(e.kind)}</div><h3>${esc(e.title)}</h3></div></article>`).join(""):`<p class="empty-state">📅 Aucun événement majeur proche.</p>`;
  root.innerHTML=`
    <div class="detail-head"><div><div class="eyebrow">${type==="crypto"?"CRYPTO":"BOURSE"}</div><h1>${esc(symbol)} · ${esc(x.name)}</h1></div><span class="badge ${z.state==="below"?"red":z.state==="above"?"green":"neutral"}">${status}</span></div>
    <div class="detail-price">${money(x.price,type)} <span class="${x.change>=0?"positive":"negative"}" style="font-size:18px">${x.change>=0?"+":""}${x.change.toFixed(2)} %</span></div>
    ${interactiveChart(a)}
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
  loadDetailHistory(a);
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

document.addEventListener("click",e=>{
  const range=e.target.closest("[data-chart-range]");
  if(range){
    detailChartRange=range.dataset.chartRange;
    const title=document.querySelector("#detailContent h1")?.textContent||"";
    const symbol=title.split(" · ")[0];
    const a=watch.find(v=>v.symbol===symbol);
    if(a){renderDetail(a.type,a.symbol);}
    return;
  }
  const point=e.target.closest(".chart-point");
  if(point){showChartPoint(point);}
});
function showChartPoint(point){
  const shell=point.closest(".chart-shell"),tip=shell?.querySelector(".chart-tooltip"),readout=shell?.querySelector(".chart-readout");
  if(!tip||!readout)return;
  const price=Number(point.dataset.price),ts=Number(point.dataset.ts);
  const title=document.querySelector("#detailContent h1")?.textContent||"";
  const symbol=title.split(" · ")[0],a=watch.find(v=>v.symbol===symbol);
  const date=new Date(ts);
  const dateText=date.toLocaleString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});
  readout.innerHTML=`<b>${money(price,a?.type||"crypto")}</b><span>${dateText}</span>`;
  const svg=shell.querySelector("svg"),rect=svg.getBoundingClientRect(),cx=Number(point.getAttribute("cx")),cy=Number(point.getAttribute("cy"));
  const vb=svg.viewBox.baseVal, px=(cx/vb.width)*rect.width, py=(cy/vb.height)*rect.height;
  tip.innerHTML=`<strong>${money(price,a?.type||"crypto")}</strong><span>${esc(dateText)}</span>`;
  tip.hidden=false;
  tip.style.left=Math.max(8,Math.min(rect.width-150,px-65))+"px";
  tip.style.top=Math.max(8,py-58)+"px";
}

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
function addSelectedAsset(){
  const input=document.querySelector("#assetInput");
  const type=document.querySelector("#assetType").value;
  const symbol=input.value.trim().toUpperCase();
  if(!symbol)return;

  if(!watch.some(a=>a.symbol===symbol&&a.type===type)){
    const x=data[type][symbol]||{price:0};
    const min=x.price?Math.round(x.price*.9*100)/100:0;
    const max=x.price?Math.round(x.price*1.1*100)/100:0;
    watch.push({symbol,type,min,max});
    save();
    renderWatchlist();
    renderDashboard();
    refreshRealData();
  }
  input.value="";
  hideAssetSuggestions();
}

document.querySelector("#addAssetBtn").onclick=addSelectedAsset;

document.querySelector("#assetInput").addEventListener("focus",renderAssetSuggestions);
document.querySelector("#assetInput").addEventListener("input",renderAssetSuggestions);
document.querySelector("#assetType").addEventListener("change",()=>{
  document.querySelector("#assetInput").value="";
  renderAssetSuggestions();
});

document.addEventListener("click",e=>{
  const btn=e.target.closest("[data-suggest-symbol]");
  if(btn){
    const input=document.querySelector("#assetInput");
    input.value=btn.dataset.suggestSymbol;
    hideAssetSuggestions();
    input.focus();
    return;
  }
  if(!e.target.closest(".asset-search-wrap")) hideAssetSuggestions();
});
document.querySelector("#assetInput").addEventListener("keydown",e=>{
  if(e.key==="Enter"){e.preventDefault();addSelectedAsset();}
});


document.querySelector("#refreshBtn").onclick=()=>refreshRealData();
document.querySelector("#saveSettings").onclick=()=>{
  settings.cgKey=document.querySelector("#cgKey").value.trim();settings.fhKey=document.querySelector("#fhKey").value.trim();
  localStorage.setItem("mw_settings",JSON.stringify(settings));alert("Réglages enregistrés sur cet appareil.");
};
document.querySelector("#cgKey").value=settings.cgKey||"";document.querySelector("#fhKey").value=settings.fhKey||"";

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
