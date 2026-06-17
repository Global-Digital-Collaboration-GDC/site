const BASE_ID = "appConzgqW3vehv4S";
const TABLE_ID = "tblilHeWSOIQ0cs4C";
const AIRTABLE_API = "https://api.airtable.com/v0";
const TOKEN_FIELD = "edit_token";
const TOKEN_BYTES = 24;
const META_CACHE_MS = 10 * 60 * 1000;
let metadataCache = null;

const FIELDS = [
  {
    name: "Contact Name",
    label: "Contact name",
    type: "text",
    required: true,
    section: "A. Core Information",
  },
  {
    name: "Contact Email",
    label: "Contact email",
    type: "email",
    required: true,
    section: "A. Core Information",
    help: "We will use this address for proposal follow-up and edit links.",
  },
  {
    name: "Session Title",
    label: "Session title",
    type: "text",
    required: true,
    section: "A. Core Information",
  },
  {
    name: "Co-Organizers",
    label: "Co-organizers",
    type: "textarea",
    required: true,
    section: "A. Core Information",
  },
  {
    name: "Short Summary",
    label: "Short summary",
    type: "textarea",
    required: true,
    section: "A. Core Information",
  },
  {
    name: "Objectives and Outcomes",
    label: "Objectives and outcomes",
    type: "text",
    required: true,
    section: "A. Core Information",
  },
  {
    name: "Strategic Alignment with GDC priorities",
    label: "Strategic alignment with GDC priorities",
    type: "checkboxes",
    required: true,
    section: "B. Session Details",
  },
  {
    name: "extra priority",
    label: "If you selected 'Other': Please specify",
    type: "textarea",
    section: "B. Session Details",
  },
  {
    name: "Public/Private Balance",
    label: "Public/private balance",
    type: "radio",
    required: true,
    section: "B. Session Details",
  },
  {
    name: "Target Audience",
    label: "Target audience",
    type: "textarea",
    section: "B. Session Details",
    help: "Describe the intended audience",
  },
  {
    name: "Proposed Speakers and Moderators",
    label: "Proposed speakers and moderators",
    type: "textarea",
    required: true,
    section: "B. Session Details",
  },
  {
    name: "Estimated Room Capacity",
    label: "Estimated room capacity",
    type: "number",
    section: "C. Logistics",
    help: "Estimate the expected number of participants.",
  },
  {
    name: "AV/Tech Requirements and Room Setup",
    label: "AV/tech requirements and room setup",
    type: "textarea",
    section: "C. Logistics",
    help: "Describe audio/visual, technical needs, and room layout.",
  },
  {
    name: "Additional Information",
    label: "Additional information",
    type: "textarea",
    section: "C. Logistics",
    help: "Any additional context or requests.",
  },
];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeRecordId(id) {
  const value = String(id ?? "").trim();
  return /^rec[a-zA-Z0-9]{14}$/.test(value) ? value : "";
}

function normalizeToken(token) {
  const value = String(token ?? "").trim();
  return /^[a-zA-Z0-9_-]{24,128}$/.test(value) ? value : "";
}

function escapeFormulaString(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

function randomToken() {
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function fieldValue(fields, name) {
  const value = fields?.[name];
  if (Array.isArray(value)) return value.join(", ");
  return value ?? "";
}

function selectedValues(fields, name) {
  const value = fields?.[name];
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value) return [value];
  return [];
}

async function airtableRequest(env, path, init = {}) {
  if (!env.AIRTABLE_API_TOKEN) {
    throw new Error("AIRTABLE_API_TOKEN is not configured");
  }

  const response = await fetch(`${AIRTABLE_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.AIRTABLE_API_TOKEN}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Airtable ${response.status}: ${body}`);
  }

  return response.json();
}

async function getFieldMetadata(env) {
  const now = Date.now();
  if (metadataCache && now - metadataCache.time < META_CACHE_MS) {
    return metadataCache.fields;
  }

  const data = await airtableRequest(env, `/meta/bases/${BASE_ID}/tables`);
  const table = data.tables.find((item) => item.id === TABLE_ID);
  const fields = {};

  for (const field of table?.fields || []) {
    fields[field.name] = {
      description: field.description || "",
      type: field.type,
      options: field.options?.choices?.map((choice) => choice.name) || [],
    };
  }

  metadataCache = { time: now, fields };
  return fields;
}

function htmlPage({ title, body, status = 200 }) {
  return new Response(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f7f7f5;
      --panel: #ffffff;
      --text: #1f2933;
      --muted: #5f6b7a;
      --line: #d9ded8;
      --accent: #0f766e;
      --accent-dark: #0b5f59;
      --danger: #9f1239;
      --focus: #2563eb;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font: 15px/1.5 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    header {
      border-bottom: 1px solid var(--line);
      background: var(--panel);
    }

    .bar, main {
      width: min(880px, calc(100% - 32px));
      margin: 0 auto;
    }

    .bar {
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 68px;
    }

    .mark {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      background: var(--accent);
      color: white;
      display: grid;
      place-items: center;
      font-weight: 700;
      letter-spacing: .02em;
    }

    .brand {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    .brand strong { font-size: 15px; }
    .brand span { color: var(--muted); font-size: 13px; }

    main {
      padding: 34px 0 56px;
    }

    h1 {
      margin: 0 0 8px;
      font-size: clamp(26px, 4vw, 38px);
      line-height: 1.12;
      letter-spacing: 0;
    }

    .lede {
      margin: 0 0 28px;
      color: var(--muted);
      max-width: 70ch;
    }

    .subtitle {
      margin: 0 0 28px;
      color: var(--muted);
      font-size: 18px;
    }

    form, .message {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 24px;
    }

    fieldset {
      border: 0;
      margin: 0;
      padding: 0;
    }

    fieldset + fieldset {
      border-top: 1px solid var(--line);
      margin-top: 28px;
      padding-top: 24px;
    }

    legend {
      color: var(--text);
      font-size: 18px;
      font-weight: 750;
      margin-bottom: 18px;
      padding: 0;
    }

    .field {
      display: grid;
      gap: 8px;
      margin-block: 0 20px;
    }

    label {
      font-weight: 650;
    }

    .hint {
      color: var(--muted);
      font-size: 13px;
    }

    .choice-list {
      display: grid;
      gap: 10px;
    }

    .choice {
      align-items: flex-start;
      display: grid;
      gap: 10px;
      grid-template-columns: 18px 1fr;
      font-weight: 400;
    }

    .choice input {
      height: 18px;
      margin: 2px 0 0;
      width: 18px;
    }

    input, textarea, select {
      width: 100%;
      border: 1px solid #c8d0ca;
      border-radius: 6px;
      background: #fff;
      color: var(--text);
      font: inherit;
      padding: 10px 12px;
    }

    textarea {
      min-height: 112px;
      resize: vertical;
    }

    input:focus, textarea:focus, select:focus {
      outline: 3px solid color-mix(in srgb, var(--focus) 24%, transparent);
      border-color: var(--focus);
    }

    .actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 12px;
      border-top: 1px solid var(--line);
      padding-top: 20px;
      margin-top: 8px;
    }

    button {
      border: 0;
      border-radius: 6px;
      background: var(--accent);
      color: #fff;
      cursor: pointer;
      font: inherit;
      font-weight: 700;
      padding: 11px 18px;
    }

    button:hover { background: var(--accent-dark); }

    .error {
      border-color: color-mix(in srgb, var(--danger) 35%, var(--line));
    }

    .error-text {
      color: var(--danger);
      font-weight: 650;
    }

    .meta {
      color: var(--muted);
      font-size: 13px;
      margin-top: 18px;
    }

    @media (max-width: 640px) {
      .bar, main {
        width: min(100% - 24px, 880px);
      }

      main { padding-top: 24px; }
      form, .message { padding: 18px; }
      .actions { justify-content: stretch; }
      button { width: 100%; }
    }
  </style>
</head>
<body>
  <header>
    <div class="bar">
      <div class="mark">Gd</div>
      <div class="brand">
        <strong>Global Digital Collaboration 2026</strong>
        <span>Proposal form</span>
      </div>
    </div>
  </header>
  <main>${body}</main>
</body>
</html>`, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function fieldOptions(field, metadata) {
  return metadata?.[field.name]?.options?.length
    ? metadata[field.name].options
    : field.options || [];
}

function fieldHelp(field, metadata) {
  return field.help ?? metadata?.[field.name]?.description ?? "";
}

function renderField(field, fields, metadata) {
  const id = `field-${field.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
  const value = fieldValue(fields, field.name);
  const required = field.required ? " required" : "";
  const label = `${escapeHtml(field.label)}${field.required ? " *" : ""}`;
  const help = fieldHelp(field, metadata);

  if (field.type === "textarea") {
    return `<div class="field">
      <label for="${id}">${label}</label>
      ${help ? `<div class="hint">${escapeHtml(help)}</div>` : ""}
      <textarea id="${id}" name="${escapeHtml(field.name)}"${required}>${escapeHtml(value)}</textarea>
    </div>`;
  }

  if (field.type === "select") {
    const current = String(value);
    const options = ["", ...fieldOptions(field, metadata)].map((option) => {
      const selected = option === current ? " selected" : "";
      const labelText = option || "Select an option";
      return `<option value="${escapeHtml(option)}"${selected}>${escapeHtml(labelText)}</option>`;
    }).join("");
    return `<div class="field">
      <label for="${id}">${label}</label>
      ${help ? `<div class="hint">${escapeHtml(help)}</div>` : ""}
      <select id="${id}" name="${escapeHtml(field.name)}"${required}>${options}</select>
    </div>`;
  }

  if (field.type === "radio") {
    const current = String(value);
    const options = fieldOptions(field, metadata).map((option, index) => {
      const checked = option === current ? " checked" : "";
      const optionId = `${id}-${index}`;
      return `<label class="choice" for="${optionId}">
        <input id="${optionId}" type="radio" name="${escapeHtml(field.name)}" value="${escapeHtml(option)}"${checked}${required}>
        <span>${escapeHtml(option)}</span>
      </label>`;
    }).join("");
    return `<div class="field">
      <label>${label}</label>
      ${help ? `<div class="hint">${escapeHtml(help)}</div>` : ""}
      <div class="choice-list">${options}</div>
    </div>`;
  }

  if (field.type === "checkboxes") {
    const current = new Set(selectedValues(fields, field.name));
    const options = fieldOptions(field, metadata).map((option, index) => {
      const checked = current.has(option) ? " checked" : "";
      const optionId = `${id}-${index}`;
      return `<label class="choice" for="${optionId}">
        <input id="${optionId}" type="checkbox" name="${escapeHtml(field.name)}" value="${escapeHtml(option)}"${checked}>
        <span>${escapeHtml(option)}</span>
      </label>`;
    }).join("");
    return `<div class="field">
      <label>${label}</label>
      ${help ? `<div class="hint">${escapeHtml(help)}</div>` : ""}
      <div class="choice-list">${options}</div>
    </div>`;
  }

  const input = `<div class="field">
    <label for="${id}">${label}</label>
    ${help ? `<div class="hint">${escapeHtml(help)}</div>` : ""}
    <input id="${id}" name="${escapeHtml(field.name)}" type="${field.type}" value="${escapeHtml(value)}"${required}>
  </div>`;

  return input;
}

function renderSection(section, fields, metadata) {
  const sectionFields = FIELDS.filter((field) => field.section === section);
  return `<fieldset>
    <legend>${escapeHtml(section)}</legend>
    ${sectionFields.map((field) => renderField(field, fields, metadata)).join("")}
  </fieldset>`;
}

function renderForm(record = null, metadata = {}) {
  const isUpdate = Boolean(record);
  const fields = record?.fields || {};
  const parentId = fields.parent_submission_id || record?.id;
  const title = "Session proposal";
  const lede = isUpdate
    ? "Review the details below and submit only when you are ready to create a new version. Your original submission remains stored."
    : "Share the details of your proposed breakout session. The Secretariat will review submitted proposals and follow up as needed.";
  const button = isUpdate ? "Submit updated proposal" : "Submit proposal";
  const meta = isUpdate
    ? `<p class="meta">Original submission ID: ${escapeHtml(parentId)}</p>`
    : "";
  const hiddenParent = isUpdate
    ? `<input type="hidden" name="parent_submission_id" value="${escapeHtml(parentId)}">`
    : "";

  const sections = [...new Set(FIELDS.map((field) => field.section))];
  const body = `<h1>${title}</h1>
    <p class="subtitle">GDC26 Geneva - Breakout Sessions (Sep 2-3)</p>
    <p class="lede">${lede}</p>
    <form method="post">
      ${hiddenParent}
      ${sections.map((section) => renderSection(section, fields, metadata)).join("")}
      <div class="actions">
        <button type="submit">${button}</button>
      </div>
      ${meta}
    </form>`;
  return htmlPage({ title, body });
}

function renderError(message, status = 400) {
  return htmlPage({
    title: "Proposal form unavailable",
    status,
    body: `<div class="message error">
      <h1>Proposal form unavailable</h1>
      <p class="error-text">${escapeHtml(message)}</p>
      <p class="lede">Please contact the GDC Secretariat if you need help with your proposal.</p>
    </div>`,
  });
}

function renderSuccess(createdRecord, isUpdate) {
  const title = "Thank you for submitting your proposal.";
  const lede = isUpdate
    ? "Your updated proposal has been received and stored as a new version."
    : "Your proposal has been received.";
  const updateUrl = createdRecord.fields?.new_update_url;

  return htmlPage({
    title,
    body: `<div class="message">
      <h1>${title}</h1>
      <p class="lede">${lede}</p>
      ${updateUrl ? `<p>Please keep this edit link for future changes:<br><a href="${escapeHtml(updateUrl)}">${escapeHtml(updateUrl)}</a></p>` : ""}
      <p class="meta">Submission ID: ${escapeHtml(createdRecord.id)}</p>
    </div>`,
  });
}

function fieldsFromForm(formData) {
  const fields = {};

  for (const field of FIELDS) {
    if (field.type === "checkboxes") {
      const values = formData.getAll(field.name).map(String).filter(Boolean);
      if (values.length) fields[field.name] = values;
      continue;
    }

    const value = String(formData.get(field.name) ?? "").trim();
    if (!value) continue;

    if (field.type === "number") {
      const numberValue = Number(value);
      if (!Number.isNaN(numberValue)) fields[field.name] = numberValue;
      continue;
    }

    fields[field.name] = value;
  }

  const parentId = String(formData.get("parent_submission_id") ?? "").trim();
  if (parentId) fields.parent_submission_id = parentId;
  fields[TOKEN_FIELD] = randomToken();
  return fields;
}

function validateFields(fields) {
  const missing = FIELDS
    .filter((field) => field.required)
    .filter((field) => {
      const value = fields[field.name];
      return Array.isArray(value) ? value.length === 0 : !String(value ?? "").trim();
    })
    .map((field) => field.label);

  return missing;
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const isProposalHost = url.hostname === "proposals.gdc26-hub.pages.dev";
  const isLocal = url.hostname === "127.0.0.1" || url.hostname === "localhost";

  if (!isProposalHost && !isLocal) {
    return env.ASSETS.fetch(request);
  }

  const token = normalizeToken(url.searchParams.get("token"));
  const id = normalizeRecordId(url.searchParams.get("id"));

  if (!id && !token) {
    const metadata = await getFieldMetadata(env);
    return renderForm(null, metadata);
  }

  try {
    const metadata = await getFieldMetadata(env);
    const record = token
      ? await findRecordByToken(env, token)
      : await airtableRequest(env, `/${BASE_ID}/${TABLE_ID}/${id}`);
    if (!record) {
      return renderError("We could not load this proposal. The link may be invalid or expired.", 404);
    }
    const latest = await findLatestVersion(env, record);
    return renderForm(latest, metadata);
  } catch (error) {
    console.error(error);
    return renderError("We could not load this proposal. The link may be invalid or expired.", 404);
  }
}

async function findRecordByToken(env, token) {
  const formula = encodeURIComponent(`{${TOKEN_FIELD}} = '${escapeFormulaString(token)}'`);
  const data = await airtableRequest(
    env,
    `/${BASE_ID}/${TABLE_ID}?maxRecords=1&filterByFormula=${formula}`,
  );
  return data.records?.[0] || null;
}

async function findLatestVersion(env, record) {
  const rootId = record.fields?.parent_submission_id || record.id;
  const formula = encodeURIComponent(`OR(RECORD_ID()='${rootId}', {parent_submission_id}='${rootId}')`);
  const data = await airtableRequest(
    env,
    `/${BASE_ID}/${TABLE_ID}?maxRecords=100&filterByFormula=${formula}&sort%5B0%5D%5Bfield%5D=Submitted%20At&sort%5B0%5D%5Bdirection%5D=desc`,
  );
  return data.records?.[0] || record;
}

export async function onRequestPost({ request, env }) {
  const url = new URL(request.url);
  const isProposalHost = url.hostname === "proposals.gdc26-hub.pages.dev";
  const isLocal = url.hostname === "127.0.0.1" || url.hostname === "localhost";

  if (!isProposalHost && !isLocal) {
    return renderError("Proposal updates are only available on the proposals subdomain.", 404);
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return renderError("The submitted form could not be read. Please try again.");
  }
  const rawParentId = String(formData.get("parent_submission_id") ?? "").trim();
  const parentId = rawParentId ? normalizeRecordId(rawParentId) : "";

  if (rawParentId && !parentId) {
    return renderError("The submitted form includes an invalid original proposal ID.");
  }

  const fields = fieldsFromForm(formData);
  if (parentId) fields.parent_submission_id = parentId;
  const missing = validateFields(fields);

  if (missing.length) {
    return renderError(`Please complete the required fields: ${missing.join(", ")}.`);
  }

  try {
    const created = await airtableRequest(env, `/${BASE_ID}/${TABLE_ID}`, {
      method: "POST",
      body: JSON.stringify({ fields }),
    });
    return renderSuccess(created, Boolean(parentId));
  } catch (error) {
    console.error(error);
    return renderError("We could not save the updated proposal. Please review the form and try again.", 500);
  }
}
