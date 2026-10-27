/* All geometry uses the 924 x 1308 reference image, origin at the top-left. */
const FIELDS = {
  courseTitle: {
    label: "Course Title",
    type: "text",
    box: [64, 614, 868, 657],
    textStart: 190,
    baseline: 638
  },
  experimentNo: {
    label: "No of Experiment",
    type: "text",
    box: [64, 678, 873, 720],
    textStart: 232,
    baseline: 701
  },
  experimentName: {
    label: "Name of Experiment",
    type: "textarea",
    box: [68, 735, 872, 822],
    textStart: 258,
    secondLineStart: 80,
    baseline: 761
  },
  studentName: {
    label: "Student Name",
    type: "text",
    box: [69, 838, 868, 884],
    textStart: 205,
    baseline: 862
  },
  section: {
    label: "Section",
    type: "text",
    box: [69, 899, 462, 944],
    textStart: 148,
    baseline: 927
  },
  roll: {
    label: "Roll",
    type: "text",
    box: [496, 899, 868, 944],
    textStart: 552,
    baseline: 924
  },
  semester: {
    label: "Semester",
    type: "text",
    box: [64, 958, 462, 1000],
    textStart: 162,
    baseline: 985
  },
  group: {
    label: "Group",
    type: "text",
    box: [496, 958, 868, 1000],
    textStart: 582,
    baseline: 987,
    defaultValue: "4",
    cover: [580, 962, 602, 996]
  },
  expDate: {
    label: "Exp. Date",
    type: "date",
    box: [69, 1015, 462, 1058],
    textStart: 177,
    baseline: 1044
  },
  submissionDate: {
    label: "Submission date",
    type: "date",
    box: [496, 1015, 868, 1058],
    textStart: 654,
    baseline: 1042
  }
};

const REFERENCE_WIDTH = 924;
const BASE_FONT_SIZE = 18;
const STORAGE_KEY = "lab-report-cover-fields";
const REQUIRED_FIELDS = ["courseTitle", "experimentNo", "experimentName", "studentName", "roll"];
const inputs = Object.fromEntries(
  Object.keys(FIELDS).map((key) => [key, document.getElementById(key)])
);
const ASSIGNMENT_FIELDS = {
  courseTitle: { label: "Course Title", type: "text", box: [64, 614, 868, 657], textStart: 190, baseline: 638 },
  studentName: { label: "Student Name", type: "text", box: [69, 673, 868, 719], textStart: 205, baseline: 700 },
  section: { label: "Section", type: "text", box: [69, 735, 462, 775], textStart: 148, baseline: 758 },
  roll: { label: "Roll", type: "text", box: [496, 735, 868, 775], textStart: 552, baseline: 758 },
  semester: { label: "Semester", type: "text", box: [64, 792, 462, 830], textStart: 162, baseline: 815 },
  submissionDate: { label: "Submission date", type: "date", box: [496, 788, 868, 829], textStart: 654, baseline: 812 }
};
const ASSIGNMENT_REQUIRED_FIELDS = ["courseTitle", "studentName", "roll"];
const ASSIGNMENT_STORAGE_KEY = "assignment-cover-fields";
const assignmentInputs = Object.fromEntries(
  Object.keys(ASSIGNMENT_FIELDS).map((key) => [key, document.getElementById(`assignment-${key}`)])
);
const form = document.getElementById("cover-form");
const assignmentForm = document.getElementById("assignment-form");
const generateButton = document.getElementById("generate-button");
const assignmentGenerateButton = document.getElementById("assignment-generate-button");
const clearButton = document.getElementById("clear-button");
const assignmentClearButton = document.getElementById("assignment-clear-button");
const clearDialog = document.getElementById("clear-dialog");
const confirmClearButton = document.getElementById("confirm-clear-button");
const successPanel = document.getElementById("success-panel");
const assignmentSuccessPanel = document.getElementById("assignment-success-panel");
const formActions = document.getElementById("form-actions");
const assignmentFormActions = document.getElementById("assignment-form-actions");
const formError = document.getElementById("form-error");
const assignmentFormError = document.getElementById("assignment-form-error");
const statusElement = document.getElementById("status");
const STORAGE_WARNING = "Saved values could not be read from this browser.";
let toastTimeout;
let pdfObjectUrl;
let generatedFilename = "";
let assignmentPdfObjectUrl;
let assignmentFilename = "";
let clearDialogTarget = "lab";

function showStatus(message, isError = false) {
  window.clearTimeout(toastTimeout);
  statusElement.textContent = message;
  statusElement.classList.toggle("error", isError);
  statusElement.hidden = !message;
  if (message) {
    toastTimeout = window.setTimeout(() => {
      statusElement.hidden = true;
    }, 3200);
  }
}

function getStoredValues() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return stored && typeof stored === "object" ? stored : {};
  } catch (error) {
    showStatus(STORAGE_WARNING, true);
    return {};
  }
}

function saveValues() {
  try {
    const values = {};
    for (const key of Object.keys(FIELDS)) values[key] = inputs[key].value;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
  } catch (error) {
    showStatus("Your changes could not be saved in this browser.", true);
  }
}

function restoreValues() {
  const stored = getStoredValues();
  for (const [key, config] of Object.entries(FIELDS)) {
    inputs[key].value = typeof stored[key] === "string" ? stored[key] : (config.defaultValue || "");
  }
  updateCharacterCount();
}

function dateForDisplay(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function setFieldError(key, message) {
  const input = inputs[key];
  const errorElement = document.getElementById(`${key}-error`);
  errorElement.textContent = message;
  input.setAttribute("aria-invalid", message ? "true" : "false");
}

function clearFieldErrors() {
  for (const key of Object.keys(FIELDS)) setFieldError(key, "");
  formError.hidden = true;
  formError.textContent = "";
}

function validateRequiredFields() {
  clearFieldErrors();
  let firstInvalid;
  for (const key of REQUIRED_FIELDS) {
    if (!inputs[key].value.trim()) {
      setFieldError(key, `${FIELDS[key].label} is required.`);
      firstInvalid = firstInvalid || inputs[key];
    }
  }
  if (firstInvalid) {
    firstInvalid.focus();
    return false;
  }
  return true;
}

function updateCharacterCount() {
  document.getElementById("experimentName-count").textContent =
    `${inputs.experimentName.value.length}/120`;
}

function safeFilenamePart(value) {
  return value.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/[. ]+$/g, "");
}

function wrapText(text, font, size, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    if (font.widthOfTextAtSize(word, size) > maxWidth) {
      if (line) {
        lines.push(line);
        line = "";
      }
      let chunk = "";
      for (const character of word) {
        if (chunk && font.widthOfTextAtSize(chunk + character, size) > maxWidth) {
          lines.push(chunk);
          chunk = character;
        } else {
          chunk += character;
        }
      }
      line = chunk;
      continue;
    }
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function fitPdfText(text, font, initialSize, maxWidth) {
  let size = initialSize;
  while (size > 2) {
    if (font.widthOfTextAtSize(text, size) <= maxWidth) return size;
    size -= 0.25;
  }
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return size;
  throw new Error("Some text is too long to fit in its cover box.");
}

function pdfTopEdge(page) {
  const cropBox = page.getCropBox();
  return cropBox.y + cropBox.height;
}

function toPdfY(baselineTop, page, scale) {
  return pdfTopEdge(page) - (baselineTop * scale);
}

function drawTextInField(page, font, text, config, size, scale) {
  const [, y1, x2, y2] = config.box;
  const boxHeight = y2 - y1;
  const x = config.textStart * scale;
  const width = (x2 - config.textStart - 12) * scale;
  const fontSize = fitPdfText(text, font, size, width);
  const baselineTop = config.baseline || y1 + boxHeight / 2 + (fontSize / scale) * 0.14;
  page.drawText(text, {
    x,
    y: toPdfY(baselineTop, page, scale),
    size: fontSize,
    font,
    color: PDFLib.rgb(0, 0, 0)
  });
}

function drawExperimentName(page, font, text, config, size, scale) {
  const [, y1, x2, y2] = config.box;
  const width1 = (x2 - config.textStart - 12) * scale;
  const width2 = (x2 - config.secondLineStart - 12) * scale;
  const maxHeight = (y2 - y1 - 16) * scale;
  let fontSize = size;
  let lines;

  while (fontSize > 2) {
    const explicitLines = text.replace(/\r/g, "").split("\n");
    if (explicitLines.length > 2) {
      lines = null;
    } else {
      lines = [];
      explicitLines.forEach((part, index) => {
        const maxWidth = index === 0 ? width1 : width2;
        lines.push(...wrapText(part, font, fontSize, maxWidth));
      });
      const fitsWidth = lines.length <= 2 && lines.every((line, index) =>
        font.widthOfTextAtSize(line, fontSize) <= (index === 0 ? width1 : width2));
      if (fitsWidth && lines.length * fontSize * 1.2 <= maxHeight) break;
      lines = null;
    }
    fontSize -= 0.25;
  }
  if (!lines || lines.length > 2) {
    throw new Error("The experiment name is too long to fit on two lines.");
  }

  const top = y1 + 8;
  lines.forEach((line, index) => {
    const xRef = index === 0 ? config.textStart : config.secondLineStart;
    const x = xRef * scale;
    const baselineTop = top + fontSize / scale + index * fontSize * 1.2 / scale;
    page.drawText(line, {
      x,
      y: toPdfY(baselineTop, page, scale),
      size: fontSize,
      font,
      color: PDFLib.rgb(0, 0, 0)
    });
  });
}

function drawDate(page, font, key, value, scale, labelFontSize) {
  if (!value) return;
  const config = FIELDS[key];
  const [, y1, x2, y2] = config.box;
  const topEdge = pdfTopEdge(page);
  const x = config.textStart * scale;
  const width = (x2 - config.textStart - 5) * scale;
  const coverTop = y1 + 4;
  const coverBottom = y2 - 4;
  page.drawRectangle({
    x,
    y: topEdge - coverBottom * scale,
    width,
    height: (coverBottom - coverTop) * scale,
    color: PDFLib.rgb(1, 1, 1)
  });
  const text = dateForDisplay(value);
  const size = fitPdfText(text, font, labelFontSize, width);
  const baselineTop = config.baseline || y1 + (y2 - y1) / 2 + (size / scale) * 0.14;
  page.drawText(text, {
    x,
    y: toPdfY(baselineTop, page, scale),
    size,
    font,
    color: PDFLib.rgb(0, 0, 0)
  });
}

function checkFontSupport(font) {
  return checkFieldsFontSupport(font, FIELDS, inputs);
}

function checkFieldsFontSupport(font, fieldConfigs, fieldInputs, prefix = "") {
  for (const [key, config] of Object.entries(fieldConfigs)) {
    const value = fieldInputs[key].value.trim();
    if (!value) continue;
    try {
      font.encodeText(config.type === "date" ? dateForDisplay(value) : value);
    } catch (error) {
      const message = "This field contains characters unsupported by the PDF font. Remove unusual characters and try again.";
      const input = fieldInputs[key];
      document.getElementById(`${prefix}${key}-error`).textContent = message;
      input.setAttribute("aria-invalid", "true");
      input.focus();
      return false;
    }
  }
  return true;
}

function assignmentSetFieldError(key, message) {
  const input = assignmentInputs[key];
  document.getElementById(`assignment-${key}-error`).textContent = message;
  input.setAttribute("aria-invalid", message ? "true" : "false");
}

function clearAssignmentFieldErrors() {
  for (const key of Object.keys(ASSIGNMENT_FIELDS)) assignmentSetFieldError(key, "");
  assignmentFormError.hidden = true;
  assignmentFormError.textContent = "";
}

function validateAssignmentFields() {
  clearAssignmentFieldErrors();
  let firstInvalid;
  for (const key of ASSIGNMENT_REQUIRED_FIELDS) {
    if (!assignmentInputs[key].value.trim()) {
      assignmentSetFieldError(key, `${ASSIGNMENT_FIELDS[key].label} is required.`);
      firstInvalid = firstInvalid || assignmentInputs[key];
    }
  }
  if (firstInvalid) {
    firstInvalid.focus();
    return false;
  }
  return true;
}

function getAssignmentFilename() {
  const roll = assignmentInputs.roll.value.trim();
  return roll ? `Assignment_Cover_${safeFilenamePart(roll)}.pdf` : "Assignment_Cover.pdf";
}

async function createAssignmentPdf() {
  const response = await fetch("./Assignment_Cover.pdf");
  if (!response.ok) {
    throw new Error(`Could not load Assignment_Cover.pdf (HTTP ${response.status}).`);
  }
  const pdfDocument = await PDFLib.PDFDocument.load(await response.arrayBuffer());
  const page = pdfDocument.getPage(0);
  const scale = page.getWidth() / REFERENCE_WIDTH;
  const roman = await pdfDocument.embedFont(PDFLib.StandardFonts.TimesRoman);
  const bold = await pdfDocument.embedFont(PDFLib.StandardFonts.TimesRomanBold);
  if (!checkFieldsFontSupport(roman, ASSIGNMENT_FIELDS, assignmentInputs, "assignment-") ||
      !checkFieldsFontSupport(bold, ASSIGNMENT_FIELDS, assignmentInputs, "assignment-")) return null;

  for (const [key, config] of Object.entries(ASSIGNMENT_FIELDS)) {
    const value = assignmentInputs[key].value.trim();
    if (!value) continue;
    try {
      if (config.type === "date") {
        const [, y1, x2, y2] = config.box;
        const [x1, coverTop, coverRight, coverBottom] = [config.textStart, y1 + 4, x2 - 4, y2 - 4];
        page.drawRectangle({
          x: x1 * scale,
          y: pdfTopEdge(page) - coverBottom * scale,
          width: (coverRight - x1) * scale,
          height: (coverBottom - coverTop) * scale,
          color: PDFLib.rgb(1, 1, 1)
        });
        drawTextInField(page, roman, dateForDisplay(value), config, BASE_FONT_SIZE * scale, scale);
      } else {
        drawTextInField(page, roman, value, config, BASE_FONT_SIZE * scale, scale);
      }
    } catch (error) {
      assignmentSetFieldError(key, error.message);
      assignmentInputs[key].focus();
      return null;
    }
  }
  return new Blob([await pdfDocument.save()], { type: "application/pdf" });
}

async function handleAssignmentGenerate(event) {
  event.preventDefault();
  if (assignmentGenerateButton.disabled || !validateAssignmentFields()) return;

  assignmentFormError.hidden = true;
  assignmentGenerateButton.disabled = true;
  assignmentGenerateButton.textContent = "Generating...";
  try {
    const blob = await createAssignmentPdf();
    if (!blob) return;
    if (assignmentPdfObjectUrl) URL.revokeObjectURL(assignmentPdfObjectUrl);
    assignmentPdfObjectUrl = URL.createObjectURL(blob);
    assignmentFilename = getAssignmentFilename();
    document.getElementById("assignment-success-filename").textContent = assignmentFilename;
    assignmentFormActions.hidden = true;
    assignmentSuccessPanel.hidden = false;
    showStatus("Assignment cover generated");
  } catch (error) {
    const detail = String(error && error.message || error);
    assignmentFormError.textContent = /Assignment_Cover\.pdf|fetch|network|load|Failed to parse URL/i.test(detail)
      ? `${detail} Make sure the assignment template is present and run this site through Live Server.`
      : detail || "The assignment cover could not be created.";
    assignmentFormError.hidden = false;
    showStatus("The assignment cover could not be generated.", true);
  } finally {
    assignmentGenerateButton.disabled = false;
    assignmentGenerateButton.textContent = "Generate assignment cover";
  }
}

function downloadAssignmentPdf() {
  if (!assignmentPdfObjectUrl) return;
  const link = document.createElement("a");
  link.href = assignmentPdfObjectUrl;
  link.download = assignmentFilename;
  link.click();
}

function clearAssignmentSuccessState() {
  assignmentSuccessPanel.hidden = true;
  assignmentFormActions.hidden = false;
  if (assignmentPdfObjectUrl) {
    URL.revokeObjectURL(assignmentPdfObjectUrl);
    assignmentPdfObjectUrl = undefined;
  }
  assignmentFilename = "";
}

function clearAssignmentForm() {
  for (const key of Object.keys(ASSIGNMENT_FIELDS)) {
    assignmentInputs[key].value = "";
    assignmentSetFieldError(key, "");
  }
  clearAssignmentSuccessState();
  assignmentFormError.hidden = true;
  try {
    localStorage.removeItem(ASSIGNMENT_STORAGE_KEY);
  } catch (error) {
    showStatus("Assignment fields were cleared, but saved values could not be removed from this browser.", true);
    return;
  }
  showStatus("Assignment fields cleared");
  assignmentInputs.courseTitle.focus();
}

function restoreAssignmentValues() {
  try {
    const stored = JSON.parse(localStorage.getItem(ASSIGNMENT_STORAGE_KEY) || "{}");
    if (!stored || typeof stored !== "object") return;
    for (const key of Object.keys(ASSIGNMENT_FIELDS)) {
      if (typeof stored[key] === "string") assignmentInputs[key].value = stored[key];
    }
  } catch (error) {
    showStatus(STORAGE_WARNING, true);
  }
}

function saveAssignmentValues() {
  try {
    const values = {};
    for (const key of Object.keys(ASSIGNMENT_FIELDS)) values[key] = assignmentInputs[key].value;
    localStorage.setItem(ASSIGNMENT_STORAGE_KEY, JSON.stringify(values));
  } catch (error) {
    showStatus("Assignment details could not be saved in this browser.", true);
  }
}

function getFilename() {
  const roll = inputs.roll.value.trim();
  const experimentNo = inputs.experimentNo.value.trim();
  return roll && experimentNo
    ? `Lab_Report_${safeFilenamePart(roll)}_${safeFilenamePart(experimentNo)}.pdf`
    : "Lab_Report.pdf";
}

async function createPdf() {
  const response = await fetch("./Cover.pdf");
  if (!response.ok) {
    throw new Error(`Could not load Cover.pdf (HTTP ${response.status}).`);
  }
  const templateBytes = await response.arrayBuffer();
  const pdfDocument = await PDFLib.PDFDocument.load(templateBytes);
  const page = pdfDocument.getPage(0);
  const scale = page.getWidth() / REFERENCE_WIDTH;
  const roman = await pdfDocument.embedFont(PDFLib.StandardFonts.TimesRoman);
  const bold = await pdfDocument.embedFont(PDFLib.StandardFonts.TimesRomanBold);
  const white = PDFLib.rgb(1, 1, 1);
  if (!checkFontSupport(roman) || !checkFontSupport(bold)) return null;

  const group = FIELDS.group;
  const [gx1, gy1, gx2, gy2] = group.cover;
  page.drawRectangle({
    x: gx1 * scale,
    y: pdfTopEdge(page) - gy2 * scale,
    width: (gx2 - gx1) * scale,
    height: (gy2 - gy1) * scale,
    color: white
  });

  for (const key of ["courseTitle", "experimentNo", "studentName", "section", "roll", "semester", "group"]) {
    const text = inputs[key].value.trim();
    if (!text) continue;
    try {
      drawTextInField(page, roman, text, FIELDS[key], BASE_FONT_SIZE * scale, scale);
    } catch (error) {
      setFieldError(key, error.message);
      inputs[key].focus();
      return null;
    }
  }

  const experimentName = inputs.experimentName.value.trim();
  if (experimentName) {
    try {
      drawExperimentName(page, roman, experimentName, FIELDS.experimentName, BASE_FONT_SIZE * scale, scale);
    } catch (error) {
      setFieldError("experimentName", error.message);
      inputs.experimentName.focus();
      return null;
    }
  }

  const labelSize = BASE_FONT_SIZE * scale;
  drawDate(page, bold, "expDate", inputs.expDate.value, scale, labelSize);
  drawDate(page, bold, "submissionDate", inputs.submissionDate.value, scale, labelSize);
  return new Blob([await pdfDocument.save()], { type: "application/pdf" });
}

function showGenerationError(error) {
  const detail = String(error && error.message || error);
  formError.textContent = /Cover\.pdf|fetch|network|load|Failed to parse URL/i.test(detail)
    ? `${detail} Make sure the template file is present and run this site through Live Server.`
    : detail || "The PDF could not be created.";
  formError.hidden = false;
  showStatus("The cover page could not be generated.", true);
}

async function handleGenerate(event) {
  event.preventDefault();
  if (generateButton.disabled || !validateRequiredFields()) return;

  formError.hidden = true;
  generateButton.disabled = true;
  generateButton.textContent = "Generating...";
  try {
    const blob = await createPdf();
    if (!blob) return;
    if (pdfObjectUrl) URL.revokeObjectURL(pdfObjectUrl);
    pdfObjectUrl = URL.createObjectURL(blob);
    generatedFilename = getFilename();
    document.getElementById("success-filename").textContent = generatedFilename;
    formActions.hidden = true;
    successPanel.hidden = false;
    showStatus("Cover page generated");
  } catch (error) {
    showGenerationError(error);
  } finally {
    generateButton.disabled = false;
    generateButton.textContent = "Generate cover page";
  }
}

function downloadPdf() {
  if (!pdfObjectUrl) return;
  const link = document.createElement("a");
  link.href = pdfObjectUrl;
  link.download = generatedFilename;
  link.click();
}

function clearSuccessState() {
  successPanel.hidden = true;
  formActions.hidden = false;
  if (pdfObjectUrl) {
    URL.revokeObjectURL(pdfObjectUrl);
    pdfObjectUrl = undefined;
  }
  generatedFilename = "";
}

function clearAll() {
  for (const [key, config] of Object.entries(FIELDS)) {
    inputs[key].value = config.defaultValue || "";
    setFieldError(key, "");
  }
  clearSuccessState();
  formError.hidden = true;
  updateCharacterCount();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    showStatus("Fields were cleared, but saved values could not be removed from this browser.", true);
    return;
  }
  showStatus("Fields cleared");
  inputs.courseTitle.focus();
}

function buildDebugPreview() {
  if (new URLSearchParams(window.location.search).get("debug") !== "1") return;
  const debugSection = document.getElementById("debug-preview");
  debugSection.hidden = false;
  const [labFrame, assignmentFrame] = debugSection.querySelectorAll("iframe");
  labFrame.src = "Cover.pdf#toolbar=0&navpanes=0&view=FitH";
  assignmentFrame.src = "Assignment_Cover.pdf#toolbar=0&navpanes=0&view=FitH";
  buildDebugOverlays(FIELDS, document.getElementById("debug-overlays"));
  buildDebugOverlays(ASSIGNMENT_FIELDS, document.getElementById("assignment-debug-overlays"));
}

function buildDebugOverlays(fieldConfigs, overlays) {
  for (const [key, config] of Object.entries(fieldConfigs)) {
    const [left, top, right, bottom] = config.box;
    const box = document.createElement("span");
    box.className = "debug-box";
    box.dataset.field = key;
    box.style.left = `${left / REFERENCE_WIDTH * 100}%`;
    box.style.top = `${top / 1308 * 100}%`;
    box.style.width = `${(right - left) / REFERENCE_WIDTH * 100}%`;
    box.style.height = `${(bottom - top) / 1308 * 100}%`;
    overlays.append(box);
  }
}

restoreValues();
restoreAssignmentValues();
buildDebugPreview();
document.getElementById("current-year").textContent = new Date().getFullYear();

for (const input of Object.values(inputs)) {
  input.addEventListener("input", () => {
    const key = input.name;
    if (document.getElementById(`${key}-error`).textContent) setFieldError(key, "");
    if (key === "experimentName") updateCharacterCount();
    saveValues();
  });
}

form.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.target instanceof HTMLInputElement) event.preventDefault();
});
form.addEventListener("submit", handleGenerate);
for (const input of Object.values(assignmentInputs)) {
  input.addEventListener("input", () => {
    const key = input.name;
    if (document.getElementById(`assignment-${key}-error`).textContent) {
      assignmentSetFieldError(key, "");
    }
    saveAssignmentValues();
  });
}
assignmentForm.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.target instanceof HTMLInputElement) event.preventDefault();
});
assignmentForm.addEventListener("submit", handleAssignmentGenerate);
document.getElementById("download-button").addEventListener("click", downloadPdf);
document.getElementById("assignment-download-button").addEventListener("click", downloadAssignmentPdf);
document.getElementById("make-another-button").addEventListener("click", () => {
  clearSuccessState();
  generateButton.focus();
});
document.getElementById("assignment-make-another-button").addEventListener("click", () => {
  clearAssignmentSuccessState();
  assignmentGenerateButton.focus();
});
function openClearDialog(target) {
  clearDialogTarget = target;
  document.getElementById("clear-title").textContent =
    target === "assignment" ? "Clear assignment fields?" : "Clear all fields?";
  document.getElementById("clear-description").textContent =
    target === "assignment"
      ? "This will remove your saved assignment entries from this browser."
      : "This will remove your saved lab report entries from this browser.";
  clearDialog.returnValue = "";
  clearDialog.showModal();
}
clearButton.addEventListener("click", () => openClearDialog("lab"));
assignmentClearButton.addEventListener("click", () => openClearDialog("assignment"));
clearDialog.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    clearDialog.close("cancel");
  }
});
clearDialog.addEventListener("close", () => {
  if (clearDialog.returnValue === "confirm") {
    if (clearDialogTarget === "assignment") clearAssignmentForm();
    else clearAll();
  }
});
confirmClearButton.addEventListener("click", () => {
  clearDialog.returnValue = "confirm";
});
window.addEventListener("beforeunload", () => {
  if (pdfObjectUrl) URL.revokeObjectURL(pdfObjectUrl);
  if (assignmentPdfObjectUrl) URL.revokeObjectURL(assignmentPdfObjectUrl);
});
