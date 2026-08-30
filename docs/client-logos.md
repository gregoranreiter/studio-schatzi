# Footer logo sources

The footer uses original client marks extracted from the supplied project assets:

- Auf der Matte: page 2, “Logo (Version horizontal)”, from the 2025 branding PDF.
- Karrer Oehlinger Architekten: page 4 from the KOA branding PDF.
- Wirtshaus Gretzl: `Gretzl_Logo (neu).svg`.
- Chrispi Architektur: page 4, “Logo (inkl. Schriftzug)”, from the branding PDF.

Additional marks come from the clients' official websites, retrieved on 2026-08-30:

- [Johannes Kepler Universität Linz](https://www.jku.at/): [horizontal German SVG](https://www.jku.at/fileadmin/marketing/Startseite/JKU-Hauptlogo-de-schwarz-quer.svg).
- [Donauwalther](https://www.donauwalther.at/): [SVG wordmark](https://www.donauwalther.at/cdn/shop/files/dw-logo-01_1000x1000.svg?v=1777445792).
- [SCHÄXPIR Theaterfestival](https://www.schaexpir.at/): [SVG logo](https://www.schaexpir.at/_assets/c2be7d8b2adc9335aeb11fd37055ea2e/Images/logo-schaexpir.svg). This is the working interpretation of the requested “Shakespeare Festival Linz”.

Only the logo artwork is included. Page headings, outer margins, and export metadata are removed. The Chrispi SVG retains the original embedded images and transparency masks from the PDF; the other logos use the original vector paths. The new SVGs have tightly cropped view boxes and black fills. All seven assets have transparent backgrounds and are displayed in black.

The original branding PDFs remain outside the repository.

The marquee uses compact logo items sized from their aspect ratios and a compact gap. Dimensions are reserved before SVG loading, and these small assets load eagerly so the animated strip cannot scroll an unloaded logo into view. Both animation groups repeat the same seven-logo sequence enough times to cover the viewport. Reduced-motion mode shows each logo once in a static, wrapping row.
