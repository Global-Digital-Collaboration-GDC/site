/*
 * Airtable Automation script for syncing one latest proposal row to Google Sheets.
 *
 * Suggested trigger:
 * - When a record is created in session_proposals, or
 * - When a record matches the "latest proposals" conditions used by the workflow.
 *
 * Input variables:
 * - recordId: Airtable record ID from the trigger
 * - webAppUrl: Cloudflare sync endpoint URL, usually:
 *   https://proposals.gdc26-hub.pages.dev/api/sync-sheet
 * - syncSecret: shared secret stored in Cloudflare as GDC_SHEET_SYNC_SECRET
 */

const config = input.config();
const recordId = config.recordId;
const webAppUrl = config.webAppUrl;
const syncSecret = config.syncSecret;

if (!recordId) throw new Error("Missing input variable: recordId");
if (!webAppUrl) throw new Error("Missing input variable: webAppUrl");
if (!syncSecret) throw new Error("Missing input variable: syncSecret");

const table = base.getTable("session_proposals");
const fields = [
  "Contact Name",
  "Contact Email",
  "Session Title",
  "Co-Organizers",
  "Submission ID",
  "Estimated Room Capacity",
  "Proposed Speakers and Moderators",
  "Short Summary",
  "Public/Private Balance",
  "parent_submission_id",
  "superseded",
  "new_update_url",
  "Submitted At",
];

const query = await table.selectRecordsAsync({ fields });
const records = query.records;
const byId = new Map(records.map((record) => [record.id, record]));
const triggerRecord = byId.get(recordId);

if (!triggerRecord) throw new Error(`Record not found: ${recordId}`);

const latestRecord = findLatestInFamily(triggerRecord, records);
const rootSubmissionId = findRootSubmissionId(latestRecord, byId);

const payload = {
  action: "upsertProposal",
  secret: syncSecret,
  proposal: {
    contactName: cellText(latestRecord, "Contact Name"),
    contactEmail: cellText(latestRecord, "Contact Email"),
    sessionTitle: cellText(latestRecord, "Session Title"),
    coOrganizers: cellText(latestRecord, "Co-Organizers"),
    submissionId: latestRecord.id,
    estimatedRoomCapacity: cellText(latestRecord, "Estimated Room Capacity"),
    proposedSpeakersAndModerators: cellText(latestRecord, "Proposed Speakers and Moderators"),
    shortSummary: cellText(latestRecord, "Short Summary"),
    updateUrl: cellText(latestRecord, "new_update_url"),
    publicPrivateBalance: cellText(latestRecord, "Public/Private Balance"),
    rootSubmissionId,
    superseded: Boolean(latestRecord.getCellValue("superseded")),
  },
};

const response = await fetch(webAppUrl, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

const responseText = await response.text();
if (!response.ok) {
  throw new Error(`Google Sheets sync failed: ${response.status} ${responseText}`);
}

let result;
try {
  result = JSON.parse(responseText);
} catch (error) {
  throw new Error(`Google Sheets sync returned non-JSON response: ${responseText}`);
}

if (!result.ok) {
  throw new Error(`Google Sheets sync failed: ${result.error || responseText}`);
}

output.set("operation", result.operation);
output.set("row", result.row);
output.set("submissionId", latestRecord.id);
output.set("rootSubmissionId", rootSubmissionId);

function findLatestInFamily(record, allRecords) {
  const rootId = findRootSubmissionId(record, byId);
  const family = allRecords.filter((candidate) => findRootSubmissionId(candidate, byId) === rootId);
  const active = family.filter((candidate) => !candidate.getCellValue("superseded"));

  if (active.length === 1) return active[0];
  if (active.length > 1) return newestRecord(active);

  return newestRecord(family);
}

function findRootSubmissionId(record, recordMap) {
  let current = record;
  const seen = new Set();

  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    const parentId = String(current.getCellValue("parent_submission_id") || "").trim();
    if (!parentId || !recordMap.has(parentId)) return current.id;
    current = recordMap.get(parentId);
  }

  return record.id;
}

function newestRecord(candidates) {
  return [...candidates].sort((left, right) => {
    const leftDate = Date.parse(left.getCellValue("Submitted At") || "") || 0;
    const rightDate = Date.parse(right.getCellValue("Submitted At") || "") || 0;
    return rightDate - leftDate;
  })[0];
}

function cellText(record, fieldName) {
  const value = record.getCellValue(fieldName);
  if (value == null) return "";
  if (Array.isArray(value)) {
    return value.map((item) => item.name || item).join(", ");
  }
  if (typeof value === "object" && "name" in value) return value.name;
  return String(value);
}
