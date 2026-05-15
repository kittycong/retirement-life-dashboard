const SHEETS = {
  settings: "Settings",
  accounts: "Accounts",
  scenarios: "Scenarios",
  summary: "Summary",
  snapshots: "Snapshots"
};

function doGet(e) {
  try {
    const payload = readPlannerPayload_();
    return json_({ ok: true, updatedAt: payload.updatedAt || "", payload });
  } catch (error) {
    return json_({ ok: false, error: String(error.message || error) });
  }
}

function doPost(e) {
  try {
    const request = JSON.parse(e.postData.contents || "{}");
    if (request.action !== "save") throw new Error("Unsupported action");
    const payload = request.payload || {};
    writePlannerPayload_(payload);
    return json_({ ok: true, updatedAt: payload.updatedAt || new Date().toISOString() });
  } catch (error) {
    return json_({ ok: false, error: String(error.message || error) });
  }
}

function writePlannerPayload_(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheets_(ss);

  writeObject_(ss.getSheetByName(SHEETS.settings), {
    updatedAt: payload.updatedAt || new Date().toISOString(),
    person: payload.person || {},
    assumptions: payload.assumptions || {},
    pensions: payload.pensions || {}
  });
  writeTable_(ss.getSheetByName(SHEETS.accounts), [
    "institution",
    "type",
    "product",
    "openedAt",
    "pensionStartDate",
    "balance",
    "asOf"
  ], payload.accounts || []);
  writeTable_(ss.getSheetByName(SHEETS.scenarios), [
    "id",
    "name",
    "monthlyLivingCost"
  ], payload.scenarios || []);
  writeObject_(ss.getSheetByName(SHEETS.summary), payload.summary || {});

  const snapshots = ss.getSheetByName(SHEETS.snapshots);
  if (snapshots.getLastRow() === 0) {
    snapshots.appendRow(["updatedAt", "monthlyNeed", "needAtRetire", "projectedWithSaving", "payloadJson"]);
  }
  snapshots.appendRow([
    payload.updatedAt || new Date().toISOString(),
    payload.summary && payload.summary.monthlyNeed,
    payload.summary && payload.summary.needAtRetire,
    payload.summary && payload.summary.projectedWithSaving,
    JSON.stringify(payload)
  ]);
}

function readPlannerPayload_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheets_(ss);
  const settings = readObject_(ss.getSheetByName(SHEETS.settings));
  return {
    updatedAt: settings.updatedAt || "",
    person: settings.person || {},
    assumptions: settings.assumptions || {},
    pensions: settings.pensions || {},
    accounts: readTable_(ss.getSheetByName(SHEETS.accounts)),
    scenarios: readTable_(ss.getSheetByName(SHEETS.scenarios)),
    summary: readObject_(ss.getSheetByName(SHEETS.summary))
  };
}

function ensureSheets_(ss) {
  Object.keys(SHEETS).forEach((key) => {
    if (!ss.getSheetByName(SHEETS[key])) ss.insertSheet(SHEETS[key]);
  });
}

function writeObject_(sheet, source) {
  sheet.clear();
  sheet.getRange(1, 1, 1, 2).setValues([["key", "value"]]).setFontWeight("bold");
  const rows = flattenObject_(source).map(([key, value]) => [key, value]);
  if (rows.length) sheet.getRange(2, 1, rows.length, 2).setValues(rows);
  sheet.autoResizeColumns(1, 2);
}

function readObject_(sheet) {
  const rows = sheet.getDataRange().getValues().slice(1);
  const out = {};
  rows.forEach(([key, value]) => setPath_(out, key, parseValue_(value)));
  return out;
}

function writeTable_(sheet, headers, rows) {
  sheet.clear();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");
  if (rows.length) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(
      rows.map((row) => headers.map((header) => row[header] === undefined ? "" : row[header]))
    );
  }
  sheet.autoResizeColumns(1, headers.length);
}

function readTable_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).filter((row) => row.some((cell) => cell !== "")).map((row) => {
    const item = {};
    headers.forEach((header, index) => item[header] = parseValue_(row[index]));
    return item;
  });
}

function flattenObject_(source, prefix) {
  return Object.keys(source || {}).flatMap((key) => {
    const path = prefix ? `${prefix}.${key}` : key;
    const value = source[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return flattenObject_(value, path);
    }
    return [[path, value]];
  });
}

function setPath_(target, path, value) {
  if (!path) return;
  const parts = String(path).split(".");
  let cursor = target;
  parts.slice(0, -1).forEach((part) => {
    if (!cursor[part] || typeof cursor[part] !== "object") cursor[part] = {};
    cursor = cursor[part];
  });
  cursor[parts[parts.length - 1]] = value;
}

function parseValue_(value) {
  if (value === "") return "";
  if (typeof value === "number") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  const numeric = Number(value);
  return Number.isFinite(numeric) && String(value).trim() !== "" ? numeric : value;
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
