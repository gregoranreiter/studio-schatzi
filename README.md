# Studio Schatzi

The German portfolio website for Studio Schatzi, an independent design studio in Linz. Built with Astro, TypeScript, and plain CSS. Pages are generated as static HTML. There is no CMS, database, analytics, or contact form backend.

## Local development

Use Node.js 22.23.2 and pnpm 11.19.0. The versions are recorded in `.nvmrc` and `package.json`.

```sh
nvm install
nvm use
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Open the local URL printed by Astro, normally `http://127.0.0.1:4321`. If another site uses that port, Astro chooses the next available port. No environment variables or external accounts are required.

If another pnpm version is already installed, use `corepack pnpm` in place of `pnpm`. If Corepack is unavailable, install the pinned pnpm version using the [official pnpm installation instructions](https://pnpm.io/installation).

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Run the website with live updates. |
| `pnpm check` | Check Astro and TypeScript files. |
| `pnpm build` | Check types and generate the complete site in `dist/`. |
| `pnpm preview` | Serve the production build locally. Run the build first. |

GitHub Actions runs the same locked install and build for pushes to `main` and pull requests. A build does not publish the site.

## Editing the website

| Location | Content |
| --- | --- |
| `src/data/projects.ts` | Five projects, gallery images, scope of work, and related projects. |
| `src/data/services.ts` | Four services, explanatory text, project examples, and contact links. |
| `src/pages/` | Homepage, project archive and detail pages, service pages, studio, and 404. |
| `src/layouts/BaseLayout.astro` | Shared navigation, metadata, and page transitions. |
| `src/components/` | Project cards and footer. |
| `src/styles/global.css` | Colours, typography, spacing, motion, and responsive layouts. |
| `public/images/projects/` | Images used on the website. |
| `public/logo-studio-schatzi.svg` | Original Studio Schatzi wordmark. |
| `public/og.png` | Existing social preview image. |

Project and service slugs become URLs. Keep them stable once the site is published, or add redirects when changing them. Update the `related` and service `cases` references when renaming a project slug.

## Deployment

The existing configuration produces a static site. The canonical domain is `https://www.studioschatzi.at`, configured in `astro.config.mjs`. Confirm that domain before a public launch.

- Repository root is the project root. There is no nested `site/` directory.
- Install command: `pnpm install --frozen-lockfile`.
- Build command: `pnpm build`.
- Publish directory: `dist/`.
- Serve directory indexes for nested routes and use `404.html` for unknown pages. Do not use a single-page-app fallback to the homepage.

Only deploy `dist/`, never the source folder. See Astro's [deployment guide](https://docs.astro.build/en/guides/deploy/) for host-specific settings.

## Source materials and launch work

The website was imported from the existing `Studio Schatzi Webauftritt/site` folder. Its `Content`, `Gestaltung`, `Projects`, and `tmp` siblings remain in the original working folder. They contain editable design documents, client materials, and intermediate exports and are deliberately excluded from this public repository. This repo includes the web images already used by the site.

See [the project status](docs/project-status.md) for the remaining content and launch decisions. The code and artwork have no open-source licence; a public repository does not grant permission to reuse client assets.
