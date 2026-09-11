# CMS and hosting handover

Status date: 11 September 2026

Editors should start with the [CMS editor guide](cms-editor-guide.md). This document covers technical operation, hosting, and recovery.

## What is complete

- A separate Sanity project named **Studio Schatzi** exists under the previously requested shared Sanity login. It does not reuse or modify the BauConsult Sanity project.
- Project ID: `cun0jylh`; dataset: `production`; dataset visibility: public read, authenticated write.
- The existing five projects, four services, four singleton pages, 30 project images, and seven client logos have been migrated.
- The Studio schema, visual array editors, and production Studio bundle are implemented in `studio/`.
- The Astro site reads published Sanity content at build time and fails a production build when required content or references are invalid.
- Two Cloudflare Worker packages are configured: `studio-schatzi-site` and `studio-schatzi-cms`.
- The site and Studio both pass Wrangler dry-run packaging.
- Both packages have been deployed for review to the dedicated Cloudflare account **Studio Schatzi**, originally claimed from a temporary account:
  - Site: `https://studio-schatzi-site.fragrant-buffer.workers.dev`
  - CMS: `https://studio-schatzi-cms.fragrant-buffer.workers.dev`
- The CMS preview origin is registered with Sanity CORS using credential support.
- Wrangler is authorized through the remote-device flow, and both configurations are pinned to the Studio Schatzi account ID `40eb2bae1ed3bb7a25b98ea43804a113`.
- The editor guide and the Studio's built-in **Start & Hilfe** screen are deployed.
- GitHub repository `gregoranreiter/studio-schatzi` is connected to both Workers through Workers Builds. Production and preview triggers use the shared repository root and build cache.
- Production builds for both Workers have completed successfully through the Git connection.
- The site deploy hook **Sanity production publish** and Sanity webhook **Cloudflare: Website neu bauen** are active. A deploy-hook build completed successfully end to end.
- The former Vercel password middleware has been removed. Prelaunch access belongs at the Cloudflare edge, not in repository code.

The BauConsult Cloudflare account is explicitly out of scope and must not receive Studio Schatzi Workers, settings, policies, hooks, or domains.

## Architecture

```text
Sanity Studio (authenticated editors)
            │ publish
            ▼
Sanity production dataset ── webhook ──► Cloudflare deploy hook
            │                                  │
            │ public read during build         ▼
            └──────────────────────────► Astro static build
                                               │
                                               ▼
                                  studio-schatzi-site Worker

Repository change ──► Cloudflare Workers Builds ──► site and/or Studio Worker
```

There is no database. Public website visitors receive static HTML, CSS, JavaScript, and Sanity CDN images; only the CMS preview routes use the Worker renderer. Publishing content starts a fresh static build; it does not add runtime CMS traffic to the site.

## Editorial model

### Website preview implementation (11 September 2026)

Homepage and project document layouts now place the complete editor next to an iframe. The iframe is unmounted below 800px of document-pane width or 1000px of browser width, so mobile CMS sessions load no preview and open no preview content subscriptions.

The public website routes and CMS remain static. Only `/cms-preview/home/` and `/cms-preview/project/` render on demand through the Cloudflare Astro adapter. Each draft update posts a bounded, validated content snapshot and renders the same `HomePageView.astro` or `ProjectPageView.astro` as the public routes, including their layout, CSS and scripts. The iframe preserves scrolling but blocks links, menu controls, forms, keyboard activation and popups. Its document is selected exclusively by the CMS editor.

The authenticated Studio reads homepage/project documents, resolves referenced drafts and overlays the current editor value. Draft content is passed only to the configured iframe origin after a source/origin/session-checked handshake, then submitted to the same-origin renderer. No Sanity token is sent. Requests are not stored, response caching is disabled and previews are marked noindex. There is no server-side Sanity draft query, session store or database. The site allows framing only by the specified Studio Schatzi CMS origins; changing a CMS domain requires updating the CSP and `src/lib/preview/protocol.ts`.

Maintenance: change page markup only in the shared page views and their components, and image/content mapping in `src/lib/content/project.ts`. Keep preview-specific code limited to draft transport, document selection and interaction locking. Run `pnpm test`, `pnpm build`, `pnpm cms:build`, then `pnpm test:preview`. CI runs this parity check automatically against the built local Worker; it needs published Sanity content but no token. For an already-running dev server, use `PREVIEW_TEST_URL=http://127.0.0.1:4321 pnpm test`. The integration check compares homepage and project main HTML against the public routes, so a separate preview layout cannot silently diverge. CMS-only incomplete drafts intentionally have empty-field/image fallbacks. Site images must keep `crossorigin="anonymous"` so adaptive navigation can sample CDN image pixels. The following website origins were added to Sanity CORS **without credentials** on 11 September 2026: `http://127.0.0.1:4321`, `http://localhost:4321`, `https://studio-schatzi-site.fragrant-buffer.workers.dev`, and `https://www.studioschatzi.at`. New website preview domains also need an exact, credential-free CORS entry.

Run both `pnpm dev` and `pnpm cms:dev` locally. `SANITY_STUDIO_PREVIEW_URL` can override the site origin; defaults are `http://127.0.0.1:4321` locally and the existing site Worker when hosted. Deploy the website before the CMS. The `/cms-preview/*` routes must keep `assets.run_worker_first` enabled so Cloudflare forwards GET and POST requests to the renderer instead of its static 404 handler. CMS deploys explicitly select `studio/wrangler.jsonc` to avoid inheriting the website adapter’s generated deployment configuration. Public assets now build to `dist/client`; the adapter generates the Worker/configuration under `dist/server` and Wrangler follows its generated deployment configuration. The preview consumes Worker requests; it requires neither a paid Sanity feature nor an additional Sanity API token.

## Local operation

Use the versions in `.nvmrc` and `package.json`.

```sh
nvm use
pnpm install --frozen-lockfile
pnpm dev
pnpm cms:dev
```

Useful checks:

```sh
pnpm check
pnpm test
pnpm build
pnpm cms:build
```

The public Sanity project ID and dataset are committed configuration because both appear in client-side CDN requests and the Studio bundle. No write token is required or stored in the repository.

`CONTENT_SOURCE=local` is an explicit emergency/development fallback. It uses the original migration snapshot in `src/data/`; do not set it in production because it bypasses current CMS content.

`pnpm cms:bootstrap` overwrites stable Sanity document IDs from that repository snapshot. It exists for disaster recovery and should not be run as a normal content command after editorial work begins.

## Cloudflare account boundary

The account is named **Studio Schatzi**. Its unchanged Workers subdomain is `fragrant-buffer.workers.dev`; this technical subdomain is independent of the dashboard account name. These URLs can remain the only public review environments until a domain cutover is wanted. Do not deploy any part of this project into the BauConsult Cloudflare account.

Verify the active identity when setting up a new development computer:

```sh
nvm use
pnpm exec wrangler login
pnpm exec wrangler whoami
```

The login must show the dedicated **Studio Schatzi** account. Both Wrangler configurations already contain its public account ID, so deploy commands cannot fall back to another account. Never change that ID to the BauConsult account.

### Authenticated deployment

From the repository root:

```sh
pnpm build
pnpm exec wrangler deploy
pnpm cms:build
pnpm --dir studio exec wrangler deploy --config wrangler.jsonc
```

Expected Worker names are fixed by the two `wrangler.jsonc` files:

- Site: `studio-schatzi-site`
- CMS: `studio-schatzi-cms`

After the CMS has a `workers.dev` address, register its exact origin with Sanity:

```sh
pnpm --dir studio exec sanity cors add https://studio-schatzi-cms.<account-subdomain>.workers.dev --credentials
```

When `cms.studioschatzi.at` is connected, add that exact HTTPS origin as well. Never use a wildcard CORS origin.

### Workers Builds

Connect the same Git repository to two separate Workers Builds projects. Keep the repository root as the root directory for both so the shared pnpm lockfile is used.

| Worker | Build command | Deploy command |
| --- | --- | --- |
| `studio-schatzi-site` | `pnpm build` | `pnpm exec wrangler deploy` |
| `studio-schatzi-cms` | `pnpm cms:build` | `pnpm --dir studio exec wrangler deploy --config wrangler.jsonc` |

Use `main` as the production branch. Non-production branches use the corresponding `wrangler versions upload` command and do not replace production. The website build reads the public Sanity dataset and needs no secret environment variables. These triggers are configured and verified; future pushes to GitHub start both builds.

The site Worker deploy hook is named **Sanity production publish**. The Sanity HTTP webhook is named **Cloudflare: Website neu bauen** and uses this filter:

```text
_type in ["homePage", "project", "service", "studioPage", "contactPage", "clientLogoSet", "redirect"]
```

It triggers on create, update, and delete in the `production` dataset. Draft and release-version events are disabled, so publishing, unpublishing, and deleting published content rebuild the site while routine draft editing does not. The deploy-hook URL is a credential stored only in Cloudflare and Sanity; never copy it into this repository or ordinary documentation.

### Prelaunch access

In the site Worker's **Access** tab, protect **all traffic** with a Studio Schatzi-specific Cloudflare Access policy. Allow only the owner's confirmed email identity. Do not reuse or modify a BauConsult policy. This protects the Worker, its previews, and every route before the static assets are served.

The Sanity Studio already requires a Sanity login. Cloudflare Access may also protect the CMS Worker if a second perimeter is desired, but that creates two sign-in steps.

At public launch, change the site Access application from all traffic to previews only, or remove it from production while retaining preview protection. Do not replace Access with Basic Auth credentials in code.

## Domain and DNS cutover

The domain is not currently using Cloudflare DNS. On 4 September 2026 its public records were:

| Name | Type | Value |
| --- | --- | --- |
| `studioschatzi.at` | A | `81.19.159.85` |
| `www.studioschatzi.at` | A | `81.19.159.85` |
| `studioschatzi.at` | MX | priority 10, `mail.studioschatzi.at` |
| `mail.studioschatzi.at` | A | `81.19.149.91` |
| `studioschatzi.at` | TXT | `v=spf1 mx include:spf.w4ymail.at -all` |
| `_dmarc.studioschatzi.at` | TXT | `v=DMARC1;p=none;` |
| `studioschatzi.at` | NS | `ns1.world4you.at`, `ns2.world4you.at` |

No `cms` record or CAA record was returned. This is a point-in-time inventory, not authority to change mail or registrar settings.

Cut over in this order:

1. Add `studioschatzi.at` as a zone in the dedicated **Studio Schatzi** Cloudflare account.
2. Compare Cloudflare's DNS scan with the World4You control panel. Recreate every mail, SPF, DKIM, DMARC, verification, and other non-web record exactly. Keep mail-related hosts DNS-only.
3. Deploy and verify both Workers on their `workers.dev` URLs while the old site remains untouched.
4. Change the registrar nameservers only after the DNS inventory is complete. This is a deliberate owner-approved action because missing records can interrupt email.
5. Add `www.studioschatzi.at` as the site's Worker custom domain and `cms.studioschatzi.at` as the CMS custom domain.
6. Create a permanent Cloudflare redirect from the apex hostname to `https://www.studioschatzi.at`, preserving path and query string. The canonical site URL is already `www`.
7. Add `https://cms.studioschatzi.at` to Sanity CORS with credentials.
8. Verify email delivery, the site, CMS login/publish, redirect generation, and the Sanity-to-Cloudflare deploy hook.
9. Remove prelaunch Access from the production site only after content, legal pages, and image rights are approved.
10. Keep the existing World4You web hosting available until the launch has been stable long enough for a safe rollback.

## Verification and rollback

Before launch, check desktop and mobile navigation, keyboard focus, reduced motion, all project/service pages, a test social link, a test redirect, and one real publish-to-deploy cycle.

The site Worker is immutable per deployment and can be rolled back in Cloudflare. DNS can also be pointed back to `81.19.159.85` while the old host remains intact. A content-only rollback can use Sanity document history followed by another publish/build.

The remaining non-technical blockers are listed in `docs/project-status.md`, especially legal pages, copy approval, image rights, and the provisional Donauwalther case.
