# Global Digital Collaboration 2026 Organizer Hub

This repository contains the MkDocs site for the Global Digital Collaboration 2026 organizer hub. The content is written for conference organizers, working groups, and task force participants.

The structure and tooling are intentionally aligned with the OpenWallet Foundation TAC site and use the same `zensical`-powered publishing workflow.

## Live site

The site is published at:

- [https://gdc26-organizer-hub.pages.dev/](https://gdc26-organizer-hub.pages.dev/)

Access is restricted through Cloudflare Access.

## Tech stack

- [MkDocs](https://www.mkdocs.org/)
- [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/)
- [Zensical](https://zensical.org/)
- Cloudflare Pages
- Cloudflare Access
- `uv` / `uvx` for local and CI execution

## Repository layout

```text
mkdocs.yml               # Site navigation and theme config
docs/
  index.md               # Homepage
  governance/            # Governing documents
  meetings/              # Meeting notes and cadence
  task-forces/           # Task force landing pages
  assets/                # Logo and icon assets
.github/workflows/       # Cloudflare Pages deployment workflow
```

## Local development

If `uv` is installed:

```bash
uvx --from zensical zensical serve
```

To create a production build:

```bash
uvx --from zensical zensical build --clean
```

If you prefer to use the project dependency file:

```bash
uv run zensical serve
uv run zensical build --clean
```

## Editing content in GitHub

Non-technical contributors can update most of the site directly from the GitHub web interface.

1. Open the repository at `https://github.com/GDC26/gdc26.github.io`.
2. Browse to the page you want to change under `docs/`.
3. Click the pencil icon to edit the Markdown file in GitHub.
4. Commit the change directly to `main` or open a pull request.
5. GitHub Actions will rebuild and deploy the site to Cloudflare Pages automatically after the change is merged.

Typical files to edit:

- Homepage content: `docs/index.md`
- Governing documents: `docs/governance/*.md`
- Meeting notes: `docs/meetings/YYYY/*.md`
- Task force pages: `docs/task-forces/*.md`
- Navigation labels/order: `mkdocs.yml`

## Notes for organizers

- The site is written in English.
- This repository can link out to the GitHub wiki for longer-form collaborative notes.
- Most current pages are placeholders and can be expanded incrementally as planning advances.
