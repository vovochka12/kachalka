(function(){
"use strict";
const LIB = window.EX_LIB, PRESETS = window.FOOD_PRESETS;

/* ================= хранилище ================= */
const KEY = "tetrad-kachalki-v2";
const clone = (o) => JSON.parse(JSON.stringify(o));
function blank(){
  return {v:2, program:clone(window.DEFAULT_PROGRAM), workouts:[], food:{}, myFoods:[], goals:{kcal:2900, protein:120},
    custom:{}, choice:{}, ach:{}, draft:{s:{}}, ui:{}};
}
function load(){
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    const d = Object.assign(blank(), JSON.parse(raw));
    if (!d.draft || typeof d.draft !== "object") d.draft = {s:{}};
    if (!d.draft.s) d.draft.s = {};
    return d;
  } catch(e){ return blank(); }
}
let data = load();
let saveT = null;
function save(now){
  clearTimeout(saveT);
  const go = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch(e){ toast("Не удалось сохранить: память браузера заполнена"); } };
  if (now) go(); else saveT = setTimeout(go, 250);
}
window.addEventListener("pagehide", () => save(true));
document.addEventListener("visibilitychange", () => { if (document.hidden) save(true); });
try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch(e){}

/* ================= утилиты ================= */
const $ = (s, r) => (r || document).querySelector(s);
function h(tag, attrs){
  const el = document.createElement(tag);
  if (attrs) for (const k in attrs){
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else if (k === "html") el.innerHTML = v;
    else if (k === "style") el.setAttribute("style", v);
    else if (k.slice(0,2) === "on") el.addEventListener(k.slice(2), v);
    else if (k === "value") el.value = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (let i = 2; i < arguments.length; i++) add(el, arguments[i]);
  return el;
}
function add(el, kid){
  if (kid == null || kid === false) return;
  if (Array.isArray(kid)) kid.forEach(k => add(el, k));
  else el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
}
const nf = new Intl.NumberFormat("ru-RU", {maximumFractionDigits:2});
const fmt = (n) => nf.format(n);
const r2 = (n) => Math.round(n * 100) / 100;
function num(s){ if (s == null) return NaN; const t = String(s).trim().replace(",", "."); return t ? Number(t) : NaN; }
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
function dstr(d){ return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
const today = () => dstr(new Date());
function pd(s){ const p = String(s||"").split("-").map(Number); return new Date(p[0], (p[1]||1)-1, p[2]||1); }
function addDays(s, n){ const d = pd(s); d.setDate(d.getDate() + n); return dstr(d); }
const shortD = (s) => pd(s).toLocaleDateString("ru-RU", {day:"numeric", month:"short"}).replace(".", "");
const longD = (s) => pd(s).toLocaleDateString("ru-RU", {weekday:"short", day:"numeric", month:"long"});
const mmss = (s) => Math.floor(s/60) + ":" + String(s%60).padStart(2,"0");
function weekKey(s){ const d = pd(s); const wd = (d.getDay()+6)%7; d.setDate(d.getDate()-wd); return dstr(d); }
function plural(n, a, b, c){ const m10 = n%10, m100 = n%100; if (m10===1 && m100!==11) return a; if (m10>=2 && m10<=4 && (m100<10||m100>=20)) return b; return c; }
const ICON = {
  play:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/></svg>',
  info:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
  up:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 15l6-6 6 6"/></svg>',
  down:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
  edit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
  x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  left:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
  right:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
  minus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 12h12"/></svg>',
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 6v12M6 12h12"/></svg>'
};
function iconBtn(name, label, onclick){ return h("button", {type:"button", class:"icon-btn", "aria-label":label, html:ICON[name], onclick}); }

/* ================= упражнения ================= */
function ex(id){ return LIB[id] || data.custom[id] || {name:"Упражнение удалено", kind:"weight", step:2.5}; }
const isBw = (id) => ex(id).kind === "bw";
function wLabel(id){ const k = ex(id).kind; return k === "bw" ? "Доп. вес, кг" : k === "db" ? "Гантель, кг" : "Вес, кг"; }
const e1rm = (w, r) => w > 0 && r > 0 ? w * (1 + Math.min(r, 15) / 30) : 0;

function lastFor(exId){
  for (const w of data.workouts){ const it = w.items.find(x => x.exId === exId); if (it) return {date:w.date, item:it}; }
  return null;
}
function suggest(slot, exId, last){
  const e = ex(exId), step = e.step || 2.5, bw = e.kind === "bw";
  if (!last){
    return {kind:"start", weight: slot.startW && exId === slot.ex[0] ? slot.startW : null,
      text: slot.startW && exId === slot.ex[0] ? "Старт: " + fmt(slot.startW) + " кг на " + slot.sets + "×" + slot.hi :
        bw ? "Начни без отягощения, 2–3 повтора в запасе" : "Возьми вес, с которым остаётся 2–3 повтора в запасе"};
  }
  const reps = last.item.reps, w = Number(last.item.weight) || 0;
  const allTop = reps.length >= slot.sets && reps.slice(0, slot.sets).every(r => r >= slot.hi);
  if (allTop){
    const nw = r2(w + step);
    return {kind:"up", weight:nw, text: bw && w === 0 ? "Все подходы по " + slot.hi + "+ — бери отягощение " + fmt(step) + " кг" : "Пора прибавить: " + fmt(nw) + " кг"};
  }
  if (bw && w === 0) return {kind:"hold", weight:null, text:"Добирай до " + slot.hi + " повторов в каждом подходе"};
  return {kind:"hold", weight:w, text:"Остаёмся на " + fmt(w) + " кг, добирай до " + slot.hi + " в каждом подходе"};
}
const itemLine = (it) => (it.weight > 0 ? fmt(it.weight) + " кг × " : "") + it.reps.filter(r => r > 0).join(", ");

/* ================= навигация ================= */
const VIEWS = {train:"Тренировка", food:"Питание", prog:"Прогресс", plan:"Программа"};
let view = "train";
function go(v){
  view = v;
  document.querySelectorAll(".tab").forEach(t => t.setAttribute("aria-selected", String(t.dataset.v === v)));
  for (const k in VIEWS) $("#v-" + k).hidden = k !== v;
  $("#title").textContent = VIEWS[v];
  $("#timer").hidden = v !== "train" && !tInt;
  $("#appbar-extra").replaceChildren();
  render();
  window.scrollTo(0, 0);
}
document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => go(t.dataset.v)));
function render(){ ({train:renderTrain, food:renderFood, prog:renderProg, plan:renderPlan})[view](); }

/* ================= тост ================= */
const toastQ = []; let toastBusy = false;
function toast(text, gold){ toastQ.push([text, gold]); if (!toastBusy) nextToast(); }
function nextToast(){
  const t = toastQ.shift(); const el = $("#toast");
  if (!t){ toastBusy = false; el.hidden = true; return; }
  toastBusy = true; el.textContent = t[0]; el.className = "toast" + (t[1] ? " gold" : ""); el.hidden = false;
  setTimeout(nextToast, 2600);
}

/* ================= шторка ================= */
let sheetClose = null;
function openSheet(title, body, onClose){
  const panel = $("#sheet-panel");
  panel.replaceChildren(h("div", {class:"grip"}),
    h("div", {class:"sheet-h"}, h("h2", null, title), iconBtn("x", "Закрыть", closeSheet)), body);
  $("#sheet").hidden = false;
  document.body.style.overflow = "hidden";
  sheetClose = onClose || null;
  panel.scrollTop = 0;
}
function closeSheet(){
  $("#sheet").hidden = true; document.body.style.overflow = "";
  const f = sheetClose; sheetClose = null; if (f) f();
}
$("#sheet-bg").addEventListener("click", closeSheet);
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#sheet").hidden) closeSheet(); });

/* ================= схема движения ================= */
function figureSVG(exId){
  const e = LIB[exId];
  if (!e || !e.anim) return null;
  const A = e.anim, NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 200 160"); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", "Схема движения: " + e.name);
  const mk = (tag, at) => { const el = document.createElementNS(NS, tag); for (const k in at) el.setAttribute(k, at[k]); svg.appendChild(el); return el; };
  mk("line", {x1:8, y1:151, x2:192, y2:151, class:"floor"});
  const dyn = [];
  (A.props || []).forEach(p => {
    const name = Array.isArray(p) ? p[0] : p;
    switch(name){
      case "bench": mk("rect",{x:60,y:110,width:96,height:7,rx:2,class:"propf"}); mk("path",{d:"M72 117V150M144 117V150",class:"prop"}); break;
      case "benchLong": mk("rect",{x:40,y:110,width:132,height:7,rx:2,class:"propf"}); mk("path",{d:"M52 117V150M160 117V150",class:"prop"}); break;
      case "benchRight": mk("rect",{x:112,y:110,width:68,height:7,rx:2,class:"propf"}); mk("path",{d:"M122 117V150M170 117V150",class:"prop"}); break;
      case "benchLeft": mk("rect",{x:34,y:119,width:40,height:7,rx:2,class:"propf"}); mk("path",{d:"M40 126V150M68 126V150",class:"prop"}); break;
      case "incline": mk("path",{d:"M92 116L130 66",class:"prop","stroke-width":7}); mk("rect",{x:66,y:114,width:34,height:6,rx:2,class:"propf"}); mk("path",{d:"M80 120V150M110 102V150",class:"prop"}); break;
      case "seat": mk("rect",{x:80,y:113,width:46,height:6,rx:2,class:"propf"}); mk("path",{d:"M92 113V58",class:"prop","stroke-width":7}); mk("path",{d:"M100 119V150",class:"prop"}); break;
      case "pullbar": mk("path",{d:"M60 22H150",class:"prop","stroke-width":5}); break;
      case "pullbarHigh": mk("path",{d:"M60 8H150",class:"prop","stroke-width":5}); break;
      case "rack": mk("path",{d:"M60 150V30M60 38h10",class:"prop"}); break;
      case "smith": mk("path",{d:"M76 150V6M124 150V6",class:"prop","stroke-width":3}); break;
      case "hack": mk("path",{d:"M66 150L84 10",class:"prop","stroke-width":6}); break;
      case "legpress": mk("path",{d:"M40 74L96 128",class:"prop","stroke-width":7}); mk("path",{d:"M96 128V150M60 100V150",class:"prop"}); mk("path",{d:"M110 150L182 74",class:"prop","stroke-width":2}); break;
      case "hyper": mk("path",{d:"M62 118L88 94",class:"prop","stroke-width":8}); mk("circle",{cx:38,cy:134,r:5,class:"propf"}); mk("path",{d:"M60 150L76 110M38 150V140",class:"prop"}); break;
      case "step": mk("rect",{x:78,y:148,width:44,height:3,class:"propf"}); break;
      case "cable": { const x = p[1], y = p[2]; mk("circle",{cx:x,cy:Math.max(y,4),r:4,class:"propf"}); dyn.push({type:"cable", x, y:Math.max(y,4), el:mk("line",{class:"cable"})}); break; }
    }
  });
  const view = A.view || "side";
  const segs = view === "front"
    ? [["n","hp"],["sl","sr"],["sl","el","wl"],["sr","er","wr"],["hp","kl","al"],["hp","kr","ar"]]
    : [["s","hp"],["hp","k","a"],["s","e","w"]];
  const back = (view !== "front" && A.p0.k2) ? mk("polyline", {class:"body2"}) : null;
  const lines = segs.map(() => mk("polyline", {class:"body"}));
  const head = mk("circle", {r:8.5, class:"head"});
  const held = (A.held || []).map(([t, at]) => {
    if (t === "bar") return {t, at, els:[mk("circle",{r:11,class:"wt"}), mk("circle",{r:3,class:"wt2"})]};
    if (t === "db") return {t, at, els:[mk("rect",{width:14,height:9,rx:3,class:"wt"})]};
    if (t === "handle") return {t, at, els:[mk("rect",{width:10,height:6,rx:2,class:"wt"})]};
    if (t === "pad") return {t, at, els:[mk("circle",{r:6,class:"wt"})]};
    if (t === "platform") return {t, at, els:[mk("line",{class:"prop","stroke-width":6})]};
    return null;
  }).filter(Boolean);

  function draw(t){
    const P = {};
    for (const k in A.p0){ const a = A.p0[k], b = A.p1[k] || a; P[k] = [a[0] + (b[0]-a[0])*t, a[1] + (b[1]-a[1])*t]; }
    segs.forEach((s, i) => lines[i].setAttribute("points", s.map(k => P[k].join(",")).join(" ")));
    if (back) back.setAttribute("points", ["hp","k2","a2"].map(k => P[k].join(",")).join(" "));
    head.setAttribute("cx", P.h[0]); head.setAttribute("cy", P.h[1]);
    held.forEach(o => {
      const [x, y] = P[o.at];
      if (o.t === "bar"){ o.els.forEach(el => { el.setAttribute("cx", x); el.setAttribute("cy", y); }); }
      else if (o.t === "db"){ o.els[0].setAttribute("x", x-7); o.els[0].setAttribute("y", y-4.5); }
      else if (o.t === "handle"){ o.els[0].setAttribute("x", x-5); o.els[0].setAttribute("y", y-3); }
      else if (o.t === "pad"){ o.els[0].setAttribute("cx", x); o.els[0].setAttribute("cy", y); }
      else if (o.t === "platform"){ const L = o.els[0]; L.setAttribute("x1", x-10); L.setAttribute("y1", y-12); L.setAttribute("x2", x+10); L.setAttribute("y2", y+12); }
    });
    dyn.forEach(d => { const w = P.w; d.el.setAttribute("x1", d.x); d.el.setAttribute("y1", d.y); d.el.setAttribute("x2", w[0]); d.el.setAttribute("y2", w[1]); });
  }
  let raf = 0, t0 = performance.now();
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function loop(now){
    const ph = ((now - t0) / 2600) % 1;
    const t = ph < 0.5 ? ph * 2 : 2 - ph * 2;
    draw(0.5 - 0.5 * Math.cos(Math.PI * t));
    raf = requestAnimationFrame(loop);
  }
  draw(reduce ? 1 : 0);
  if (!reduce) raf = requestAnimationFrame(loop);
  svg._stop = () => cancelAnimationFrame(raf);
  return svg;
}

function openTech(exId){
  const e = ex(exId);
  const fig = figureSVG(exId);
  const body = h("div", {class:"tech", style:"display:flex;flex-direction:column;gap:16px"},
    fig ? h("div", {class:"fig"}, fig) : h("p", {class:"muted small"}, "Для своего упражнения схемы нет."),
    e.how ? h("div", null, h("h3", null, "Как делать"), h("ul", null, e.how.map(x => h("li", null, x)))) : null,
    e.bad ? h("div", {class:"bad"}, h("h3", null, "Частые ошибки"), h("ul", null, e.bad.map(x => h("li", null, x)))) : null);
  openSheet(e.name, body, () => fig && fig._stop && fig._stop());
}

/* ================= тренировка ================= */
const days = () => data.program.days;
function nextDayId(){
  const ds = days(); if (!ds.length) return null;
  const last = data.workouts[0];
  if (!last) return ds[0].id;
  const i = ds.findIndex(d => d.id === last.day);
  return i < 0 ? ds[0].id : ds[(i + 1) % ds.length].id;
}
function curDay(){
  const ds = days();
  let id = data.draft.day;
  if (!id || !ds.find(d => d.id === id)) id = nextDayId();
  return ds.find(d => d.id === id) || ds[0];
}
function variantOf(slot){
  const ds = data.draft.s[slot.uid];
  if (ds && ds.v && slot.ex.includes(ds.v)) return ds.v;
  const c = data.choice[slot.uid];
  if (c && slot.ex.includes(c)) return c;
  return slot.ex[0];
}
function dslot(u){ return data.draft.s[u] || (data.draft.s[u] = {}); }

let rows = [];
function renderTrain(){
  const root = $("#v-train");
  const day = curDay();
  root.replaceChildren();
  if (!day){ root.append(h("p", {class:"empty"}, "В программе нет ни одного дня. Добавь его во вкладке «Программа».")); return; }

  if (!isStandalone() && !data.ui.hideInstall && isIOS()){
    root.append(h("div", {class:"banner info"},
      h("span", null, "Чтобы это стало приложением: в Safari нажми «Поделиться» → «На экран «Домой»»."),
      iconBtn("x", "Скрыть", () => { data.ui.hideInstall = true; save(); renderTrain(); })));
  }

  const nid = nextDayId();
  const tabs = h("div", {class:"days", role:"tablist", "aria-label":"День программы"},
    days().map(d => h("button", {type:"button", role:"tab", class:"day", "aria-selected":String(d.id === day.id), onclick: () => {
      if (d.id === day.id) return; data.draft.day = d.id; save(); renderTrain();
    }}, h("b", null, d.name), h("span", null, d.slots.length + " " + plural(d.slots.length, "упражнение", "упражнения", "упражнений")), d.id === nid ? h("span", {class:"next"}, "по очереди") : null)));
  root.append(tabs);

  const dateIn = h("input", {class:"inp num", type:"date", id:"f-date", value: data.draft.date || today(), oninput: (e) => { data.draft.date = e.target.value; save(); }});
  const bwIn = h("input", {class:"inp num", id:"f-bw", inputmode:"decimal", autocomplete:"off", placeholder: lastBw() ? fmt(lastBw()) : "кг", value: data.draft.bw || "", oninput: (e) => { data.draft.bw = e.target.value; save(); }});
  root.append(h("div", {class:"grid2"},
    h("div", {class:"field"}, h("label", {class:"lbl", for:"f-date"}, "Дата"), dateIn),
    h("div", {class:"field"}, h("label", {class:"lbl", for:"f-bw"}, "Вес тела, кг"), bwIn)));

  const first = data.workouts[data.workouts.length - 1];
  if (!first || (Date.now() - pd(first.date).getTime()) < 14 * 864e5){
    root.append(h("p", {class:"banner"}, "Первые 2 недели: ни одного подхода до отказа, оставляй 2–3 повтора в запасе."));
  }

  rows = [];
  const list = h("ol", {class:"exlist"});
  day.slots.forEach((slot, i) => list.append(slotCard(slot, i)));
  root.append(list);

  const msg = h("p", {class:"msg", id:"save-msg", role:"status"});
  root.append(h("div", {class:"sec"},
    h("button", {type:"button", class:"btn primary big", onclick: () => saveWorkout(day, msg)}, "Сохранить: " + day.name), msg));
}

function slotCard(slot, i){
  const v = variantOf(slot);
  const e = ex(v);
  const ds = data.draft.s[slot.uid] || {};
  const last = lastFor(v);
  const s = suggest(slot, v, last);
  const base = "s-" + slot.uid;

  const wIn = h("input", {class:"inp num", id:base+"-w", inputmode:"decimal", autocomplete:"off", placeholder: e.kind === "bw" ? "0" : "кг"});
  wIn.value = ds.w !== undefined ? ds.w : (s.weight != null ? fmt(s.weight) : "");
  wIn.addEventListener("input", () => { const d = dslot(slot.uid); d.v = v; d.w = wIn.value; save(); });
  const rIns = [];
  for (let k = 0; k < slot.sets; k++){
    const inp = h("input", {class:"inp num", id:base+"-r"+k, inputmode:"numeric", autocomplete:"off", placeholder:String(slot.hi)});
    if (ds.r && ds.r[k] != null) inp.value = ds.r[k];
    inp.addEventListener("input", () => { const d = dslot(slot.uid); d.v = v; d.r = d.r || []; d.r[k] = inp.value; save(); });
    rIns.push(inp);
  }
  rows.push({slot, v, wIn, rIns});

  const fields = [h("div", {class:"field"}, h("label", {class:"lbl", for:wIn.id}, wLabel(v)), wIn)]
    .concat(rIns.map((inp, k) => h("div", {class:"field"}, h("label", {class:"lbl", for:inp.id}, "Подход " + (k+1)), inp)));
  let sets;
  if (slot.sets <= 4) sets = h("div", {class:"sets", style:"--n:" + slot.sets}, fields);
  else sets = h("div", {class:"sets many"}, fields);

  return h("li", {class:"ex"},
    h("div", {class:"ex-head"},
      h("span", {class:"ex-num", "aria-hidden":"true"}, String(i + 1)),
      h("div", null, h("h3", {class:"ex-name"}, e.name),
        h("p", {class:"ex-target"}, h("b", null, slot.sets + " × " + slot.lo + "–" + slot.hi), " · отдых " + mmss(slot.rest)))),
    slot.ex.length > 1 ? h("div", {class:"chips", role:"group", "aria-label":"Вариант"},
      slot.ex.map(id => h("button", {type:"button", class:"chip", "aria-pressed":String(id === v), onclick: () => {
        if (id === v) return; const d = dslot(slot.uid); d.v = id; delete d.w; d.r = []; save(); renderTrain();
      }}, ex(id).name))) : null,
    h("div", {class:"ex-tools"},
      h("button", {type:"button", class:"btn sm", onclick: () => openTech(v)}, h("span", {html:ICON.info, style:"width:16px;height:16px;display:inline-grid"}), "Техника"),
      h("button", {type:"button", class:"btn sm", onclick: () => startTimer(slot.rest)}, h("span", {html:ICON.play, style:"width:16px;height:16px;display:inline-grid"}), "Отдых " + mmss(slot.rest))),
    slot.note ? h("p", {class:"ex-note"}, slot.note) : null,
    h("p", {class:"ex-last"}, last ? [h("span", {class:"k"}, "Прошлый раз, " + shortD(last.date) + ": "), itemLine(last.item)] : h("span", {class:"k"}, "Ещё не делал")),
    h("p", {class:"hint " + s.kind}, s.text),
    sets);
}

function lastBw(){ for (const w of data.workouts) if (w.bw > 0) return w.bw; return null; }

function saveWorkout(day, msg){
  const date = $("#f-date").value || today();
  const bw = num($("#f-bw").value);
  const items = [];
  rows.forEach(row => {
    const reps = row.rIns.map(inp => { const n = Math.round(num(inp.value)); return isFinite(n) && n > 0 && n < 300 ? n : 0; });
    if (!reps.some(r => r > 0)) return;
    let w = num(row.wIn.value); if (!isFinite(w) || w < 0 || w > 700) w = 0;
    items.push({exId: row.v, name: ex(row.v).name, weight: r2(w), reps});
  });
  if (!items.length){ msg.textContent = "Впиши повторы хотя бы в одном упражнении."; msg.className = "msg err"; return; }

  const prevBest = {};
  items.forEach(it => { prevBest[it.exId] = bestFor(it.exId); });
  const now = new Date(), d = pd(date); d.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
  const w = {id:uid(), date, ts:d.getTime(), day:day.id, dayName:day.name, bw: isFinite(bw) && bw > 20 && bw < 300 ? Math.round(bw*10)/10 : null, items};
  data.workouts.push(w);
  data.workouts.sort((a, b) => b.ts - a.ts);
  rows.forEach(row => { data.choice[row.slot.uid] = row.v; });
  data.draft = {s:{}};
  save(true);

  items.forEach(it => {
    const pb = prevBest[it.exId];
    if (!pb) return;
    if (isBw(it.exId) && !(it.weight > 0)){
      const mr = Math.max.apply(null, it.reps);
      if (mr > pb.reps && pb.weight === 0) toast("Новый рекорд: " + it.name + " — " + mr + " повт.", true);
    } else {
      const best = Math.max.apply(null, it.reps.map(r => e1rm(it.weight, r)));
      if (best > pb.e1 + 0.01) toast("Новый рекорд: " + it.name + " — " + fmt(it.weight) + " кг × " + Math.max.apply(null, it.reps), true);
    }
  });
  checkAch();
  toast("Тренировка сохранена");
  renderTrain();
  window.scrollTo(0, 0);
}

/* ================= таймер ================= */
const timer = $("#timer"), tTime = $("#t-time"), tStop = $("#t-stop");
let tEnd = 0, tInt = null, actx = null, wake = null;
function beep(){
  try {
    if (!actx) return;
    const t0 = actx.currentTime;
    [0, .35, .7].forEach(off => {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = "square"; o.frequency.value = 880;
      g.gain.setValueAtTime(.0001, t0+off); g.gain.exponentialRampToValueAtTime(.2, t0+off+.02); g.gain.exponentialRampToValueAtTime(.0001, t0+off+.22);
      o.connect(g).connect(actx.destination); o.start(t0+off); o.stop(t0+off+.25);
    });
  } catch(e){}
  try { navigator.vibrate && navigator.vibrate([200,100,200]); } catch(e){}
}
async function wakeOn(){ try { if (navigator.wakeLock && !wake){ wake = await navigator.wakeLock.request("screen"); wake.addEventListener("release", () => { wake = null; }); } } catch(e){ wake = null; } }
function wakeOff(){ try { wake && wake.release(); } catch(e){} wake = null; }
function tick(){ const left = Math.max(0, Math.ceil((tEnd - Date.now())/1000)); tTime.textContent = mmss(left); if (left <= 0) stopTimer(true); }
function startTimer(sec){
  try { if (!actx){ const AC = window.AudioContext || window.webkitAudioContext; if (AC) actx = new AC(); } if (actx && actx.state === "suspended") actx.resume(); } catch(e){}
  tEnd = Date.now() + sec*1000; clearInterval(tInt); tInt = setInterval(tick, 250); tick();
  timer.classList.add("run"); timer.classList.remove("done"); tStop.hidden = false; wakeOn();
}
function stopTimer(done){
  clearInterval(tInt); tInt = null; timer.classList.remove("run"); tStop.hidden = true; wakeOff(); tTime.textContent = "0:00";
  if (view !== "train") setTimeout(() => { if (!tInt && view !== "train") timer.hidden = true; }, done ? 4000 : 0);
  if (done){ timer.classList.add("done"); beep(); setTimeout(() => timer.classList.remove("done"), 4000); }
}
timer.querySelectorAll("[data-sec]").forEach(b => b.addEventListener("click", () => startTimer(Number(b.dataset.sec))));
tStop.addEventListener("click", () => stopTimer(false));
document.addEventListener("visibilitychange", () => { if (!document.hidden && tInt){ tick(); wakeOn(); } });

/* ================= питание ================= */
let foodDate = today();
function dayFood(d){ return data.food[d] || []; }
function totals(d){ return dayFood(d).reduce((a, f) => { a.k += f.kcal * f.n; a.p += f.p * f.n; return a; }, {k:0, p:0}); }
function addFood(item){
  const list = data.food[foodDate] || (data.food[foodDate] = []);
  const ex_ = list.find(f => f.name === item.name && f.kcal === item.kcal && f.p === item.p);
  if (ex_) ex_.n += 1; else list.push({name:item.name, kcal:item.kcal, p:item.p, n:1});
  save(); checkAch(); renderFood();
}
function renderFood(){
  const root = $("#v-food"); root.replaceChildren();
  const g = data.goals, t = totals(foodDate);
  const isToday = foodDate === today();
  root.append(h("div", {class:"datenav"},
    iconBtn("left", "Предыдущий день", () => { foodDate = addDays(foodDate, -1); renderFood(); }),
    h("b", null, isToday ? "Сегодня" : longD(foodDate)),
    iconBtn("right", "Следующий день", () => { if (!isToday){ foodDate = addDays(foodDate, 1); renderFood(); } })));

  const meter = (label, val, goal, unit) => {
    const pct = Math.min(100, goal ? val / goal * 100 : 0), left = Math.round(goal - val);
    return h("div", {class:"meter" + (val >= goal ? " done" : "")},
      h("span", {class:"lbl"}, label),
      h("div", {class:"big"}, fmt(Math.round(val)), h("small", null, " / " + fmt(goal) + " " + unit)),
      h("div", {class:"track"}, h("i", {style:"width:" + pct + "%"})),
      h("span", {class:"left"}, left > 0 ? "осталось " + fmt(left) + " " + unit : "цель выполнена"));
  };
  root.append(h("div", {class:"meters"}, meter("Калории", t.k, g.kcal, "ккал"), meter("Белок", t.p, g.protein, "г")));

  const list = dayFood(foodDate);
  const eaten = h("div", {class:"sec"}, h("h2", {class:"sec-h"}, "Съедено"));
  if (!list.length) eaten.append(h("p", {class:"empty"}, "Пока пусто. Нажми на продукт ниже, чтобы добавить порцию."));
  else eaten.append(h("div", {class:"list"}, list.map((f, i) => h("div", {class:"li"},
    h("div", null, h("div", {class:"t"}, f.name), h("div", {class:"s"}, fmt(f.kcal * f.n) + " ккал · " + fmt(r2(f.p * f.n)) + " г белка")),
    h("div", {class:"qty"},
      iconBtn("minus", "Убрать порцию", () => { f.n -= 1; if (f.n <= 0) list.splice(i, 1); if (!list.length) delete data.food[foodDate]; save(); renderFood(); }),
      h("b", null, "×" + f.n),
      iconBtn("plus", "Добавить порцию", () => { f.n += 1; save(); checkAch(); renderFood(); }))))));
  root.append(eaten);

  const quick = h("div", {class:"sec"}, h("h2", {class:"sec-h"}, "Быстро добавить"),
    h("div", {class:"foods"},
      data.myFoods.map(f => h("button", {type:"button", class:"food mine", onclick: () => addFood(f)}, h("b", null, f.name), h("span", null, f.kcal + " ккал · " + f.p + " г"))),
      PRESETS.map(f => h("button", {type:"button", class:"food", onclick: () => addFood(f)}, h("b", null, f.name), h("span", null, f.kcal + " ккал · " + f.p + " г")))),
    h("p", {class:"muted small"}, "Значения примерные, на одну порцию. Коктейль для массы: 0,5 л молока, банан, 50 г овсянки, ложка арахисовой пасты."));
  root.append(quick);

  const nm = h("input", {class:"inp", id:"cf-name", placeholder:"Например, плов", autocomplete:"off"});
  const kc = h("input", {class:"inp num", id:"cf-k", inputmode:"numeric", placeholder:"ккал"});
  const pr = h("input", {class:"inp num", id:"cf-p", inputmode:"decimal", placeholder:"г"});
  const keep = h("input", {type:"checkbox", id:"cf-keep", checked:true, style:"width:20px;height:20px;accent-color:var(--accent)"});
  const cmsg = h("p", {class:"msg", role:"status"});
  root.append(h("div", {class:"sec"}, h("h2", {class:"sec-h"}, "Своё блюдо"),
    h("div", {class:"field"}, h("label", {class:"lbl", for:"cf-name"}, "Название и порция"), nm),
    h("div", {class:"grid2"}, h("div", {class:"field"}, h("label", {class:"lbl", for:"cf-k"}, "Калории"), kc), h("div", {class:"field"}, h("label", {class:"lbl", for:"cf-p"}, "Белок, г"), pr)),
    h("label", {class:"row small", for:"cf-keep"}, keep, "Сохранить в «Быстро добавить»"),
    h("button", {type:"button", class:"btn primary", onclick: () => {
      const name = nm.value.trim(), k = Math.round(num(kc.value)), p = r2(num(pr.value) || 0);
      if (!name || !isFinite(k) || k <= 0){ cmsg.textContent = "Впиши название и калории."; cmsg.className = "msg err"; return; }
      const item = {name, kcal:k, p};
      if (keep.checked && !data.myFoods.find(f => f.name === name)) data.myFoods.unshift(item);
      addFood(item);
    }}, "Добавить"), cmsg));

  if (data.myFoods.length){
    root.append(h("details", {class:"sec"}, h("summary", {class:"sec-h", style:"cursor:pointer"}, "Мои блюда (" + data.myFoods.length + ")"),
      h("div", {class:"list"}, data.myFoods.map((f, i) => h("div", {class:"li"}, h("div", null, h("div", {class:"t"}, f.name), h("div", {class:"s"}, f.kcal + " ккал · " + f.p + " г")),
        iconBtn("x", "Удалить из списка", () => { data.myFoods.splice(i, 1); save(); renderFood(); }))))));
  }

  root.append(h("div", {class:"sec"}, h("h2", {class:"sec-h"}, "Калории за 7 дней"), weekBars()));

  const gk = h("input", {class:"inp num", id:"g-k", inputmode:"numeric", value:String(g.kcal)});
  const gp = h("input", {class:"inp num", id:"g-p", inputmode:"numeric", value:String(g.protein)});
  const upd = () => { const k = Math.round(num(gk.value)), p = Math.round(num(gp.value)); if (k >= 1000 && k <= 7000) g.kcal = k; if (p >= 30 && p <= 400) g.protein = p; save(); };
  gk.addEventListener("change", () => { upd(); renderFood(); }); gp.addEventListener("change", () => { upd(); renderFood(); });
  root.append(h("div", {class:"sec"}, h("h2", {class:"sec-h"}, "Цели на день"),
    h("div", {class:"grid2"}, h("div", {class:"field"}, h("label", {class:"lbl", for:"g-k"}, "Калории"), gk), h("div", {class:"field"}, h("label", {class:"lbl", for:"g-p"}, "Белок, г"), gp)),
    h("p", {class:"muted small"}, "Если вес 2 недели стоит на месте, прибавь к цели около 300 ккал.")));
}
function weekBars(){
  const W = 300, H = 120, P = 18, n = 7, g = data.goals.kcal;
  const ds = []; for (let i = n - 1; i >= 0; i--) ds.push(addDays(foodDate, -i));
  const vals = ds.map(d => totals(d).k);
  const max = Math.max(g * 1.15, Math.max.apply(null, vals));
  const bw = (W - P) / n - 8;
  let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Калории за неделю">';
  const gy = H - 18 - (g / max) * (H - 30);
  ds.forEach((d, i) => {
    const v = vals[i], bh = (v / max) * (H - 30), x = P + i * ((W - P) / n) + 4, y = H - 18 - bh;
    if (v > 0) s += '<rect class="barr' + (v >= g * 0.9 ? " ok" : "") + '" x="' + x + '" y="' + y + '" width="' + bw + '" height="' + bh + '" rx="3"/>';
    s += '<text class="tick" x="' + (x + bw/2) + '" y="' + (H - 4) + '" text-anchor="middle">' + pd(d).toLocaleDateString("ru-RU", {weekday:"short"}) + '</text>';
  });
  s += '<line class="goal" x1="' + P + '" x2="' + W + '" y1="' + gy + '" y2="' + gy + '"/><text class="tick" x="0" y="' + (gy + 3) + '">цель</text></svg>';
  return h("div", {class:"chart", html:s});
}

/* ================= прогресс ================= */
function bestFor(exId){
  let best = null;
  for (const w of data.workouts) for (const it of w.items){
    if (it.exId !== exId) continue;
    it.reps.forEach(r => {
      if (r <= 0) return;
      const e1 = e1rm(it.weight, r);
      if (!best || e1 > best.e1 || (e1 === best.e1 && (it.weight > best.weight || (it.weight === best.weight && r > best.reps)))) best = {e1, weight:it.weight, reps:r, date:w.date};
    });
  }
  return best;
}
function chartSVG(values, labels, unit){
  const W = 320, H = 150, L = 34, R = 10, T = 10, B = 22;
  const min = Math.min.apply(null, values), max = Math.max.apply(null, values);
  const pad = (max - min) * 0.15 || Math.max(1, max * 0.05);
  const lo = min - pad, hi = max + pad, n = values.length;
  const X = (i) => L + (n === 1 ? (W-L-R)/2 : i * (W-L-R)/(n-1));
  const Y = (v) => T + (1 - (v - lo)/(hi - lo)) * (H - T - B);
  const pts = values.map((v, i) => [X(i), Y(v)]);
  const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const area = line + " L" + pts[n-1][0].toFixed(1) + " " + (H-B) + " L" + pts[0][0].toFixed(1) + " " + (H-B) + " Z";
  let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img">';
  [max, (max+min)/2, min].forEach(v => { if (max === min && v !== max) return; const y = Y(v).toFixed(1); s += '<line class="grid" x1="' + L + '" x2="' + (W-R) + '" y1="' + y + '" y2="' + y + '"/><text class="tick" x="' + (L-4) + '" y="' + (Number(y)+3) + '" text-anchor="end">' + fmt(Math.round(v*10)/10) + '</text>'; });
  s += '<path class="area" d="' + area + '"/><path class="ln" d="' + line + '"/>';
  pts.forEach((p, i) => { s += '<circle class="dot" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + (i === n-1 ? 4 : 2.2) + '"/>'; });
  s += '<text class="tick" x="' + L + '" y="' + (H-6) + '">' + shortD(labels[0]) + '</text><text class="tick" x="' + (W-R) + '" y="' + (H-6) + '" text-anchor="end">' + shortD(labels[n-1]) + '</text></svg>';
  return s;
}
function chartCard(title, values, labels, unit){
  if (!values.length) return h("div", {class:"chart"}, h("span", {class:"lbl"}, title), h("p", {class:"empty"}, "Пока нет записей"));
  const cur = values[values.length-1], first = values[0], d = r2(cur - first);
  return h("div", {class:"chart"},
    h("span", {class:"lbl"}, title),
    h("div", {class:"chart-top"}, h("div", {class:"chart-val"}, fmt(cur), h("small", null, " " + unit)),
      values.length > 1 ? h("div", {class:"chart-d" + (d > 0 ? " pos" : "")}, "с начала " + (d > 0 ? "+" : d < 0 ? "−" : "±") + fmt(Math.abs(d)) + " " + unit) : null),
    values.length > 1 ? h("div", {html:chartSVG(values, labels, unit)}) : h("p", {class:"empty"}, "График появится после второй записи"));
}
let progEx = null;
function renderProg(){
  const root = $("#v-prog"); root.replaceChildren();
  const ws = data.workouts;
  const wk = weekKey(today());
  const thisWeek = ws.filter(w => weekKey(w.date) === wk).length;
  const st = streaks();
  const bws = ws.filter(w => w.bw > 0);
  const bwD = bws.length > 1 ? r2(bws[0].bw - bws[bws.length-1].bw) : null;
  root.append(h("dl", {class:"stats"},
    h("div", {class:"stat"}, h("dt", null, "Тренировок"), h("dd", null, String(ws.length), h("span", {class:"d"}, "на неделе: " + thisWeek))),
    h("div", {class:"stat"}, h("dt", null, "Серия"), h("dd", null, String(st.cur), h("span", {class:"d"}, plural(st.cur, "неделя", "недели", "недель") + " по 2+"))),
    h("div", {class:"stat"}, h("dt", null, "Вес тела"), h("dd", null, bws.length ? fmt(bws[0].bw) : "—", h("span", {class:"d" + (bwD > 0 ? " pos" : "")}, bwD == null ? "кг" : (bwD > 0 ? "+" : bwD < 0 ? "−" : "±") + fmt(Math.abs(bwD)) + " кг")))));

  // графики упражнений
  const done = {}; ws.slice().reverse().forEach(w => w.items.forEach(it => { if (it.weight > 0) done[it.exId] = it.name; }));
  const ids = Object.keys(done);
  const sec = h("div", {class:"sec"}, h("h2", {class:"sec-h"}, "Рабочие веса"));
  if (!ids.length) sec.append(h("p", {class:"empty"}, "После первой тренировки здесь появятся графики по каждому упражнению."));
  else {
    if (!progEx || !done[progEx]) progEx = ids.includes("bench") ? "bench" : ids[0];
    const sel = h("select", {class:"inp", id:"p-ex", "aria-label":"Упражнение", onchange: (e) => { progEx = e.target.value; renderProg(); }},
      ids.map(id => h("option", {value:id, selected: id === progEx}, ex(id).name)));
    const pts = [], lbs = [];
    ws.slice().reverse().forEach(w => { const it = w.items.find(x => x.exId === progEx && x.weight > 0); if (it){ pts.push(it.weight); lbs.push(w.date); } });
    sec.append(sel, chartCard(ex(progEx).name, pts, lbs, "кг"));
  }
  root.append(sec);
  root.append(h("div", {class:"sec"}, h("h2", {class:"sec-h"}, "Вес тела"), chartCard("Вес тела", bws.slice().reverse().map(w => w.bw), bws.slice().reverse().map(w => w.date), "кг")));

  // рекорды
  const recIds = {}; ws.forEach(w => w.items.forEach(it => { recIds[it.exId] = true; }));
  const recs = Object.keys(recIds).map(id => ({id, b:bestFor(id)})).filter(x => x.b);
  const rsec = h("div", {class:"sec"}, h("h2", {class:"sec-h"}, "Личные рекорды"));
  if (!recs.length) rsec.append(h("p", {class:"empty"}, "Рекорды появятся после первой тренировки."));
  else rsec.append(h("div", {class:"list"}, recs.sort((a, b) => b.b.e1 - a.b.e1).map(x => h("div", {class:"li"},
    h("div", null, h("div", {class:"t"}, ex(x.id).name), h("div", {class:"s"}, shortD(x.b.date) + (x.b.e1 > 0 ? " · расчётный максимум на 1 раз ≈ " + fmt(Math.round(x.b.e1)) + " кг" : ""))),
    h("div", {class:"v"}, x.b.weight > 0 ? fmt(x.b.weight) + " кг × " + x.b.reps : x.b.reps + " повт.")))));
  root.append(rsec);

  // достижения
  const list = achList();
  const got = list.filter(a => a.done).length;
  root.append(h("div", {class:"sec"}, h("h2", {class:"sec-h"}, "Достижения · " + got + " из " + list.length),
    h("div", {class:"ach"}, list.map(a => h("div", {class:"medal" + (a.done ? " on" : "")},
      h("div", {class:"ic", "aria-hidden":"true"}, a.icon),
      h("div", {class:"mt"}, a.title),
      h("div", {class:"md"}, a.done ? (data.ach[a.id] ? "получено " + shortD(data.ach[a.id]) : "получено") : a.desc),
      !a.done && a.pct != null ? h("div", {class:"pbar"}, h("i", {style:"width:" + Math.round(a.pct*100) + "%"})) : null)))));

  // история
  const hs = h("div", {class:"sec"}, h("h2", {class:"sec-h"}, "История"));
  if (!ws.length) hs.append(h("p", {class:"empty"}, "Сохранённые тренировки появятся здесь."));
  else hs.append(h("div", {class:"list"}, ws.map(w => {
    const acts = h("div", {class:"row", style:"margin-top:8px"});
    const del = h("button", {type:"button", class:"btn sm ghost", onclick: () => acts.replaceChildren(
      h("span", {class:"small"}, "Удалить запись?"),
      h("button", {type:"button", class:"btn sm danger", onclick: () => { data.workouts = data.workouts.filter(x => x.id !== w.id); save(true); renderProg(); }}, "Удалить"),
      h("button", {type:"button", class:"btn sm ghost", onclick: () => acts.replaceChildren(del)}, "Отмена"))}, "Удалить");
    acts.append(del);
    return h("details", {class:"li"},
      h("summary", null, h("span", {class:"badge"}, w.day), h("span", null, h("span", {class:"t"}, longD(w.date)), h("span", {class:"s", style:"display:block"}, w.dayName || "")), h("span", {class:"v muted"}, w.bw ? fmt(w.bw) + " кг" : "")),
      h("div", {class:"hbody"}, w.items.map(it => h("div", {class:"hline"}, h("span", null, it.name), h("span", null, itemLine(it)))), acts));
  })));
  root.append(hs);
}

/* ================= серии и достижения ================= */
function streaks(){
  const cnt = {}; data.workouts.forEach(w => { const k = weekKey(w.date); cnt[k] = (cnt[k]||0) + 1; });
  const good = Object.keys(cnt).filter(k => cnt[k] >= 2).sort();
  let max = 0, run = 0, prev = null;
  good.forEach(k => { run = (prev && addDays(prev, 7) === k) ? run + 1 : 1; max = Math.max(max, run); prev = k; });
  let cur = 0, k = weekKey(today());
  if (!(cnt[k] >= 2)) k = addDays(k, -7);
  while (cnt[k] >= 2){ cur++; k = addDays(k, -7); }
  return {cur, max};
}
function foodStreak(test){
  const ds = Object.keys(data.food).sort();
  let max = 0, run = 0, prev = null;
  ds.forEach(d => { if (!test(totals(d))){ run = 0; prev = d; return; } run = (prev && addDays(prev, 1) === d && run > 0) ? run + 1 : 1; max = Math.max(max, run); prev = d; });
  return max;
}
function achList(){
  const ws = data.workouts, n = ws.length;
  const st = streaks();
  const maxW = (ids) => { let m = 0; ws.forEach(w => w.items.forEach(it => { if (ids.includes(it.exId) && it.reps.some(r => r > 0)) m = Math.max(m, it.weight); })); return m; };
  const bench = maxW(["bench"]), legs = maxW(["squat","smith","hack"]);
  let pull = 0; ws.forEach(w => w.items.forEach(it => { if (it.exId === "pullup") pull = Math.max(pull, Math.max.apply(null, it.reps)); }));
  const bws = ws.filter(w => w.bw > 0); const gain = bws.length > 1 ? bws[0].bw - bws[bws.length-1].bw : 0;
  let ton = 0; ws.forEach(w => w.items.forEach(it => { if (it.weight > 0) it.reps.forEach(r => { ton += it.weight * r; }); }));
  let prs = 0; const best = {};
  ws.slice().reverse().forEach(w => w.items.forEach(it => { const b = Math.max.apply(null, it.reps.map(r => e1rm(it.weight, r))); if (b <= 0) return; if (best[it.exId] != null && b > best[it.exId] + 0.01) prs++; best[it.exId] = Math.max(best[it.exId] || 0, b); }));
  const g = data.goals;
  const pDays = foodStreak(t => t.p >= g.protein), kDays = foodStreak(t => t.k >= g.kcal * 0.9);
  const A = [];
  const a = (id, icon, title, desc, val, goal) => A.push({id, icon, title, desc, done: val >= goal, pct: Math.min(1, goal ? val / goal : 0)});
  a("w1", "1", "Первая тренировка", "Сохрани первую тренировку", n, 1);
  a("w10", "10", "10 тренировок", n + " из 10", n, 10);
  a("w25", "25", "25 тренировок", n + " из 25", n, 25);
  a("w50", "50", "50 тренировок", n + " из 50", n, 50);
  a("w100", "100", "Сотка", n + " из 100 тренировок", n, 100);
  a("s4", "4н", "Месяц без пропусков", "4 недели подряд по 2+ тренировки", st.max, 4);
  a("s12", "12н", "Три месяца в строю", "12 недель подряд по 2+ тренировки", st.max, 12);
  a("b50", "50", "Жим 50 кг", "Лучший жим: " + fmt(bench) + " кг", bench, 50);
  a("b60", "60", "Жим 60 кг", "Лучший жим: " + fmt(bench) + " кг", bench, 60);
  a("b70", "70", "Жим 70 кг", "Новый рекорд выше старых 65", bench, 70);
  a("b80", "80", "Жим 80 кг", "Лучший жим: " + fmt(bench) + " кг", bench, 80);
  a("l100", "100", "Ноги 100 кг", "Гакк, Смит или присед: " + fmt(legs) + " кг", legs, 100);
  a("p10", "10×", "10 подтягиваний", "Лучший подход: " + pull, pull, 10);
  a("g2", "+2", "+2 кг массы", "С первого замера: " + (gain > 0 ? "+" : "") + fmt(r2(gain)) + " кг", gain, 2);
  a("g5", "+5", "+5 кг массы", "С первого замера: " + (gain > 0 ? "+" : "") + fmt(r2(gain)) + " кг", gain, 5);
  a("t10", "10т", "10 тонн", "Поднято всего: " + fmt(Math.round(ton/100)/10) + " т", ton, 10000);
  a("t100", "100т", "100 тонн", "Поднято всего: " + fmt(Math.round(ton/100)/10) + " т", ton, 100000);
  a("pr10", "PR", "10 рекордов", "Побито рекордов: " + prs, prs, 10);
  a("fp7", "Б7", "Неделя белка", "7 дней подряд белок по цели", pDays, 7);
  a("fk7", "К7", "Неделя профицита", "7 дней подряд калории ≥ 90% цели", kDays, 7);
  return A;
}
function checkAch(){
  achList().forEach(a => { if (a.done && !data.ach[a.id]){ data.ach[a.id] = today(); toast("Достижение: " + a.title, true); } });
  save();
}

/* ================= программа ================= */
function renderPlan(){
  const root = $("#v-plan"); root.replaceChildren();
  days().forEach((d, di) => {
    const nameIn = h("input", {class:"inp", id:"dn-" + d.id, value:d.name, "aria-label":"Название дня", onchange: (e) => { d.name = e.target.value.trim() || d.name; save(); }});
    const card = h("div", {class:"daycard"},
      h("div", {class:"row", style:"flex-wrap:nowrap"}, h("span", {class:"badge"}, d.id), nameIn,
        days().length > 1 ? iconBtn("x", "Удалить день", () => confirmSheet("Удалить «" + d.name + "»?", "Записи прошлых тренировок останутся.", () => { data.program.days.splice(di, 1); if (data.draft.day === d.id) delete data.draft.day; save(true); renderPlan(); })) : null));
    d.slots.forEach((s, si) => {
      const names = s.ex.map(id => ex(id).name);
      card.append(h("div", {class:"slot"},
        h("span", {class:"n"}, String(si + 1)),
        h("div", {style:"min-width:0"}, h("div", {class:"t"}, names[0]), h("div", {class:"s"}, s.sets + " × " + s.lo + "–" + s.hi + " · отдых " + mmss(s.rest) + (names.length > 1 ? " · замены: " + names.slice(1).join(", ") : ""))),
        h("div", {class:"acts"},
          si > 0 ? iconBtn("up", "Выше", () => { d.slots.splice(si - 1, 0, d.slots.splice(si, 1)[0]); save(); renderPlan(); }) : null,
          si < d.slots.length - 1 ? iconBtn("down", "Ниже", () => { d.slots.splice(si + 1, 0, d.slots.splice(si, 1)[0]); save(); renderPlan(); }) : null,
          iconBtn("edit", "Изменить", () => editSlot(d, si)))));
    });
    card.append(h("button", {type:"button", class:"btn", onclick: () => editSlot(d, -1)}, "+ Добавить упражнение"));
    root.append(card);
  });
  root.append(h("button", {type:"button", class:"btn", onclick: () => {
    const used = days().map(d => d.id); const letter = "ABCDEFGH".split("").find(l => !used.includes(l)) || ("D" + used.length);
    data.program.days.push({id:letter, name:"Тренировка " + letter, slots:[]}); save(); renderPlan();
  }}, "+ Добавить день"));

  root.append(h("div", {class:"sec"}, h("h2", {class:"sec-h"}, "Данные"),
    h("p", {class:"muted small"}, "Всё хранится только на этом телефоне. Раз в пару недель сохраняй копию, чтобы ничего не потерять при смене телефона."),
    h("div", {class:"row"},
      h("button", {type:"button", class:"btn", onclick: exportData}, "Сохранить копию"),
      h("button", {type:"button", class:"btn", onclick: () => fileIn.click()}, "Загрузить копию")),
    h("button", {type:"button", class:"btn ghost", onclick: () => confirmSheet("Вернуть программу по умолчанию?", "Твои изменения в программе пропадут. Записи тренировок останутся.", () => { data.program = clone(window.DEFAULT_PROGRAM); delete data.draft.day; save(true); renderPlan(); })}, "Вернуть программу по умолчанию")));
}

function confirmSheet(title, text, yes){
  openSheet(title, h("div", {class:"sec"}, h("p", null, text),
    h("div", {class:"grid2"}, h("button", {type:"button", class:"btn", onclick: closeSheet}, "Отмена"),
      h("button", {type:"button", class:"btn primary", onclick: () => { closeSheet(); yes(); }}, "Да"))));
}

function editSlot(day, si){
  const isNew = si < 0;
  const s = isNew ? {uid:uid(), ex:[], sets:3, lo:8, hi:12, rest:90, note:""} : clone(day.slots[si]);
  const body = h("div", {class:"sec"});
  const err = h("p", {class:"msg err", role:"status"});
  let q = "";
  function draw(){
    const sel = h("div", {class:"sel"}, s.ex.length ? s.ex.map((id, i) => h("div", {class:"selrow"},
      h("span", {class:"tag"}, i === 0 ? "основное" : "замена"),
      h("span", {style:"min-width:0"}, ex(id).name),
      i > 0 ? iconBtn("up", "Сделать основным", () => { s.ex.splice(i - 1, 0, s.ex.splice(i, 1)[0]); draw(); }) : h("span"),
      iconBtn("x", "Убрать", () => { s.ex.splice(i, 1); draw(); }))) : h("p", {class:"muted small"}, "Выбери упражнение из списка. Можно выбрать несколько: первое основное, остальные — замены."));
    const search = h("input", {class:"inp", id:"ex-q", placeholder:"Поиск упражнения", value:q, autocomplete:"off"});
    const pick = h("div", {class:"pick"});
    const fill = () => {
      pick.replaceChildren();
      const all = Object.keys(LIB).concat(Object.keys(data.custom));
      all.filter(id => ex(id).name.toLowerCase().includes(q.toLowerCase())).forEach(id => {
        const e = ex(id); const on = s.ex.includes(id);
        pick.append(h("button", {type:"button", "aria-pressed":String(on), onclick: () => { if (on) s.ex.splice(s.ex.indexOf(id), 1); else s.ex.push(id); draw(); }},
          e.name, h("span", null, on ? "выбрано" : e.kind === "bw" ? "свой вес" : e.kind === "db" ? "гантели" : "")));
      });
    };
    search.addEventListener("input", () => { q = search.value; fill(); });
    fill();

    const cName = h("input", {class:"inp", id:"cx-n", placeholder:"Название", autocomplete:"off"});
    const cKind = h("select", {class:"inp", id:"cx-k"}, h("option", {value:"weight"}, "Штанга или тренажёр"), h("option", {value:"db"}, "Гантели"), h("option", {value:"bw"}, "Свой вес"));
    const custom = h("details", null, h("summary", {class:"small", style:"cursor:pointer;font-weight:600"}, "Нет в списке? Создать своё"),
      h("div", {class:"sec", style:"margin-top:10px"}, cName, cKind, h("button", {type:"button", class:"btn", onclick: () => {
        const name = cName.value.trim(); if (!name) return;
        const id = "c_" + uid(); const kind = cKind.value;
        data.custom[id] = {name, kind, step: kind === "db" ? 2 : kind === "bw" ? 2.5 : 5};
        s.ex.push(id); save(); draw();
      }}, "Создать и добавить")));

    const setsB = h("b", null, String(s.sets));
    const lo = h("input", {class:"inp num", id:"sl-lo", inputmode:"numeric", value:String(s.lo)});
    const hi = h("input", {class:"inp num", id:"sl-hi", inputmode:"numeric", value:String(s.hi)});
    lo.addEventListener("input", () => { s.lo = Math.round(num(lo.value)) || s.lo; });
    hi.addEventListener("input", () => { s.hi = Math.round(num(hi.value)) || s.hi; });
    const rest = h("select", {class:"inp", id:"sl-rest", onchange: (e) => { s.rest = Number(e.target.value); }},
      [45, 60, 90, 105, 120, 150, 180, 240].map(v => h("option", {value:String(v), selected: v === s.rest}, mmss(v))));
    const note = h("textarea", {class:"inp", id:"sl-note", placeholder:"Заметка, например «Старт: 40 кг»", oninput: (e) => { s.note = e.target.value; }});
    note.value = s.note || "";

    body.replaceChildren(
      h("h3", {class:"sec-h"}, "Упражнение"), sel, search, pick, custom,
      h("div", {class:"grid2"},
        h("div", {class:"field"}, h("span", {class:"lbl"}, "Подходы"), h("div", {class:"stepper"},
          iconBtn("minus", "Меньше подходов", () => { if (s.sets > 1){ s.sets--; setsB.textContent = s.sets; } }), setsB,
          iconBtn("plus", "Больше подходов", () => { if (s.sets < 8){ s.sets++; setsB.textContent = s.sets; } }))),
        h("div", {class:"field"}, h("label", {class:"lbl", for:"sl-rest"}, "Отдых"), rest)),
      h("div", {class:"grid2"},
        h("div", {class:"field"}, h("label", {class:"lbl", for:"sl-lo"}, "Повторы от"), lo),
        h("div", {class:"field"}, h("label", {class:"lbl", for:"sl-hi"}, "до"), hi)),
      h("div", {class:"field"}, h("label", {class:"lbl", for:"sl-note"}, "Заметка"), note),
      err,
      h("div", {class:"grid2"},
        isNew ? h("button", {type:"button", class:"btn", onclick: closeSheet}, "Отмена")
          : h("button", {type:"button", class:"btn danger", onclick: () => { day.slots.splice(si, 1); save(true); closeSheet(); renderPlan(); }}, "Удалить"),
        h("button", {type:"button", class:"btn primary", onclick: () => {
          if (!s.ex.length){ err.textContent = "Выбери хотя бы одно упражнение."; return; }
          if (!(s.lo >= 1 && s.hi >= s.lo && s.hi <= 50)){ err.textContent = "Проверь повторы: «от» не больше «до», до 50."; return; }
          if (isNew) day.slots.push(s); else day.slots[si] = s;
          save(true); closeSheet(); renderPlan();
        }}, "Сохранить")));
  }
  draw();
  openSheet(isNew ? "Новое упражнение" : "Изменить упражнение", body);
}

/* ================= копия данных ================= */
const fileIn = h("input", {type:"file", accept:"application/json,.json", hidden:true});
document.body.append(fileIn);
async function exportData(){
  const json = JSON.stringify(data);
  const name = "kachalka-" + today() + ".json";
  try {
    const file = new File([json], name, {type:"application/json"});
    if (navigator.canShare && navigator.canShare({files:[file]})){ await navigator.share({files:[file], title:"Копия «Тетради качалки»"}); return; }
  } catch(e){ if (e && e.name === "AbortError") return; }
  try {
    const a = h("a", {href:URL.createObjectURL(new Blob([json], {type:"application/json"})), download:name});
    document.body.append(a); a.click(); a.remove(); toast("Файл копии сохранён");
  } catch(e){ toast("Не получилось сохранить файл"); }
}
fileIn.addEventListener("change", async () => {
  const f = fileIn.files && fileIn.files[0]; fileIn.value = "";
  if (!f) return;
  try {
    const d = JSON.parse(await f.text());
    if (!d || d.v !== 2 || !Array.isArray(d.workouts) || !d.program) throw new Error("bad");
    confirmSheet("Загрузить копию?", "В копии " + d.workouts.length + " тренировок. Текущие данные на телефоне заменятся.", () => {
      data = Object.assign(blank(), d); save(true); toast("Копия загружена"); go("train");
    });
  } catch(e){ toast("Это не файл копии «Тетради качалки»"); }
});

/* ================= PWA ================= */
function isStandalone(){ return window.navigator.standalone === true || matchMedia("(display-mode: standalone)").matches; }
function isIOS(){ return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); }
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")){
  window.addEventListener("load", () => { navigator.serviceWorker.register("sw.js").catch(() => {}); });
}

window.__kachalka = {openTech};
go("train");
})();
