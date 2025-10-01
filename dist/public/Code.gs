// ======================================
// CONFIG: only change your Sheet ID here
// ======================================
const SHEET_ID = "YOUR_ID_HERE";  // 👈 put your Google Sheet ID once

// ======================================
// GET requests
// ======================================
function doGet(e) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);

    // --- Return sheet list ---
    if (e && e.parameter.type === "sheets") {
      const sheets = ss.getSheets()
        .map(s => s.getName())
        .filter(n => n !== "TEMPLATE");
      return ContentService.createTextOutput(JSON.stringify({ ok: true, sheets }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // --- Decide which sheet ---
    let sheet;
    if (e && e.parameter.sheet) {
      sheet = ss.getSheetByName(e.parameter.sheet);
      if (!sheet) throw new Error("Sheet not found: " + e.parameter.sheet);
    } else {
      sheet = getCurrentMonthSheet();
    }

    // --- Return records ---
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify({ ok: true, data: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const headers = data[0].map(h => String(h).trim());
    const rows = data.slice(1);
    const records = rows.map(r => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = r[i]);
      return obj;
    });

    return ContentService.createTextOutput(JSON.stringify({ ok: true, data: records }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ======================================
// POST requests
// ======================================
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SHEET_ID);

    // --- Update Paid ---
    if (data.type === "updatePaid") {
      const sheet = data.sheet
        ? ss.getSheetByName(data.sheet)
        : getCurrentMonthSheet();
      if (!sheet) throw new Error("Sheet not found: " + (data.sheet || "current"));

      const values = sheet.getDataRange().getValues();
      const headers = values[0].map(h => String(h).trim().toLowerCase());

      const nameCol     = headers.indexOf("full name") + 1;
      const phoneCol    = headers.indexOf("phone number") + 1;
      const paidCol     = headers.indexOf("what i got paid") + 1;
      const advanceCol  = headers.indexOf("advance:") + 1;
      const totalCol    = headers.indexOf("total commission") + 1;
      const dropdownCol = headers.indexOf("pay dropdown") + 1;

      if ([nameCol, phoneCol, paidCol, advanceCol, totalCol, dropdownCol].includes(0)) {
        throw new Error("Required columns not found. Found: " + JSON.stringify(headers));
      }

      const inName  = String(data.fullName || "").trim().toLowerCase();
      const inPhone = String(data.phone || "").replace(/\D/g, "");
      let updated = false;
      let status = "not paid yet";

      for (let i = 1; i < values.length; i++) {
        const rowName  = String(values[i][nameCol - 1] || "").trim().toLowerCase();
        const rowPhone = String(values[i][phoneCol - 1] || "").replace(/\D/g, "");

        if (rowName === inName && rowPhone === inPhone) {
          const advance = Number(values[i][advanceCol - 1]) || 0;
          const total   = Number(values[i][totalCol - 1]) || 0;
          const paid    = Number(data.value) || 0;

          // Update "WHAT I GOT PAID"
          sheet.getRange(i + 1, paidCol).setValue(paid);

          // Decide dropdown status
          if (paid === 0) {
            status = "not paid yet";
          } else if (paid === advance) {
            status = "paid correct advance";
          } else if (paid === total) {
            status = "paid in full";
          } else {
            status = "incorrect pay";
          }

          // Update "Pay Dropdown"
          sheet.getRange(i + 1, dropdownCol).setValue(status);

          updated = true;
          break;
        }
      }

      return ContentService.createTextOutput(
        JSON.stringify({
          ok: updated,
          updated: { name: data.fullName, phone: data.phone, value: data.value, status }
        })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // --- Append new record (always current month) ---
    const sheet = getCurrentMonthSheet();
    sheet.appendRow([
      new Date(),
      data.fullName || "",
      data.phone || "",
      data.mbi || "",
      data.dateSubmitted || "",
      data.effectiveDate || "",
      data.plan || "",
      data.product || "",
      data.state || "",
      data.age || "",
      data.premium || "",
      data.annualPremium || "",
      data.commission || "",
      data.advance || "",
      data.earned || "",
      data.monthlyEarned || "",
      data.breakdown || "",
      data.notes || "",
      data.clawbackRisk || "",
      data.bonusPerApp || "",
      data.survivalBonus || "",
      data.bonusNotes || "",
      "" // WHAT I GOT PAID blank
    ]);

    return ContentService.createTextOutput(JSON.stringify({ ok: true, received: data }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ======================================
// Helpers
// ======================================
function getCurrentMonthName() {
  const today = new Date();
  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  return months[today.getMonth()] + "-" + String(today.getFullYear()).slice(-2);
}

function getCurrentMonthSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const name = getCurrentMonthName();
  let sheet = ss.getSheetByName(name);

  if (!sheet) {
    const template = ss.getSheetByName("TEMPLATE");
    if (!template) throw new Error("Template sheet 'TEMPLATE' not found!");
    sheet = template.copyTo(ss).setName(name);
    sheet.showSheet();
    if (sheet.getLastRow() > 1) sheet.deleteRows(2, sheet.getLastRow() - 1);
    const templateIndex = ss.getSheets().indexOf(template);
    ss.setActiveSheet(sheet);
    ss.moveActiveSheet(templateIndex + 1);
  }
  return sheet;
}

function onEdit(e) {
  try {
    const sheet = e.range.getSheet();
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    const paidCol     = headers.findIndex(h => String(h).trim().toLowerCase() === "what i got paid") + 1;
    const advanceCol  = headers.findIndex(h => String(h).trim().toLowerCase() === "advance:") + 1;
    const totalCol    = headers.findIndex(h => String(h).trim().toLowerCase() === "total commission") + 1;
    const dropdownCol = headers.findIndex(h => String(h).trim().toLowerCase() === "pay dropdown") + 1;
    if ([paidCol, advanceCol, totalCol, dropdownCol].includes(0)) return;

    // Only run if edited column is "What I Got Paid"
    if (e.range.getColumn() !== paidCol || e.range.getRow() === 1) return;

    const row = e.range.getRow();
    const paid = Number(sheet.getRange(row, paidCol).getValue()) || 0;
    const advance = Number(sheet.getRange(row, advanceCol).getValue()) || 0;
    const total = Number(sheet.getRange(row, totalCol).getValue()) || 0;

    let status = "not paid yet";
    if (paid === 0) status = "not paid yet";
    else if (paid === advance) status = "paid correct advance";
    else if (paid === total) status = "paid in full";
    else status = "incorrect pay";

    sheet.getRange(row, dropdownCol).setValue(status);
  } catch (err) {
    Logger.log("onEdit error: " + err);
  }
}
