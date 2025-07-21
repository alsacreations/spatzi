import { APCAcontrast, sRGBtoY } from "https://esm.sh/apca-w3";
import { colorParsley } from "https://esm.sh/colorparsley";
import Color from "https://esm.sh/colorjs.io";

const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

const form = $("#controls");
const root = document.documentElement;
const backgroundColorPicker = $("#backgroundColorPicker");
const backgroundColorText = $("#backgroundColorText");
const foregroundColorPicker = $("#foregroundColorPicker");
const foregroundColorText = $("#foregroundColorText");

const swapColorsButton = $("#swapColorsButton");
const activeColorIndicator = $("#activeColorIndicator");
const bgColorControl = $("#bg-color-control");
const textColorControl = $("#text-color-control");

let isTextColorPrimary = false;

const lSlider = $("#lumi");
const cSlider = $("#chroma");
const hSlider = $("#hue");
const lValueDisplay = document.querySelector('output[for="lumi"]');
const cValueDisplay = document.querySelector('output[for="chroma"]');
const hValueDisplay = document.querySelector('output[for="hue"]');

const contrastSwitcher = $("#switch_contrast");
const wcagDisplay = $(".contrast-display--wcag");
const apcaDisplay = $(".contrast-display--apca");

const wcagGuide = $(".guide-content--wcag");
const apcaGuide = $(".guide-content--apca");

form.addEventListener("submit", (e) => e.preventDefault());

contrastSwitcher.addEventListener("change", (e) => {
  const contrastTypeIndicator = document.querySelector(
    ".contrast-type-indicator"
  );
  const wcagLabel = document.querySelector(".switcher-label-left");
  const apcaLabel = document.querySelector(".switcher-label-right");

  if (e.target.checked) {
    wcagDisplay.style.display = "none";
    apcaDisplay.style.display = "block";

    wcagGuide.style.display = "none";
    apcaGuide.style.display = "block";

    // Mettre à jour les états des labels
    if (wcagLabel) {
      wcagLabel.setAttribute("data-state", "unselected");
      const wcagStatus = wcagLabel.querySelector(".switcher-status");
      if (wcagStatus) wcagStatus.textContent = "(non sélectionné)";
    }
    if (apcaLabel) {
      apcaLabel.setAttribute("data-state", "selected");
      const apcaStatus = apcaLabel.querySelector(".switcher-status");
      if (apcaStatus) apcaStatus.textContent = "(sélectionné)";
    }

    if (contrastTypeIndicator) {
      contrastTypeIndicator.textContent = "(APCA)";
    }
  } else {
    wcagDisplay.style.display = "block";
    apcaDisplay.style.display = "none";

    wcagGuide.style.display = "block";
    apcaGuide.style.display = "none";

    // Mettre à jour les états des labels
    if (wcagLabel) {
      wcagLabel.setAttribute("data-state", "selected");
      const wcagStatus = wcagLabel.querySelector(".switcher-status");
      if (wcagStatus) wcagStatus.textContent = "(sélectionné)";
    }
    if (apcaLabel) {
      apcaLabel.setAttribute("data-state", "unselected");
      const apcaStatus = apcaLabel.querySelector(".switcher-status");
      if (apcaStatus) apcaStatus.textContent = "(non sélectionné)";
    }

    if (contrastTypeIndicator) {
      contrastTypeIndicator.textContent = "(WCAG)";
    }
  }

  updateThresholdIndicators();
  updateExampleIndicators();
});

/**
 * Inverse les couleurs et reconfigure les sliders pour contrôler l'autre couleur
 */
function swapColors() {
  const currentBgColor = backgroundColorPicker.value;
  const currentTextColor = foregroundColorPicker.value;

  isTextColorPrimary = !isTextColorPrimary;

  updateColorControlsOrder();
  updateActiveColorIndicator();

  if (isTextColorPrimary) {
    // Mode swap : sliders contrôlent le texte
    root.style.setProperty("--color-user-1", currentTextColor);
    updateColor(currentBgColor, true);

    if (foregroundColorText) foregroundColorText.value = currentBgColor;
    if (foregroundColorPicker) foregroundColorPicker.value = currentBgColor;
    if (backgroundColorText) backgroundColorText.value = currentTextColor;
    if (backgroundColorPicker) backgroundColorPicker.value = currentTextColor;

    root.style.setProperty("--ui-background", "var(--color-user-1)");
    root.style.setProperty("--ui-foreground", "var(--color-user-2)");
  } else {
    // Mode normal : sliders contrôlent l'arrière-plan
    root.style.setProperty("--color-user-1", currentBgColor);
    updateColor(currentTextColor, true);

    if (backgroundColorText) backgroundColorText.value = currentTextColor;
    if (backgroundColorPicker) backgroundColorPicker.value = currentTextColor;
    if (foregroundColorText) foregroundColorText.value = currentBgColor;
    if (foregroundColorPicker) foregroundColorPicker.value = currentBgColor;

    root.style.setProperty("--ui-background", "var(--color-user-2)");
    root.style.setProperty("--ui-foreground", "var(--color-user-1)");
  }

  setTimeout(() => {
    updateOKLCHValues();
  }, 10);
}

/**
 * Met à jour l'ordre visuel des contrôles selon le mode actif
 */
function updateColorControlsOrder() {
  if (isTextColorPrimary) {
    textColorControl.style.order = "1";
    bgColorControl.style.order = "3";
    swapColorsButton.style.order = "2";
  } else {
    bgColorControl.style.order = "1";
    swapColorsButton.style.order = "2";
    textColorControl.style.order = "3";
  }
}

/**
 * Met à jour le texte de l'indicateur de couleur active
 */
function updateActiveColorIndicator() {
  if (activeColorIndicator) {
    activeColorIndicator.textContent = isTextColorPrimary
      ? "Couleur de texte"
      : "Couleur d'arrière-plan";
  }
}

if (swapColorsButton) {
  swapColorsButton.addEventListener("click", swapColors);
}

/**
 * Convertit une couleur OKLCH ou autre format vers hexadécimal
 */
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

    if (!srgbColor.inGamut("srgb")) {
      srgbColor.toGamut({ method: "clip" });
    }

    const hex = srgbColor.to("srgb").toString({ format: "hex" });
    return hex;
  } catch (e) {
    return "#000000";
  }
}

/**
 * Formate intelligemment un nombre en supprimant les zéros inutiles
 */
function formatSmart(number, decimals) {
  const formatted = parseFloat(number).toFixed(decimals);
  return formatted.replace(/\.?0+$/, "");
}

/**
 * Valide qu'une chaîne représente une couleur valide
 */
function isValidColor(color) {
  return colorParsley(color) !== false;
}

/**
 * Calcule la luminance relative d'une couleur selon sRGB
 */
function getLuminance(colorString) {
  try {
    const colorObj = new Color(colorString);
    const srgbColor = colorObj.to("srgb");

    const [r, g, b] = srgbColor.coords.map((c) => {
      if (c <= 0.04045) {
        return c / 12.92;
      } else {
        return Math.pow((c + 0.055) / 1.055, 2.4);
      }
    });

    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luminance;
  } catch (e) {
    return 0;
  }
}

/**
 * Calcule le ratio de contraste WCAG 2.1 entre deux couleurs
 */
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

/**
 * Calcule le contraste APCA entre une couleur de texte et d'arrière-plan
 */
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

    try {
      const result = APCAcontrast([rT, gT, bT], [rB, gB, bB]);
      if (result !== 0 && !isNaN(result)) {
        return parseFloat(result.toFixed(1));
      }
    } catch (e) {
      // Fallback vers implémentation manuelle
    }

    // Implémentation APCA 0.1.9 4g selon la documentation officielle
    const textY = sRGBtoY([rT, gT, bT]);
    const bgY = sRGBtoY([rB, gB, bB]);

    // Constantes APCA 0.0.98G-4g officielles
    const Strc = 2.4;
    const Ntx = 0.57;
    const Nbg = 0.56;
    const Rtx = 0.62;
    const Rbg = 0.65;
    const Bclip = 1.414;
    const Bthrsh = 0.022;
    const Wscale = 1.14;
    const Woffset = 0.027;
    const Wclamp = 0.1;

    function softClamp(Yc) {
      if (Yc < 0.0) return 0.0;
      if (Yc < Bthrsh) {
        return Yc + Math.pow(Bthrsh - Yc, Bclip);
      }
      return Yc;
    }

    const Ytxt = softClamp(textY);
    const Ybg = softClamp(bgY);

    let Sapc = 0;

    if (Ybg > Ytxt) {
      // Normal polarity (dark text on light background)
      Sapc = (Math.pow(Ybg, Nbg) - Math.pow(Ytxt, Ntx)) * Wscale;
    } else {
      // Reverse polarity (light text on dark background)
      Sapc = (Math.pow(Ybg, Rbg) - Math.pow(Ytxt, Rtx)) * Wscale;
    }

    let Lc = 0;
    if (Math.abs(Sapc) < Wclamp) {
      Lc = 0.0;
    } else if (Sapc > 0) {
      Lc = (Sapc - Woffset) * 100.0;
    } else {
      Lc = (Sapc + Woffset) * 100.0;
    }

    return parseFloat(Lc.toFixed(1));
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

    const wcagIndicators = document.querySelectorAll(
      ".guide-content--wcag .threshold-indicator"
    );
    wcagIndicators.forEach((indicator) => {
      const threshold = parseFloat(indicator.dataset.threshold);
      const isPassed = wcagRatio >= threshold;

      indicator.innerHTML = isPassed
        ? '✅<span class="visually-hidden"> accessible</span>'
        : '❌<span class="visually-hidden"> non accessible</span>';
      indicator.dataset.passed = isPassed.toString();

      // Applique l'état au threshold-item parent
      const thresholdItem = indicator.closest(".threshold-item");
      if (thresholdItem) {
        thresholdItem.dataset.passed = isPassed.toString();
      }
    });
  }

  if (apcaRatioElement) {
    const apcaValue = parseFloat(apcaRatioElement.textContent);

    const apcaIndicators = document.querySelectorAll(
      ".guide-content--apca .threshold-indicator"
    );
    apcaIndicators.forEach((indicator) => {
      const threshold = parseFloat(indicator.dataset.threshold);
      // Pour APCA, seule la valeur absolue compte
      const isPassed = Math.abs(apcaValue) >= threshold;

      indicator.innerHTML = isPassed
        ? '✅<span class="visually-hidden"> accessible</span>'
        : '❌<span class="visually-hidden"> non accessible</span>';
      indicator.dataset.passed = isPassed.toString();

      // Applique l'état au threshold-item parent
      const thresholdItem = indicator.closest(".threshold-item");
      if (thresholdItem) {
        thresholdItem.dataset.passed = isPassed.toString();
      }
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
    const type = item.dataset.type; // Nouveau : type graphique
    const statusElement = item.querySelector(".threshold-status");

    if (!statusElement) return;

    let isPassed = false;

    if (contrastSwitcherChecked) {
      const apcaRatioElement = apcaDisplay.querySelector(".contrast-ratio");
      if (apcaRatioElement) {
        const apcaValue = Math.abs(parseFloat(apcaRatioElement.textContent));

        // Seuils APCA selon la taille et le type
        let threshold = 75;
        if (type === "graphic") {
          // Éléments graphiques = Texte large en APCA
          threshold = 45;
        } else if ((size >= 24 && weight === "bold") || size >= 36) {
          threshold = 45;
        } else if (size >= 24 || (size >= 16 && weight === "bold")) {
          threshold = 60;
        }

        isPassed = apcaValue >= threshold;
      }
    } else {
      const wcagRatioElement = wcagDisplay.querySelector(".contrast-ratio");
      if (wcagRatioElement) {
        const wcagRatio = parseFloat(wcagRatioElement.textContent);

        // Seuils WCAG2 selon la taille et le type (niveau AA)
        let threshold = 4.5;
        if (type === "graphic") {
          // Éléments graphiques = seuil 3:1
          threshold = 3;
        } else if ((size >= 18 && weight === "bold") || size >= 24) {
          threshold = 3;
        }

        isPassed = wcagRatio >= threshold;
      }
    }

    statusElement.innerHTML = isPassed
      ? '✅<span class="visually-hidden"> accessible</span>'
      : '❌<span class="visually-hidden"> non accessible</span>';

    // Applique l'état au size-indicator parent
    const sizeIndicator = item.querySelector(".size-indicator");
    if (sizeIndicator) {
      sizeIndicator.dataset.passed = isPassed.toString();
    }
  });
}

/**
 * Met à jour l'affichage des valeurs OKLCH et les calculs de contraste
 */
function updateOKLCHValues() {
  const primaryColorOutOfGamut = root.dataset.primaryColorOutOfGamut === "true";
  const box = document.querySelector(".box-user");

  if (box) {
    let actualBgColor, actualTextColor;
    let colorToDisplayInBox;

    if (isTextColorPrimary) {
      // Mode swap : sliders contrôlent le texte
      actualBgColor = getComputedStyle(root)
        .getPropertyValue("--color-user-1")
        .trim();
      actualTextColor = getComputedStyle(root)
        .getPropertyValue("--color-user-2")
        .trim();
      colorToDisplayInBox = actualTextColor;
    } else {
      // Mode normal : sliders contrôlent l'arrière-plan
      actualBgColor = getComputedStyle(root)
        .getPropertyValue("--color-user-2")
        .trim();
      actualTextColor = getComputedStyle(root)
        .getPropertyValue("--color-user-1")
        .trim();
      colorToDisplayInBox = actualBgColor;
    }

    // Fallback si les variables CSS ne sont pas encore définies
    if (!actualBgColor || actualBgColor === "") {
      actualBgColor = isTextColorPrimary ? "#eeeeee" : "#ff69b4";
    }
    if (!actualTextColor || actualTextColor === "") {
      actualTextColor = isTextColorPrimary ? "#ff69b4" : "#eeeeee";
    }
    if (!colorToDisplayInBox || colorToDisplayInBox === "") {
      colorToDisplayInBox = isTextColorPrimary ? "#ff69b4" : "#ff69b4";
    }

    // La boîte affiche toujours la couleur contrôlée par les sliders
    const oklchBgColorString = colorToDisplayInBox;
    const textColorForContrast = actualTextColor;

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

    if (textColorForContrast && oklchBgColorString) {
      const oklchRegex =
        /oklch\(\s*([\d.%]+)\s+([\d.%]+)\s+([\d.]+)\s*(?:\/\s*([\d.%]+))?\s*\)/i;
      const oklchDisplayValue = oklchBgColorString.replace(
        oklchRegex,
        (match, l, c, h, alpha) => {
          const lightness = l.includes("%")
            ? l
            : `${formatSmart(parseFloat(l) * 100, 2)}%`;
          const chroma = c.includes("%")
            ? `${formatSmart(parseFloat(c.replace("%", "")), 0)}%`
            : formatSmart(parseFloat(c), 3);
          const hue = formatSmart(parseFloat(h), 2);

          return `oklch(${lightness} ${chroma} ${hue})`;
        }
      );

      const hexEquivalentColor = toHex(oklchBgColorString);

      if (boxBodyOklchHalf) {
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
        currentBoxColorOutOfGamut = true;
        gamutWarningText = " (sRGB la plus proche)";
      }

      if (boxBodyHexHalf) {
        const realBgColorForHex = actualBgColor.startsWith("#")
          ? actualBgColor
          : toHex(actualBgColor);

        root.style.setProperty("--ui-background-hex", realBgColorForHex);
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
        // actualBgColor = vraie couleur d'arrière-plan, actualTextColor = vraie couleur de texte
        const realTextColor = actualTextColor.startsWith("#")
          ? actualTextColor
          : toHex(actualTextColor);
        const realBgColor = actualBgColor.startsWith("#")
          ? actualBgColor
          : toHex(actualBgColor);

        const wcagContrast = getContrastRatio(realTextColor, realBgColor);
        const apcaContrast = getAPCAContrast(realTextColor, realBgColor);

        if (contrastRatioElement) {
          const wcagRatioSpan =
            contrastRatioElement.querySelector(".contrast-ratio");
          if (wcagRatioSpan) {
            wcagRatioSpan.innerHTML = `<span class="contrast-value">${wcagContrast.toFixed(
              2
            )}</span><span class="contrast-unit">:1</span>`;
          } else {
            contrastRatioElement.innerHTML = `<span class="visually-hidden">Contraste WCAG2 : </span><span class="contrast-ratio"><span class="contrast-value">${wcagContrast.toFixed(
              2
            )}</span><span class="contrast-unit">:1</span></span>`;
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

          // Suppression de l'application de couleur - le texte garde sa couleur naturelle

          // Utiliser le conteneur d'avertissement existant
          const wcagWarningContainer =
            document.getElementById("wcag-gamut-warning");
          const shouldShowWcagWarning = currentBoxColorOutOfGamut;

          if (shouldShowWcagWarning) {
            if (wcagWarningContainer) {
              wcagWarningContainer.textContent =
                " (calculé sur la couleur sRGB la plus proche)";
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

          // Suppression de l'application de couleur - le texte garde sa couleur naturelle
        }
      } catch (error) {
        if (contrastRatioElement) {
          const wcagRatioSpan =
            contrastRatioElement.querySelector(".contrast-ratio");
          if (wcagRatioSpan) {
            wcagRatioSpan.innerHTML =
              '<span class="contrast-value">0.00</span><span class="contrast-unit">:1</span>';
          } else {
            contrastRatioElement.innerHTML =
              '<span class="visually-hidden">Contraste WCAG2 : </span><span class="contrast-ratio"><span class="contrast-value">0.00</span><span class="contrast-unit">:1</span></span>';
          }
          // Suppression de l'application de couleur - le texte garde sa couleur naturelle
          // contrastRatioElement.style.color = "var(--error)";
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
          wcagRatioSpan.innerHTML =
            '<span class="contrast-value">0.00</span><span class="contrast-unit">:1</span>';
        } else {
          contrastRatioElement.innerHTML =
            '<span class="visually-hidden">Contraste WCAG2 : </span><span class="contrast-ratio"><span class="contrast-value">0.00</span><span class="contrast-unit">:1</span></span>';
        }
        // Suppression de l'application de couleur - le texte garde sa couleur naturelle
        // contrastRatioElement.style.color = "var(--error)";
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

  updateThresholdIndicators();
  updateExampleIndicators();
}

/**
 * Met à jour une couleur (primaire contrôlée par sliders ou secondaire fixe)
 */
function updateColor(value, isPrimaryColor = true) {
  if (!isValidColor(value)) {
    return;
  }

  if (isPrimaryColor) {
    if (!isTextColorPrimary) {
      // Mode normal : sliders contrôlent l'arrière-plan
      if (backgroundColorText) backgroundColorText.value = value;
      if (backgroundColorPicker) backgroundColorPicker.value = value;
      root.style.setProperty("--ui-background", "var(--color-user-2)");
      root.style.setProperty("--ui-foreground", "var(--color-user-1)");
    } else {
      // Mode swap : sliders contrôlent le texte
      if (foregroundColorText) foregroundColorText.value = value;
      if (foregroundColorPicker) foregroundColorPicker.value = value;
      root.style.setProperty("--ui-background", "var(--color-user-1)");
      root.style.setProperty("--ui-foreground", "var(--color-user-2)");
    }

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

      initializeSliderDisplays();
    } catch (e) {
      root.dataset.primaryColorOutOfGamut = "true";
    }

    const secondaryColor = getComputedStyle(root)
      .getPropertyValue("--color-user-1")
      .trim();
    if (secondaryColor) {
      if (!isTextColorPrimary) {
        if (foregroundColorText) foregroundColorText.value = secondaryColor;
        if (foregroundColorPicker) foregroundColorPicker.value = secondaryColor;
      } else {
        if (backgroundColorText) backgroundColorText.value = secondaryColor;
        if (backgroundColorPicker) backgroundColorPicker.value = secondaryColor;
      }
    }
  } else {
    if (!isTextColorPrimary) {
      // Mode normal : mettre à jour la couleur de texte
      root.style.setProperty("--color-user-1", value);
      if (foregroundColorText) foregroundColorText.value = value;
      if (foregroundColorPicker) foregroundColorPicker.value = value;
      root.style.setProperty("--ui-background", "var(--color-user-2)");
      root.style.setProperty("--ui-foreground", "var(--color-user-1)");
    } else {
      // Mode swap : mettre à jour la couleur d'arrière-plan
      root.style.setProperty("--color-user-1", value);
      if (backgroundColorText) backgroundColorText.value = value;
      if (backgroundColorPicker) backgroundColorPicker.value = value;
      root.style.setProperty("--ui-background", "var(--color-user-1)");
      root.style.setProperty("--ui-foreground", "var(--color-user-2)");
    }
  }
  updateOKLCHValues();
}

if (backgroundColorPicker) {
  backgroundColorPicker.addEventListener("input", (e) => {
    // En mode normal: backgroundColorPicker contrôle la couleur primaire (arrière-plan)
    // En mode swap: backgroundColorPicker contrôle la couleur secondaire (texte)
    updateColor(e.target.value, !isTextColorPrimary);
  });
}

if (foregroundColorPicker) {
  foregroundColorPicker.addEventListener("input", (e) => {
    // En mode normal: foregroundColorPicker contrôle la couleur secondaire (texte)
    // En mode swap: foregroundColorPicker contrôle la couleur primaire (arrière-plan)
    updateColor(e.target.value, isTextColorPrimary);
  });
}

/**
 * Initialise l'affichage des sliders avec les valeurs CSS actuelles
 */
function initializeSliderDisplays() {
  updateSliderFromCSS("--slider-l", lSlider, lValueDisplay);
  updateSliderFromCSS("--slider-c", cSlider, cValueDisplay);
  updateSliderFromCSS("--slider-h", hSlider, hValueDisplay);
}

if (backgroundColorText) {
  backgroundColorText.addEventListener("input", (e) => {
    // En mode normal: backgroundColorText contrôle la couleur primaire (arrière-plan)
    // En mode swap: backgroundColorText contrôle la couleur secondaire (texte)
    updateColor(e.target.value, !isTextColorPrimary);
  });
}

if (foregroundColorText) {
  foregroundColorText.addEventListener("input", (e) => {
    // En mode normal: foregroundColorText contrôle la couleur secondaire (texte)
    // En mode swap: foregroundColorText contrôle la couleur primaire (arrière-plan)
    updateColor(e.target.value, isTextColorPrimary);
  });
}

/**
 * Met à jour un slider depuis une variable CSS
 */
function updateSliderFromCSS(cssVarName, slider, valueDisplay) {
  if (!slider) return;

  const computedValue = getComputedStyle(root)
    .getPropertyValue(cssVarName)
    .trim();

  if (cssVarName === "--slider-l") {
    let lightness = parseFloat(computedValue) * 100; // Convert from 0-1 to 0-100
    if (isNaN(lightness)) lightness = 75;
    slider.value = lightness;
    if (valueDisplay) {
      valueDisplay.textContent = `${formatSmart(lightness, 2)}%`;
    }
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

/**
 * Met à jour les champs couleur selon les valeurs des sliders
 */
function updateSliderColor() {
  const l = parseFloat(root.style.getPropertyValue("--slider-l")) || 0;
  const c = parseFloat(root.style.getPropertyValue("--slider-c")) || 0;
  const h = parseFloat(root.style.getPropertyValue("--slider-h")) || 0;

  const oklchColor = `oklch(${l} ${c} ${h})`;
  const hexColor = toHex(oklchColor);

  if (!isTextColorPrimary) {
    // Mode normal : sliders contrôlent l'arrière-plan
    if (backgroundColorPicker) backgroundColorPicker.value = hexColor;
    if (backgroundColorText) backgroundColorText.value = hexColor;
    root.style.setProperty("--ui-background", "var(--color-user-2)");
    root.style.setProperty("--ui-foreground", "var(--color-user-1)");
  } else {
    // Mode swap : sliders contrôlent le texte
    if (foregroundColorPicker) foregroundColorPicker.value = hexColor;
    if (foregroundColorText) foregroundColorText.value = hexColor;
    root.style.setProperty("--ui-background", "var(--color-user-1)");
    root.style.setProperty("--ui-foreground", "var(--color-user-2)");
  }

  updateOKLCHValues();
}

if (lSlider) {
  lSlider.addEventListener("input", () => {
    const value = parseFloat(lSlider.value);
    root.style.setProperty("--slider-l", (value / 100).toString()); // Convert from 0-100 to 0-1
    if (lValueDisplay) lValueDisplay.textContent = `${formatSmart(value, 2)}%`;
    updateSliderColor();
  });
}

if (cSlider) {
  cSlider.addEventListener("input", () => {
    const value = parseFloat(cSlider.value);
    root.style.setProperty("--slider-c", value.toString());
    if (cValueDisplay) cValueDisplay.textContent = formatSmart(value, 3);
    updateSliderColor();
  });
}

if (hSlider) {
  hSlider.addEventListener("input", () => {
    const value = parseFloat(hSlider.value);
    root.style.setProperty("--slider-h", value.toString());
    if (hValueDisplay) hValueDisplay.textContent = formatSmart(value, 2);
    updateSliderColor();
  });
}

/**
 * Initialise la page avec les couleurs par défaut
 */
function initializePage() {
  const initialBgColor = backgroundColorPicker
    ? backgroundColorPicker.value
    : "#ff69b4";
  const initialTextColor = foregroundColorPicker
    ? foregroundColorPicker.value
    : "#eeeeee";

  root.style.setProperty("--color-user-1", initialTextColor);
  root.style.setProperty("--ui-background", initialBgColor);
  root.style.setProperty("--ui-foreground", initialTextColor);

  try {
    const colorObj = new Color(initialBgColor);
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

    const inGamut = colorObj.inGamut("srgb");
    root.dataset.primaryColorOutOfGamut = String(!inGamut);
  } catch (e) {
    root.style.setProperty("--slider-l", "0.75");
    root.style.setProperty("--slider-c", "0.1");
    root.style.setProperty("--slider-h", "180");
    root.dataset.primaryColorOutOfGamut = "false";
  }

  initializeSliderDisplays();
  updateOKLCHValues();
}

initializePage();

/**
 * Synchronise les valeurs initiales au chargement
 */
function syncInitialValues() {
  const defaultBgColor = "#ff69b4";
  const defaultTextColor = "#eeeeee";

  updateColor(defaultBgColor, true);
  root.style.setProperty("--color-user-1", defaultTextColor);

  const backgroundColorPicker = document.getElementById(
    "backgroundColorPicker"
  );
  const backgroundColorText = document.getElementById("backgroundColorText");
  const foregroundColorPicker = document.getElementById(
    "foregroundColorPicker"
  );
  const foregroundColorText = document.getElementById("foregroundColorText");

  if (backgroundColorPicker) backgroundColorPicker.value = defaultBgColor;
  if (backgroundColorText) backgroundColorText.value = defaultBgColor;
  if (foregroundColorPicker) foregroundColorPicker.value = defaultTextColor;
  if (foregroundColorText) foregroundColorText.value = defaultTextColor;

  updateOKLCHValues();
}

syncInitialValues();

updateColorControlsOrder();
updateActiveColorIndicator();

/**
 * Réinitialise toutes les couleurs aux valeurs par défaut
 */
function resetToDefaultColors() {
  // Valeurs par défaut depuis le HTML
  const defaultTextColor = "#eeeeee";
  const defaultBgColor = "#ff69b4";

  // Utiliser la même logique qu'au chargement initial pour synchroniser tout
  updateColor(defaultBgColor, true); // Met à jour automatiquement les sliders OKLCH
  root.style.setProperty("--color-user-1", defaultTextColor);

  // Réinitialiser les champs de saisie de couleur
  if (foregroundColorPicker) foregroundColorPicker.value = defaultTextColor;
  if (foregroundColorText) foregroundColorText.value = defaultTextColor;
  if (backgroundColorPicker) backgroundColorPicker.value = defaultBgColor;
  if (backgroundColorText) backgroundColorText.value = defaultBgColor;

  // Remettre les attributs data aux valeurs par défaut
  root.removeAttribute("data-primary-color-out-of-gamut");
  root.removeAttribute("data-background-color-out-of-gamut");

  // Réinitialiser l'état du swap de couleurs
  isTextColorPrimary = false;
  updateActiveColorIndicator();
  updateColorControlsOrder();

  // Réinitialiser le contraste switcher en mode WCAG
  if (contrastSwitcher) {
    contrastSwitcher.checked = false;
    // L'event listener se chargera de mettre à jour les labels
  }
}

// Event listener pour le bouton de réinitialisation
const resetButton = document.getElementById("reset-colors");
if (resetButton) {
  resetButton.addEventListener("click", resetToDefaultColors);
}
