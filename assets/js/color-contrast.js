import {
  APCAcontrast,
  sRGBtoY,
} from "https://cdn.jsdelivr.net/npm/apca-w3/+esm";
import Color from "https://esm.sh/colorjs.io";

// DOM helpers
const $ = (sel) => document.querySelector(sel);

// Elements
const root = document.documentElement;
const backgroundColorPicker = $("#backgroundColorPicker");
const backgroundColorText = $("#backgroundColorText");
const foregroundColorPicker = $("#foregroundColorPicker");
const foregroundColorText = $("#foregroundColorText");
const swapColorsButton = $("#swapColorsButton");
const textControl = document.getElementById("text-color-control");
const bgControl = document.getElementById("bg-color-control");
const pickersGroup = document.querySelector(".color-pickers-group");
const activeColorIndicator = $("#activeColorIndicator");
const lSlider = $("#lumi");
const cSlider = $("#chroma");
const hSlider = $("#hue");
const lValueDisplay = document.querySelector('output[for="lumi"]');
const cValueDisplay = document.querySelector('output[for="chroma"]');
const hValueDisplay = document.querySelector('output[for="hue"]');
const contrastSwitcher = $("#switch_contrast");
const wcagDisplay = document.querySelector(".contrast-display--wcag");
const apcaDisplay = document.querySelector(".contrast-display--apca");
const wcagGuide = document.querySelector(".guide-content--wcag");
const apcaGuide = document.querySelector(".guide-content--apca");
const contrastTypeIndicator = document.querySelector(
  ".contrast-type-indicator"
);

// State: sliders contrôlent le texte
let isTextColorPrimary = true;

// URL sync (partage) — helpers et état
let scheduledUrlUpdate = null;
let lastAppliedHash = "";
// Référence pour le bouton "Réinitialiser" (devient les couleurs définies par l’utilisateur ou l’URL)
let resetReference = { fg: "#EEEEEE", bg: "#E5508A" };
let resetRefLocked = false;

function buildHashFromColors(fg, bg) {
  const params = new URLSearchParams();
  params.set("fg", String(fg));
  params.set("bg", String(bg));
  return `#${params.toString()}`;
}

function parseColorsFromHash() {
  try {
    const raw = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    if (!raw) return null;
    const params = new URLSearchParams(raw);
    const fg = params.get("fg");
    const bg = params.get("bg");
    if (!fg || !bg) return null;
    if (!isValidColor(fg) || !isValidColor(bg)) return null;
    return { fg, bg };
  } catch {
    return null;
  }
}

function scheduleUrlUpdateWithColors(fgStr, bgStr) {
  try {
    const targetHash = buildHashFromColors(fgStr, bgStr);
    if (targetHash === lastAppliedHash) return;
    if (scheduledUrlUpdate) cancelAnimationFrame(scheduledUrlUpdate);
    scheduledUrlUpdate = requestAnimationFrame(() => {
      const url = new URL(window.location.href);
      url.hash = targetHash;
      // Remplace silencieusement pour éviter hashchange
      history.replaceState(null, "", url);
      lastAppliedHash = targetHash;
      scheduledUrlUpdate = null;
    });
  } catch {}
}

function applyColorsFromUrl() {
  const parsed = parseColorsFromHash();
  if (!parsed) return false;
  const { fg, bg } = parsed;
  // Définit le fond (color-user-1) et la couleur texte pilotée par sliders
  root.style.setProperty("--color-user-1", String(bg).trim());
  updateColor(fg, true, "url");
  // Met à jour les pickers pour cohérence visuelle
  if (backgroundColorPicker) backgroundColorPicker.value = toInputHex(bg);
  if (foregroundColorPicker) foregroundColorPicker.value = toInputHex(fg);
  // Alimente les champs texte avec la notation telle que dans l’URL et mémorise le format
  if (backgroundColorText) {
    backgroundColorText.value = String(bg).trim();
    backgroundColorText.dataset.format = detectNotation(
      backgroundColorText.value
    );
  }
  if (foregroundColorText) {
    foregroundColorText.value = String(fg).trim();
    foregroundColorText.dataset.format = detectNotation(
      foregroundColorText.value
    );
  }
  updateOKLCHValues();
  // La première application via URL devient la référence de reset
  captureResetReference("from-url");
  resetRefLocked = true;
  return true;
}

// Calcule les hex UI à partir des variables (sliders et --color-user-1)
function getUiHexColors() {
  const lVar = parseFloat(
    getComputedStyle(root).getPropertyValue("--slider-l").trim()
  );
  const cVar = parseFloat(
    getComputedStyle(root).getPropertyValue("--slider-c").trim()
  );
  const hVar = parseFloat(
    getComputedStyle(root).getPropertyValue("--slider-h").trim()
  );
  const l = Number.isFinite(lVar) ? lVar : 0;
  // Évite la notation scientifique (ex: 3.88e-16) non valide en CSS
  const cRaw = Number.isFinite(cVar) ? cVar : 0;
  const c = Math.abs(cRaw) < 1e-6 ? 0 : cRaw;
  const h = Number.isFinite(hVar) ? hVar : 0;
  const sliderHex = toNormalizedHex(safeOklchString(l, c, h));
  const user1Hex = getCssVarHex("--color-user-1");
  const textHex = isTextColorPrimary ? sliderHex : user1Hex;
  const bgHex = isTextColorPrimary ? user1Hex : sliderHex;
  return { textHex, bgHex };
}

// Synchronise les color pickers et champs texte avec les couleurs UI rendues
// Déférée d'un frame pour éviter les états transitoires (race de CSS vars)
function syncPickersFromUI(options = { defer: true, label: "sync" }) {
  const run = () => {
    // Valeurs calculées (sliders + user-1)
    const calc = getUiHexColors();
    // Valeurs réellement rendues (var(--ui-foreground/background) résolues)
    const resolved = getResolvedUiColors();

    // Logs de debug compacts
    if (document.documentElement.dataset.debug === "true") {
      try {
        const cs = getComputedStyle(root);
        const l = cs.getPropertyValue("--slider-l").trim();
        const c = cs.getPropertyValue("--slider-c").trim();
        const h = cs.getPropertyValue("--slider-h").trim();
        const user1 = cs.getPropertyValue("--color-user-1").trim();
        const uiFg = cs.getPropertyValue("--ui-foreground").trim();
        const uiBg = cs.getPropertyValue("--ui-background").trim();
        // eslint-disable-next-line no-console
        console.groupCollapsed(
          `[syncPickersFromUI:${options.label}] isTextColorPrimary=${isTextColorPrimary}`
        );
        // eslint-disable-next-line no-console
        console.log("vars", { l, c, h, user1, uiFg, uiBg });
        // eslint-disable-next-line no-console
        console.log("calc", calc, "resolved", resolved);
        // eslint-disable-next-line no-console
        console.groupEnd();
      } catch {}
    }

    const textHex = resolved.textHex || calc.textHex;
    const bgHex = resolved.bgHex || calc.bgHex;
    // Ne synchronise que les color pickers pour ne pas écraser la notation saisie par l'utilisateur
    if (backgroundColorPicker) backgroundColorPicker.value = toInputHex(bgHex);
    if (foregroundColorPicker)
      foregroundColorPicker.value = toInputHex(textHex);
  };
  if (options && options.defer) {
    requestAnimationFrame(run);
  } else {
    run();
  }
}

// Utils
function formatSmart(value, digits = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  const fixed = n.toFixed(digits);
  return String(parseFloat(fixed));
}

function clamp01(x) {
  return Math.min(1, Math.max(0, x));
}

// Construit une chaîne OKLCH sûre (évite la notation scientifique pour C quasi nulle)
function safeOklchString(l, c, h) {
  const L = Number.isFinite(l) ? clamp01(l) : 0;
  const Cn = Number.isFinite(c) ? Math.max(0, c) : 0;
  const C = Math.abs(Cn) < 1e-6 ? 0 : Cn;
  const H = Number.isFinite(h) ? h : 0;
  return `oklch(${L} ${C} ${H})`;
}

function toHex(inputColor) {
  try {
    const c = new Color(inputColor).to("srgb");
    const r = Math.round(clamp01(c.coords[0]) * 255);
    const g = Math.round(clamp01(c.coords[1]) * 255);
    const b = Math.round(clamp01(c.coords[2]) * 255);
    const hex = `#${r.toString(16).padStart(2, "0")}${g
      .toString(16)
      .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    return hex.toUpperCase();
  } catch {
    return "#000000";
  }
}

function toNormalizedHex(inputColor) {
  return toHex(inputColor).toUpperCase();
}

// Détecte une couleur nommée CSS (heuristique simple)
function isNamedColorKeyword(value) {
  if (typeof value !== "string") return false;
  const v = value.trim().toLowerCase();
  // Simples mots (sans #, parenthèses, espaces, chiffres)
  if (!/^[a-z]+$/.test(v)) return false;
  // Exclure mots-clés non-couleur éventuels si besoin (peu probable ici)
  return isValidColor(v);
}

// Préserve la notation utilisateur sauf pour les noms (convertis en HEX uppercase)
function normalizeDisplayValue(value, source) {
  if (source === "text" && isNamedColorKeyword(value)) {
    return toNormalizedHex(value);
  }
  if (source === "text") {
    return String(value).trim();
  }
  return toNormalizedHex(value);
}

// Détection basique de la notation saisie
function detectNotation(value) {
  if (typeof value !== "string") return "hex";
  const v = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return "hex";
  if (/^oklch\(/i.test(v)) return "oklch";
  if (/^oklab\(/i.test(v)) return "oklab";
  if (/^hsl[a]?\(/i.test(v)) return "hsl";
  if (/^rgb[a]?\(/i.test(v)) return "rgb";
  if (/^[a-z]+$/i.test(v) && isNamedColorKeyword(v)) return "named";
  return "hex";
}

// Sérialise une couleur dans une notation donnée
function serializeColorString(colorInput, notation) {
  try {
    const c = new Color(colorInput);
    switch (notation) {
      case "oklch": {
        const o = c.to("oklch");
        const L = formatSmart(o.coords[0] * 100, 2);
        const C = formatSmart(Math.max(0, o.coords[1] || 0), 3);
        const H = formatSmart(o.coords[2] || 0, 2);
        return `oklch(${L}% ${C} ${H})`;
      }
      case "oklab": {
        const o = c.to("oklab");
        const L = formatSmart(o.coords[0] * 100, 2);
        const a = formatSmart(o.coords[1] || 0, 3);
        const b = formatSmart(o.coords[2] || 0, 3);
        return `oklab(${L}% ${a} ${b})`;
      }
      case "hsl": {
        const o = c.to("hsl");
        const H = formatSmart(o.coords[0] || 0, 1);
        const S = formatSmart((o.coords[1] || 0) * 100, 1);
        const L = formatSmart((o.coords[2] || 0) * 100, 1);
        return `hsl(${H} ${S}% ${L}%)`;
      }
      case "rgb": {
        const o = c.to("srgb");
        const r = Math.round(clamp01(o.coords[0]) * 255);
        const g = Math.round(clamp01(o.coords[1]) * 255);
        const b = Math.round(clamp01(o.coords[2]) * 255);
        return `rgb(${r} ${g} ${b})`;
      }
      case "named":
      case "hex":
      default:
        return toNormalizedHex(c);
    }
  } catch {
    return toNormalizedHex(colorInput);
  }
}

// Certains navigateurs sont pointilleux sur input[type=color]
// Utiliser un hex valide minuscule (#rrggbb)
function toInputHex(value) {
  // Si la valeur est déjà un hex 6 chiffres, renvoie la version minuscule
  if (typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value)) {
    return value.toLowerCase();
  }
  try {
    const hex = toHex(value);
    return /^#[0-9A-F]{6}$/i.test(hex) ? hex.toLowerCase() : "#000000";
  } catch {
    return "#000000";
  }
}

function isValidColor(value) {
  // Accepte immédiatement les hex #rrggbb (inputs color)
  if (typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value)) return true;
  // Valide via colorjs.io (gère pink, oklch(...), rgb(...), etc.) sans bruit console
  try {
    new Color(value);
    return true;
  } catch {
    return false;
  }
}

function getCssVarHex(varName) {
  try {
    // Résout la variable via un élément sonde pour obtenir une couleur réelle
    const probe = document.createElement("div");
    probe.style.position = "absolute";
    probe.style.left = "-9999px";
    probe.style.top = "-9999px";
    probe.style.backgroundColor = `var(${varName})`;
    document.body.appendChild(probe);
    const cs = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return toNormalizedHex(cs);
  } catch {
    return "#000000";
  }
}

function getResolvedUiColors() {
  const probe = document.createElement("div");
  probe.style.position = "absolute";
  probe.style.left = "-9999px";
  probe.style.top = "-9999px";
  probe.style.color = "var(--ui-foreground)";
  probe.style.backgroundColor = "var(--ui-background)";
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const textHex = toNormalizedHex(cs.color);
  const bgHex = toNormalizedHex(cs.backgroundColor);
  probe.remove();
  return { textHex, bgHex };
}

// Capture la paire actuelle comme référence de réinitialisation
function captureResetReference(reason = "") {
  if (resetRefLocked) return;
  try {
    // Préfère la valeur des champs texte (préserve la notation), fallback sur UI résolue
    const resolved = getResolvedUiColors();
    let fgStr =
      foregroundColorText && isValidColor(foregroundColorText.value)
        ? String(foregroundColorText.value).trim()
        : serializeColorString(
            resolved.textHex,
            foregroundColorText?.dataset.format || "hex"
          );
    let bgStr =
      backgroundColorText && isValidColor(backgroundColorText.value)
        ? String(backgroundColorText.value).trim()
        : serializeColorString(
            resolved.bgHex,
            backgroundColorText?.dataset.format || "hex"
          );
    resetReference = { fg: fgStr, bg: bgStr };
    if (document.documentElement.dataset.debug === "true") {
      // eslint-disable-next-line no-console
      console.debug("[captureResetReference]", reason, resetReference);
    }
  } catch {}
}

// Contrast
function getLuminance(colorString) {
  try {
    const colorObj = new Color(colorString).to("srgb");
    const [r, g, b] = colorObj.coords.map((c) => {
      if (c <= 0.04045) return c / 12.92;
      return Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  } catch {
    return 0;
  }
}

function getContrastRatio(color1, color2) {
  try {
    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);
    if (!Number.isFinite(lum1) || !Number.isFinite(lum2)) return 0;
    const contrast =
      (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);
    return parseFloat(contrast.toFixed(2));
  } catch {
    return 0;
  }
}

/**
 * Calcule l’APCA (Lc) entre un texte et un fond.
 *
 * Contrat
 * - Entrées: textColor et backgroundColor en CSS (hex, oklch, rgb…).
 * - Conversion: sRGB 8‑bit -> luminances relatives Y via sRGBtoY([r,g,b]).
 * - APCA: appel APCAcontrast(textY, bgY) comme recommandé par la lib ESM jsDelivr.
 * - Signe: négatif si le texte est plus clair que le fond; positif sinon.
 * - Sortie: nombre à 0.1 près; fallback sur delta Y signé si la lib est indisponible.
 *
 * Réf: https://github.com/Myndex/SAPC-APCA/tree/master/documentation
 */
function getAPCAContrast(textColor, backgroundColor) {
  try {
    const text = new Color(textColor).to("srgb");
    const bg = new Color(backgroundColor).to("srgb");
    const rT = Math.round(clamp01(text.coords[0]) * 255);
    const gT = Math.round(clamp01(text.coords[1]) * 255);
    const bT = Math.round(clamp01(text.coords[2]) * 255);
    const rB = Math.round(clamp01(bg.coords[0]) * 255);
    const gB = Math.round(clamp01(bg.coords[1]) * 255);
    const bB = Math.round(clamp01(bg.coords[2]) * 255);

    // APCAcontrast attend des luminances Y (0..1), pas des tableaux sRGB
    const textY = sRGBtoY([rT, gT, bT]);
    const bgY = sRGBtoY([rB, gB, bB]);
    if (typeof APCAcontrast === "function") {
      try {
        const res = APCAcontrast(textY, bgY);
        if (Number.isFinite(res)) return parseFloat(res.toFixed(1));
      } catch {}
    }

    // Fallback: delta Y signé
    const sign = textY > bgY ? -1 : 1;
    const lc = sign * Math.abs((textY - bgY) * 100);
    return parseFloat(lc.toFixed(1));
  } catch {
    return 0;
  }
}

// Indicators
function updateThresholdIndicators() {
  const wcagRatioEl = wcagDisplay
    ? wcagDisplay.querySelector(".contrast-ratio")
    : null;
  const apcaRatioEl = apcaDisplay
    ? apcaDisplay.querySelector(".contrast-ratio")
    : null;

  if (wcagRatioEl) {
    const wcagRatio = parseFloat(wcagRatioEl.textContent);
    const nodes = document.querySelectorAll(
      ".guide-content--wcag .threshold-indicator"
    );
    nodes.forEach((indicator) => {
      const threshold = parseFloat(indicator.dataset.threshold);
      const isPassed = wcagRatio >= threshold;
      indicator.innerHTML = isPassed
        ? '✅<span class="visually-hidden"> accessible</span>'
        : '❌<span class="visually-hidden"> non accessible</span>';
      indicator.dataset.passed = String(isPassed);
      const parent = indicator.closest(".threshold-item");
      if (parent) parent.setAttribute("data-passed", String(isPassed));
    });
  }

  if (apcaRatioEl) {
    const apcaVal = parseFloat(apcaRatioEl.textContent);
    const nodes = document.querySelectorAll(
      ".guide-content--apca .threshold-indicator"
    );
    nodes.forEach((indicator) => {
      const threshold = parseFloat(indicator.dataset.threshold);
      const isPassed = Math.abs(apcaVal) >= threshold;
      indicator.innerHTML = isPassed
        ? '✅<span class="visually-hidden"> accessible</span>'
        : '❌<span class="visually-hidden"> non accessible</span>';
      indicator.dataset.passed = String(isPassed);
      const parent = indicator.closest(".threshold-item");
      if (parent) parent.setAttribute("data-passed", String(isPassed));
    });
  }
}

function updateExampleIndicators() {
  const apcaMode = !!(contrastSwitcher && contrastSwitcher.checked);
  const exampleItems = document.querySelectorAll(".example-text-item");
  exampleItems.forEach((item) => {
    const size = parseInt(item.dataset.size);
    const weight = item.dataset.weight;
    const type = item.dataset.type;
    const status = item.querySelector(".threshold-status");
    if (!status) return;

    let passed = false;
    if (apcaMode) {
      const span = apcaDisplay
        ? apcaDisplay.querySelector(".contrast-ratio")
        : null;
      if (span) {
        const val = Math.abs(parseFloat(span.textContent));
        let th = 75;
        if (type === "graphic") th = 45;
        else if ((size >= 24 && weight === "bold") || size >= 36) th = 45;
        else if (size >= 24 || (size >= 16 && weight === "bold")) th = 60;
        passed = val >= th;
      }
    } else {
      const span = wcagDisplay
        ? wcagDisplay.querySelector(".contrast-ratio")
        : null;
      if (span) {
        const val = parseFloat(span.textContent);
        let th = 4.5;
        if (type === "graphic") th = 3;
        else if ((size >= 18 && weight === "bold") || size >= 24) th = 3;
        passed = val >= th;
      }
    }

    status.innerHTML = passed
      ? '✅<span class="visually-hidden"> accessible</span>'
      : '❌<span class="visually-hidden"> non accessible</span>';
    const sizeInd = item.querySelector(".size-indicator");
    if (sizeInd) sizeInd.setAttribute("data-passed", String(passed));
  });
}

// Update display
function updateOKLCHValues() {
  const box = document.querySelector(".box-user");
  if (box) {
    const lVar = parseFloat(
      getComputedStyle(root).getPropertyValue("--slider-l").trim()
    );
    const cVar = parseFloat(
      getComputedStyle(root).getPropertyValue("--slider-c").trim()
    );
    const hVar = parseFloat(
      getComputedStyle(root).getPropertyValue("--slider-h").trim()
    );
    const safeL = Number.isFinite(lVar) ? lVar : 0;
    const rawC = Number.isFinite(cVar) ? cVar : 0;
    const safeC = Math.abs(rawC) < 1e-6 ? 0 : rawC;
    const safeH = Number.isFinite(hVar) ? hVar : 0;
    const safeOklch = safeOklchString(safeL, safeC, safeH);

    const oklchValue = `oklch(${formatSmart(safeL * 100, 2)}% ${formatSmart(
      safeC,
      3
    )} ${formatSmart(safeH, 2)})`;
    const oklchSpan = box.querySelector(".box-half.box-oklch .box-color-value");
    if (oklchSpan) oklchSpan.textContent = oklchValue;

    let hexDisplayValue = toHex(safeOklch);
    let gamutWarningText = "";
    try {
      const oklchObj = new Color(safeOklch);
      const inGamut = oklchObj.inGamut("srgb");
      if (!inGamut) {
        const clamped = oklchObj.clone().toGamut({ method: "clip" });
        hexDisplayValue = toHex(clamped.toString());
        gamutWarningText = " (sRGB la plus proche)";
      }
    } catch {
      gamutWarningText = " (sRGB la plus proche)";
    }

    const hexContainer = box.querySelector(
      ".box-half.box-hex .box-color-value"
    );
    if (hexContainer) {
      hexContainer.textContent = hexDisplayValue.toUpperCase();
      let warn = hexContainer.querySelector(".gamut-warning");
      if (gamutWarningText) {
        if (!warn) {
          warn = document.createElement("span");
          warn.className = "gamut-warning";
          hexContainer.appendChild(warn);
        }
        warn.textContent = gamutWarningText;
      } else if (warn) {
        warn.remove();
      }
    }

    const sliderHex = toNormalizedHex(safeOklch);
    const bgHex = isTextColorPrimary
      ? getCssVarHex("--color-user-1")
      : sliderHex;
    const textHex = isTextColorPrimary
      ? sliderHex
      : getCssVarHex("--color-user-1");
    // eslint-disable-next-line no-console
    if (document.documentElement.dataset.debug === "true") {
      try {
        console.debug("[updateOKLCHValues]", {
          isTextColorPrimary,
          sliderHex,
          textHex,
          bgHex,
        });
      } catch {}
    }
    root.style.setProperty("--ui-background-hex", bgHex);

    const wcagContrast = getContrastRatio(textHex, bgHex);
    const apcaContrast = getAPCAContrast(textHex, bgHex);

    // Met à jour l’URL en préservant la notation utilisateur si connue
    const fgPref = foregroundColorText?.dataset.format;
    const bgPref = backgroundColorText?.dataset.format;
    const fgStr = fgPref
      ? serializeColorString(textHex, fgPref)
      : toNormalizedHex(textHex);
    const bgStr = bgPref
      ? serializeColorString(bgHex, bgPref)
      : toNormalizedHex(bgHex);
    scheduleUrlUpdateWithColors(fgStr, bgStr);

    const wcagRatioSpan = wcagDisplay
      ? wcagDisplay.querySelector(".contrast-ratio")
      : null;
    if (wcagRatioSpan)
      wcagRatioSpan.textContent = `${wcagContrast.toFixed(2)}:1`;
    const wcagValueP = wcagDisplay
      ? wcagDisplay.querySelector(".contrast-value")
      : null;
    if (wcagValueP) {
      const level =
        wcagContrast >= 7
          ? "AAA"
          : wcagContrast >= 4.5
          ? "AA"
          : wcagContrast >= 3
          ? "AA Large"
          : "Échec";
      wcagValueP.dataset.level = level;
    }
    const wcagWarn = document.getElementById("wcag-gamut-warning");
    if (wcagWarn)
      wcagWarn.textContent = gamutWarningText
        ? " (calculé sur la couleur sRGB la plus proche)"
        : "";

    const apcaSpan = apcaDisplay
      ? apcaDisplay.querySelector(".contrast-ratio")
      : null;
    if (apcaSpan)
      apcaSpan.textContent =
        apcaContrast > 0
          ? `+${apcaContrast.toFixed(1)}`
          : apcaContrast.toFixed(1);
  }

  updateThresholdIndicators();
  updateExampleIndicators();
}

// Color updates
function updateColor(value, isPrimaryColor = true, source = "other") {
  if (!isValidColor(value)) return;

  if (isPrimaryColor) {
    if (isTextColorPrimary) {
      if (foregroundColorText)
        foregroundColorText.value = normalizeDisplayValue(value, source);
      if (foregroundColorPicker)
        foregroundColorPicker.value = toInputHex(value);
      root.style.setProperty("--ui-background", "var(--color-user-1)");
      root.style.setProperty("--ui-foreground", "var(--color-user-2)");
    } else {
      if (backgroundColorText)
        backgroundColorText.value = normalizeDisplayValue(value, source);
      if (backgroundColorPicker)
        backgroundColorPicker.value = toInputHex(value);
      root.style.setProperty("--ui-background", "var(--color-user-2)");
      root.style.setProperty("--ui-foreground", "var(--color-user-1)");
    }

    try {
      const colorObj = new Color(value);
      root.dataset.primaryColorOutOfGamut = String(!colorObj.inGamut("srgb"));
      const oklch = colorObj.to("oklch");
      root.style.setProperty("--slider-l", clamp01(oklch.coords[0]).toString());
      {
        const Cn = Math.max(0, oklch.coords[1] || 0);
        const C = Math.abs(Cn) < 1e-6 ? 0 : Cn;
        root.style.setProperty("--slider-c", C.toString());
      }
      root.style.setProperty("--slider-h", (oklch.coords[2] || 0).toString());
      initializeSliderDisplays();
    } catch {
      root.dataset.primaryColorOutOfGamut = "true";
    }

    const secondary = getComputedStyle(root)
      .getPropertyValue("--color-user-1")
      .trim();
    if (secondary) {
      if (!isTextColorPrimary) {
        if (foregroundColorText)
          foregroundColorText.value = toNormalizedHex(secondary);
        if (foregroundColorPicker)
          foregroundColorPicker.value = toInputHex(secondary);
      } else {
        if (backgroundColorText)
          backgroundColorText.value = toNormalizedHex(secondary);
        if (backgroundColorPicker)
          backgroundColorPicker.value = toInputHex(secondary);
      }
    }
  } else {
    // Conserve la notation saisie pour la couleur fixe
    root.style.setProperty("--color-user-1", String(value).trim());
    if (isTextColorPrimary) {
      if (backgroundColorText)
        backgroundColorText.value = normalizeDisplayValue(value, source);
      if (backgroundColorPicker)
        backgroundColorPicker.value = toInputHex(value);
      root.style.setProperty("--ui-background", "var(--color-user-1)");
      root.style.setProperty("--ui-foreground", "var(--color-user-2)");
    } else {
      if (foregroundColorText)
        foregroundColorText.value = normalizeDisplayValue(value, source);
      if (foregroundColorPicker)
        foregroundColorPicker.value = toInputHex(value);
      root.style.setProperty("--ui-background", "var(--color-user-2)");
      root.style.setProperty("--ui-foreground", "var(--color-user-1)");
    }
  }
  updateOKLCHValues();
  // Met à jour la référence de reset après toute modification utilisateur explicite
  if (source === "text" || source === "picker" || source === "url") {
    captureResetReference(`updateColor:${source}`);
    // Verrouille sur la première action utilisateur (texte/picker) pour figer la référence
    if ((source === "text" || source === "picker") && !resetRefLocked) {
      resetRefLocked = true;
    }
  }
}

// Inputs
if (backgroundColorPicker) {
  backgroundColorPicker.addEventListener("input", (e) => {
    updateColor(e.target.value, !isTextColorPrimary, "picker");
  });
  backgroundColorPicker.addEventListener("change", (e) => {
    updateColor(e.target.value, !isTextColorPrimary, "picker");
  });
}
if (foregroundColorPicker) {
  foregroundColorPicker.addEventListener("input", (e) => {
    updateColor(e.target.value, isTextColorPrimary, "picker");
  });
  foregroundColorPicker.addEventListener("change", (e) => {
    updateColor(e.target.value, isTextColorPrimary, "picker");
  });
}
if (backgroundColorText) {
  backgroundColorText.addEventListener("input", (e) => {
    const val = e.target.value;
    backgroundColorText.dataset.format = detectNotation(val);
    updateColor(val, !isTextColorPrimary, "text");
  });
}
if (foregroundColorText) {
  foregroundColorText.addEventListener("input", (e) => {
    const val = e.target.value;
    foregroundColorText.dataset.format = detectNotation(val);
    updateColor(val, isTextColorPrimary, "text");
  });
}

function updateSliderFromCSS(cssVarName, slider, valueDisplay) {
  if (!slider) return;
  const computedValue = getComputedStyle(root)
    .getPropertyValue(cssVarName)
    .trim();
  if (cssVarName === "--slider-l") {
    let lightness = parseFloat(computedValue) * 100;
    if (isNaN(lightness)) lightness = 75;
    slider.value = lightness;
    if (valueDisplay)
      valueDisplay.textContent = `${formatSmart(lightness, 2)}%`;
  } else if (cssVarName === "--slider-c") {
    let chroma = parseFloat(computedValue);
    if (isNaN(chroma)) chroma = 0.1;
    slider.value = chroma;
    if (valueDisplay) valueDisplay.textContent = formatSmart(chroma, 3);
  } else if (cssVarName === "--slider-h") {
    let hue = parseFloat(computedValue);
    if (isNaN(hue)) hue = 180;
    slider.value = hue;
    if (valueDisplay) valueDisplay.textContent = formatSmart(hue, 2);
  }
}

function initializeSliderDisplays() {
  updateSliderFromCSS("--slider-l", lSlider, lValueDisplay);
  updateSliderFromCSS("--slider-c", cSlider, cValueDisplay);
  updateSliderFromCSS("--slider-h", hSlider, hValueDisplay);
}

function updateSliderColor() {
  let l = lSlider ? parseFloat(lSlider.value) / 100 : NaN;
  let c = cSlider ? parseFloat(cSlider.value) : NaN;
  let h = hSlider ? parseFloat(hSlider.value) : NaN;
  if (!Number.isFinite(l))
    l = parseFloat(
      getComputedStyle(root).getPropertyValue("--slider-l").trim()
    );
  if (!Number.isFinite(c))
    c = parseFloat(
      getComputedStyle(root).getPropertyValue("--slider-c").trim()
    );
  if (!Number.isFinite(h))
    h = parseFloat(
      getComputedStyle(root).getPropertyValue("--slider-h").trim()
    );
  l = Number.isFinite(l) ? l : 0;
  c = Number.isFinite(c) ? c : 0;
  h = Number.isFinite(h) ? h : 0;

  const oklchColor = safeOklchString(l, c, h);
  const hexColor = toHex(oklchColor);
  const serializedByPref = (pref, fallbackHex) => {
    if (!pref) return fallbackHex;
    return serializeColorString(oklchColor, pref);
  };
  if (isTextColorPrimary) {
    if (foregroundColorPicker)
      foregroundColorPicker.value = toInputHex(hexColor);
    if (foregroundColorText)
      foregroundColorText.value = serializedByPref(
        foregroundColorText.dataset.format,
        hexColor
      );
    root.style.setProperty("--ui-background", "var(--color-user-1)");
    root.style.setProperty("--ui-foreground", "var(--color-user-2)");
  } else {
    if (backgroundColorPicker)
      backgroundColorPicker.value = toInputHex(hexColor);
    if (backgroundColorText)
      backgroundColorText.value = serializedByPref(
        backgroundColorText.dataset.format,
        hexColor
      );
    root.style.setProperty("--ui-background", "var(--color-user-2)");
    root.style.setProperty("--ui-foreground", "var(--color-user-1)");
  }
  updateOKLCHValues();
}

if (lSlider) {
  lSlider.addEventListener("input", () => {
    const value = parseFloat(lSlider.value);
    root.style.setProperty("--slider-l", (value / 100).toString());
    if (lValueDisplay) lValueDisplay.textContent = `${formatSmart(value, 2)}%`;
    lSlider.value = String(value);
    updateSliderColor();
  });
}
if (cSlider) {
  cSlider.addEventListener("input", () => {
    const value = parseFloat(cSlider.value);
    root.style.setProperty("--slider-c", value.toString());
    if (cValueDisplay) cValueDisplay.textContent = formatSmart(value, 3);
    cSlider.value = String(value);
    updateSliderColor();
  });
}
if (hSlider) {
  hSlider.addEventListener("input", () => {
    const value = parseFloat(hSlider.value);
    root.style.setProperty("--slider-h", value.toString());
    if (hValueDisplay) hValueDisplay.textContent = formatSmart(value, 2);
    hSlider.value = String(value);
    updateSliderColor();
  });
}

function initializePage() {
  const initialBgColor = backgroundColorPicker
    ? backgroundColorPicker.value
    : "#e5508a";
  const initialTextColor = foregroundColorPicker
    ? foregroundColorPicker.value
    : "#eeeeee";
  // Initialise la référence par défaut (sera écrasée si URL présente)
  resetReference = {
    fg: toNormalizedHex(initialTextColor),
    bg: toNormalizedHex(initialBgColor),
  };
  root.style.setProperty("--color-user-1", initialBgColor);
  root.style.setProperty("--ui-background", "var(--color-user-1)");
  root.style.setProperty("--ui-foreground", "var(--color-user-2)");
  try {
    const c = new Color(initialTextColor).to("oklch");
    root.style.setProperty("--slider-l", clamp01(c.coords[0]).toString());
    {
      const Cn = Math.max(0, c.coords[1] || 0);
      const C = Math.abs(Cn) < 1e-6 ? 0 : Cn;
      root.style.setProperty("--slider-c", C.toString());
    }
    root.style.setProperty("--slider-h", (c.coords[2] || 0).toString());
    root.dataset.primaryColorOutOfGamut = String(
      !new Color(initialTextColor).inGamut("srgb")
    );
  } catch {
    root.style.setProperty("--slider-l", "0.75");
    root.style.setProperty("--slider-c", "0.1");
    root.style.setProperty("--slider-h", "180");
    root.dataset.primaryColorOutOfGamut = "false";
  }
  initializeSliderDisplays();
  updateOKLCHValues();
  // Aligne l'affichage des champs sur l'UI (HEX uppercase dans les champs texte)
  syncPickersFromUI();
}

initializePage();

function syncInitialValues() {
  const defaultBgColor = "#e5508a";
  const defaultTextColor = "#eeeeee";
  root.style.setProperty("--color-user-1", defaultBgColor);
  updateColor(defaultTextColor, true);
  root.style.setProperty("--ui-background", "var(--color-user-1)");
  root.style.setProperty("--ui-foreground", "var(--color-user-2)");
  if (foregroundColorPicker)
    foregroundColorPicker.value = toInputHex(defaultTextColor);
  if (foregroundColorText)
    foregroundColorText.value = toNormalizedHex(defaultTextColor);
  if (backgroundColorPicker)
    backgroundColorPicker.value = toInputHex(defaultBgColor);
  if (backgroundColorText)
    backgroundColorText.value = toNormalizedHex(defaultBgColor);
  updateOKLCHValues();
}

syncInitialValues();
// Assure que l’affichage correspond exactement à l’UI rendue (uppercase dans champs texte)
syncPickersFromUI();

// Applique les couleurs depuis l’URL si présentes (prioritaire sur les valeurs par défaut)
const urlApplied = applyColorsFromUrl();
if (!urlApplied) {
  // Pas de valeurs dans l’URL, on fixe la référence sur les valeurs par défaut affichées
  captureResetReference("initial-default");
}

// Écoute les modifications du hash pour partager/coller des palettes
window.addEventListener("hashchange", () => {
  const ok = applyColorsFromUrl();
  if (ok) syncPickersFromUI({ defer: true, label: "from-url" });
});

function updateActiveColorIndicator() {
  if (!activeColorIndicator) return;
  activeColorIndicator.textContent = isTextColorPrimary
    ? "Texte"
    : "Arrière-plan";
}

function updateColorControlsOrder() {
  // Inverse physiquement les champs selon la cible des sliders
  if (!pickersGroup || !textControl || !bgControl || !swapColorsButton) return;

  if (isTextColorPrimary) {
    // Ordre: Texte | ↔ | Arrière-plan
    if (pickersGroup.firstElementChild !== textControl) {
      pickersGroup.insertBefore(textControl, pickersGroup.firstElementChild);
    }
    if (swapColorsButton.previousElementSibling !== textControl) {
      pickersGroup.insertBefore(swapColorsButton, textControl.nextSibling);
    }
    if (bgControl.nextElementSibling !== null) {
      pickersGroup.appendChild(bgControl);
    }
  } else {
    // Ordre: Arrière-plan | ↔ | Texte
    if (pickersGroup.firstElementChild !== bgControl) {
      pickersGroup.insertBefore(bgControl, pickersGroup.firstElementChild);
    }
    if (swapColorsButton.previousElementSibling !== bgControl) {
      pickersGroup.insertBefore(swapColorsButton, bgControl.nextSibling);
    }
    if (textControl.nextElementSibling !== null) {
      pickersGroup.appendChild(textControl);
    }
  }
}

if (swapColorsButton) {
  swapColorsButton.addEventListener("click", () => {
    // Recalcule à partir des sources de vérité (sliders + --color-user-1)
    const l = parseFloat(
      getComputedStyle(root).getPropertyValue("--slider-l").trim()
    );
    const c = parseFloat(
      getComputedStyle(root).getPropertyValue("--slider-c").trim()
    );
    const h = parseFloat(
      getComputedStyle(root).getPropertyValue("--slider-h").trim()
    );
    const sliderHex = toNormalizedHex(safeOklchString(l, c, h));
    const currentBgHex = getCssVarHex("--color-user-1");
    const currentBgRaw = getComputedStyle(root)
      .getPropertyValue("--color-user-1")
      .trim();
    const currentText = sliderHex;

    // Inverse le rôle: les sliders pilotent désormais la couleur de fond
    isTextColorPrimary = !isTextColorPrimary;

    // Mettre à jour le mapping UI en fonction de la nouvelle cible
    if (isTextColorPrimary) {
      root.style.setProperty("--ui-background", "var(--color-user-1)");
      root.style.setProperty("--ui-foreground", "var(--color-user-2)");
    } else {
      root.style.setProperty("--ui-background", "var(--color-user-2)");
      root.style.setProperty("--ui-foreground", "var(--color-user-1)");
    }

    // Conserve la notation d'origine du fond dans --color-user-1
    root.style.setProperty("--color-user-1", currentBgRaw || currentBgHex);

    // Synchronise les champs pour refléter l'inversion visuelle
    // Après inversion: arrière-plan = couleur pilotée (sliders), texte = couleur fixe
    const prevFgTextVal = foregroundColorText
      ? foregroundColorText.value
      : null;
    const prevBgTextVal = backgroundColorText
      ? backgroundColorText.value
      : null;
    const prevFgFormat = foregroundColorText?.dataset.format;
    const prevBgFormat = backgroundColorText?.dataset.format;
    if (backgroundColorPicker)
      backgroundColorPicker.value = toInputHex(currentText);
    if (foregroundColorPicker)
      foregroundColorPicker.value = toInputHex(currentBgHex);
    // Échange les valeurs texte pour préserver les notations utilisateur
    if (backgroundColorText && prevFgTextVal != null)
      backgroundColorText.value = prevFgTextVal;
    if (foregroundColorText && prevBgTextVal != null)
      foregroundColorText.value = prevBgTextVal;
    if (backgroundColorText && prevFgFormat != null)
      backgroundColorText.dataset.format = prevFgFormat;
    if (foregroundColorText && prevBgFormat != null)
      foregroundColorText.dataset.format = prevBgFormat;

    // Assure que la box HEX a le bon fond immédiatement
    const newBgHex = isTextColorPrimary ? currentBgHex : currentText;
    root.style.setProperty("--ui-background-hex", toNormalizedHex(newBgHex));

    updateActiveColorIndicator();
    updateColorControlsOrder();
    updateOKLCHValues();
    // Corrige l'affichage des pickers selon l'UI réellement rendue
    syncPickersFromUI({ defer: true, label: "after-swap" });
    // Le swap fixe aussi la référence de reset
    captureResetReference("after-swap");
  });
}

if (contrastSwitcher) {
  contrastSwitcher.addEventListener("change", (e) => {
    const apcaMode = !!e.target.checked;
    if (apcaMode) {
      if (wcagDisplay) wcagDisplay.style.display = "none";
      if (apcaDisplay) apcaDisplay.style.display = "block";
      if (wcagGuide) wcagGuide.style.display = "none";
      if (apcaGuide) apcaGuide.style.display = "block";
    } else {
      if (wcagDisplay) wcagDisplay.style.display = "block";
      if (apcaDisplay) apcaDisplay.style.display = "none";
      if (wcagGuide) wcagGuide.style.display = "block";
      if (apcaGuide) apcaGuide.style.display = "none";
    }
    // Met à jour le libellé de l’exemple d’application
    if (contrastTypeIndicator)
      contrastTypeIndicator.textContent = apcaMode ? "(APCA)" : "(WCAG)";
    updateOKLCHValues();
  });
}

function resetToDefaultColors() {
  // Utilise la référence dynamique (définie par l'utilisateur ou l'URL)
  const fgRef = resetReference?.fg || "#EEEEEE";
  const bgRef = resetReference?.bg || "#E5508A";

  // Sliders pilotent le texte
  isTextColorPrimary = true;
  root.style.setProperty("--color-user-1", String(bgRef));
  root.style.setProperty("--ui-background", "var(--color-user-1)");
  root.style.setProperty("--ui-foreground", "var(--color-user-2)");

  // Positionne les sliders sur la couleur texte de référence
  try {
    const c = new Color(fgRef).to("oklch");
    const L = clamp01(c.coords[0]);
    const Ctemp = Math.max(0, c.coords[1] || 0);
    const C = Math.abs(Ctemp) < 1e-6 ? 0 : Ctemp;
    const H = c.coords[2] || 0;
    root.style.setProperty("--slider-l", String(L));
    root.style.setProperty("--slider-c", String(C));
    root.style.setProperty("--slider-h", String(H));
    if (lSlider) {
      lSlider.value = String(L * 100);
      if (lValueDisplay)
        lValueDisplay.textContent = `${formatSmart(L * 100, 2)}%`;
    }
    if (cSlider) {
      cSlider.value = String(C);
      if (cValueDisplay) cValueDisplay.textContent = formatSmart(C, 3);
    }
    if (hSlider) {
      hSlider.value = String(H);
      if (hValueDisplay) hValueDisplay.textContent = formatSmart(H, 2);
    }
  } catch {}

  // Synchronise les champs de saisie (préserve notations si connues)
  if (foregroundColorPicker) foregroundColorPicker.value = toInputHex(fgRef);
  if (foregroundColorText) {
    const fmt = foregroundColorText.dataset.format || detectNotation(fgRef);
    foregroundColorText.dataset.format = fmt;
    foregroundColorText.value = serializeColorString(fgRef, fmt);
  }
  if (backgroundColorPicker) backgroundColorPicker.value = toInputHex(bgRef);
  if (backgroundColorText) {
    const fmt = backgroundColorText.dataset.format || detectNotation(bgRef);
    backgroundColorText.dataset.format = fmt;
    backgroundColorText.value = serializeColorString(bgRef, fmt);
  }

  root.removeAttribute("data-primary-color-out-of-gamut");
  root.removeAttribute("data-background-color-out-of-gamut");
  if (contrastSwitcher) {
    contrastSwitcher.checked = false;
    contrastSwitcher.dispatchEvent(new Event("change"));
  }

  updateActiveColorIndicator();
  updateColorControlsOrder();

  // Met à jour les displays et ratios
  updateSliderColor();
  syncPickersFromUI();
}

const resetButton = document.getElementById("reset-colors");
if (resetButton) {
  resetButton.addEventListener("click", resetToDefaultColors);
}

function testLuminosity(lightness, chroma, hue, targetColor) {
  try {
    const testOklch = safeOklchString(lightness / 100, chroma, hue);
    const testHex = toHex(testOklch);
    let wcagRatio, apcaValue;
    if (isTextColorPrimary) {
      wcagRatio = getContrastRatio(testHex, targetColor);
      apcaValue = Math.abs(getAPCAContrast(testHex, targetColor));
    } else {
      wcagRatio = getContrastRatio(targetColor, testHex);
      apcaValue = Math.abs(getAPCAContrast(targetColor, testHex));
    }
    const wcagPassed = wcagRatio >= 4.5;
    const apcaPassed = apcaValue >= 60;
    return {
      wcagRatio,
      apcaValue,
      wcagPassed,
      apcaPassed,
      success: wcagPassed && apcaPassed,
    };
  } catch {
    return {
      wcagRatio: 0,
      apcaValue: 0,
      wcagPassed: false,
      apcaPassed: false,
      success: false,
    };
  }
}

function makeColorAccessible() {
  try {
    const currentL = parseFloat(lSlider.value);
    const currentC = parseFloat(cSlider.value);
    const currentH = parseFloat(hSlider.value);
    const { textHex, bgHex } = getResolvedUiColors();
    const targetColor = isTextColorPrimary ? bgHex : textHex;
    const apcaMode = !!(contrastSwitcher && contrastSwitcher.checked);
    const wcagGoal = 4.5;
    const apcaGoal = 60;
    const passes = (wcag, apca) =>
      apcaMode ? Math.abs(apca) >= apcaGoal : wcag >= wcagGoal;
    const scoreToGoal = (wcag, apca) =>
      apcaMode
        ? Math.abs(Math.abs(apca) - apcaGoal)
        : Math.abs(wcag - wcagGoal);

    const current = testLuminosity(currentL, currentC, currentH, targetColor);
    if (passes(current.wcagRatio, current.apcaValue)) return;

    let bestPass = { L: null, score: Infinity, dist: Infinity };
    let bestApprox = { L: null, score: Infinity, dist: Infinity };
    for (let l = 0; l <= 100; l += 0.1) {
      const r = testLuminosity(l, currentC, currentH, targetColor);
      const s = scoreToGoal(r.wcagRatio, r.apcaValue);
      const d = Math.abs(l - currentL);
      if (passes(r.wcagRatio, r.apcaValue)) {
        if (s < bestPass.score || (s === bestPass.score && d < bestPass.dist))
          bestPass = { L: l, score: s, dist: d };
      } else {
        if (
          s < bestApprox.score ||
          (s === bestApprox.score && d < bestApprox.dist)
        )
          bestApprox = { L: l, score: s, dist: d };
      }
    }
    const newL = bestPass.L ?? bestApprox.L;
    if (newL == null) return;
    lSlider.value = String(newL);
    root.style.setProperty("--slider-l", (newL / 100).toString());
    if (lValueDisplay) lValueDisplay.textContent = `${formatSmart(newL, 1)}%`;
    updateSliderColor();
    updateOKLCHValues();
  } catch (error) {
    console.error("Erreur lors de l'ajustement automatique:", error);
    alert("Une erreur s'est produite lors de l'ajustement automatique.");
  }
}

const accessibleBtn = document.getElementById("make-accessible");
if (accessibleBtn) {
  accessibleBtn.addEventListener("click", makeColorAccessible);
}
