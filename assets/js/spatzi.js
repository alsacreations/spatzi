// Spätzi — vérificateur de contrastes (WCAG 2.2, APCA, OKLCH, daltonismes)

// DOM helpers
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const root = document.documentElement;

/* ==========================================
 * Calculs colorimétriques
 * ========================================== */

const lin = (c) => {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};
const gam = (c) =>
  c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const round = (v, d) => +v.toFixed(d);
const toHex = (rgb) =>
  "#" +
  rgb
    .map((v) =>
      Math.round(clamp(v, 0, 255))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");
const luminance = (rgb) => {
  const [r, g, b] = rgb.map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
// Gris neutre le plus doux qui reste lisible (AA) sur `bg`, noir ou blanc à défaut
function neutralOn(bg) {
  const darken = contrast([0, 0, 0], bg) >= contrast([255, 255, 255], bg);
  for (let g = 128; g >= 0 && g <= 255; g += darken ? -1 : 1) {
    if (contrast([g, g, g], bg) >= 4.5) return toHex([g, g, g]);
  }
  return darken ? "#000000" : "#ffffff";
}
// Valeurs tronquées (et non arrondies) : 4,499 n'atteint pas 4,5
const fmt = (r, d = 2) => {
  const p = Math.pow(10, d);
  return (Math.floor(r * p) / p).toFixed(d).replace(".", ",");
};
const fmtLc = (lc) => (lc < 0 ? "−" : "") + Math.floor(Math.abs(lc));

// Convertit n'importe quelle couleur CSS en sRGB 8 bits, composée sur `under`
let ctx = null;
function raster(str, under) {
  let s = (str || "").trim();
  if (/^([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(s)) s = "#" + s;
  if (!s || !CSS.supports("color", s)) return null;
  if (!ctx) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    ctx = canvas.getContext("2d", { willReadFrequently: true });
  }
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = toHex(under);
  ctx.fillRect(0, 0, 1, 1);
  ctx.fillStyle = s;
  ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return [d[0], d[1], d[2]];
}

// APCA 0.0.98G (Lc signé : négatif si le texte est plus clair que le fond)
function apca(txt, bg) {
  const Y = (rgb) => {
    const [r, g, b] = rgb.map((c) => Math.pow(c / 255, 2.4));
    return 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  };
  let yt = Y(txt);
  let yb = Y(bg);
  if (yt < 0.022) yt += Math.pow(0.022 - yt, 1.414);
  if (yb < 0.022) yb += Math.pow(0.022 - yb, 1.414);
  if (Math.abs(yb - yt) < 0.0005) return 0;
  let o;
  if (yb > yt) {
    const s = (Math.pow(yb, 0.56) - Math.pow(yt, 0.57)) * 1.14;
    o = s < 0.1 ? 0 : s - 0.027;
  } else {
    const s = (Math.pow(yb, 0.65) - Math.pow(yt, 0.62)) * 1.14;
    o = s > -0.1 ? 0 : s + 0.027;
  }
  return o * 100;
}

function apcaNote(lc) {
  if (lc >= 90) return "Idéal pour le texte courant";
  if (lc >= 75) return "Minimum pour le texte courant";
  if (lc >= 60) return "Texte secondaire, intitulés";
  if (lc >= 45) return "Grands titres uniquement";
  if (lc >= 30) return "Texte non essentiel, placeholder";
  if (lc >= 15) return "Éléments non textuels seulement";
  return "Invisible pour beaucoup de lecteurs";
}

function toOklch(rgb) {
  const [r, g, b] = rgb.map(lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), Math.atan2(B, A)];
}

// OKLCH (teinte en radians) vers sRGB linéaire, sans correction de gamut
function oklchToLinear(L, C, h) {
  const A = C * Math.cos(h);
  const B = C * Math.sin(h);
  const l = Math.pow(L + 0.3963377774 * A + 0.2158037573 * B, 3);
  const m = Math.pow(L - 0.1055613458 * A - 0.0638541728 * B, 3);
  const s = Math.pow(L - 0.0894841775 * A - 1.291485548 * B, 3);
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const inGamut = (rgb) => rgb.every((v) => v >= -0.0005 && v <= 1.0005);

// Réduit la chroma jusqu'à revenir dans le gamut sRGB
function fromOklch(L, C, h) {
  let out;
  for (let i = 0; i < 80; i++) {
    out = oklchToLinear(L, C, h);
    if (inGamut(out)) break;
    C *= 0.9;
  }
  return out.map((v) => Math.round(gam(clamp(v, 0, 1)) * 255));
}

// Couleur la plus proche (luminosité OKLCH seule) dont le score atteint la cible
function suggest(adj, target, scoreOf) {
  if (scoreOf(adj) >= target) return { ok: true, rgb: adj };
  const [L, C, h] = toOklch(adj);
  let best = null;
  for (const dir of [1, -1]) {
    for (let k = 1; k <= 220; k++) {
      const nl = L + dir * k * 0.005;
      if (nl < -0.001 || nl > 1.001) break;
      const rgb = fromOklch(clamp(nl, 0, 1), C, h);
      if (scoreOf(rgb) >= target) {
        if (!best || k < best.k) best = { k, rgb };
        break;
      }
    }
  }
  return best ? { ok: false, rgb: best.rgb } : null;
}

// Simulation des daltonismes (matrices de Machado et al., sévérité maximale)
const CVD = [
  {
    name: "Protanopie",
    desc: "Insensibilité au rouge",
    m: [
      [0.152286, 1.052583, -0.204868],
      [0.114503, 0.786281, 0.099216],
      [-0.003882, -0.048116, 1.051998],
    ],
  },
  {
    name: "Deutéranopie",
    desc: "Insensibilité au vert",
    m: [
      [0.367322, 0.860646, -0.227968],
      [0.280085, 0.672501, 0.047413],
      [-0.01182, 0.04294, 0.968881],
    ],
  },
  {
    name: "Tritanopie",
    desc: "Insensibilité au bleu",
    m: [
      [1.255528, -0.076749, -0.178779],
      [-0.078411, 0.930809, 0.147602],
      [0.004733, 0.691367, 0.3039],
    ],
  },
  { name: "Achromatopsie", desc: "Vision sans couleurs", m: null },
];

function simulate(rgb, m) {
  const v = rgb.map(lin);
  if (!m) {
    const y = 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
    return [y, y, y].map((c) => Math.round(gam(c) * 255));
  }
  return m.map((r) =>
    Math.round(gam(clamp(r[0] * v[0] + r[1] * v[1] + r[2] * v[2], 0, 1)) * 255),
  );
}

/* ==========================================
 * Méthodes de calcul (WCAG 2.2 / APCA)
 * ========================================== */

const METHODS = {
  wcag: {
    label: "Contraste WCAG : ",
    note: "Norme en vigueur, exigée par le RGAA (niveau AA).",
    score: (fg, bg) => contrast(fg, bg),
    big: (r) => fmt(r),
    short: (r) => fmt(r, 1),
    full: (r) => `${fmt(r)}:1`,
    // Niveau atteint pour du texte courant (badges des daltonismes et de la matrice)
    level(r) {
      if (r >= 7) return { label: "AAA", level: "aaa" };
      if (r >= 4.5) return { label: "AA", level: "aa" };
      if (r >= 3) return { label: "AA grand", level: "large" };
      return { label: "Échec", level: "fail" };
    },
    targets: [
      { target: 4.5, name: "AA · 4,5:1" },
      { target: 7, name: "AAA · 7:1" },
    ],
    criteria: [
      { label: "Texte courant", name: "AA", detail: "4,5:1", t: 4.5 },
      { label: "Texte courant", name: "AAA", detail: "7:1", t: 7 },
      { label: "Grand texte", name: "AA", detail: "3:1", t: 3 },
      { label: "Grand texte", name: "AAA", detail: "4,5:1", t: 4.5 },
      { label: "Composants", name: "AA", detail: "3:1", t: 3 },
    ],
    // Grand texte à partir de 24 px, ou 18,66 px en gras
    category: (size, bold, ui) =>
      ui ? "ui" : size >= 24 || (bold && size >= 18.66) ? "large" : "normal",
    // Seuil AA par catégorie de texte
    minimum: {
      normal: { t: 4.5, label: "4,5:1" },
      large: { t: 3, label: "3:1" },
      ui: { t: 3, label: "3:1" },
    },
  },
  apca: {
    label: "Contraste APCA Lc : ",
    note: "Méthode perceptuelle à l'étude pour les futures WCAG 3, donnée à titre indicatif.",
    score: (fg, bg) => apca(fg, bg),
    big: (lc) => fmtLc(lc),
    short: (lc) => `Lc ${fmtLc(lc)}`,
    full: (lc) => `Lc ${fmtLc(lc)}`,
    level(lc) {
      const abs = Math.abs(lc);
      if (abs >= 90) return { label: "Idéal", level: "aaa" };
      if (abs >= 75) return { label: "Courant", level: "aa" };
      if (abs >= 60) return { label: "Moyen", level: "large" };
      if (abs >= 45) return { label: "Grand", level: "large" };
      return { label: "Échec", level: "fail" };
    },
    targets: [
      { target: 60, name: "Lc 60 · texte moyen" },
      { target: 75, name: "Lc 75 · texte courant" },
    ],
    criteria: [
      { label: "Texte courant", name: "Lc 90", detail: "idéal", t: 90 },
      { label: "Texte courant", name: "Lc 75", detail: "< 24 px", t: 75 },
      { label: "Texte moyen", name: "Lc 60", detail: "≥ 24 px", t: 60 },
      { label: "Grand texte", name: "Lc 45", detail: "≥ 36 px", t: 45 },
    ],
    // Texte moyen à partir de 24 px (16 px en gras), grand à partir de 36 px (24 px en gras)
    category(size, bold, ui) {
      if (ui) return "ui";
      if (size >= 36 || (bold && size >= 24)) return "large";
      if (size >= 24 || (bold && size >= 16)) return "medium";
      return "normal";
    },
    minimum: {
      normal: { t: 75, label: "Lc 75" },
      medium: { t: 60, label: "Lc 60" },
      large: { t: 45, label: "Lc 45" },
      ui: { t: 45, label: "Lc 45" },
    },
  },
};

/* ==========================================
 * État
 * ========================================== */

const HISTORY_KEY = "spatzi-history";
const METHOD_KEY = "spatzi-method";
const HEX_RE = /^#[0-9a-f]{6}$/i;
const OKLCH_RE =
  /^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)(?:deg)?\s*(?:\/[^)]*)?\)$/i;

const state = {
  fgInput: "#146af5",
  bgInput: "#ffffff",
  fg: [20, 106, 245],
  bg: [255, 255, 255],
  fgError: false,
  bgError: false,
  method: "wcag",
  oklchTarget: "fg",
  oklch: { l: 55, c: 0.2, h: 260 },
  palette: ["#111827", "#ffffff", "#146af5", "#acc737", "#e7b924", "#e44d26"],
  history: [],
  // Couleurs de départ (défaut ou lien partagé) pour « Réinitialiser »
  reference: null,
};

let historyTimer = null;
let toastTimer = null;
let analysisMemo = null;
// Évite de recalculer les curseurs pendant qu'on les manipule
let slidersDriving = false;

const method = () => METHODS[state.method];

/* ==========================================
 * Éléments
 * ========================================== */

const els = {
  colorInputs: $$(".js-color-input"),
  pickers: $$(".js-picker"),
  errors: $$(".js-error"),
  eyedroppers: $$(".js-eyedropper"),
  swap: $(".js-swap"),
  reset: $(".js-reset"),
  oklch: $(".js-oklch"),
  oklchTargets: $$(".js-oklch-target"),
  oklchSliders: $$(".js-oklch-slider"),
  oklchOutputs: $$(".js-oklch-output"),
  oklchValue: $(".js-oklch-value"),
  oklchHex: $(".js-oklch-hex"),
  gamut: $(".js-gamut"),
  methods: $$(".js-method"),
  methodNote: $(".js-method-note"),
  copyCss: $(".js-copy-css"),
  share: $(".js-share"),
  history: $(".js-history"),
  historyList: $(".js-history-list"),
  preview: $(".preview"),
  verdict: $(".js-verdict"),
  specimens: $$(".js-specimen"),
  ratioLabel: $(".js-ratio-label"),
  ratioPrefix: $(".js-ratio-prefix"),
  ratio: $(".js-ratio"),
  ratioUnit: $(".js-ratio-unit"),
  altValue: $(".js-alt-value"),
  altNote: $(".js-alt-note"),
  criteria: $(".js-criteria"),
  suggestions: $$(".js-suggestion"),
  cvdList: $(".js-cvd-list"),
  paletteList: $(".js-palette-list"),
  paletteForm: $(".js-palette-form"),
  paletteInput: $("#palette-input"),
  matrix: $(".js-matrix"),
  toast: $(".js-toast"),
};

/* ==========================================
 * Actions
 * ========================================== */

function setColors(fgInput, bgInput, { silent = false } = {}) {
  const bgRaw = raster(bgInput, [255, 255, 255]);
  const bg = bgRaw || state.bg;
  // Le texte est composé sur le fond (gestion de la transparence)
  const fgRaw = raster(fgInput, bg);
  const fg = fgRaw || state.fg;
  Object.assign(state, {
    fgInput,
    bgInput,
    fg,
    bg,
    fgError: !fgRaw,
    bgError: !bgRaw,
  });

  updateUrl();
  render();
  if (silent) return;

  clearTimeout(historyTimer);
  historyTimer = setTimeout(addToHistory, 1500);
}

// Lien partagé : #fg=146af5&bg=ffffff (&m=apca)
function shareHash() {
  const methodParam = state.method === "apca" ? "&m=apca" : "";
  return `#fg=${toHex(state.fg).slice(1)}&bg=${toHex(state.bg).slice(1)}${methodParam}`;
}

function updateUrl() {
  try {
    history.replaceState(null, "", shareHash());
  } catch {}
}

function addToHistory() {
  const item = { fg: toHex(state.fg), bg: toHex(state.bg) };
  state.history = [
    item,
    ...state.history.filter((h) => !(h.fg === item.fg && h.bg === item.bg)),
  ].slice(0, 8);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(state.history));
  } catch {}
  renderHistory();
}

// Charge un couple de couleurs et remonte jusqu'à l'outil
function load(fg, bg) {
  setColors(fg, bg);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  $("#outil").scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
}

function setMethod(name) {
  if (!METHODS[name]) return;
  state.method = name;
  els.methods.forEach((radio) => (radio.checked = radio.value === name));
  try {
    localStorage.setItem(METHOD_KEY, name);
  } catch {}
  updateUrl();
  render();
  renderPalette();
}

function flash(message) {
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  toastTimer = setTimeout(() => (els.toast.textContent = ""), 2200);
}

async function copy(text, message) {
  try {
    await navigator.clipboard.writeText(text);
    flash(message);
  } catch {
    flash("Copie impossible dans ce contexte");
  }
}

async function pick(target) {
  try {
    const result = await new window.EyeDropper().open();
    if (target === "fg") setColors(result.sRGBHex, state.bgInput);
    else setColors(state.fgInput, result.sRGBHex);
  } catch {}
}

function addPaletteColors(value) {
  const v = value.trim();
  if (!v) return;
  // Les notations fonctionnelles contiennent des virgules : on sépare alors par « ; »
  const parts = v.includes("(") ? v.split(/;|\n/) : v.split(/[\s,;]+/);
  const added = parts
    .map((p) => raster(p, [255, 255, 255]))
    .filter(Boolean)
    .map(toHex);
  if (!added.length) {
    flash("Aucune couleur reconnue");
    return;
  }
  const next = [...state.palette];
  added.forEach((h) => {
    if (!next.includes(h)) next.push(h);
  });
  state.palette = next.slice(0, 10);
  els.paletteInput.value = "";
  renderPalette();
}

/* ==========================================
 * OKLCH
 * ========================================== */

const oklchString = ({ l, c, h }) =>
  `oklch(${round(l, 1)}% ${round(c, 3)} ${round(h, 1)})`;

// Lit les valeurs OKLCH de la couleur ajustée (saisie oklch() ou couleur calculée)
function syncOklchFromColor() {
  const target = state.oklchTarget;
  const match = state[`${target}Input`].trim().match(OKLCH_RE);
  if (match) {
    const l = Number(match[1]);
    state.oklch = {
      l: match[2] ? l : l * 100,
      c: Number(match[3]),
      h: Number(match[4]) % 360,
    };
    return;
  }
  const [L, C, h] = toOklch(state[target]);
  state.oklch = {
    l: L * 100,
    c: C,
    // Teinte indéfinie pour les gris : on garde la précédente
    h: C < 0.002 ? state.oklch.h : ((h * 180) / Math.PI + 360) % 360,
  };
}

function onSliderInput() {
  const values = Object.fromEntries(
    els.oklchSliders.map((slider) => [
      slider.dataset.channel,
      Number(slider.value),
    ]),
  );
  state.oklch = values;
  const color = oklchString(values);
  slidersDriving = true;
  if (state.oklchTarget === "fg") setColors(color, state.bgInput);
  else setColors(state.fgInput, color);
  slidersDriving = false;
}

function renderOklch() {
  if (!slidersDriving) syncOklchFromColor();
  const { l, c, h } = state.oklch;
  const outputs = { l: `${round(l, 1)}%`, c: round(c, 3), h: round(h, 1) };

  els.oklchSliders.forEach((slider) => {
    if (!slidersDriving) slider.value = state.oklch[slider.dataset.channel];
  });
  els.oklchOutputs.forEach((output) => {
    output.textContent = outputs[output.dataset.channel];
  });
  els.oklch.style.setProperty("--ok-l", l / 100);
  els.oklch.style.setProperty("--ok-c", c);
  els.oklch.style.setProperty("--ok-h", h);

  els.oklchValue.textContent = oklchString(state.oklch);
  els.oklchHex.textContent = toHex(state[state.oklchTarget]);
  // La valeur HEX est alors la couleur sRGB la plus proche
  els.gamut.hidden = inGamut(oklchToLinear(l / 100, c, (h * Math.PI) / 180));
}

/* ==========================================
 * Rendu
 * ========================================== */

function analysis() {
  const m = method();
  const key = toHex(state.fg) + toHex(state.bg) + state.method;
  if (analysisMemo?.key === key) return analysisMemo;

  const { fg, bg } = state;
  const suggestions = els.suggestions.map((li) => {
    const adjustText = li.dataset.adjust === "fg";
    const { target, name } = m.targets[Number(li.dataset.rank) - 1];
    const scoreOf = (rgb) =>
      Math.abs(adjustText ? m.score(rgb, bg) : m.score(fg, rgb));
    const res = suggest(adjustText ? fg : bg, target, scoreOf);
    const score = res
      ? adjustText
        ? m.score(res.rgb, bg)
        : m.score(fg, res.rgb)
      : null;
    return { adjustText, name, res, score };
  });
  const cvd = CVD.map((type) => {
    const f = simulate(fg, type.m);
    const b = simulate(bg, type.m);
    return { ...type, fg: toHex(f), bg: toHex(b), score: m.score(f, b) };
  });

  analysisMemo = { key, suggestions, cvd };
  return analysisMemo;
}

function render() {
  const m = method();
  const fgHex = toHex(state.fg);
  const bgHex = toHex(state.bg);
  const score = m.score(state.fg, state.bg);

  root.style.setProperty("--pair-fg", fgHex);
  root.style.setProperty("--pair-bg", bgHex);
  root.style.setProperty("--pair-neutral", neutralOn(state.bg));

  // Champs (on ne réécrit pas un champ en cours de saisie)
  els.colorInputs.forEach((input) => {
    const t = input.dataset.target;
    const value = state[`${t}Input`];
    if (input.value !== value) input.value = value;
    input.setAttribute("aria-invalid", String(state[`${t}Error`]));
  });
  els.pickers.forEach((picker) => {
    picker.value = picker.dataset.target === "fg" ? fgHex : bgHex;
  });
  els.errors.forEach((error) => {
    error.hidden = !state[`${error.dataset.target}Error`];
  });

  renderOklch();

  els.methodNote.textContent = m.note;

  // Verdict (pour du texte courant) et valeur principale
  const verdict = m.level(score);
  els.verdict.textContent = verdict.label;
  els.verdict.dataset.level = verdict.level;
  els.ratioLabel.textContent = m.label;
  els.ratio.textContent = m.big(score);
  els.ratioPrefix.hidden = state.method !== "apca";
  els.ratioUnit.hidden = state.method !== "wcag";

  // Lecture secondaire : l'autre méthode
  if (state.method === "wcag") {
    const lc = apca(state.fg, state.bg);
    els.altValue.textContent = `APCA Lc ${fmtLc(lc)}`;
    els.altNote.textContent = apcaNote(Math.abs(lc));
  } else {
    const wcag = METHODS.wcag;
    const r = contrast(state.fg, state.bg);
    els.altValue.textContent = `WCAG ${wcag.full(r)}`;
    els.altNote.textContent = wcag.level(r).label;
  }

  renderSpecimens(score);
  renderCriteria(score);
  renderSuggestions();
  renderCvd();
}

// Conformité de chaque cas de texte (taille, graisse, icônes)
function renderSpecimens(score) {
  const m = method();
  els.specimens.forEach((item) => {
    const { size, bold, kind } = item.dataset;
    const category = m.category(Number(size), bold !== undefined, kind === "ui");
    const { t, label } = m.minimum[category];
    const ok = Math.abs(score) >= t;
    const status = $(".js-specimen-status", item);
    status.dataset.level = ok ? "aaa" : "fail";
    status.innerHTML = `<span aria-hidden="true">${ok ? "✓" : "✕"}</span> ${ok ? "Conforme" : "Non conforme"}`;
    $(".js-specimen-threshold", item).textContent = label;
  });
}

function renderCriteria(score) {
  els.criteria.innerHTML = method()
    .criteria.map((c) => {
      const ok = Math.abs(score) >= c.t;
      return `
      <li class="criterion">
        <div class="criterion-header">
          <span class="small">${c.label}</span>
        </div>
        <div class="criterion-level">
          <span class="criterion-name">${c.name}</span>
          <span class="mono small">${c.detail}</span>
        </div>
        <span class="badge" data-level="${ok ? "aaa" : "fail"}">${ok ? "✓ Réussi" : "✕ Échec"}</span>
      </li>`;
    })
    .join("");
}

function renderSuggestions() {
  const m = method();
  const { suggestions } = analysis();
  const fgHex = toHex(state.fg);
  const bgHex = toHex(state.bg);

  els.suggestions.forEach((li, i) => {
    const { adjustText, name, res, score } = suggestions[i];
    const hex = res ? toHex(res.rgb) : null;
    const sampleFg = res && adjustText ? hex : fgHex;
    const sampleBg = res && !adjustText ? hex : bgHex;
    let detail = "Hors d'atteinte";
    if (res) detail = res.ok ? "Déjà conforme" : `Obtenu : ${m.full(score)}`;
    const canApply = res && !res.ok;
    const what = adjustText ? "au texte" : "au fond";

    li.className = "swatch-card js-suggestion";
    li.innerHTML = `
      <div class="suggestion-sample" style="background:${sampleBg};color:${sampleFg}">
        <span class="suggestion-aa" aria-hidden="true">Aa</span>
        <span class="suggestion-hex">${hex ?? "—"}</span>
      </div>
      <div class="suggestion-footer">
        <div class="suggestion-info">
          <span class="swatch-card-strong">${name}</span>
          <span class="small">${detail}</span>
        </div>
        ${
          canApply
            ? `<button type="button" class="btn btn-primary" data-apply="${adjustText ? "fg" : "bg"}" data-hex="${hex}" aria-label="Appliquer ${hex} ${what}">Appliquer</button>`
            : ""
        }
      </div>`;
  });
}

function renderCvd() {
  const m = method();
  const { cvd } = analysis();
  els.cvdList.innerHTML = cvd
    .map((v) => {
      const lv = m.level(v.score);
      const value =
        state.method === "wcag"
          ? `${fmt(v.score)}<span class="cvd-ratio-unit">:1</span>`
          : `<span class="cvd-ratio-unit">Lc </span>${fmtLc(v.score)}`;
      return `
      <li class="swatch-card">
        <div class="cvd-sample" style="background:${v.bg};color:${v.fg}">
          <span class="cvd-ratio">${value}</span>
          <span>Texte de démonstration</span>
        </div>
        <div class="cvd-info">
          <div class="cvd-header">
            <h3 class="swatch-card-strong cvd-name">${v.name}</h3>
            <span class="badge badge-sm" data-level="${lv.level}">${lv.label}</span>
          </div>
          <span class="small">${v.desc}</span>
        </div>
      </li>`;
    })
    .join("");
}

function renderHistory() {
  els.history.hidden = state.history.length === 0;
  els.historyList.innerHTML = state.history
    .map(
      (h) => `
      <li>
        <button type="button" class="history-item" data-fg="${h.fg}" data-bg="${h.bg}"
          style="background:${h.bg};color:${h.fg}"
          title="${h.fg} sur ${h.bg}" aria-label="${h.fg} sur ${h.bg}">Aa</button>
      </li>`,
    )
    .join("");
}

function renderPalette() {
  const m = method();
  const { palette } = state;
  const rgb = palette.map((h) => raster(h, [255, 255, 255]) || [0, 0, 0]);
  const colorLabel = (hex) =>
    `<span class="matrix-color"><span class="matrix-color-dot" style="background:${hex}"></span>${hex}</span>`;

  els.paletteList.innerHTML = palette
    .map(
      (hex) => `
      <li class="palette-chip">
        <span class="palette-chip-dot" style="background:${hex}"></span>
        ${hex}
        <button type="button" class="palette-chip-remove" data-remove="${hex}" aria-label="Retirer ${hex}">×</button>
      </li>`,
    )
    .join("");

  const caption = els.matrix.querySelector("caption").outerHTML;
  const head = `
    <thead>
      <tr>
        <td class="matrix-corner">Texte ↓<br />Fond →</td>
        ${palette.map((hex) => `<th scope="col">${colorLabel(hex)}</th>`).join("")}
      </tr>
    </thead>`;
  const body = palette
    .map((textHex, i) => {
      const cells = palette
        .map((bgHex, j) => {
          const score = m.score(rgb[i], rgb[j]);
          const same = i === j;
          const lv = m.level(score);
          const badge = same
            ? "<span>—</span>"
            : `<span class="badge badge-xs" data-level="${lv.level}">${lv.label}</span>`;
          return `
          <td>
            <button type="button" class="matrix-cell${same ? " is-same" : ""}"
              data-fg="${textHex}" data-bg="${bgHex}"
              title="${textHex} sur ${bgHex} : ${m.full(score)}"
              aria-label="Charger ${textHex} sur ${bgHex}, ${m.full(score)}${same ? "" : `, ${lv.label}`}">
              <span class="matrix-cell-sample" style="background:${bgHex};color:${textHex}" aria-hidden="true">Aa</span>
              <span class="matrix-cell-info" aria-hidden="true">
                <span>${m.short(score)}</span>${badge}
              </span>
            </button>
          </td>`;
        })
        .join("");
      return `<tr><th scope="row">${colorLabel(textHex)}</th>${cells}</tr>`;
    })
    .join("");

  els.matrix.innerHTML = `${caption}${head}<tbody>${body}</tbody>`;
}

/* ==========================================
 * Événements
 * ========================================== */

els.colorInputs.forEach((input) => {
  input.addEventListener("input", () => {
    if (input.dataset.target === "fg") setColors(input.value, state.bgInput);
    else setColors(state.fgInput, input.value);
  });
});

els.pickers.forEach((picker) => {
  picker.addEventListener("input", () => {
    if (picker.dataset.target === "fg") setColors(picker.value, state.bgInput);
    else setColors(state.fgInput, picker.value);
  });
});

els.eyedroppers.forEach((button) => {
  button.hidden = typeof window.EyeDropper !== "function";
  button.addEventListener("click", () => pick(button.dataset.target));
});

els.swap.addEventListener("click", () =>
  setColors(toHex(state.bg), toHex(state.fg)),
);

els.reset.addEventListener("click", () =>
  setColors(state.reference.fg, state.reference.bg),
);

els.oklchTargets.forEach((radio) => {
  radio.addEventListener("change", () => {
    state.oklchTarget = radio.value;
    render();
  });
});

els.oklchSliders.forEach((slider) => {
  slider.addEventListener("input", onSliderInput);
});

els.methods.forEach((radio) => {
  radio.addEventListener("change", () => setMethod(radio.value));
});

els.copyCss.addEventListener("click", () =>
  copy(
    `color: ${toHex(state.fg)};\nbackground-color: ${toHex(state.bg)};`,
    "CSS copié",
  ),
);

els.share.addEventListener("click", () =>
  copy(location.origin + location.pathname + shareHash(), "Lien copié"),
);

els.historyList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-fg]");
  if (button) setColors(button.dataset.fg, button.dataset.bg);
});

$("#suggestions").addEventListener("click", (event) => {
  const button = event.target.closest("[data-apply]");
  if (!button) return;
  if (button.dataset.apply === "fg") setColors(button.dataset.hex, state.bgInput);
  else setColors(state.fgInput, button.dataset.hex);
});

els.paletteList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove]");
  if (!button) return;
  state.palette = state.palette.filter((h) => h !== button.dataset.remove);
  renderPalette();
  els.paletteInput.focus();
});

els.paletteForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addPaletteColors(els.paletteInput.value);
});

els.matrix.addEventListener("click", (event) => {
  const button = event.target.closest("[data-fg]");
  if (button) load(button.dataset.fg, button.dataset.bg);
});

/* ==========================================
 * Initialisation
 * ========================================== */

try {
  const stored = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  if (Array.isArray(stored)) {
    state.history = stored.filter(
      (h) => HEX_RE.test(h?.fg) && HEX_RE.test(h?.bg),
    );
  }
  const storedMethod = localStorage.getItem(METHOD_KEY);
  if (METHODS[storedMethod]) state.method = storedMethod;
} catch {}

const params = new URLSearchParams(location.hash.slice(1));
if (METHODS[params.get("m")]) state.method = params.get("m");
els.methods.forEach((radio) => (radio.checked = radio.value === state.method));

if (params.get("fg") || params.get("bg")) {
  setColors(
    params.get("fg") || state.fgInput,
    params.get("bg") || state.bgInput,
    { silent: true },
  );
} else {
  render();
}
state.reference = { fg: state.fgInput, bg: state.bgInput };
renderHistory();
renderPalette();
