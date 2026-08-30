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
| `pnpm test` | Check header contrast, navigation, and service hover interactions. |
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

The homepage shows four projects in the former archive layout, preserving their order, alternating widths, offsets, image crops, and captions. Donauwalther remains in the archive and on its detail page but is omitted from the homepage. "Alle Projekte ansehen" remains below the cards. The project archive uses a uniform grid with 16:9 covers and stacked captions: four columns from 1200px, two columns from 761px to 1199px, and one column at 760px and below. Archive descriptions align at the top, with 1.25rem between the title area and description. The four-column layout reserves two lines for titles so their descriptions start together. Both pages use the same project data and `ProjectCard` component, with 2.4rem between images and captions.

For local typography testing, the site uses the installed PP Neue Montreal Medium font through CSS `local()`. It falls back to Helvetica Neue, Helvetica, Arial, and the system sans-serif when unavailable. No font files are bundled or requested over the network. Replace the local source with the licensed webfont when it is ready. The SVG wordmark retains its original outlines.

Typography uses only three responsive sizes, defined in `src/styles/global.css`. Each size has its own fluid range. Every size uses Medium, weight 500, and its matching shared line-height token. Adjust these shared tokens rather than adding component-specific sizes, line heights, or mobile font overrides.

| Token | Range at a 16px root size | Line height | Use |
| --- | --- | --- | --- |
| `--text-sm` | ≈13.94–17.42px | 1.4 | Navigation, supporting copy, metadata. |
| `--text-md` | 17.28–37.44px | 1.2 | Section and project-card headings, service overview titles, larger body copy, prominent links. |
| `--text-lg` | ≈38.02–107.71px | 1.1 | Page headlines, service overview descriptions, and short display statements. |

The header centers Projekte, Leistungen, and Studio as a group in the viewport. The logo stays left and Kontakt aligns to the right page inset. Below 480px, the logo and Kontakt share the first row, with the three page links centered beneath them. All navigation items use the shared small text size.

Text links use a `.06em` underline thickness and `.3em` baseline offset through the `--link-underline-*` tokens. Navigation uses `.08em` thickness to approximate the letter strokes and a `.3em` offset, including its moving indicator and static fallback. Service overview headings and project-card titles use the browser's default underline thickness, offset, and descender handling. Hovering anywhere on a project card or focusing it with the keyboard underlines only its title. Existing always-underlined links retain their behavior.

On desktop, service titles rest at the bottom of each column on a continuous yellow background. Hover and keyboard focus underline the title and raise it beneath the service's large description. The description appears instantly in a shared position across the full page width, with equal side insets. The title's destination follows the rendered description height and leaves a small gap. The full column remains clickable, and the image preview stays behind both text levels. Mobile titles and descriptions remain permanently visible. Reduced motion skips the title animation.

Hovering also shows a pointer-following 4:3 preview of the projects in that service's `cases` list. Its width is 25.2% of the viewport, between 196px and 392px, constrained further to fit the visible area. The box sits 16px from the pointer, flipping inward or shrinking when needed to stay below the header and inside the viewport. The native cursor stays visible. Covers switch every 500ms without a fade. Position updates on pointer movement, scrolling, resizing, and visual viewport changes. The preview never intercepts clicks. Reduced motion shows a still cover. Leaving a column, switching tabs, or navigating away hides the preview and stops its timer.

At 760px and below, or on touch-first devices, services become stacked sections with permanently visible headings and descriptions. Each section has a native horizontal gallery of its referenced projects with 4:3 images and the next card peeking in to suggest swiping. Galleries do not rotate automatically. The heading opens the service; each image and caption opens its project. Galleries work without JavaScript, retain keyboard access, and load images lazily. Desktop hover previews are disabled in this layout, including on narrow windows with a mouse.

The selected navigation item has one shared underline. Its 320ms slide starts as soon as navigation begins, without waiting for the page wipe or the next page to load, including back/forward navigation. It persists across Astro page swaps, stays put within the same section, and hides on pages without a selected menu item. Cancelled navigation restores the current selection. Resizing and font loading update its position; reduced motion skips the slide. Without JavaScript, the selected link keeps a static underline. The moving underline uses the same background contrast sampling as the header letters.

The fixed header samples the background beneath each letter of the logo and navigation links. Each letter independently picks dark or white using relative luminance, accounting for the visible crop of local images. Menu labels use individual grapheme spans with a complete accessible link name; `HeaderWordmark.astro` groups the original SVG outlines into 13 letters without changing their shapes. All navigation links, including Kontakt, share the same typography and have no background. Kontakt opens an email to `post@studioschatzi.at`. When image data cannot be read, that letter retains its previous colour. The script batches updates per animation frame on scrolling, resizing, image loading, and page navigation. Samples estimate contrast rather than certify every image pixel; mixed photographs may not provide sufficient contrast for either colour. No image data leaves the browser. The contrast method follows [W3C's text contrast guidance](https://www.w3.org/WAI/WCAG22/Techniques/general/G18.html).

Every page uses the shared yellow footer in `SiteFooter.astro`. On the homepage it follows the project list and archive link directly, without a separate statement or services teaser. It fills at least one viewport and leaves space below the fixed header. A compact, full-width loop of seven black client logos sits above the large headline. The band pauses on hover or via its checkbox and becomes a static wrapping row with reduced motion. Original logo sources are recorded in `docs/client-logos.md`.

Email, phone, and the street address appear in a medium-size contact block on the right, stacking on small screens. The legal label and copyright sit at the bottom. The legal label remains unlinked until approved text or a destination is supplied. The default headline comes from the positioning service; service detail pages pass their own headline into the same footer and no longer render a separate CTA section.

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
