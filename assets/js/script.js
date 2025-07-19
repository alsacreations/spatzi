import { APCAcontrast, sRGBtoY } from "https://esm.sh/apca-w3";
import { colorParsley } from "https://esm.sh/colorparsley";
import Color from "https://esm.sh/colorjs.io";

const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

// Selectors
const form = $("#controls");
const root = document.documentElement;
const colorPicker = $("#colorPicker");
const colorText = $("#colorText");
const textColorPicker = $("#textColorPicker");
const textColorText = $("#textColorText");

// LCH Sliders and their value displays
const lSlider = $("#lumi");
const cSlider = $("#chroma");
const hSlider = $("#hue");
const lValueDisplay = document.querySelector('output[for="lumi"]');
const cValueDisplay = document.querySelector('output[for="chroma"]');
const hValueDisplay = document.querySelector('output[for="hue"]');

// Contrast switcher and displays
const contrastSwitcher = $("#switch_contrast");
const wcagDisplay = $(".contrast-display--wcag");
const apcaDisplay = $(".contrast-display--apca");

// Guide elements
const wcagGuide = $(".guide-content--wcag");
const apcaGuide = $(".guide-content--apca");

// Prevent form submission
form.addEventListener("submit", (e) => e.preventDefault());

// Handle contrast type switching
contrastSwitcher.addEventListener("change", (e) => {
  const contrastTypeIndicator = document.querySelector(
    ".contrast-type-indicator"
  );

  if (e.target.checked) {
    // Show APCA, hide WCAG2
    wcagDisplay.style.display = "none";
    apcaDisplay.style.display = "block";

    // Switch guide content
    wcagGuide.style.display = "none";
    apcaGuide.style.display = "block";

    // Update example title indicator
    if (contrastTypeIndicator) {
      contrastTypeIndicator.textContent = "(APCA)";
    }
  } else {
    // Show WCAG2, hide APCA
    wcagDisplay.style.display = "block";
    apcaDisplay.style.display = "none";

    // Switch guide content
    wcagGuide.style.display = "block";
    apcaGuide.style.display = "none";

    // Update example title indicator
    if (contrastTypeIndicator) {
      contrastTypeIndicator.textContent = "(WCAG)";
    }
  }

  // Met à jour les indicateurs après le changement de mode
  updateThresholdIndicators();
  updateExampleIndicators();
});

// Converts a color to #RRGGBB or #RRGGBBAA hexadecimal value
function toHex(colorStringInput) {
  const originalColorString = String(colorStringInput);

  try {
    let color = originalColorString;

    if (color.toLowerCase().startsWith("oklch(")) {
      const oklchRegex =
        /oklch\(\s*([\d.%]+)\s+([\d.%]+)\s+([\d.]+)\s*(?:\/\s*([\d.%]+))?\s*\)/i;
      const match = color.match(oklchRegex);
      if (match) {
        let [, l, c, h, alpha] = match;

        if (!l.includes("%")) {
          const lNum = parseFloat(l);
          if (!isNaN(lNum) && lNum >= 0 && lNum <= 1) {
            l = (lNum * 100).toString() + "%";
          }
        }

        color = `oklch(${l} ${c} ${h}${alpha ? ` / ${alpha}` : ""})`;
      }
    }

    const colorObj = new Color(color);
    const srgbColor = colorObj.to("srgb");

    // Check if within sRGB gamut, if not clamp to gamut
    if (!srgbColor.inGamut("srgb")) {
      srgbColor.toGamut({ method: "clip" });
    }

    const hex = srgbColor.to("srgb").toString({ format: "hex" });
    return hex;
  } catch (e) {
    return "#000000";
  }
}

// Simple validation of a color string
function isValidColor(color) {
  return colorParsley(color) !== false;
}

// Get the relative luminance of a color
function getLuminance(colorString) {
  try {
    const colorObj = new Color(colorString);
    const srgbColor = colorObj.to("srgb");

    // Convert to linear RGB
    const [r, g, b] = srgbColor.coords.map((c) => {
      if (c <= 0.04045) {
        return c / 12.92;
      } else {
        return Math.pow((c + 0.055) / 1.055, 2.4);
      }
    });

    // Calculate luminance
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luminance;
  } catch (e) {
    return 0;
  }
}

function getContrastRatio(color1, color2) {
  try {
    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);
    if (isNaN(lum1) || isNaN(lum2)) {
      return 0;
    }
    const contrast =
      (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);
    return parseFloat(contrast.toFixed(2));
  } catch (e) {
    return 0;
  }
}

function getAPCAContrast(textColor, backgroundColor) {
  try {
    const colorTextObj = new Color(textColor).to("srgb");
    const colorBgObj = new Color(backgroundColor).to("srgb");

    if (!colorTextObj || !colorTextObj.coords) {
      return 0;
    }
    if (!colorBgObj || !colorBgObj.coords) {
      return 0;
    }

    const rT = Math.round(colorTextObj.coords[0] * 255);
    const gT = Math.round(colorTextObj.coords[1] * 255);
    const bT = Math.round(colorTextObj.coords[2] * 255);

    const rB = Math.round(colorBgObj.coords[0] * 255);
    const gB = Math.round(colorBgObj.coords[1] * 255);
    const bB = Math.round(colorBgObj.coords[2] * 255);

    // D'abord essayer la fonction officielle APCAcontrast
    try {
      const result = APCAcontrast([rT, gT, bT], [rB, gB, bB]);
      if (result !== 0 && !isNaN(result)) {
        return parseFloat(result.toFixed(1));
      }
    } catch (e) {
      // La fonction officielle a échoué, utiliser notre implémentation
    }

    // Implémentation APCA 0.1.9 4g exacte selon la documentation officielle
    const textY = sRGBtoY([rT, gT, bT]);
    const bgY = sRGBtoY([rB, gB, bB]);

    // Constantes APCA 0.0.98G-4g officielles
    const Strc = 2.4;
    const Ntx = 0.57; // normTXT
    const Nbg = 0.56; // normBG
    const Rtx = 0.62; // revTXT
    const Rbg = 0.65; // revBG
    const Bclip = 1.414; // blkClmp
    const Bthrsh = 0.022; // blkThrs
    const Wscale = 1.14; // scale
    const Woffset = 0.027; // offset
    const Wclamp = 0.1; // loClip

    // Soft clamp pour les noirs (fsc function)
    function softClamp(Yc) {
      if (Yc < 0.0) return 0.0;
      if (Yc < Bthrsh) {
        return Yc + Math.pow(Bthrsh - Yc, Bclip);
      }
      return Yc;
    }

    // Appliquer le soft clamp
    const Ytxt = softClamp(textY);
    const Ybg = softClamp(bgY);

    // Déterminer la polarité et calculer Sapc
    let Sapc = 0;

    if (Ybg > Ytxt) {
      // Normal polarity (dark text on light background)
      Sapc = (Math.pow(Ybg, Nbg) - Math.pow(Ytxt, Ntx)) * Wscale;
    } else {
      // Reverse polarity (light text on dark background)
      Sapc = (Math.pow(Ybg, Rbg) - Math.pow(Ytxt, Rtx)) * Wscale;
    }

    // Clamp minimum contrast et offset final
    let Lc = 0;
    if (Math.abs(Sapc) < Wclamp) {
      Lc = 0.0;
    } else if (Sapc > 0) {
      Lc = (Sapc - Woffset) * 100.0;
    } else {
      Lc = (Sapc + Woffset) * 100.0;
    }

    return parseFloat(Lc.toFixed(1));

    return parseFloat(result.toFixed(1));
  } catch (e) {
    return 0;
  }
}

/**
 * Met à jour les indicateurs visuels dans le guide des seuils
 */
function updateThresholdIndicators() {
  const contrastRatioElement = wcagDisplay.querySelector(".contrast-ratio");
  const apcaRatioElement = apcaDisplay.querySelector(".contrast-ratio");

  if (contrastRatioElement) {
    const wcagRatio = parseFloat(contrastRatioElement.textContent);

    // Met à jour les indicateurs WCAG2
    const wcagIndicators = document.querySelectorAll(
      ".guide-content--wcag .threshold-indicator"
    );
    wcagIndicators.forEach((indicator) => {
      const threshold = parseFloat(indicator.dataset.threshold);
      const isPassed = wcagRatio >= threshold;

      // Création d'un contenu accessible
      indicator.innerHTML = isPassed
        ? '✅<span class="visually-hidden"> accessible</span>'
        : '❌<span class="visually-hidden"> non accessible</span>';
      indicator.dataset.passed = isPassed.toString();
    });
  }

  if (apcaRatioElement) {
    const apcaValue = parseFloat(apcaRatioElement.textContent);

    // Met à jour les indicateurs APCA
    const apcaIndicators = document.querySelectorAll(
      ".guide-content--apca .threshold-indicator"
    );
    apcaIndicators.forEach((indicator) => {
      const threshold = parseFloat(indicator.dataset.threshold);

      // Pour APCA, seule la valeur absolue compte
      const isPassed = Math.abs(apcaValue) >= threshold;

      // Création d'un contenu accessible
      indicator.innerHTML = isPassed
        ? '✅<span class="visually-hidden"> accessible</span>'
        : '❌<span class="visually-hidden"> non accessible</span>';
      indicator.dataset.passed = isPassed.toString();
    });
  }
}

/**
 * Met à jour les indicateurs de seuil dans la section d'exemple
 */
function updateExampleIndicators() {
  const contrastSwitcherChecked = contrastSwitcher.checked;
  const exampleItems = document.querySelectorAll(".example-text-item");

  exampleItems.forEach((item) => {
    const size = parseInt(item.dataset.size);
    const weight = item.dataset.weight;
    const statusElement = item.querySelector(".threshold-status");

    if (!statusElement) return;

    let isPassed = false;

    if (contrastSwitcherChecked) {
      // Mode APCA
      const apcaRatioElement = apcaDisplay.querySelector(".contrast-ratio");
      if (apcaRatioElement) {
        const apcaValue = Math.abs(parseFloat(apcaRatioElement.textContent));

        // Seuils APCA selon la taille
        let threshold = 75; // Défaut pour texte normal
        if ((size >= 24 && weight === "bold") || size >= 36) {
          threshold = 45; // Texte large
        } else if (size >= 24 || (size >= 16 && weight === "bold")) {
          threshold = 60; // Texte moyen
        }

        isPassed = apcaValue >= threshold;
      }
    } else {
      // Mode WCAG2
      const wcagRatioElement = wcagDisplay.querySelector(".contrast-ratio");
      if (wcagRatioElement) {
        const wcagRatio = parseFloat(wcagRatioElement.textContent);

        // Seuils WCAG2 selon la taille (seuil AA)
        let threshold = 4.5; // Défaut pour texte normal
        if ((size >= 18 && weight === "bold") || size >= 24) {
          threshold = 3; // Texte large
        }

        isPassed = wcagRatio >= threshold;
      }
    }

    // Création d'un contenu accessible
    statusElement.innerHTML = isPassed
      ? '✅<span class="visually-hidden"> accessible</span>'
      : '❌<span class="visually-hidden"> non accessible</span>';
  });
}

function updateOKLCHValues() {
  const primaryColorOutOfGamut = root.dataset.primaryColorOutOfGamut === "true";
  const box = document.querySelector(".box-user");

  if (box) {
    const textColorVarName = "--color-text-user";
    const boxBgColorCssVar = "--color-variant";

    const textColor = getComputedStyle(root)
      .getPropertyValue(textColorVarName)
      .trim();
    const oklchBgColorString = getComputedStyle(root)
      .getPropertyValue(boxBgColorCssVar)
      .trim();

    const boxBodyOklchHalf = box.querySelector(".box-half.box-oklch");
    const boxBodyHexHalf = box.querySelector(".box-half.box-hex");
    const oklchValueInBox = boxBodyOklchHalf
      ? boxBodyOklchHalf.querySelector(".box-color-value")
      : null;
    const hexDisplayContainerInBox = boxBodyHexHalf
      ? boxBodyHexHalf.querySelector(".box-color-value")
      : null;

    const contrastRatioElement = wcagDisplay.querySelector(".contrast-value");
    const apcaContrastDisplay = apcaDisplay.querySelector(".contrast-value");

    if (textColor && oklchBgColorString) {
      const oklchRegex =
        /oklch\(\s*([\d.%]+)\s+([\d.%]+)\s+([\d.]+)\s*(?:\/\s*([\d.%]+))?\s*\)/i;
      const oklchDisplayValue = oklchBgColorString.replace(
        oklchRegex,
        (match, l, c, h, alpha) => {
          const lightness = l.includes("%")
            ? l
            : `${(parseFloat(l) * 100).toFixed(0)}%`;
          const chroma = c.includes("%")
            ? `${parseFloat(c.replace("%", "")).toFixed(0)}%`
            : `${parseFloat(c).toFixed(3)}`;
          const hue = `${parseFloat(h).toFixed(0)}°`;

          return `${lightness} ${chroma} ${hue}`;
        }
      );

      const hexEquivalentColor = toHex(oklchBgColorString);

      if (boxBodyOklchHalf) {
        boxBodyOklchHalf.style.backgroundColor = oklchBgColorString;
        if (oklchValueInBox) oklchValueInBox.textContent = oklchDisplayValue;
      }

      let hexDisplayValue = hexEquivalentColor;
      let gamutWarningText = "";
      let currentBoxColorOutOfGamut = false;
      try {
        let colorStringToParse = oklchBgColorString;
        if (
          typeof oklchBgColorString === "string" &&
          oklchBgColorString.toLowerCase().startsWith("oklch(")
        ) {
          const match = oklchBgColorString.match(oklchRegex);
          if (match) {
            let lComponent = match[1];
            const cComponent = match[2];
            const hComponent = match[3];
            const alphaComponent = match[4];

            const originalLComponent = lComponent;

            if (!lComponent.includes("%")) {
              const lNum = parseFloat(lComponent);
              if (!isNaN(lNum) && lNum >= 0 && lNum <= 1) {
                lComponent = (lNum * 100).toString() + "%";
              }
            }

            colorStringToParse = `oklch(${lComponent} ${cComponent} ${hComponent}${
              alphaComponent ? ` / ${alphaComponent}` : ""
            })`;
          }
        }

        const oklchColorObj = new Color(colorStringToParse);
        const isInGamut = oklchColorObj.inGamut("srgb");
        currentBoxColorOutOfGamut = !isInGamut;

        if (!isInGamut) {
          const clampedColor = oklchColorObj
            .clone()
            .toGamut({ method: "clip" });
          const clampedColorString = clampedColor.toString();
          hexDisplayValue = toHex(clampedColorString);
          gamutWarningText = " (sRGB la plus proche)";
        }
      } catch (e) {
        // Use the fallback hex color if there's an error
        currentBoxColorOutOfGamut = true;
        gamutWarningText = " (sRGB la plus proche)";
      }

      if (boxBodyHexHalf) {
        boxBodyHexHalf.style.backgroundColor = hexDisplayValue;
        if (hexDisplayContainerInBox) {
          const upperCaseHex = hexDisplayValue.toUpperCase();
          hexDisplayContainerInBox.innerHTML = upperCaseHex;

          if (gamutWarningText) {
            let gamutWarningElement =
              hexDisplayContainerInBox.querySelector(".gamut-warning");
            if (!gamutWarningElement) {
              gamutWarningElement = document.createElement("span");
              gamutWarningElement.classList.add("gamut-warning");
              hexDisplayContainerInBox.appendChild(gamutWarningElement);
            }
            gamutWarningElement.textContent = gamutWarningText;
          } else {
            const existingWarning =
              hexDisplayContainerInBox.querySelector(".gamut-warning");
            if (existingWarning) {
              existingWarning.remove();
            }
          }
        }
      }

      try {
        // Utiliser les vraies couleurs pour les calculs de contraste
        const realTextColor = textColor.startsWith("#")
          ? textColor
          : toHex(textColor);
        const realBgColor = toHex(oklchBgColorString);

        const wcagContrast = getContrastRatio(realTextColor, realBgColor);
        const apcaContrast = getAPCAContrast(realTextColor, realBgColor);

        if (contrastRatioElement) {
          const wcagRatioSpan =
            contrastRatioElement.querySelector(".contrast-ratio");
          if (wcagRatioSpan) {
            wcagRatioSpan.textContent = wcagContrast.toFixed(2);
          } else {
            contrastRatioElement.innerHTML = `<span class="visually-hidden">Contraste WCAG2 : </span><span class="contrast-ratio">${wcagContrast.toFixed(
              2
            )}</span>`;
          }

          const level =
            wcagContrast >= 7
              ? "AAA"
              : wcagContrast >= 4.5
              ? "AA"
              : wcagContrast >= 3
              ? "AA Large"
              : "Échec";
          contrastRatioElement.dataset.level = level;

          let color;
          if (wcagContrast >= 4.5) {
            color = "var(--success)";
          } else if (wcagContrast >= 3) {
            color = "var(--warning)";
          } else {
            color = "var(--error)";
          }
          contrastRatioElement.style.color = color;

          // Utiliser le conteneur d'avertissement existant
          const wcagWarningContainer =
            document.getElementById("wcag-gamut-warning");
          const shouldShowWcagWarning = currentBoxColorOutOfGamut;

          if (shouldShowWcagWarning) {
            if (wcagWarningContainer) {
              wcagWarningContainer.textContent =
                " (ratio basé sur la couleur sRGB la plus proche)";
            }
          } else {
            if (wcagWarningContainer) {
              wcagWarningContainer.textContent = "";
            }
          }
        }

        if (apcaContrastDisplay) {
          const apcaValueSpan =
            apcaContrastDisplay.querySelector(".contrast-ratio");
          if (apcaValueSpan) {
            apcaValueSpan.textContent =
              apcaContrast >= 0
                ? `+${apcaContrast.toFixed(1)}`
                : apcaContrast.toFixed(1);
          } else {
            apcaContrastDisplay.innerHTML = `<span class="visually-hidden">APCA Lc : </span><span class="contrast-ratio">${
              apcaContrast >= 0
                ? `+${apcaContrast.toFixed(1)}`
                : apcaContrast.toFixed(1)
            }</span>`;
          }

          const absValue = Math.abs(apcaContrast);
          let color;
          if (absValue >= 75) {
            color = "var(--success)";
          } else if (absValue >= 60) {
            color = "var(--warning)";
          } else {
            color = "var(--error)";
          }
          apcaContrastDisplay.style.color = color;
        }
      } catch (error) {
        if (contrastRatioElement) {
          const wcagRatioSpan =
            contrastRatioElement.querySelector(".contrast-ratio");
          if (wcagRatioSpan) {
            wcagRatioSpan.textContent = "0.00";
          } else {
            contrastRatioElement.innerHTML =
              '<span class="visually-hidden">Contraste WCAG2 : </span><span class="contrast-ratio">0.00</span>';
          }
          contrastRatioElement.style.color = "var(--error)";
        }
        if (apcaContrastDisplay) {
          const apcaValueSpan =
            apcaContrastDisplay.querySelector(".contrast-ratio");
          if (apcaValueSpan) apcaValueSpan.textContent = "0.00";
          else
            apcaContrastDisplay.innerHTML =
              '<span class="visually-hidden">APCA Lc : </span><span class="contrast-ratio">0.00</span>';
        }
      }
    } else {
      if (contrastRatioElement) {
        const wcagRatioSpan =
          contrastRatioElement.querySelector(".contrast-ratio");
        if (wcagRatioSpan) {
          wcagRatioSpan.textContent = "0.00";
        } else {
          contrastRatioElement.innerHTML =
            '<span class="visually-hidden">Contraste WCAG2 : </span><span class="contrast-ratio">0.00</span>';
        }
        contrastRatioElement.style.color = "var(--error)";
      }
      if (apcaContrastDisplay) {
        const apcaValueSpan =
          apcaContrastDisplay.querySelector(".contrast-ratio");
        if (apcaValueSpan) apcaValueSpan.textContent = "0.00";
        else
          apcaContrastDisplay.innerHTML =
            '<span class="visually-hidden">APCA Lc : </span><span class="contrast-ratio">0.00</span>';
      }
    }
  }

  // Met à jour les indicateurs de seuil dans le guide
  updateThresholdIndicators();
  updateExampleIndicators();
}

function updateColor(value, isPrimaryColor = true) {
  if (!isValidColor(value)) {
    return;
  }

  if (isPrimaryColor) {
    // Mettre à jour la couleur directement ET les variables slider
    root.style.setProperty("--color-variant", value);
    if (colorText) colorText.value = value;

    try {
      const colorObj = new Color(value);
      const inGamut = colorObj.inGamut("srgb");
      root.dataset.primaryColorOutOfGamut = String(!inGamut);

      // Convertir en OKLCH et mettre à jour les variables slider
      const oklch = colorObj.to("oklch");
      root.style.setProperty(
        "--slider-l",
        Math.max(0, Math.min(1, oklch.coords[0])).toString()
      );
      root.style.setProperty(
        "--slider-c",
        Math.max(0, oklch.coords[1] || 0).toString()
      );
      root.style.setProperty("--slider-h", (oklch.coords[2] || 0).toString());
    } catch (e) {
      root.dataset.primaryColorOutOfGamut = "true";
    }
    initializeSliderDisplays();
  } else {
    root.style.setProperty("--color-text-user", value);
    if (textColorText) textColorText.value = value;
  }
  updateOKLCHValues();
}

if (colorPicker) {
  colorPicker.addEventListener("input", (e) => {
    updateColor(e.target.value, true);
  });
}

if (textColorPicker) {
  textColorPicker.addEventListener("input", (e) => {
    updateColor(e.target.value, false);
  });
}

// Initialize slider displays with current color values
function initializeSliderDisplays() {
  updateSliderFromCSS("--slider-l", lSlider, lValueDisplay);
  updateSliderFromCSS("--slider-c", cSlider, cValueDisplay);
  updateSliderFromCSS("--slider-h", hSlider, hValueDisplay);
}

if (colorText) {
  colorText.addEventListener("input", (e) => {
    updateColor(e.target.value, true);
  });
}

if (textColorText) {
  textColorText.addEventListener("input", (e) => {
    updateColor(e.target.value, false);
  });
}

function updateSliderFromCSS(cssVarName, slider, valueDisplay) {
  if (!slider) return;

  const computedValue = getComputedStyle(root)
    .getPropertyValue(cssVarName)
    .trim();

  if (cssVarName === "--slider-l") {
    let lightness = parseFloat(computedValue) * 100; // Convert from 0-1 to 0-100
    if (isNaN(lightness)) lightness = 75;
    lightness = Math.round(lightness); // Arrondir à l'entier
    slider.value = lightness;
    if (valueDisplay) valueDisplay.textContent = `${lightness}%`;
  } else if (cssVarName === "--slider-c") {
    let chroma = parseFloat(computedValue);
    if (isNaN(chroma)) chroma = 0.1;
    slider.value = chroma;
    if (valueDisplay) valueDisplay.textContent = chroma.toFixed(3);
  } else if (cssVarName === "--slider-h") {
    let hue = parseFloat(computedValue);
    if (isNaN(hue)) hue = 180;
    hue = Math.round(hue); // Arrondir à l'entier
    slider.value = hue;
    if (valueDisplay) valueDisplay.textContent = `${hue}°`;
  }
}

if (lSlider) {
  lSlider.addEventListener("input", () => {
    const value = lSlider.value;
    root.style.setProperty("--slider-l", (value / 100).toString()); // Convert from 0-100 to 0-1
    if (lValueDisplay) lValueDisplay.textContent = `${value}%`;
    updateOKLCHValues();
  });
}

if (cSlider) {
  cSlider.addEventListener("input", () => {
    const value = cSlider.value;
    root.style.setProperty("--slider-c", value);
    if (cValueDisplay) cValueDisplay.textContent = parseFloat(value).toFixed(3);
    updateOKLCHValues();
  });
}

if (hSlider) {
  hSlider.addEventListener("input", () => {
    const value = hSlider.value;
    root.style.setProperty("--slider-h", value);
    if (hValueDisplay) hValueDisplay.textContent = `${value}°`;
    updateOKLCHValues();
  });
}

// Initialize the page
function initializePage() {
  // Set initial colors from HTML default values
  const initialBgColor = colorPicker ? colorPicker.value : "#ff69b4";
  const initialTextColor = textColorPicker ? textColorPicker.value : "#ffffff";

  // Set the CSS variables
  root.style.setProperty("--color-text-user", initialTextColor);

  // Convert initial color to OKLCH and set slider values
  try {
    const colorObj = new Color(initialBgColor);
    const oklch = colorObj.to("oklch");

    // Set slider variables
    root.style.setProperty(
      "--slider-l",
      Math.max(0, Math.min(1, oklch.coords[0])).toString()
    );
    root.style.setProperty(
      "--slider-c",
      Math.max(0, oklch.coords[1] || 0).toString()
    );
    root.style.setProperty("--slider-h", (oklch.coords[2] || 0).toString());

    // Set gamut info
    const inGamut = colorObj.inGamut("srgb");
    root.dataset.primaryColorOutOfGamut = String(!inGamut);
  } catch (e) {
    // Fallback values
    root.style.setProperty("--slider-l", "0.75");
    root.style.setProperty("--slider-c", "0.1");
    root.style.setProperty("--slider-h", "180");
    root.dataset.primaryColorOutOfGamut = "false";
  }

  // Initialize slider displays
  initializeSliderDisplays();

  // Update everything
  updateOKLCHValues();
}

initializePage();
