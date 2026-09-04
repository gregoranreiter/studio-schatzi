# Studio Schatzi CMS editor guide

This guide is for day-to-day editing. The CMS is intentionally restrained: it represents the layouts that exist on the website instead of exposing a general page builder.

- CMS: <https://studio-schatzi-cms.fragrant-buffer.workers.dev>
- Website preview: <https://studio-schatzi-site.fragrant-buffer.workers.dev>

## The editing rhythm

1. Open the relevant area in the left navigation.
2. Edit the content and use the yellow composition above the fields to check order, scale, and placement.
3. Resolve any validation messages, then select **Publish**.

Sanity keeps unpublished work as a draft. **Publish** makes it available to the website build; it does not discard the previous version history.

The website is static. Publishing one of the maintained website documents automatically starts a fresh Cloudflare build. The public review URL normally updates within a few minutes; draft edits do not trigger a build.

## Where content lives

| Area | What it controls |
| --- | --- |
| Startseite | Main headline, selected projects, their order, and full/left/right placement. |
| Projekte | Project copy, URL, services, cover, gallery rhythm, related projects, and archive order. |
| Leistungen | Service headline, chapters, project examples, contact CTA, and navigation order. |
| Studio | Headline and one ordered stream of rich-text and image blocks. |
| Kontakt | Email, phone, address, and an optional ordered list of social links. |
| Kundenlogos | Footer logos, their order, and relative visual width. |
| Technik → Weiterleitungen | Old URLs that must continue to work after a URL change. |

## Startseite

Each entry combines a project reference with one of three placements:

- **Volle Breite** uses all four columns.
- **Links, drei Spalten** uses columns one to three.
- **Rechts, drei Spalten** uses columns two to four.

Drag entries to change their order. A project must already exist and be published before it can appear reliably on the published site. Keep the selection deliberate; the schema allows no more than six projects.

## Projekte

The **Titelbild** is reused across the homepage, archive, related-project cards, and service examples. Set its crop and hotspot with all of those contexts in mind.

Every image requires a **Bildbeschreibung**. Describe what is visible and meaningful, rather than repeating the project title. The description is read aloud when the image cannot be seen.

The gallery offers three compositions:

- **Breit** spans the row.
- **Halb** shares a row with another half-width image.
- **Hochformat** uses the narrower portrait rhythm.

The yellow gallery representation shows the sequence and approximate rhythm. Drag images to reorder them.

Exactly two **Weiter im Archiv** projects are required. A new project is not automatically added to the homepage or a service page; add those references separately when wanted.

Treat the **Adresse** field as permanent after a project has been shared publicly. If it must change, create a redirect from the old path in **Technik → Weiterleitungen** before publishing the new address.

## Leistungen

The **Headline** is used both on the service overview and as the service-page headline. Chapters are kept as deliberate title-and-text pairs rather than free-form sections.

Each project example contains a project reference and a short **Einordnung** written for that particular service. Reordering the entries also reorders them on the page.

The **Kontaktimpuls** is one composed CTA:

- **Einladung** is the visible statement.
- **Linktext** is the button label.
- **E-Mail-Betreff** becomes the subject of the email to the address maintained under Kontakt.

## Studio

The Studio page uses one ordered content array with two block types:

- **Text** is one restrained rich-text field. It supports paragraphs and links, without extra heading styles or decorative formatting.
- **Bild** can be **Volle Breite** or **Rechts, drei Spalten**.

Drag the blocks into the intended reading order. The yellow four-column composition is the main CMS representation; use the live website only as the final browser check.

## Kontakt and social links

Email, phone, and address are required. Social links are optional and flexible: each item has a visible label and a full `https://` URL. Their order in the array is their order on the page.

Changing the contact email also changes the destination used by all service CTAs.

## Kundenlogos

Use SVG when a clean vector logo is available; PNG and WebP are also accepted. **Relative Breite** changes visual scale without modifying the original file. Start at `1` and adjust against the other logos in the yellow representation.

The customer name supplies the accessible description and must identify the organization clearly.

## Weiterleitungen

Use redirects when a published project or service path changes.

- **Von** is the old path and begins with `/`.
- **Nach** is the replacement path or a full HTTPS URL.
- **Status** is normally **301 — Permanent**. Use a temporary status only when the old path is expected to return.

Redirects are validated and written into the static Cloudflare build. Duplicate sources, self-links, and invalid paths stop the build instead of publishing ambiguous routing.

## Safe changes and coordinated changes

Routine copy edits, image crops, alt text, block order, project selection, CTA copy, social links, and logo scale are normal editorial changes.

Coordinate these changes before publishing:

- changing a project or service URL;
- deleting a project referenced by the homepage, a service, or related projects;
- removing required images or related-project references;
- changing the canonical domain or legal links;
- running a migration or disaster-recovery command.

Never run `pnpm cms:bootstrap` as an editing command. It overwrites the stable migrated documents from the repository snapshot and exists only for deliberate disaster recovery.

## If something looks wrong

- A disabled Publish button usually means a required field or referenced item is missing. Follow the validation message beside the field.
- If a published change is visible in Sanity but not on the website, wait a few minutes and reload. If it still has not appeared, ask the technical maintainer to check the Sanity webhook and Cloudflare build history.
- If an image composition feels wrong, adjust its layout, crop, or hotspot rather than preparing a second copy prematurely.
- Use Sanity document history to restore an earlier content version; then publish and rebuild the website.
- For hosting, deploy hooks, DNS, Access, or rollback, use the [CMS and hosting handover](cms-hosting-handover.md).
