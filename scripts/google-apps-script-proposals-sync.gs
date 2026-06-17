/*
 * Google Apps Script Web App for syncing GDC26 latest proposals into a Sheet.
 *
 * Setup:
 * 1. Open the Google Sheet, then Extensions > Apps Script.
 * 2. Paste this file.
 * 3. Project Settings > Script properties:
 *    - GDC_SYNC_SECRET: a long random secret shared only with Airtable.
 * 4. Deploy > New deployment > Web app:
 *    - Execute as: Me
 *    - Who has access: Anyone with the link
 * 5. Put the Web App URL and the same secret in the Airtable automation script.
 */

const SHEET_NAME = "Sessions received ";
const HEADER_ROW = 2;
const DATA_START_ROW = 3;
const ROOT_ID_HEADER = "Root Submission ID";

const HEADERS = [
  "Contact Name",
  "Contact Email",
  "Session Title",
  "Co-Organizers",
  "Submission ID",
  "Estimated Room Capacity",
  "Proposed Speakers and Moderators",
  "Short Summary",
  "update_url",
  "Public/Private Balance",
  ROOT_ID_HEADER,
  "Superseded",
];

function doPost(event) {
  try {
    const payload = JSON.parse(event.postData.contents || "{}");
    verifySecret_(payload.secret);

    if (payload.action !== "upsertProposal") {
      throw new Error("Unsupported action");
    }

    const result = upsertProposal_(payload.proposal);
    return jsonResponse_({ ok: true, ...result });
  } catch (error) {
    return jsonResponse_({ ok: false, error: String(error.message || error) });
  }
}

function verifySecret_(secret) {
  const expected = PropertiesService.getScriptProperties().getProperty("GDC_SYNC_SECRET");
  if (!expected) throw new Error("GDC_SYNC_SECRET is not configured");
  if (!secret || secret !== expected) throw new Error("Invalid sync secret");
}

function upsertProposal_(proposal) {
  if (!proposal || !proposal.rootSubmissionId) {
    throw new Error("proposal.rootSubmissionId is required");
  }

  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);

  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error(`Sheet not found: ${SHEET_NAME}`);

    ensureHeaders_(sheet);

    const rootIdCol = HEADERS.indexOf(ROOT_ID_HEADER) + 1;
    const row = findRowByValue_(sheet, rootIdCol, proposal.rootSubmissionId);
    const values = [proposalToRow_(proposal)];

    if (row) {
      sheet.getRange(row, 1, 1, HEADERS.length).setValues(values);
      return { operation: "updated", row };
    }

    const nextRow = Math.max(sheet.getLastRow() + 1, DATA_START_ROW);
    sheet.getRange(nextRow, 1, 1, HEADERS.length).setValues(values);
    return { operation: "inserted", row: nextRow };
  } finally {
    lock.releaseLock();
  }
}

function ensureHeaders_(sheet) {
  sheet.getRange(HEADER_ROW, 1, 1, HEADERS.length).setValues([HEADERS]);
}

function findRowByValue_(sheet, column, value) {
  const lastRow = sheet.getLastRow();
  if (lastRow < DATA_START_ROW) return 0;

  const range = sheet.getRange(DATA_START_ROW, column, lastRow - DATA_START_ROW + 1, 1);
  const values = range.getValues();

  for (let index = 0; index < values.length; index += 1) {
    if (String(values[index][0] || "") === String(value)) {
      return DATA_START_ROW + index;
    }
  }

  return 0;
}

function proposalToRow_(proposal) {
  return [
    proposal.contactName || "",
    proposal.contactEmail || "",
    proposal.sessionTitle || "",
    proposal.coOrganizers || "",
    proposal.submissionId || "",
    proposal.estimatedRoomCapacity || "",
    proposal.proposedSpeakersAndModerators || "",
    proposal.shortSummary || "",
    proposal.updateUrl || "",
    proposal.publicPrivateBalance || "",
    proposal.rootSubmissionId || "",
    proposal.superseded ? "TRUE" : "",
  ];
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
