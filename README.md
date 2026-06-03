# Global Digital Collaboration 2026 Hub


## Live site

The site is published at:

- [https://gdc26-hub.pages.dev/](https://gdc26-hub.pages.dev/)

The site is public.

## Preview site

Changes pushed to `main`, and pull requests opened against `main`, are deployed to the protected preview site:

- [https://preview.gdc26-hub.pages.dev/](https://preview.gdc26-hub.pages.dev/)

The preview site should be protected with Cloudflare Access. Allow access for:

- `gaitan@gmail.com`
- `ruth@globaldigitalcollaboration.org`

Cloudflare Pages configuration expected for this repository:

- Project name: `gdc26-hub`
- Production branch: `production`
- Preview branch alias: `preview.gdc26-hub.pages.dev` mapped to the `preview` branch
- Cloudflare Access application protecting `preview.gdc26-hub.pages.dev`

The production site remains public. The preview site displays a diagonal preview ribbon so draft content is visibly distinct from the published site.

## Publishing model

The repository uses one GitHub Actions workflow with two deployment paths:

- Pushes to `main` and pull requests against `main` build and deploy the preview site.
- Published GitHub releases build and deploy the production site.

To publish a reviewed version, create a GitHub release from the commit that should become public. Direct pushes or merges to `main` do not update production.

## Tech stack

- [MkDocs](https://www.mkdocs.org/)
- [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/)
- [Zensical](https://zensical.org/)
- Cloudflare Pages
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

1. Open the repository at `https://github.com/Global-Digital-Collaboration-GDC/site`.
2. Browse to the page you want to change under `docs/`.
3. Click the pencil icon to edit the Markdown file in GitHub.
4. Commit the change directly to `main` or open a pull request.
5. GitHub Actions will rebuild and deploy the protected preview site automatically after the change is merged.
6. Create a GitHub release when the reviewed preview should become the public production site.

Typical files to edit:

- Homepage content: `docs/index.md`
- Governing documents: `docs/governance/*.md`
- Meeting notes: `docs/meetings/YYYY/*.md`
- Task force pages: `docs/task-forces/*.md`
- Navigation labels/order: `mkdocs.yml`

## Notes for contributors

- The site is written in English.
- This repository can link out to the GitHub wiki for longer-form collaborative notes.
- Most current pages are placeholders and can be expanded incrementally as planning advances.
