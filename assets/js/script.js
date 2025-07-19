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

// Prevent form submission
form.addEventListener("submit", (e) => e.preventDefault());

// Handle contrast type switching
contrastSwitcher.addEventListener("change", (e) => {
  if (e.target.checked) {
    // Show APCA, hide WCAG2
    wcagDisplay.style.display = "none";
    apcaDisplay.style.display = "block";
  } else {
    // Show WCAG2, hide APCA
    wcagDisplay.style.display = "block";
    apcaDisplay.style.display = "none";
  }
});

// Converts a color to #RRGGBB or #RRGGBBAA hexadecimal value
function toHex(colorStringInput) {
  const originalColorString = String(colorStringInput);

  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  ctx.fillStyle = originalColorString;
  ctx.fillRect(0, 0, 1, 1);

  const imageData = ctx.getImageData(0, 0, 1, 1).data;
  const r = imageData[0];
  const g = imageData[1];
  const b = imageData[2];
  const a = imageData[3];

  if (
    typeof r === "undefined" ||
    typeof g === "undefined" ||
    typeof b === "undefined" ||
    typeof a === "undefined" ||
    isNaN(r) ||
    isNaN(g) ||
    isNaN(b) ||
    isNaN(a)
  ) {
    return "#000000";
  }

  const rHex = r.toString(16).padStart(2, "0");
  const gHex = g.toString(16).padStart(2, "0");
  const bHex = b.toString(16).padStart(2, "0");

  if (a === 255) {
    return `#${rHex}${gHex}${bHex}`;
  } else {
    const aHex = a.toString(16).padStart(2, "0");
    return `#${rHex}${gHex}${bHex}${aHex}`;
  }
}

function isValidColor(color) {
  const style = new Option().style;
  style.color = color;
  return style.color !== "";
}

const oklchRegex =
  /oklch\(\s*([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+%?)(?:\s*\/\s*([\d.]+%?))?\s*\)/i;

function formatToOKLCHDisplay(colorString) {
  let temp = document.createElement("div");
  temp.style.color = colorString;
  document.body.appendChild(temp);
  let computedColor = getComputedStyle(temp).color;

  let colorObj;
  try {
    colorObj = new Color(computedColor).to("oklch");
  } catch (e) {
    document.body.removeChild(temp);
    const regexMatches = computedColor.match(oklchRegex);
    if (regexMatches) {
      let [, l_regex, c_regex, h_regex, a_regex] = regexMatches;
      const l_num_regex = parseFloat(l_regex);
      const l_percent_regex = l_regex.includes("%")
        ? `${Math.round(l_num_regex)}%`
        : `${Math.round(l_num_regex * 100)}%`;
      const c_formatted_regex =
        parseFloat(c_regex)
          .toFixed(3)
          .replace(/\.?0+$/, "") || "0";
      const h_formatted_regex = Math.round(parseFloat(h_regex));
      let alphaPart_regex = "";
      if (a_regex !== undefined) {
        let aNum_regex = parseFloat(a_regex);
        if (Math.abs(aNum_regex - 1) > 0.001 && Math.abs(aNum_regex) > 0.001) {
          alphaPart_regex = ` / ${aNum_regex.toFixed(2).replace(/\.?0+$/, "")}`;
        } else if (Math.abs(aNum_regex) < 0.001) {
          alphaPart_regex = ` / 0`;
        }
      }
      return `oklch(${l_percent_regex} ${c_formatted_regex} ${h_formatted_regex}${alphaPart_regex})`;
    }
    return computedColor;
  }
  document.body.removeChild(temp);

  let [l, c, h, alpha] = colorObj.coords;
  let oklchAlpha = colorObj.alpha;

  const lPercent = (l * 100).toFixed(4).replace(/\.?0+$/, "") + "%";

  const cFormatted =
    parseFloat(c)
      .toFixed(4)
      .replace(/\.?0+$/, "") || "0";

  const hFormatted = !isNaN(h)
    ? parseFloat(h)
        .toFixed(4)
        .replace(/\.?0+$/, "")
    : "0";

  let alphaPart = "";
  if (
    oklchAlpha !== undefined &&
    Math.abs(oklchAlpha - 1) > 0.00001 &&
    Math.abs(oklchAlpha) > 0.00001
  ) {
    alphaPart = ` / ${parseFloat(oklchAlpha)
      .toFixed(2)
      .replace(/\.?0+$/, "")}`;
  } else if (oklchAlpha !== undefined && Math.abs(oklchAlpha) < 0.00001) {
    alphaPart = ` / 0`;
  }

  return `oklch(${lPercent} ${cFormatted} ${hFormatted}${alphaPart})`;
}

function getOKLCHValuesFromColor(colorString) {
  try {
    const color = new Color(colorString);

    if (typeof color.to === "function") {
      const oklchColorSpaceObject = color.to("oklch");

      if (
        oklchColorSpaceObject &&
        typeof oklchColorSpaceObject.coords !== "undefined" &&
        Array.isArray(oklchColorSpaceObject.coords)
      ) {
        const coords = oklchColorSpaceObject.coords;
        return {
          l: coords[0],
          c: coords[1],
          h: coords[2] !== undefined && !isNaN(coords[2]) ? coords[2] : 0,
        };
      }
    }

    if (typeof color.oklch === "function") {
      const oklch = color.oklch();
      if (Array.isArray(oklch)) {
        return {
          l: oklch[0],
          c: oklch[1],
          h: oklch[2] !== undefined && !isNaN(oklch[2]) ? oklch[2] : 0,
        };
      } else {
        throw new Error("color.oklch() did not return an array.");
      }
    } else {
      throw new TypeError("Cannot get OKLCH values from the color object.");
    }
  } catch (e) {
    return { l: 0, c: 0, h: 0 };
  }
}

function getLuminance(colorString) {
  try {
    const color = new Color(colorString).to("srgb");
    const rgb = color.coords.map((c) => {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
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

    const contrastLc = APCAcontrast(
      sRGBtoY([rT, gT, bT]),
      sRGBtoY([rB, gB, bB])
    );
    if (isNaN(contrastLc)) {
      return 0;
    }
    return parseFloat(contrastLc.toFixed(2));
  } catch (e) {
    return 0;
  }
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
    const hexCodeSpanInBox = hexDisplayContainerInBox
      ? hexDisplayContainerInBox.querySelector(".hex-code")
      : null;
    const gamutWarningSpanInBox = hexDisplayContainerInBox
      ? hexDisplayContainerInBox.querySelector(".gamut-warning-inline")
      : null;

    const contrastRatioElement = document.querySelector(".contrast-value");
    const apcaContrastDisplay = document.querySelector(
      ".contrast-display--apca .contrast-value"
    );

    if (
      oklchBgColorString &&
      oklchBgColorString !== "rgba(0, 0, 0, 0)" &&
      oklchBgColorString !== "transparent"
    ) {
      const oklchDisplayValue = formatToOKLCHDisplay(oklchBgColorString);
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

            if (lComponent !== originalLComponent) {
              colorStringToParse = `oklch(${lComponent} ${cComponent} ${hComponent}${
                alphaComponent !== undefined ? ` / ${alphaComponent}` : ""
              })`;
            }
          }
        }
        const colorObj = new Color(colorStringToParse);
        currentBoxColorOutOfGamut = !colorObj.inGamut("srgb");
        if (currentBoxColorOutOfGamut) {
          gamutWarningText = " (couleur sRGB la plus proche)";
        }
      } catch (e) {
        currentBoxColorOutOfGamut = true;
        gamutWarningText = " (couleur sRGB la plus proche)";
      }

      if (boxBodyHexHalf) {
        boxBodyHexHalf.style.backgroundColor = hexEquivalentColor;
        if (hexCodeSpanInBox) hexCodeSpanInBox.textContent = hexDisplayValue;
        if (gamutWarningSpanInBox)
          gamutWarningSpanInBox.textContent = gamutWarningText;
      }

      if (oklchValueInBox) {
        oklchValueInBox.style.color = textColor;
      }
      if (hexCodeSpanInBox) {
        hexCodeSpanInBox.style.color = textColor;
      }
      if (gamutWarningSpanInBox) {
        gamutWarningSpanInBox.style.color = textColor;
      }

      const wcagContainer = contrastRatioElement
        ? contrastRatioElement.parentElement
        : null;

      const wcagContrast = getContrastRatio(hexEquivalentColor, textColor);
      if (contrastRatioElement) {
        const wcagRatioSpan =
          contrastRatioElement.querySelector(".contrast-ratio");
        if (isNaN(wcagContrast) || typeof wcagContrast !== "number") {
          if (wcagRatioSpan) {
            wcagRatioSpan.textContent = "N/A";
          } else {
            contrastRatioElement.innerHTML =
              '<span class="visually-hidden">Contraste WCAG2 : </span><span class="contrast-ratio">N/A</span>';
          }
          contrastRatioElement.style.color = "var(--on-surface)";
        } else {
          if (wcagRatioSpan) {
            wcagRatioSpan.textContent = wcagContrast.toFixed(2);
          } else {
            contrastRatioElement.innerHTML = `<span class="visually-hidden">Contraste WCAG2 : </span><span class="contrast-ratio">${wcagContrast.toFixed(
              2
            )}</span>`;
          }
          if (wcagContrast >= 4.5) {
            contrastRatioElement.style.color = "var(--success)";
          } else {
            contrastRatioElement.style.color = "var(--error)";
          }
        }
      }

      const apcaLc = getAPCAContrast(textColor, hexEquivalentColor);
      if (apcaContrastDisplay) {
        const apcaValueSpan =
          apcaContrastDisplay.querySelector(".contrast-ratio");
        if (apcaLc === null || isNaN(apcaLc)) {
          if (apcaValueSpan) apcaValueSpan.textContent = "N/A";
          else
            apcaContrastDisplay.innerHTML =
              '<span class="visually-hidden">APCA Lc : </span><span class="contrast-ratio">N/A</span>';
        } else {
          if (apcaValueSpan) apcaValueSpan.textContent = apcaLc.toFixed(2);
          else
            apcaContrastDisplay.innerHTML = `<span class="visually-hidden">APCA Lc : </span><span class="contrast-ratio">${apcaLc.toFixed(
              2
            )}</span>`;
        }
      }

      if (wcagContainer) {
        let wcagWarningElement = wcagContainer.querySelector(
          ".wcag-gamut-warning"
        );
        const shouldShowWcagWarning = currentBoxColorOutOfGamut;

        if (shouldShowWcagWarning) {
          if (!wcagWarningElement) {
            wcagWarningElement = document.createElement("span");
            wcagWarningElement.classList.add("wcag-gamut-warning");
            if (contrastRatioElement.nextSibling) {
              wcagContainer.insertBefore(
                wcagWarningElement,
                contrastRatioElement.nextSibling
              );
            } else {
              wcagContainer.appendChild(wcagWarningElement);
            }
          }
          wcagWarningElement.textContent =
            " (ratio basé sur la couleur sRGB la plus proche)";
        } else {
          if (wcagWarningElement) {
            wcagWarningElement.remove();
          }
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
}

function updateColor(value, isPrimaryColor = true) {
  if (!isValidColor(value)) {
    return;
  }

  if (isPrimaryColor) {
    root.style.setProperty("--color-variant", value);
    if (colorText) colorText.value = value;
    try {
      const colorObj = new Color(value);
      const inGamut = colorObj.inGamut("srgb");
      root.dataset.primaryColorOutOfGamut = String(!inGamut);
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

if (colorText) {
  colorText.addEventListener("change", (e) => {
    updateColor(e.target.value, true);
  });
}

if (textColorText) {
  textColorText.addEventListener("change", (e) => {
    updateColor(e.target.value, false);
  });
}

updateOKLCHValues();

initializeSliderDisplays();

[lSlider, cSlider, hSlider].forEach((slider) => {
  if (slider) {
    slider.addEventListener("input", (e) => {
      const l = lSlider.value / 100;
      const c = cSlider.value;
      const h = hSlider.value;

      if (lValueDisplay)
        lValueDisplay.textContent = `${Math.round(lSlider.value)}%`;
      if (cValueDisplay)
        cValueDisplay.textContent = parseFloat(cSlider.value).toFixed(4);
      if (hValueDisplay)
        hValueDisplay.textContent = parseFloat(hSlider.value).toFixed(4);

      const oklchColor = `oklch(${l} ${c} ${h})`;

      root.style.setProperty("--color-variant", oklchColor);
      updateOKLCHValues();
    });
  }
});

function initializeSliderDisplays() {
  const initialPrimaryColor = getComputedStyle(root)
    .getPropertyValue("--color-variant")
    .trim();

  root.style.setProperty("--color-variant", initialPrimaryColor);

  if (
    lSlider &&
    cSlider &&
    hSlider &&
    lValueDisplay &&
    cValueDisplay &&
    hValueDisplay
  ) {
    try {
      const formattedPrimaryOKLCHString =
        formatToOKLCHDisplay(initialPrimaryColor);

      const matches = formattedPrimaryOKLCHString.match(oklchRegex);
      if (matches) {
        let [, l_str_from_format, c_str_from_format, h_str_from_format] =
          matches;

        const l_slider_val = parseFloat(l_str_from_format.replace("%", ""));
        const c_slider_val = parseFloat(c_str_from_format);
        const h_slider_val = parseFloat(h_str_from_format);

        lSlider.value = l_slider_val.toFixed(0);
        cSlider.value = c_slider_val.toFixed(4);
        hSlider.value = h_slider_val.toFixed(4);

        lValueDisplay.textContent = `${Math.round(l_slider_val)}%`;
        cValueDisplay.textContent = c_slider_val.toFixed(4);
        hValueDisplay.textContent = h_slider_val.toFixed(4);

        root.style.setProperty("--slider-l", (l_slider_val / 100).toString());
        root.style.setProperty("--slider-c", c_slider_val.toString());
        root.style.setProperty("--slider-h", h_slider_val.toString());
      } else {
        const oklchValues = getOKLCHValuesFromColor(initialPrimaryColor);
        if (oklchValues) {
          const l_val = oklchValues.l * 100;
          lSlider.value = l_val.toFixed(0);
          cSlider.value = oklchValues.c.toFixed(4);
          hSlider.value = oklchValues.h.toFixed(4);
          lValueDisplay.textContent = `${Math.round(l_val)}%`;
          cValueDisplay.textContent = oklchValues.c.toFixed(4);
          hValueDisplay.textContent = oklchValues.h.toFixed(4);
          root.style.setProperty("--slider-l", oklchValues.l.toString());
          root.style.setProperty("--slider-c", oklchValues.c.toString());
          root.style.setProperty("--slider-h", oklchValues.h.toString());
        }
      }
    } catch (e) {
      lSlider.value = 75;
      cSlider.value = 0.1;
      hSlider.value = 180;
      lValueDisplay.textContent = "75%";
      cValueDisplay.textContent = "0.1000";
      hValueDisplay.textContent = "180.0000";
      root.style.setProperty("--slider-l", "0.75");
      root.style.setProperty("--slider-c", "0.1");
      root.style.setProperty("--slider-h", "180");
    }
  }

  updateOKLCHValues();
}

function initializeApp() {
  const initialPrimaryColor = getComputedStyle(root)
    .getPropertyValue("--color-variant")
    .trim();
  const initialTextColor = getComputedStyle(root)
    .getPropertyValue("--color-text-user")
    .trim();

  if (initialPrimaryColor && isValidColor(initialPrimaryColor)) {
    if (colorPicker) colorPicker.value = toHex(initialPrimaryColor);
    if (colorText) colorText.value = initialPrimaryColor;
    try {
      const colorObj = new Color(initialPrimaryColor);
      root.dataset.primaryColorOutOfGamut = String(!colorObj.inGamut("srgb"));
    } catch (e) {
      root.dataset.primaryColorOutOfGamut = "true";
    }
  }

  if (initialTextColor && isValidColor(initialTextColor)) {
    if (textColorPicker) textColorPicker.value = toHex(initialTextColor);
    if (textColorText) textColorText.value = initialTextColor;
  }

  initializeSliderDisplays();
  updateOKLCHValues();
}

document.addEventListener("DOMContentLoaded", initializeApp);
