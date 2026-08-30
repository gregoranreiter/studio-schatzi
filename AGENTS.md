# Studio Schatzi website

This repository is the development copy of an existing Astro portfolio. Keep its German content, original wordmark, project photography, typography, and pale yellow accents unless the user requests a change.

- Work from this repository root. The original `Studio Schatzi Webauftritt` folder is reference material, not a second development copy.
- Use the pnpm version in `package.json` and Node.js version in `.nvmrc`. Commit `pnpm-lock.yaml` with dependency changes.
- Keep the static Astro architecture. Do not add a CMS, database, UI framework, analytics, or a hosting integration without a task that requires it.
- Project content lives in `src/data/projects.ts`; service content lives in `src/data/services.ts`. Keep slug references and image paths consistent.
- Preserve reduced-motion support and keyboard navigation when changing interactions.
- Run `pnpm build` before handing off code changes. It includes Astro's type checker.
- This repository is public. Do not commit secrets, original client documents, design working files, dependency folders, or build output.
- Read `docs/project-status.md` before launch-related work. Do not invent legal details or treat unapproved project copy as verified fact.
