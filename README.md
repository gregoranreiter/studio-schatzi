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
| `src/pages/` | Homepage, project archive and detail pages, service pages, studio, contact, and 404. |
| `src/layouts/BaseLayout.astro` | Shared navigation, metadata, and page transitions. |
| `src/components/` | Project cards and footer. |
| `src/styles/global.css` | Colours, typography, spacing, motion, and responsive layouts. |
| `public/images/projects/` | Images used on the website. |
| `public/logo-studio-schatzi.svg` | Original Studio Schatzi wordmark. |
| `public/og.png` | Existing social preview image. |

The homepage uses a shared four-column grid, defined by `--page-columns`, `--grid-gap`, and the common page inset. Its headline occupies columns 2–4, leaving the first column empty. Auf der Matte's image fills the full width; KOA's image occupies columns 2–4; Wirtshaus Gretzl's image occupies columns 1–3; Chrispi's image occupies columns 2–4. This sequence is explicit in `homeLayout` rather than inferred from card order. Card captions use CSS subgrid to inherit the page's column lines. All project titles start at page column 2, aligned with the hero headline. All descriptions sit alongside them in columns 3–4, extending to the right page inset independently of image width. Image frames keep their existing aspect ratios. At 760px and below, the headline and all projects fill the content width and captions stack. Donauwalther remains in the archive and on its detail page but is omitted from the homepage. "Alle Projekte ansehen" remains below the cards.

The project archive uses one row per project on the shared four-column grid. The 16:9 cover fills columns 1–3 on the left. In column 4, the title aligns with the top of the cover and the scope aligns with its bottom edge, with a minimum gap of 1.25rem between them. Archive scopes use the shared medium text size and line height in lighter grey, `--ink-muted` at `#858585`; titles remain dark. Each service appears on its own line, without commas or the joining "und". Archive cards and project detail lists share the scope formatter; homepage and related cards retain the inline scope copy. Each complete row remains one project link. At 760px and below, the cover and caption stack at full width, with 2.4rem above the caption and 1.25rem between title and scope. Both pages use the same project data and `ProjectCard` component. Homepage caption spacing remains unchanged, scaling from 1.5rem to 2.4rem.

Project detail introductions use the shared four-column grid with no viewport-based minimum height. The title fills columns 1–3 and starts 1.5–3rem below the fixed header. A 2.5–5rem gap separates it from the summary in columns 2–4. The cover follows with the shared page inset as its top gap. Below the cover, the description occupies columns 2–3 alongside an unstyled service list in column 1. The list uses the shared medium text size and muted grey, with one service per line. At 760px and below, the title and summary fill the content width, and the services and description stack. Cover frames stay unchanged.

The studio headline occupies columns 2–4, while its shared body-text container occupies columns 2–3. Both leave column 1 empty. The introduction has no viewport minimum height: its headline begins 2–3.5rem below the header, followed by a 4–8rem gap before the body text. The three paragraphs flow in one block with 1.2em between paragraphs. At 760px and below, both headline and body use the full content width.

KOA cover images use the top 987px of the 1241px source export, excluding the white strip. The original JPEG stays unchanged. `coverVisibleHeight` in the project data controls the shared `ProjectCover` component and the service hover preview, so the same crop applies to homepage and archive cards, related projects, project heroes, service cases, and mobile galleries. The existing image frames, hover motion, and alt text are preserved.

For local typography testing, the site uses the installed PP Neue Montreal Medium font through CSS `local()`. It falls back to Helvetica Neue, Helvetica, Arial, and the system sans-serif when unavailable. No font files are bundled or requested over the network. Replace the local source with the licensed webfont when it is ready. The SVG wordmark retains its original outlines.

Typography uses only three responsive sizes, defined in `src/styles/global.css`. Each size has its own fluid range. Every size uses Medium, weight 500, and its matching shared line-height token. Adjust these shared tokens rather than adding component-specific sizes, line heights, or mobile font overrides.

| Token | Range at a 16px root size | Line height | Use |
| --- | --- | --- | --- |
| `--text-sm` | ≈13.94–17.42px | 1.4 | Supporting copy, metadata. |
| `--text-md` | ≈15.55–33.70px | 1.2 | Navigation, section and project-card headings, service overview titles, larger body copy, prominent links. |
| `--text-lg` | ≈34.21–96.94px | 1.1 | Page headlines, service overview descriptions, and short display statements. |

The desktop header follows the same four-column grid, with Projekte, Leistungen, and Studio grouped from the left edge of column 2. The logo stays left and Kontakt aligns to the right page inset. The wordmark is scaled to 216% of its original responsive width, 20% larger than the previous version. Logo and navigation align at the top, with the same `--pad` inset on all four sides. Header height follows the logo's original aspect ratio. Desktop navigation and the mobile trigger use the shared medium text size.

At 760px and below, the header shows the logo and a text-only "Menü" button. It opens a full-screen pale-yellow native dialog with the same wordmark, a "Schließen" button, and the four page links in the shared large text size. The current section stays underlined. The dialog contains keyboard focus and makes the underlying page inert; closing restores focus to the trigger. Escape, link activation, navigation, history restoration, and resizing to desktop all close it and release the scroll lock. The menu has no motion, including with reduced motion enabled. Without JavaScript or dialog support, the original navigation remains available, with a second row at 600px and below.

Text links use a `.06em` underline thickness and `.3em` baseline offset through the `--link-underline-*` tokens. Navigation uses `.08em` thickness to approximate the letter strokes and a `.3em` offset, including its moving indicator and static fallback. Service overview headings and project-card titles use the browser's default underline thickness, offset, and descender handling. Hovering anywhere on a project card or focusing it with the keyboard underlines only its title. Existing always-underlined links retain their behavior.

On desktop, service titles rest at the bottom of each column on a continuous yellow background that stays unchanged on hover. Hover and keyboard focus underline the title, reveal its trailing arrow, and raise it beneath the service's large description. The arrow stays outside the underline and reserves its space while hidden. Matter.js drives the titles, headline masks, and image position through one on-demand engine in `src/lib/physical-motion.ts`. Titles lift with an immediate spring impulse and a slight elastic stretch, allowing at most 8px of overshoot. Leaving releases the title at its current height, stops the upward pull, and lets gravity accelerate it toward the baseline. A typical full-height drop lands in about 270ms, with a small rebound and compression. Re-hovering catches the falling title without resetting its position or momentum. Stretch stays within 3.5% and compression within 4.5%; the title returns to its natural shape at rest. The raised destination follows the description's rendered height and leaves a small gap. CSS provides the no-script fallback.

The large description stays fixed at full opacity. A single physical progress value moves both clipping masks, concealing the previous text while revealing the next. The conceal edge leads the reveal edge by 20px, leaving a strip of the yellow page background between the old and new text. Moving right sweeps from left to right, and moving left reverses the sweep. The first pointer entry uses its movement or entry side. Leaving the columns wipes the text away. Interrupted reveals retain their current mask for concealment, and rapid switches discard older outgoing text. Moving within a column does not restart the wipe. Navigation, loss of window focus, and layout changes stop the engine and remove outgoing text. Reduced motion settles the titles and masks immediately. The engine uses fixed 120Hz simulation steps, caps time after a suspended tab, and requests no frames while at rest. Tests exercise the real Matter engine, including retargeting, refresh rates, and cleanup.

Hovering also shows a 4:3 preview of the projects in that service's `cases` list. Its width is 25.2% of the viewport, between 196px and 392px, constrained further to fit the visible area. Its bottom edge stays flush with the visible viewport bottom, with no gap. The box follows only the pointer's horizontal movement with spring inertia. Its target keeps a 32px cursor gap, flipping inward at the side edges or shrinking when needed to fit the viewport below the header. Switching columns preserves the image's position and momentum. Vertical pointer movement does not move or resize it, and resizing immediately clamps it inside the viewport. The native cursor stays visible. Covers switch every 500ms without a fade. Position updates on pointer movement, scrolling, resizing, and visual viewport changes. The preview stays behind the text and never intercepts clicks. Reduced motion uses a still cover and direct positioning. Leaving the columns, switching tabs, or navigating away hides the preview and stops its timer.

At 760px and below, or on touch-first devices, services become stacked sections with permanently visible headings and descriptions. Each section has a native horizontal gallery of its referenced projects with 4:3 images and the next card peeking in to suggest swiping. Galleries do not rotate automatically. The heading opens the service; each image and caption opens its project. Galleries work without JavaScript, retain keyboard access, and load images lazily. Desktop hover previews are disabled in this layout, including on narrow windows with a mouse.

Each service detail page uses its overview hover sentence as the H1, with the short service name as a medium-size label beneath it. Both sentences read the same `service.headline` field and use `.service-headline` for identical typography, hyphenation, width, and side margins. On desktop, the detail heading starts at the same `--service-headline-top` offset as the hover text. Services pages reserve the scrollbar gutter so navigation to a scrollable detail page cannot change the headline's line breaks. Mobile overview descriptions remain in the stacked layout.

Page navigation uses one persistent yellow overlay, controlled by `src/scripts/page-swipe.ts`. It covers from a random edge in 560ms while the next page loads, holds for 90ms, and exits through the opposite edge in 680ms. The controller skips the browser's native snapshot transition and waits for its render pause to end before revealing the new page. This prevents a captured mid-swipe frame from appearing as a second animation. New navigation cancels the previous animation and ignores its late callbacks. Reloads and cached page restoration reset the overlay offscreen. Reduced motion skips both effects, and script replacement leaves only one set of listeners.

The selected navigation item has one shared underline. Its 320ms slide starts as soon as navigation begins, without waiting for the page wipe or the next page to load, including back/forward navigation. It persists across Astro page swaps, stays put within the same section, and hides on pages without a selected menu item. Cancelled navigation restores the current selection. Resizing and font loading update its position; reduced motion skips the slide. Without JavaScript, the selected link keeps a static underline. The moving underline uses the same background contrast sampling as the header letters.

The fixed header samples the background beneath each letter of the logo and navigation links. Each letter independently picks dark or white using relative luminance, accounting for the visible crop of local images. Menu labels use individual grapheme spans with a complete accessible link name; `HeaderWordmark.astro` groups the original SVG outlines into 13 letters without changing their shapes. All navigation links, including Kontakt, share the same typography and have no background. Kontakt opens `/kontakt` and uses the same active-page underline as the other navigation links. When image data cannot be read, that letter retains its previous colour. The script batches updates per animation frame on scrolling, resizing, image loading, and page navigation. Samples estimate contrast rather than certify every image pixel; mixed photographs may not provide sufficient contrast for either colour. No image data leaves the browser. The contrast method follows [W3C's text contrast guidance](https://www.w3.org/WAI/WCAG22/Techniques/general/G18.html).

The services overview at `/leistungen` has no footer, on desktop or mobile. Service detail pages and all other pages use the shared paper-coloured footer with dark text in `SiteFooter.astro`, using the `--paper` and `--ink` tokens. On the homepage it follows the project list and archive link directly, without a separate statement or services teaser. The archive link is a yellow pill across columns 2–3 with the unchanged medium text size, becoming a centered, content-sized button on mobile. The footer height follows its content, without a viewport minimum or a stretching CTA section. Its top inset leaves space below the fixed header; the contact page uses a smaller inset. A full-width loop of seven dark client logos sits directly above the imprint and copyright row. The original logo files stay unchanged; CSS renders them black. The band pauses on hover or via its checkbox and becomes a static wrapping row with reduced motion. Original logo sources are recorded in `docs/client-logos.md`.

The footer headline uses the shared medium text size and spans columns 1–2. A yellow "Kontakt aufnehmen" pill in columns 3–4 sits alongside it in an equally wide column and links to `/kontakt`. It shares its shape, padding, typography, and hover style with the homepage archive button through `.pill-link`. On small screens, the footer text and button fill the content width. The legal label and copyright align to the same grid at the bottom. The legal label remains unlinked until approved text or a destination is supplied. The default headline reads "Verwirrt? Wir erklären Ihnen gerne unsere Website." Service detail pages retain their own headline in the same footer.

The contact page has no visible heading; its accessible heading remains available to screen readers. The existing email, phone, and street address occupy columns 2–3, leaving column 1 empty and using the full content width on small screens. Email and phone retain their `mailto:` and `tel:` links. It has no form or external embed. Its compact footer retains the logos and legal row but omits the contact CTA to avoid linking back to the same page.

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
