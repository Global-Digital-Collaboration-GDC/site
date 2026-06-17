const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";
const PROPOSALS_SHEET_ID = "1TQ-p8CmJ1pwveufnC3AdxwLtCeAM4ylNLlBlQAKnU4s";
const PROPOSALS_SHEET_NAME = "Sessions received ";

const SHEET_HEADERS = [
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
  "Root Submission ID",
  "Superseded",
];

export async function onRequestPost({ request, env }) {
  if (!env.GDC_SHEET_SYNC_SECRET) {
    return jsonResponse({ ok: false, error: "GDC_SHEET_SYNC_SECRET is not configured" }, 500);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON body" }, 400);
  }

  if (payload.secret !== env.GDC_SHEET_SYNC_SECRET) {
    return jsonResponse({ ok: false, error: "Invalid sync secret" }, 403);
  }
  if (payload.action !== "upsertProposal") {
    return jsonResponse({ ok: false, error: "Unsupported action" }, 400);
  }

  try {
    const result = await upsertProposalInSheet(env, payload.proposal);
    return jsonResponse({ ok: true, ...result });
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, error: String(error.message || error) }, 500);
  }
}

export async function onRequestGet() {
  return jsonResponse({ ok: true, service: "gdc26-sheet-sync" });
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function base64UrlEncode(input) {
  let bytes;
  if (typeof input === "string") {
    bytes = new TextEncoder().encode(input);
  } else {
    bytes = new Uint8Array(input);
  }

  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function pemToArrayBuffer(pem) {
  const body = pem
    .replace(/\\n/g, "\n")
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

async function googleAccessToken(env) {
  if (!env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    throw new Error("Google service account credentials are not configured");
  }

  const now = Math.floor(Date.now() / 1000);
  const unsignedJwt = [
    base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" })),
    base64UrlEncode(JSON.stringify({
      iss: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: GOOGLE_TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })),
  ].join(".");

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsignedJwt),
  );
  const assertion = `${unsignedJwt}.${base64UrlEncode(signature)}`;

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    throw new Error(`Google token request failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function sheetsRequest(env, method, range, body) {
  const token = await googleAccessToken(env);
  const encodedRange = encodeURIComponent(range);
  const query = method === "POST"
    ? "?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS"
    : "?valueInputOption=USER_ENTERED";
  const suffix = method === "POST" ? ":append" : "";
  const response = await fetch(
    `${GOOGLE_SHEETS_API}/${PROPOSALS_SHEET_ID}/values/${encodedRange}${suffix}${method === "GET" ? "" : query}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    },
  );

  if (!response.ok) {
    throw new Error(`Google Sheets request failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

function proposalToSheetRow(proposal) {
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

async function upsertProposalInSheet(env, proposal) {
  if (!proposal?.rootSubmissionId) {
    throw new Error("proposal.rootSubmissionId is required");
  }

  await sheetsRequest(env, "PUT", `'${PROPOSALS_SHEET_NAME}'!A2:L2`, { values: [SHEET_HEADERS] });

  const keyData = await sheetsRequest(env, "GET", `'${PROPOSALS_SHEET_NAME}'!K3:K`);
  const keys = keyData.values || [];
  const existingIndex = keys.findIndex((row) => String(row?.[0] || "") === proposal.rootSubmissionId);
  const rowValues = [proposalToSheetRow(proposal)];

  if (existingIndex >= 0) {
    const rowNumber = existingIndex + 3;
    await sheetsRequest(env, "PUT", `'${PROPOSALS_SHEET_NAME}'!A${rowNumber}:L${rowNumber}`, {
      values: rowValues,
    });
    return { operation: "updated", row: rowNumber };
  }

  const appendData = await sheetsRequest(env, "POST", `'${PROPOSALS_SHEET_NAME}'!A:L`, {
    values: rowValues,
  });
  return {
    operation: "inserted",
    row: appendData.updates?.updatedRange || null,
  };
}
