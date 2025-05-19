console.log("Script.js loaded and running"); // Log on script load

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

// Log to verify element selection
console.log("colorPicker element:", colorPicker);
console.log("textColorPicker element:", textColorPicker);
console.log("form element:", form);

// Prevent form submission
form.addEventListener("submit", (e) => e.preventDefault());

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
    console.error(
      `toHex: Could not get RGBA components from canvas for color: "${originalColorString}". Returning black by default.`
    );
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

const oklchRegex = /oklch\((\d*\.?\d+%?)\s(\d*\.?\d+%?)\s(\d*\.?\d+%?)(?:\s*\/\s*(\d*\.?\d+%?))?\)/;

function formatToOKLCHDisplay(colorString) {
  let temp = document.createElement("div");
  temp.style.color = colorString;
  document.body.appendChild(temp);
  let computedColor = getComputedStyle(temp).color;

  // Use Color.js to get the oklch values directly for better precision
  let colorObj;
  try {
    colorObj = new Color(computedColor).to("oklch");
  } catch (e) {
    console.error("[formatToOKLCHDisplay] Error parsing color with Color.js:", computedColor, e);
    document.body.removeChild(temp);
    // Fallback to regex if Color.js fails (e.g. for invalid colors before full parsing)
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
    return computedColor; // Return as is if regex also fails
  }
  document.body.removeChild(temp);

  let [l, c, h, alpha] = colorObj.coords;
  let oklchAlpha = colorObj.alpha;

  // L: 0-1 from Color.js, convert to percentage 0-100%
  // No rounding for L before converting to percentage to keep precision
  const lPercent = (l * 100).toFixed(4).replace(/\.?0+$/, "") + "%";

  // C: Chroma, round to 4 decimal places
  const cFormatted =
    parseFloat(c)
      .toFixed(4)
      .replace(/\.?0+$/, "") || "0";

  // H: Hue, round to 4 decimal places. Handle NaN for achromatic colors (h becomes 0).
  const hFormatted = !isNaN(h)
    ? parseFloat(h)
        .toFixed(4)
        .replace(/\.?0+$/, "")
    : "0";

  let alphaPart = "";
  // Alpha: 0-1 from Color.js, format to 2 decimal places if not 1 or 0
  if (oklchAlpha !== undefined && Math.abs(oklchAlpha - 1) > 0.00001 && Math.abs(oklchAlpha) > 0.00001) {
    alphaPart = ` / ${parseFloat(oklchAlpha)
      .toFixed(2)
      .replace(/\.?0+$/, "")}`;
  } else if (oklchAlpha !== undefined && Math.abs(oklchAlpha) < 0.00001) {
    alphaPart = ` / 0`;
  }
  // If alpha is exactly 1 or undefined (no alpha), no alpha part is added.

  return `oklch(${lPercent} ${cFormatted} ${hFormatted}${alphaPart})`;
}

function getOKLCHValuesFromColor(colorString) {
  try {
    console.log("[getOKLCHValuesFromColor] Input colorString:", colorString);
    const color = new Color(colorString); // Color.js instance
    console.log("[getOKLCHValuesFromColor] Parsed color object:", color);

    // Preferred method: .to("oklch").coords
    if (typeof color.to === "function") {
      const oklchColorSpaceObject = color.to("oklch");
      console.log("[getOKLCHValuesFromColor] color.to('oklch') result:", oklchColorSpaceObject);

      if (
        oklchColorSpaceObject &&
        typeof oklchColorSpaceObject.coords !== "undefined" &&
        Array.isArray(oklchColorSpaceObject.coords)
      ) {
        const coords = oklchColorSpaceObject.coords; // Should be [l, c, h, alpha]
        console.log("[getOKLCHValuesFromColor] OKLCH Coords from .to('oklch').coords:", coords);
        return {
          l: coords[0], // L is 0 to 1
          c: coords[1], // C
          h: coords[2] !== undefined && !isNaN(coords[2]) ? coords[2] : 0, // Hue, ensure it's a number
        };
      } else {
        console.warn(
          "[getOKLCHValuesFromColor] color.to('oklch').coords is not an array or oklchColorSpaceObject is invalid. Coords:",
          oklchColorSpaceObject ? oklchColorSpaceObject.coords : "N/A"
        );
      }
    } else {
      console.warn("[getOKLCHValuesFromColor] color.to is not a function. Attempting fallback to color.oklch().");
    }

    // Fallback to color.oklch()
    if (typeof color.oklch === "function") {
      console.log("[getOKLCHValuesFromColor] Attempting with color.oklch().");
      const oklch = color.oklch(); // Should return [l, c, h, alpha]
      console.log("[getOKLCHValuesFromColor] OKLCH Coords from .oklch():", oklch);
      if (Array.isArray(oklch)) {
        return {
          l: oklch[0],
          c: oklch[1],
          h: oklch[2] !== undefined && !isNaN(oklch[2]) ? oklch[2] : 0,
        };
      } else {
        console.error("[getOKLCHValuesFromColor] color.oklch() did not return an array:", oklch);
        throw new Error("color.oklch() did not return an array.");
      }
    } else {
      console.error(
        "[getOKLCHValuesFromColor] Neither color.to nor color.oklch are valid functions on the color object."
      );
      throw new TypeError("Cannot get OKLCH values from the color object.");
    }
  } catch (e) {
    console.error("[getOKLCHValuesFromColor] Error parsing color:", colorString, e);
    return { l: 0, c: 0, h: 0 }; // Return default values on error
  }
}

function getLuminance(colorString) {
  try {
    const color = new Color(colorString).to("srgb"); // Convert to sRGB for luminance
    const rgb = color.coords.map((c) => {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  } catch (e) {
    console.error(`[getLuminance] Error processing color: ${colorString}`, e);
    return 0; // Return 0 on error to avoid breaking contrast calculation
  }
}

function getContrastRatio(color1, color2) {
  try {
    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);
    if (isNaN(lum1) || isNaN(lum2)) {
      console.error(`[getContrastRatio] Invalid luminance values. Lum1: ${lum1}, Lum2: ${lum2}`);
      return 0;
    }
    const contrast = (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);
    return parseFloat(contrast.toFixed(2));
  } catch (e) {
    console.error("[getContrastRatio] Error:", e, "Inputs:", color1, color2);
    return 0; // Return 0 on error
  }
}

function getAPCAContrast(textColor, backgroundColor) {
  try {
    const colorTextObj = new Color(textColor).to("srgb");
    const colorBgObj = new Color(backgroundColor).to("srgb");

    if (!colorTextObj || !colorTextObj.coords) {
      console.error(`[getAPCAContrast] Invalid text color object or coords for: ${textColor}`);
      return 0;
    }
    if (!colorBgObj || !colorBgObj.coords) {
      console.error(`[getAPCAContrast] Invalid background color object or coords for: ${backgroundColor}`);
      return 0;
    }

    const rT = Math.round(colorTextObj.coords[0] * 255);
    const gT = Math.round(colorTextObj.coords[1] * 255);
    const bT = Math.round(colorTextObj.coords[2] * 255);

    const rB = Math.round(colorBgObj.coords[0] * 255);
    const gB = Math.round(colorBgObj.coords[1] * 255);
    const bB = Math.round(colorBgObj.coords[2] * 255);

    const contrastLc = APCAcontrast(sRGBtoY([rT, gT, bT]), sRGBtoY([rB, gB, bB]));
    if (isNaN(contrastLc)) {
      console.warn(
        `[getAPCAContrast] APCAcontrast returned NaN for textColor: ${textColor} and backgroundColor: ${backgroundColor}. Returning 0.`
      );
      return 0;
    }
    return parseFloat(contrastLc.toFixed(2));
  } catch (e) {
    console.error("[getAPCAContrast] Error:", e, "Inputs:", textColor, backgroundColor);
    return 0; // Return 0 on error
  }
}

function updateOKLCHValues() {
  const primaryColorOutOfGamut = root.dataset.primaryColorOutOfGamut === "true";
  const boxesToUpdate = document.querySelectorAll(".box");

  boxesToUpdate.forEach((box) => {
    let textColorVarName;
    let boxBgColorCssVar;
    let isUserBox = box.classList.contains("box-user");

    if (isUserBox) {
      textColorVarName = "--color-text-user";
      boxBgColorCssVar = "--color-primary";
    } else if (box.classList.contains("box-variant")) {
      textColorVarName = "--color-text-user"; // Variant box also uses user text color for its content
      boxBgColorCssVar = "--color-variant";
    } else {
      console.warn("[updateOKLCHValues] Box does not have a recognized class.", box.className);
      return; // Skip this box if it's not user or variant
    }
    const textColor = getComputedStyle(root).getPropertyValue(textColorVarName).trim();
    const oklchBgColorString = getComputedStyle(root).getPropertyValue(boxBgColorCssVar).trim();

    console.log(
      `[updateOKLCHValues] Called for ${box.className}. textColor (${textColorVarName}): ${textColor}, oklchBgColorString (${boxBgColorCssVar}): ${oklchBgColorString}`
    );

    const boxBodyOklchHalf = box.querySelector(".box-half.box-oklch");
    const boxBodyHexHalf = box.querySelector(".box-half.box-hex");
    const oklchValueInBox = boxBodyOklchHalf ? boxBodyOklchHalf.querySelector(".box-color-value") : null;
    // Select the new structure for HEX display in box-body
    const hexDisplayContainerInBox = boxBodyHexHalf ? boxBodyHexHalf.querySelector(".box-color-value") : null;
    const hexCodeSpanInBox = hexDisplayContainerInBox ? hexDisplayContainerInBox.querySelector(".hex-code") : null;
    const gamutWarningSpanInBox = hexDisplayContainerInBox
      ? hexDisplayContainerInBox.querySelector(".gamut-warning-inline")
      : null;

    const contrastRatioElement = box.querySelector(".contrast-ratio-display");
    const apcaContrastDisplay = box.querySelector(".apca-contrast-display");

    if (oklchBgColorString && oklchBgColorString !== "rgba(0, 0, 0, 0)" && oklchBgColorString !== "transparent") {
      const oklchDisplayValue = formatToOKLCHDisplay(oklchBgColorString);
      const hexEquivalentColor = toHex(oklchBgColorString); // This is the sRGB equivalent

      // Update OKLCH side of the box-body
      if (boxBodyOklchHalf) {
        boxBodyOklchHalf.style.backgroundColor = oklchBgColorString;
        if (oklchValueInBox) oklchValueInBox.textContent = oklchDisplayValue;
      }

      // Update HEX side of the box-body
      let hexDisplayValue = hexEquivalentColor;
      let gamutWarningText = "";
      let currentBoxColorOutOfGamut = false;
      try {
        const colorObj = new Color(oklchBgColorString);
        currentBoxColorOutOfGamut = !colorObj.inGamut("srgb");
        if (currentBoxColorOutOfGamut) {
          gamutWarningText = " (closest sRGB color)";
        }
      } catch (e) {
        console.error(`[updateOKLCHValues] Error checking gamut for ${oklchBgColorString}:`, e);
        currentBoxColorOutOfGamut = true; // Assume out of gamut on error
        gamutWarningText = " (closest sRGB color)";
      }

      if (boxBodyHexHalf) {
        boxBodyHexHalf.style.backgroundColor = hexEquivalentColor; // Use the sRGB hex for background
        if (hexCodeSpanInBox) hexCodeSpanInBox.textContent = hexDisplayValue;
        if (gamutWarningSpanInBox) gamutWarningSpanInBox.textContent = gamutWarningText;
      }

      // Update text colors inside box-halves to always use --color-text-user
      if (oklchValueInBox) {
        oklchValueInBox.style.color = textColor; // Use --color-text-user
      }
      // Update text color for the new structure in HEX display
      if (hexCodeSpanInBox) {
        hexCodeSpanInBox.style.color = textColor; // Use --color-text-user
      }
      if (gamutWarningSpanInBox) {
        gamutWarningSpanInBox.style.color = textColor; // Or a specific warning color if desired
        // Example: gamutWarningSpanInBox.style.color = 'var(--color-accent)';
      }

      const wcagContainer = contrastRatioElement ? contrastRatioElement.parentElement : null;

      // Use hexEquivalentColor for contrast calculations as it represents the displayed color
      const wcagContrast = getContrastRatio(hexEquivalentColor, textColor);
      if (contrastRatioElement) {
        if (isNaN(wcagContrast) || typeof wcagContrast !== "number") {
          contrastRatioElement.textContent = "WCAG2 Contrast: N/A";
          contrastRatioElement.style.color = "var(--on-surface)"; // Default color for N/A
        } else {
          const wcagPass = wcagContrast >= 4.5 ? "✓" : "✗";
          contrastRatioElement.textContent = `WCAG2 Contrast: ${wcagContrast.toFixed(2)} ${wcagPass}`;
          // Apply color based on pass/fail
          if (wcagContrast >= 4.5) {
            contrastRatioElement.style.color = "var(--success)";
          } else {
            contrastRatioElement.style.color = "var(--error)";
          }
        }
      } else {
        console.warn("[updateOKLCHValues] Element .contrast-ratio-display not found in box:", box.className);
      }

      const apcaLc = getAPCAContrast(textColor, hexEquivalentColor);
      if (apcaContrastDisplay) {
        const apcaValueSpan = apcaContrastDisplay.querySelector(".apca-lc-value");
        if (apcaLc === null || isNaN(apcaLc)) {
          if (apcaValueSpan) apcaValueSpan.textContent = "N/A";
          else apcaContrastDisplay.textContent = "APCA Lc: N/A";
        } else {
          if (apcaValueSpan) apcaValueSpan.textContent = apcaLc.toFixed(2);
          else apcaContrastDisplay.textContent = `APCA Lc: ${apcaLc.toFixed(2)}`;
        }
      } else {
        console.warn("[updateOKLCHValues] Element .apca-contrast-display not found in box:", box.className);
      }

      // Gamut warning for WCAG ratio (below the box)
      if (wcagContainer) {
        let wcagWarningElement = wcagContainer.querySelector(".wcag-gamut-warning");
        const shouldShowWcagWarning = currentBoxColorOutOfGamut;

        if (shouldShowWcagWarning) {
          if (!wcagWarningElement) {
            wcagWarningElement = document.createElement("span");
            wcagWarningElement.classList.add("wcag-gamut-warning");
            // Append after the contrastRatioElement itself
            if (contrastRatioElement.nextSibling) {
              wcagContainer.insertBefore(wcagWarningElement, contrastRatioElement.nextSibling);
            } else {
              wcagContainer.appendChild(wcagWarningElement);
            }
          }
          wcagWarningElement.textContent = " (ratio based on closest sRGB color)";
        } else {
          if (wcagWarningElement) {
            wcagWarningElement.remove();
          }
        }
      }
    } else {
      // Fallback for transparent/invalid background
      if (contrastRatioElement) {
        contrastRatioElement.textContent = "WCAG2 Contrast: 0.00 ✗";
        contrastRatioElement.style.color = "var(--error)"; // Default error color
      }
      if (apcaContrastDisplay) {
        const apcaValueSpan = apcaContrastDisplay.querySelector(".apca-lc-value");
        if (apcaValueSpan) apcaValueSpan.textContent = "0.00";
        else apcaContrastDisplay.textContent = "APCA Lc: 0.00";
      }
    }
  });
}

// Function to update color based on picker or text input
function updateColor(value, isPrimaryColor = true) {
  console.log(`[updateColor] Called. Value: ${value}, isPrimaryColor: ${isPrimaryColor}`);
  if (!isValidColor(value)) {
    console.warn(`[updateColor] Invalid color value: ${value}`);
    return;
  }

  if (isPrimaryColor) {
    root.style.setProperty("--color-primary", value);
    console.log(`[updateColor] CSS variable --color-primary set to ${value}`);
    if (colorText) colorText.value = value;
    else console.warn("[updateColor] colorText element not found");
    try {
      const colorObj = new Color(value); // Create Color object once
      const inGamut = colorObj.inGamut("srgb");
      root.dataset.primaryColorOutOfGamut = String(!inGamut);
      console.log(
        `[updateColor] Gamut check for ${value}: inGamut=${inGamut}, dataset.primaryColorOutOfGamut=${root.dataset.primaryColorOutOfGamut}`
      );
    } catch (e) {
      console.error(`[updateColor] Error checking gamut for ${value}:`, e);
      root.dataset.primaryColorOutOfGamut = "true"; // Default to out of gamut on error
    }
    // Synchronize LCH sliders and --color-variant with the new primary color
    console.log("[updateColor] Primary color changed, calling initializeSliderDisplays to sync variant and sliders.");
    initializeSliderDisplays();
  } else {
    // Update --color-text-user when textColorPicker or textColorText changes
    root.style.setProperty("--color-text-user", value);
    console.log(`[updateColor] CSS variable --color-text-user set to ${value}`);
    if (textColorText) textColorText.value = value;
    else console.warn("[updateColor] textColorText element not found");
  }
  console.log("[updateColor] Calling updateOKLCHValues...");
  updateOKLCHValues();
}

// Event listeners for color pickers
if (colorPicker) {
  colorPicker.addEventListener("input", (e) => {
    console.log("[Event Listener] colorPicker input event triggered");
    updateColor(e.target.value, true);
  });
} else console.error("colorPicker element not found for event listener");

if (textColorPicker) {
  textColorPicker.addEventListener("input", (e) => {
    console.log("[Event Listener] textColorPicker input event triggered");
    updateColor(e.target.value, false);
  });
} else console.error("textColorPicker element not found for event listener");

// Event listeners for text inputs
if (colorText) {
  colorText.addEventListener("change", (e) => {
    console.log("[Event Listener] colorText change event triggered");
    updateColor(e.target.value, true);
  });
} else console.error("colorText element not found for event listener");

if (textColorText) {
  textColorText.addEventListener("change", (e) => {
    console.log("[Event Listener] textColorText change event triggered");
    updateColor(e.target.value, false);
  });
} else console.error("textColorText element not found for event listener");

// Initial call to display values for default colors
console.log("Initial call to updateOKLCHValues before initializeSliderDisplays");
updateOKLCHValues(); // Call once before slider init if needed for text colors

console.log("Initial call to initializeSliderDisplays");
initializeSliderDisplays(); // This will call updateOKLCHValues again

console.log("[Sliders] lSlider:", lSlider, "lValueDisplay:", lValueDisplay);
console.log("[Sliders] cSlider:", cSlider, "cValueDisplay:", cValueDisplay);
console.log("[Sliders] hSlider:", hSlider, "hValueDisplay:", hValueDisplay);

[lSlider, cSlider, hSlider].forEach((slider) => {
  if (slider) {
    slider.addEventListener("input", (e) => {
      console.log(`[Event Listener] Slider ${e.target.id} input event triggered. Value: ${e.target.value}`);
      const l = lSlider.value / 100;
      const c = cSlider.value;
      const h = hSlider.value;

      if (lValueDisplay) lValueDisplay.textContent = `${Math.round(lSlider.value)}%`;
      if (cValueDisplay) cValueDisplay.textContent = parseFloat(cSlider.value).toFixed(4);
      if (hValueDisplay) hValueDisplay.textContent = parseFloat(hSlider.value).toFixed(4);

      const oklchColor = `oklch(${l} ${c} ${h})`;
      console.log(`[Event Listener] New oklchColor from sliders: ${oklchColor}`);

      root.style.setProperty("--color-variant", oklchColor);
      updateOKLCHValues();
    });
  }
});

// Initial setup for slider value displays
function initializeSliderDisplays() {
  console.log("[initializeSliderDisplays] Called");

  const initialPrimaryColor = getComputedStyle(root).getPropertyValue("--color-primary").trim();
  console.log("[initializeSliderDisplays] Initial --color-primary from CSS:", initialPrimaryColor);

  // CRUCIAL: Set --color-variant to be identical to --color-primary for the initial synchronized display.
  root.style.setProperty("--color-variant", initialPrimaryColor);
  console.log("[initializeSliderDisplays] Set --color-variant to initial primary color:", initialPrimaryColor);

  if (lSlider && cSlider && hSlider && lValueDisplay && cValueDisplay && hValueDisplay) {
    try {
      // Determine LCH values for sliders using formatToOKLCHDisplay
      // so sliders match the displayed (rounded) OKLCH values.
      const formattedPrimaryOKLCHString = formatToOKLCHDisplay(initialPrimaryColor);
      console.log(
        "[initializeSliderDisplays] Formatted primary OKLCH string (for slider setup):",
        formattedPrimaryOKLCHString
      );

      const matches = formattedPrimaryOKLCHString.match(oklchRegex);
      if (matches) {
        let [, l_str_from_format, c_str_from_format, h_str_from_format] = matches;

        const l_slider_val = parseFloat(l_str_from_format.replace("%", ""));
        const h_slider_val = parseFloat(h_str_from_format);

        // Set slider values
        lSlider.value = l_slider_val.toFixed(0);
        cSlider.value = c_str_from_format; // Use the string directly
        hSlider.value = h_slider_val.toFixed(0);

        // Update slider display text
        lValueDisplay.textContent = `${lSlider.value}%`;
        cValueDisplay.textContent = parseFloat(cSlider.value).toFixed(4);
        hValueDisplay.textContent = parseFloat(hSlider.value).toFixed(4);

        console.log(
          "[initializeSliderDisplays] Updated LCH sliders from formatted string: L:",
          lSlider.value,
          "C:",
          cSlider.value,
          "H:",
          hSlider.value
        );
      } else {
        console.error(
          "[initializeSliderDisplays] Could not parse formatted OKLCH string for slider setup:",
          formattedPrimaryOKLCHString
        );
        // Fallback: if parsing formatted string fails, use getOKLCHValuesFromColor.
        const oklchValues = getOKLCHValuesFromColor(initialPrimaryColor);
        if (oklchValues && typeof oklchValues.l === "number") {
          lSlider.value = (oklchValues.l * 100).toFixed(0);
          cSlider.value = parseFloat(oklchValues.c).toFixed(3);
          hSlider.value = Math.round(oklchValues.h).toFixed(0);

          lValueDisplay.textContent = `${lSlider.value}%`;
          cValueDisplay.textContent = parseFloat(cSlider.value).toFixed(4);
          hValueDisplay.textContent = parseFloat(hSlider.value).toFixed(4);
          console.warn("[initializeSliderDisplays] Fallback: Sliders set using getOKLCHValuesFromColor.");
        }
      }
    } catch (e) {
      console.error("[initializeSliderDisplays] Error during slider setup:", e);
    }
  } else {
    console.warn("[initializeSliderDisplays] Sliders or display elements not found.");
  }

  // This call ensures displays are refreshed with the synchronized variant.
  console.log("[initializeSliderDisplays] Calling updateOKLCHValues to refresh displays.");
  updateOKLCHValues();
}

// Main application initialization function
function initializeApp() {
  console.log("initializeApp: Application initialization started.");

  // Set initial color values from CSS variables if available
  const initialPrimaryColor = getComputedStyle(root).getPropertyValue("--color-primary").trim();
  const initialTextColor = getComputedStyle(root).getPropertyValue("--color-text-user").trim();

  if (initialPrimaryColor && isValidColor(initialPrimaryColor)) {
    colorPicker.value = toHex(initialPrimaryColor); // Update picker
    colorText.value = initialPrimaryColor; // Update text input
    updateColor("primary", initialPrimaryColor);
  } else {
    // Fallback if CSS variable is not a valid color (e.g., empty or invalid)
    const defaultBgColor = "#ff69b4"; // Default background if CSS var is invalid
    colorPicker.value = defaultBgColor;
    colorText.value = defaultBgColor;
    updateColor("primary", defaultBgColor);
  }

  if (initialTextColor && isValidColor(initialTextColor)) {
    textColorPicker.value = toHex(initialTextColor);
    textColorText.value = initialTextColor;
    updateColor("text", initialTextColor);
  } else {
    const defaultTextColor = "#ffffff"; // Default text color if CSS var is invalid
    textColorPicker.value = defaultTextColor;
    textColorText.value = defaultTextColor;
    updateColor("text", defaultTextColor);
  }

  initializeSliderDisplays(); // Initialize sliders after setting initial colors
  updateOKLCHValues(); // Initial call to display OKLCH values and contrast

  // "Learn more" button functionality
  const learnMoreButton = $(".button-more"); // Corrected selector to use class
  const moreContent = $("#more-content");

  if (learnMoreButton && moreContent) {
    learnMoreButton.addEventListener("click", () => {
      const isExpanded = learnMoreButton.getAttribute("aria-expanded") === "true";
      learnMoreButton.setAttribute("aria-expanded", String(!isExpanded));
      moreContent.hidden = isExpanded; // Toggle hidden based on the *old* expanded state
    });
  } else {
    console.warn("initializeApp: 'Learn more' button or content not found.");
  }
  console.log("initializeApp: Application initialization finished.");
}

// Attach the main initialization function to DOMContentLoaded
// This is the standard and robust way to ensure DOM is ready, especially for module scripts.
document.addEventListener("DOMContentLoaded", initializeApp);

// Ensure Color.js is loaded
console.log("Color.js library object:", Color);

// Test toHex function
console.log("Test toHex('red'):", toHex("red"));
console.log("Test toHex('rgba(0,255,0,0.5)'):", toHex("rgba(0,255,0,0.5)"));

// Test formatToOKLCHDisplay
console.log("Test formatToOKLCHDisplay('blue'):", formatToOKLCHDisplay("blue"));

// Test getOKLCHValuesFromColor
try {
  console.log("Test getOKLCHValuesFromColor('lime'):", getOKLCHValuesFromColor("lime"));
} catch (e) {
  console.error("Error testing getOKLCHValuesFromColor with 'lime':", e);
}

// Final check after all initializations
console.log("End of script.js execution. Initial UI update should have occurred.");
