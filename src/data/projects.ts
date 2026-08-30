export type ProjectImage = { src: string; alt: string; format?: 'wide' | 'half' | 'portrait' };

export type Project = {
  slug: string;
  title: string;
  shortTitle?: string;
  summary: string;
  description: string;
  scope: string;
  cover: string;
  coverAlt: string;
  logo?: { src: string; width: number; height: number };
  cardImage?: { aspectRatio: string; position: string };
  tone: string;
  gallery: ProjectImage[];
  related: string[];
};

export const projects: Project[] = [
  {
    slug: 'auf-der-matte',
    title: 'Auf der Matte',
    logo: { src: '/images/logos/auf-der-matte.svg', width: 414, height: 86 },
    summary: 'Ein flexibler Markenauftritt für einen Ort, an dem Menschen zur Ruhe und wieder in Bewegung kommen.',
    description: 'Aus zwei einfachen Zeichen entsteht eine visuelle Sprache mit vielen Stimmungen. Das System reicht von der Praxis über Kampagnen bis zum digitalen Auftritt und bleibt dabei freundlich, direkt und unverkennbar.',
    scope: 'Positionierung, Corporate Design, Kampagne und Webdesign',
    cover: '/images/projects/auf-der-matte/poster.jpg',
    coverAlt: 'Rotes Auf der Matte Poster in einem ruhigen Interieur',
    tone: '#e84249',
    gallery: [
      { src: '/images/projects/auf-der-matte/cover.jpg', alt: 'Auf der Matte Zeichen vor einem ruhigen Horizont', format: 'wide' },
      { src: '/images/projects/auf-der-matte/cards.jpg', alt: 'Visitenkarten in Rot und Hellblau', format: 'half' },
      { src: '/images/projects/auf-der-matte/bag.jpg', alt: 'Stofftaschen mit dem Auf der Matte Zeichen', format: 'half' },
      { src: '/images/projects/auf-der-matte/posters.jpg', alt: 'Plakate in einem warmen Praxisraum', format: 'wide' },
      { src: '/images/projects/auf-der-matte/campaign.jpg', alt: 'Plakatkampagne im öffentlichen Raum', format: 'wide' },
      { src: '/images/projects/auf-der-matte/web.jpg', alt: 'Webdesign auf Desktop und Mobilgerät', format: 'wide' },
    ],
    related: ['gretzl', 'chrispi-architektur'],
  },
  {
    slug: 'karrer-oehlinger-architekten',
    title: 'Karrer Oehlinger Architekten',
    logo: { src: '/images/logos/karrer-oehlinger.svg', width: 480, height: 125 },
    shortTitle: 'KOA',
    summary: 'Ein präzises Erscheinungsbild, das Architektur als lebendigen Dialog mit Ort, Mensch und Zeit vermittelt.',
    description: 'Das typografische Zeichen ist streng genug für Pläne und Leitsysteme, offen genug für Bilder und Geschichten. Ein roter Akzent führt durch Geschäftsausstattung, Baustelle, Website und Kommunikation.',
    scope: 'Strategie, Corporate Design, Geschäftsausstattung, Webdesign und Social Media',
    cover: '/images/projects/koa/architecture.jpg',
    coverAlt: 'Architekturansichten mit dem typografischen KOA Zeichen',
    // The photograph occupies the top 16:9 area; the source export has a white strip below.
    cardImage: { aspectRatio: '16 / 9', position: 'center top' },
    tone: '#e33436',
    gallery: [
      { src: '/images/projects/koa/stationery.jpg', alt: 'Geschäftsausstattung für Karrer Oehlinger Architekten', format: 'wide' },
      { src: '/images/projects/koa/sign.jpg', alt: 'Architekturschild mit KOA Zeichen', format: 'half' },
      { src: '/images/projects/koa/fence.jpg', alt: 'Großflächige Baustellenkommunikation', format: 'half' },
      { src: '/images/projects/koa/brochure.jpg', alt: 'Broschüre mit architektonischer Typografie', format: 'wide' },
      { src: '/images/projects/koa/car.jpg', alt: 'Fahrzeug mit zurückhaltender Markenbeschriftung', format: 'wide' },
      { src: '/images/projects/koa/web.jpg', alt: 'Webauftritt für Karrer Oehlinger Architekten', format: 'wide' },
      { src: '/images/projects/koa/social.jpg', alt: 'Social-Media-Anwendung der Marke', format: 'half' },
      { src: '/images/projects/koa/clothing.jpg', alt: 'Arbeitskleidung mit KOA Zeichen', format: 'half' },
    ],
    related: ['chrispi-architektur', 'auf-der-matte'],
  },
  {
    slug: 'gretzl',
    title: 'Wirtshaus Gretzl',
    logo: { src: '/images/logos/wirtshaus-gretzl.svg', width: 913, height: 262 },
    summary: 'Eine lebendige Identität für einen gastlichen Ort, der zwischen Alltag, Nachbarschaft und Ereignis wechselt.',
    description: 'Die handschriftliche Wortmarke bleibt bewusst eigenwillig. Rundherum entsteht ein offenes System, das auf Speisekarte, Fassade, Kleidung und Veranstaltungsplakaten immer wieder anders auftreten kann.',
    scope: 'Markenpflege, Grafikdesign, Kampagnen und Ausstattung',
    cover: '/images/projects/gretzl/press.jpg',
    coverAlt: 'Außenansicht des Wirtshauses Gretzl mit Gästen',
    tone: '#287249',
    gallery: [
      { src: '/images/projects/gretzl/menu.jpg', alt: 'Speisekarte mit der Wortmarke von Wirtshaus Gretzl', format: 'half' },
      { src: '/images/projects/gretzl/shirt-1.jpg', alt: 'Weißes Shirt für Wirtshaus Gretzl', format: 'half' },
      { src: '/images/projects/gretzl/beef-baby.jpg', alt: 'Illustriertes Veranstaltungsplakat für Wirtshaus Gretzl', format: 'portrait' },
      { src: '/images/projects/gretzl/sommerfest.jpg', alt: 'Sommerfest-Plakat in kräftigem Rot', format: 'portrait' },
      { src: '/images/projects/gretzl/front-green.jpg', alt: 'Fassade mit grün leuchtender Wortmarke von Wirtshaus Gretzl', format: 'wide' },
      { src: '/images/projects/gretzl/shirt-2.jpg', alt: 'Zweites Shirt-Mockup für Wirtshaus Gretzl', format: 'wide' },
    ],
    related: ['auf-der-matte', 'karrer-oehlinger-architekten'],
  },
  {
    slug: 'chrispi-architektur',
    title: 'Chrispi Architektur',
    logo: { src: '/images/logos/chrispi-architektur.svg', width: 439, height: 343 },
    summary: 'Geometrische Klarheit für ein Architekturbüro, dessen Arbeit aus Ruhe, Präzision und Nähe entsteht.',
    description: 'Das Zeichen reduziert Raum auf wenige Linien. Diese Einfachheit trägt das Erscheinungsbild vom Briefbogen bis zur Website und gibt den Architekturprojekten eine stille, wiedererkennbare Bühne.',
    scope: 'Corporate Design, Geschäftsausstattung, Signaletik und Webdesign',
    cover: '/images/projects/chrispi/web.jpg',
    coverAlt: 'Webauftritt von Chrispi Architektur auf einem Laptop',
    tone: '#efead9',
    gallery: [
      { src: '/images/projects/chrispi/logo.jpg', alt: 'Geometrisches Zeichen von Chrispi Architektur', format: 'wide' },
      { src: '/images/projects/chrispi/cards.jpg', alt: 'Visitenkarten von Chrispi Architektur', format: 'half' },
      { src: '/images/projects/chrispi/stationery.jpg', alt: 'Briefpapier und Geschäftsausstattung', format: 'half' },
      { src: '/images/projects/chrispi/sign.jpg', alt: 'Firmenschild an einer Hausfassade', format: 'wide' },
    ],
    related: ['karrer-oehlinger-architekten', 'gretzl'],
  },
  {
    slug: 'donauwalther',
    title: 'Donauwalther',
    logo: { src: '/images/logos/donauwalther.svg', width: 477, height: 154 },
    summary: 'Eine kleine Produktidee, übersetzt in eine klare grafische Anwendung.',
    description: 'Für das Glas Willi wurde eine reduzierte Gestaltung entwickelt, die als Objekt funktioniert und den Charakter der Marke direkt an den Tisch bringt. Das Projekt ist im Archiv vorläufig dokumentiert.',
    scope: 'Produktgrafik und Ausarbeitung',
    cover: '/images/projects/donauwalther/glass-1-background.jpg',
    coverAlt: 'Grafische Ausarbeitung für das Donauwalther Glas Willi',
    tone: '#f4f0e8',
    gallery: [
      { src: '/images/projects/donauwalther/glass-2.jpg', alt: 'Zweite Ansicht der Glasgestaltung', format: 'wide' },
    ],
    related: ['gretzl', 'auf-der-matte'],
  },
];

export const projectBySlug = (slug: string) => projects.find((project) => project.slug === slug);
