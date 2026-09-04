# CMS and hosting handover

Status date: 4 September 2026

## What is complete

- A separate Sanity project named **Studio Schatzi** exists under the previously requested shared Sanity login. It does not reuse or modify the BauConsult Sanity project.
- Project ID: `cun0jylh`; dataset: `production`; dataset visibility: public read, authenticated write.
- The existing five projects, four services, four singleton pages, 30 project images, and seven client logos have been migrated.
- The Studio schema, visual array editors, and production Studio bundle are implemented in `studio/`.
- The Astro site reads published Sanity content at build time and fails a production build when required content or references are invalid.
- Two static Cloudflare Worker packages are configured: `studio-schatzi-site` and `studio-schatzi-cms`.
- The site and Studio both pass Wrangler dry-run packaging.
- Both packages have been deployed for review to the dedicated Cloudflare account **Studio Schatzi**, originally claimed from a temporary account:
  - Site: `https://studio-schatzi-site.fragrant-buffer.workers.dev`
  - CMS: `https://studio-schatzi-cms.fragrant-buffer.workers.dev`
- The CMS preview origin is registered with Sanity CORS using credential support.
- The former Vercel password middleware has been removed. Prelaunch access belongs at the Cloudflare edge, not in repository code.

Claiming preserved the Workers but did not authenticate Wrangler for later deployments. Future deployments require Wrangler authorization into **Studio Schatzi** on the development computer. The BauConsult Cloudflare account is explicitly out of scope and must not receive Studio Schatzi Workers, settings, policies, hooks, or domains.

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

There is no database or application server. Visitors receive static HTML, CSS, JavaScript, and Sanity CDN images. Publishing content starts a fresh static build; it does not add runtime CMS traffic to the site.

## Editorial model

The Studio intentionally exposes only decisions that exist in the design.

| Area | Maintained content | Guardrails and representation |
| --- | --- | --- |
| Startseite | Headline and selected projects | Maximum six; project thumbnails are shown in the actual full/left/right four-column placement. |
| Projekte | Title, URL slug, summary, description, service list, cover, gallery, related projects, archive order | Service scope is an array; cover and gallery images require alt text; gallery cards show the real wide/half/portrait composition; exactly two related projects. |
| Leistungen | Headline, chapters, project cases, CTA, order | Cases show project photography; each CTA has its statement, visible link label, and email subject. |
| Studio | Headline and an ordered content array | A text block is one restrained Portable Text field; image blocks are either full width or right-aligned across three columns, represented on the four-column canvas. |
| Kontakt | Email, phone, address, social links | Social links are a flexible ordered array of label plus URL; the editor shows the contact composition. |
| Kundenlogos | Logo file, client name, relative width | The list renders actual SVG/PNG/WebP files and their relative scale. |
| Weiterleitungen | Old path, new path, redirect status | Generated into Cloudflare's `_redirects` file during each site build; duplicates, self-links, and invalid paths fail the build. |

Slug fields should be treated as stable after launch. If a project or service URL must change, publish a redirect before or together with the slug change.

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

## Cloudflare account completion

The account is named **Studio Schatzi**. Its unchanged Workers subdomain is `fragrant-buffer.workers.dev`; this technical subdomain is independent of the dashboard account name. These URLs can remain the only public review environments until a domain cutover is wanted. Do not deploy any part of this project into the BauConsult Cloudflare account.

Complete this when working on the development computer:

```sh
nvm use
pnpm exec wrangler login
pnpm exec wrangler whoami
```

The login must show and select the dedicated **Studio Schatzi** account. If Wrangler lists multiple accounts, confirm its account ID before deploying and add that public account ID to both Wrangler configurations. Never select the BauConsult account.

### Authenticated deployment

From the repository root:

```sh
pnpm build
pnpm exec wrangler deploy
pnpm cms:build
pnpm --dir studio exec wrangler deploy
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
| `studio-schatzi-cms` | `pnpm cms:build` | `pnpm --dir studio exec wrangler deploy` |

Use `main` as the production branch. The website build reads the public Sanity dataset and needs no secret environment variables.

Create a site Worker deploy hook named `Sanity publish`. In the Sanity project management console, create an HTTP webhook pointing to that URL and use this filter:

```text
_type in ["homePage", "project", "service", "studioPage", "contactPage", "clientLogoSet", "redirect"] && !(_id in path("drafts.**"))
```

Trigger on create, update, and delete. Draft edits must not rebuild the site; publishing, unpublishing, and deleting published content should.

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
