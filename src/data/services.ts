export type ServiceChapter = {
  title: string;
  text: string;
};

export type ServiceCase = {
  project: string;
  text: string;
};

export type Service = {
  slug: string;
  title: string;
  overviewTitle: string;
  overviewText: string;
  headline: string;
  intro: string;
  chapters: ServiceChapter[];
  casesIntro: string;
  cases: ServiceCase[];
  ctaText: string;
  ctaLink: string;
  ctaSubject: string;
};

export const services: Service[] = [
  {
    slug: 'positionierung-kommunikation',
    title: 'Positionierung & Kommunikation',
    overviewTitle: 'Aus Aufmerksamkeit wird Nachfrage.',
    overviewText: 'Wir schärfen das Angebot, finden die richtige Geschichte und bauen einen Auftritt, der den nächsten Schritt leicht macht. Das kann eine Website sein, eine Kampagne oder ein ganzes System. Entscheidend ist, dass aus Interesse ein Gespräch wird.',
    headline: 'Damit Menschen schnell verstehen, warum, bitte, genau dieses Angebot so relevant ist.',
    intro: 'Gute Kommunikation beginnt lange vor dem ersten Entwurf. Wir bringen Angebot, Zielgruppe und Haltung auf einen gemeinsamen Punkt und übersetzen ihn in eine Geschichte, die intern Orientierung gibt und außen Interesse auslöst.',
    chapters: [
      {
        title: 'Wer sich wichtig macht, bleibt hängen.',
        text: 'Gemeinsam klären wir, was das Unternehmen besonders macht, für wen das einen Unterschied bedeutet und welche Entscheidung die Kommunikation erleichtern soll. Daraus entsteht kein austauschbarer Claim, sondern eine belastbare Grundlage für Sprache, Gestaltung und die nächsten Maßnahmen.',
      },
      {
        title: 'Eine klare Idee trägt mehr Gewicht als das Gewicht selbst.',
        text: 'Wir denken Botschaft und Anwendung zusammen. So kann dieselbe Positionierung auf einer Website präzise führen, in einer Kampagne Energie entwickeln und im persönlichen Gespräch selbstverständlich klingen. Das Ergebnis ist ein roter Faden, den Teams weiterführen können.',
      },
    ],
    casesIntro: 'Wenn es wichtig klingt, dann ist es wahrscheinlich zu früh darauf zu antworten.',
    cases: [
      { project: 'auf-der-matte', text: 'Die Positionierung verbindet Ruhe und Bewegung zu einer einfachen Idee, die vom Praxisraum bis zur Website verständlich bleibt.' },
      { project: 'gretzl', text: 'Eine eigenwillige, offene Identität macht aus einem Ort eine Haltung und gibt wechselnden Anlässen einen gemeinsamen Absender.' },
    ],
    ctaText: 'Das Angebot ist gut, aber noch nicht klar genug erzählt?',
    ctaLink: 'Positionierung schärfen',
    ctaSubject: 'Positionierung schärfen',
  },
  {
    slug: 'markenentwicklung',
    title: 'Markenentwicklung',
    overviewTitle: 'Eine Marke wird zum verlässlichen Gefühl.',
    overviewText: 'Positionierung, Sprache und Gestaltung werden so eng miteinander verbunden, dass jede Begegnung zusammenpasst. Nicht uniform, aber eindeutig. So entsteht Wiedererkennung, ohne dass die Marke sich ständig erklären muss.',
    headline: 'Ein Erscheinungsbild, das nicht nur gut aussieht, sondern Erscheinungen verursacht.',
    intro: 'Eine Marke ist kein Logo-Paket. Sie ist ein System aus Haltung, Sprache, Typografie, Farbe, Bild und Verhalten. Wir entwickeln diese Teile gemeinsam, damit sie ein erkennbares Ganzes bilden und im Alltag tatsächlich funktionieren.',
    chapters: [
      {
        title: 'Charakter entsteht durch Marke.',
        text: 'Wir suchen nicht nach Dekoration, sondern nach der passenden Form für das, was ein Unternehmen ausmacht. Dabei entsteht eine visuelle Idee mit genug Eigenständigkeit für Wiedererkennung und genug Spielraum für unterschiedliche Medien, Inhalte und Menschen.',
      },
      {
        title: 'Ein gutes System wächst mit, ohne billiger zu werden.',
        text: 'Von der Geschäftsausstattung über Räume und Publikationen bis zu digitalen Anwendungen wird festgelegt, was konstant bleibt und wo Bewegung möglich ist. Die Marke wird dadurch leichter anzuwenden und behält auch bei neuen Aufgaben ihre Haltung.',
      },
    ],
    casesIntro: 'Zwei Marken, die nichts voneinander halten.',
    cases: [
      { project: 'karrer-oehlinger-architekten', text: 'Ein präzises typografisches System schafft Ordnung und lässt zugleich der Architektur, den Orten und ihren Geschichten Raum.' },
      { project: 'chrispi-architektur', text: 'Wenige geometrische Linien werden zur stillen Konstante zwischen Geschäftsausstattung, Signaletik und digitalem Auftritt.' },
    ],
    ctaText: 'Die Substanz ist da. Jetzt braucht sie eine unverwechselbare Form.',
    ctaLink: 'Marke entwickeln',
    ctaSubject: 'Markenentwicklung besprechen',
  },
  {
    slug: 'kampagnen',
    title: 'Kampagnen',
    overviewTitle: 'Ein Anlass bekommt Energie und Reichweite.',
    overviewText: 'Für Kampagnen entwickeln wir die Idee, die Dramaturgie und alle nötigen Anwendungen gemeinsam. Vom ersten Motiv bis zur digitalen Verlängerung bleibt eine klare Haltung spürbar und der Aufwand für das Team beherrschbar.',
    headline: 'Eine starke Idee, die Menschen erreicht und über alle Berührungspunkte berührt.',
    intro: 'Kampagnen müssen in kurzer Zeit viel leisten: Aufmerksamkeit gewinnen, etwas verständlich machen und eine Reaktion auslösen. Wir verdichten den Anlass zu einer Leitidee und entwickeln daraus einen Auftritt, der im richtigen Moment die richtige Wirkung entfaltet.',
    chapters: [
      {
        title: 'Der Anlass gibt den Takt vor, die Kampagne haut drauf.',
        text: 'Bevor Motive entstehen, klären wir Ziel, Publikum, Umfeld und Laufzeit. Daraus entwickelt sich eine Idee, die nicht an einem einzelnen Plakat hängt, sondern als Dramaturgie über verschiedene Situationen und Kanäle hinweg funktioniert.',
      },
      {
        title: 'Reichweite entsteht durch Länge mal Durchmesser.',
        text: 'Ein Kampagnensystem muss sofort erkennbar sein und trotzdem immer wieder neu wirken können. Wir gestalten dafür die zentralen Motive, Sprache und Anwendungen so, dass weitere Inhalte effizient ergänzt werden können, ohne die Idee zu verwässern.',
      },
    ],
    casesIntro: 'Nur wenn eine Leitidee die ganze Kampagne tragen kann, ist sie eine starke Leitidee. Und das macht die Idee zur Kampagne.',
    cases: [
      { project: 'gretzl', text: 'Wechselnde Veranstaltungen bekommen eine jeweils eigene Stimmung und bleiben durch den unverkennbaren Charakter des Hauses verbunden.' },
      { project: 'auf-der-matte', text: 'Das reduzierte Zeichensystem lässt sich vom stillen Praxis-Moment bis zur aufmerksamkeitsstarken Außenwerbung flexibel zuspitzen.' },
    ],
    ctaText: 'Ein Anlass steht bevor und soll mehr werden als eine Reihe von Sujets?',
    ctaLink: 'Kampagne anstoßen',
    ctaSubject: 'Neue Kampagne',
  },
  {
    slug: 'websites',
    title: 'Websites',
    overviewTitle: 'Eine Website macht den Wert des Angebots sichtbar.',
    overviewText: 'Wir ordnen Inhalte, reduzieren Reibung und übersetzen die Marke in eine digitale Erfahrung, die auf jedem Bildschirm selbstverständlich wirkt. Klar in der Führung, schnell im Zugriff und bereit, später mit echten Inhalten zu wachsen.',
    headline: 'Digitale Auftritte müssen keine Orientierung geben, sie müssen Orientierung spürbar machen.',
    intro: 'Eine gute Website verbindet Strategie, Inhalt, Gestaltung und Technik zu einer einfachen Erfahrung. Wir denken vom ersten Besuch bis zur gewünschten Handlung und schaffen eine Struktur, die heute überzeugt und morgen mit neuen Inhalten weiterwachsen kann.',
    chapters: [
      {
        title: 'Wenn Inhalte im Weg stehen.',
        text: 'Wir ordnen Fragen, Erwartungen und Entscheidungen der Besucherinnen und Besucher. Daraus entwickelt sich eine klare Architektur mit verständlicher Führung, einer passenden Dramaturgie und Texten, die nicht mehr erklären als nötig.',
      },
      {
        title: 'Eine Marke muss sich richtig digital anfühlen.',
        text: 'Typografie, Bild, Bewegung und Interaktion werden als Teil des Markenauftritts gedacht. Das Design reagiert auf unterschiedliche Bildschirme, bleibt zugänglich und lässt sich in einem flexiblen Redaktionssystem verlässlich pflegen.',
      },
    ],
    casesIntro: 'Digitale Systeme kommen erst dann ins Spiel, wenn konventionelles Marketing versagt.',
    cases: [
      { project: 'chrispi-architektur', text: 'Eine zurückhaltende Oberfläche gibt Projekten viel Raum und übersetzt die geometrische Markenidee in eine klare digitale Ordnung.' },
      { project: 'karrer-oehlinger-architekten', text: 'Der Webauftritt verbindet Architektur, Haltung und aktuelle Einblicke in einem System, das trotz vielfältiger Inhalte präzise bleibt.' },
    ],
    ctaText: 'Die aktuelle Website zeigt nicht mehr, wie gut das Unternehmen heute ist?',
    ctaLink: 'Website neu denken',
    ctaSubject: 'Neue Website',
  },
];

export const serviceBySlug = (slug: string) => services.find((service) => service.slug === slug);
