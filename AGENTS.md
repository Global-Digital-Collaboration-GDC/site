# Repository Notes

## Site: Zensical / MkDocs

This repository publishes the Global Digital Collaboration 2026 hub.

Production and preview:

- Public production site: `https://gdc26-hub.pages.dev/`
- Protected preview site: `https://preview.gdc26-hub.pages.dev/`
- Cloudflare Pages project: `gdc26-hub`
- Pushes to `main` and pull requests build and deploy preview.
- Published GitHub releases build and deploy production.

Tech stack:

- Zensical on top of MkDocs / Material for MkDocs
- Site config: `mkdocs.yml`
- Content root: `docs/`
- Draft/non-public working content: `drafts/`
- Deployment workflow: `.github/workflows/ci.yml`
- Local and CI execution should use `uv` / `uvx`

Common commands:

```bash
uvx --from zensical zensical serve
uvx --from zensical zensical build --config-file mkdocs.yml --clean
```

Repository layout:

```text
mkdocs.yml               # Navigation, theme, Markdown extensions, assets
docs/
  index.md               # Homepage
  task-forces/           # Public task force landing pages
  assets/                # Logo/icon/media assets
  stylesheets/           # Site-specific CSS
  javascripts/           # Site-specific JS
drafts/                  # Internal drafts and staging notes
.github/workflows/       # Build/deploy workflow
```

Publishing rule:

- Do not assume a push to `main` updates production. Production deploys only on a published GitHub release.
- Before creating a release, verify that the target commit is on `origin/main`.

## Task Force Repositories and Wikis

Task forces use the website for concise public landing pages and separate GitHub repositories for collaborative working material.

Current task force repos:

- Age Assurance: `Global-Digital-Collaboration-GDC/age-assurance`
- Trust Registries: `Global-Digital-Collaboration-GDC/trust-registries`
- DAISi: `Global-Digital-Collaboration-GDC/daisi`

Expected repository settings for task force repos:

- Public repository
- Issues: enabled
- Discussions: enabled
- Wiki: enabled
- Downloads: enabled
- Projects: disabled
- Pull requests: disabled
- Pages: disabled
- Forking: enabled
- Template: disabled

Task force website pattern:

- Public pages live under `docs/task-forces/<slug>/index.md`.
- Navigation is configured in `mkdocs.yml` under `nav > Task Forces`.
- Each task force page should include a `## GitHub resources` section with links to:
  - `https://github.com/Global-Digital-Collaboration-GDC/<repo>/wiki`
  - `https://github.com/Global-Digital-Collaboration-GDC/<repo>/discussions`
  - `https://github.com/Global-Digital-Collaboration-GDC/<repo>/issues`

Wiki-centered working model:

- The wiki is the working space for evolving materials such as charters, meeting notes, agendas, references, and scratch drafts.
- The website should stay concise and stable: overview, scope, co-leads, participation, charter links, mailing list, and GitHub resources.
- Mature wiki content can later be promoted into the website when it becomes durable public wording.
- New task force repos should mirror the existing repo pattern before being linked from the site.

## Airtable: GDC26 Session Proposals

The GDC26 proposal workflow is managed in Airtable, not in this repository.

Production base:

- Base: `GDC26` (`appConzgqW3vehv4S`)
- Table: `session_proposals` (`tblilHeWSOIQ0cs4C`)
- Main grid view: `viwN1OxR0vp7dDJMc`
- API token env var: `AIRTABLE_API_TOKEN` in `.env`

Important fields in `session_proposals`:

- `Submission ID` (`fld13s6u4Nlf0O2pe`): formula, `RECORD_ID()`
- `parent_submission_id` (`fldOrBkB0a1yJZQjN`): stores the original submission record ID when an update creates a replacement proposal
- `superseded` (`fldIUa778kf4Zr4JJ`): checkbox used by automation to mark older versions as replaced
- `update_url` (`fldo8Xm0bvna5IBKG`): formula that builds the prefilled Airtable form URL sent in confirmation emails
- `edit_token` (`fld2D3V1lPmpqs497`): random token used by the Cloudflare proposal form edit URL
- `new_update_url` (`fldF923yIpS9ki4Vd`): formula that builds the short Cloudflare edit URL from `edit_token`

Known update-link workflow:

1. A submitter creates an original proposal through an Airtable form.
2. Airtable sends a confirmation email containing `update_url`.
3. Opening `update_url` loads the same form with `prefill_...` query parameters and `hide_parent_submission_id=true`.
4. Submitting the prefilled form creates a new record whose `parent_submission_id` points back to the original record.
5. An Airtable automation marks the older record `superseded` so downstream views can keep only the latest version.

Safety rules:

- Treat `appConzgqW3vehv4S` as production. Do not create, update, delete, or trigger test records without explicit confirmation.
- Prefer read-only Airtable API calls while investigating.
- If Python is used, create PEP 723 scripts and run them with `uv run <script>`.
- Do not print Airtable tokens or full secret-bearing environment output.

Current bug investigation notes:

- Broken example update links point to `https://airtable.com/apped7LMeihDW5DIG/pagv4xFzFY9dxzXZl/form?...`.
- The production base is `appConzgqW3vehv4S`, so `apped7LMeihDW5DIG` is likely an old/deleted/inaccessible base or form source.
- Airtable metadata confirms the `update_url` formula currently hardcodes that `apped7LMeihDW5DIG/pagv4xFzFY9dxzXZl/form` prefix.
- The confirmed current session proposal form URL is `https://airtable.com/appConzgqW3vehv4S/pagv4xFzFY9dxzXZl/form`.
- The safest fix is to update only the `update_url` formula prefix from `apped7LMeihDW5DIG` to `appConzgqW3vehv4S`.

## Proposal Form on Cloudflare Pages

The repository includes a Cloudflare Pages Function for the proposal form:

- Function: `functions/index.js`
- New proposal URL: `https://proposals.gdc26-hub.pages.dev/`
- Update proposal URL pattern: `https://proposals.gdc26-hub.pages.dev/?token=<edit_token>`
- Runtime secret required in Cloudflare Pages: `AIRTABLE_API_TOKEN`

The function uses Airtable as the database:

- `GET /` on the proposals subdomain renders a blank proposal form.
- `GET /?token=...` loads the existing proposal from Airtable and pre-fills the form.
- `POST /` creates a new Airtable record.
- If `parent_submission_id` is present, the new record is treated as an updated version of the original proposal.
- `?id=rec...` is supported as a temporary fallback during migration, but public edit links should use `new_update_url`.

Deployment details:

- The GitHub Actions workflow deploys branch `proposals` to Cloudflare Pages so the branch alias can serve `https://proposals.gdc26-hub.pages.dev/`.
- The normal site host is intentionally passed through to static assets, so `gdc26-hub.pages.dev` remains the Zensical site.
- Do not test POST submissions against production Airtable without explicit confirmation.

## Google Sheets Sync for Session Proposals

The public/program working spreadsheet is populated from Airtable, but only with the latest version of each proposal.

- Spreadsheet: `Proposed Sessions - GDC Geneva Sep 2-3 2026`
- Sheet ID: `1TQ-p8CmJ1pwveufnC3AdxwLtCeAM4ylNLlBlQAKnU4s`
- Live tab: `Sessions received `
- Backup tab currently exists as: `Copy of Sessions received `
- Row 1 is the sheet title and remains merged/formatted.
- Row 2 contains export headers.
- Column K is the technical key `Root Submission ID`, used to keep one row per proposal family.

Scripts:

- `scripts/export_latest_proposals_to_gsheet.py`: one-time local export builder from Airtable.
- `scripts/airtable-automation-sync-gsheet.js`: Airtable Automation script that sends the latest proposal data to the Cloudflare sync endpoint.
- `scripts/google-apps-script-proposals-sync.gs`: optional Google Apps Script Web App fallback, only useful if the operator can deploy Apps Script for the spreadsheet.

Preferred sync endpoint:

- URL: `https://proposals.gdc26-hub.pages.dev/api/sync-sheet`
- Cloudflare secrets required:
  - `GDC_SHEET_SYNC_SECRET`
  - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
  - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
- The Google Sheet must be shared with the service account email as editor.

Operational model:

1. Airtable remains the source of truth.
2. A new original proposal inserts a row keyed by its own record ID.
3. A proposal edit creates a new Airtable record with `parent_submission_id`.
4. The automation resolves the proposal family root and updates the existing spreadsheet row.
5. The visible `Submission ID` column stores the latest Airtable record ID; `Root Submission ID` stores the stable family key.
