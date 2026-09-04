# Project status

## Existing website

The imported design uses large Helvetica typography, white backgrounds, pale yellow navigation accents, and animated page transitions. This setup preserves that direction and the existing German copy.

The portfolio contains Auf der Matte, Karrer Oehlinger Architekten, Gretzl, Chrispi Architektur, and Donauwalther. Service pages cover Positionierung & Kommunikation, Markenentwicklung, Kampagnen, and Websites. The studio page links to email contact, and the footer includes a phone link.

The code now lives at the root of the Git repository. The original website and design documents remain unchanged in the source folder. Continue development in the repository to avoid keeping two competing copies.

## CMS and hosting status

The site now has a purpose-built Sanity Studio and a populated, separate Sanity production dataset. Astro reads that content during static builds. The repository contains isolated Cloudflare Worker configurations for the public site and CMS. Both pass local packaging checks and are live for review at `fragrant-buffer.workers.dev` URLs in a claimed, dedicated Studio Schatzi Cloudflare account. Wrangler is authorized, both configurations are pinned to that account, and the editor onboarding is deployed. GitHub production and preview builds are configured for both Workers, and a verified Sanity webhook automatically rebuilds the site after published content changes. The BauConsult Cloudflare account is out of scope and must remain untouched.

The domain still uses World4You nameservers and web hosting. Moving it to Cloudflare requires a verified DNS and mail-record migration, not only an A-record change. See [CMS and hosting handover](cms-hosting-handover.md) for the exact architecture, completed work, deployment, Access, webhook, DNS, and rollback procedure.

## Before public launch

- Have the studio approve the homepage, service copy, project descriptions, and credited scope of work. Importing the text does not verify its claims.
- Confirm that every selected client image may appear publicly. Review the provisional Donauwalther case study.
- Confirm the displayed email, phone number, studio description, and canonical domain.
- Supply and approve the legal notice and privacy text, then add their pages and navigation links. They are not present in the supplied site. The footer's “Imprint & Privacy” label is currently plain text, awaiting an approved destination.
- Decide whether the temporary public site review URL should be protected with a Studio Schatzi-specific Cloudflare Access policy. The CMS already requires Sanity authentication; adding Access there would create a second sign-in step.
- Inventory all World4You DNS records before changing nameservers; preserve MX, mail host, SPF, DKIM, DMARC, and verification records.
- Connect `www.studioschatzi.at` to the site Worker, redirect the apex to `www`, and connect `cms.studioschatzi.at` to the CMS Worker.
- After the domain is confirmed, add the production sitemap and robots policy.
- Review the site in desktop and mobile browsers, including keyboard navigation, page transitions, and reduced-motion settings.

No analytics service or contact-form backend is present. No production DNS record has been changed.
