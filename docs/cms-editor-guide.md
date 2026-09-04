# Studio Schatzi CMS – kurz erklärt

Das CMS ist bewusst reduziert. Nicht, weil die Website basic ist, sondern weil hier nur die Entscheidungen auftauchen, die es im Design wirklich gibt. So bleibt die Pflege einfach, schnell und trotzdem präzise.

- CMS: <https://studio-schatzi-cms.fragrant-buffer.workers.dev>
- Website: <https://studio-schatzi-site.fragrant-buffer.workers.dev>

## So läuft’s

1. Links den richtigen Bereich öffnen.
2. Inhalt bearbeiten und prüfen.
3. Validierungen lösen und **Publish** drücken.

Alles, was noch nicht veröffentlicht ist, bleibt als Entwurf in Sanity. Mit **Publish** wird die Änderung freigegeben und automatisch ein neuer Website-Build gestartet. Die Website ist normalerweise nach wenigen Minuten aktuell. Reines Arbeiten am Entwurf löst keinen Build aus.

## Was wo gepflegt wird

| Bereich | Was du hier steuerst |
| --- | --- |
| Startseite | Headline, Projektauswahl, Reihenfolge und Platzierung. |
| Projekte | Texte, URL, Leistungen, Titelbild, Galerie, verwandte Projekte und Archiv-Reihenfolge. |
| Leistungen | Headline, Kapitel, Projektbeispiele und Reihenfolge. |
| Studio | Headline und ein geordneter Stream aus Text- und Bildblöcken. |
| Kontakt | E-Mail, Telefon, Adresse und Social Links. |
| Kundenlogos | Logos, Reihenfolge und ihre relative visuelle Größe. |
| Technik → Weiterleitungen | Alte URLs, die nach einer Änderung weiter funktionieren sollen. |

## Startseite

Jeder Eintrag verbindet ein Projekt mit einer von drei klaren Platzierungen:

- **Volle Breite** nutzt alle vier Spalten.
- **Links, drei Spalten** nutzt die ersten drei Spalten.
- **Rechts, drei Spalten** nutzt die letzten drei Spalten.

Die Reihenfolge lässt sich direkt verschieben. Die gelbe Darstellung zeigt die echte Komposition – deshalb braucht es für diese Entscheidung keine zusätzliche Vorschau.

Ein Projekt muss zuerst angelegt und veröffentlicht sein, bevor es verlässlich auf der veröffentlichten Website erscheinen kann. Maximal sechs Projekte halten die Startseite fokussiert.

## Projekte

Das **Titelbild** taucht an mehreren Stellen auf: auf der Startseite, im Archiv, bei verwandten Projekten und in den Leistungen. Crop und Hotspot also so setzen, dass das Bild in all diesen Formaten funktioniert.

Jedes Bild braucht eine **Bildbeschreibung**. Beschreibe kurz, was wirklich zu sehen und relevant ist – nicht einfach noch einmal den Projektnamen.

Für die Galerie gibt es drei Formate:

- **Breit** geht über die ganze Zeile.
- **Halb** teilt sich eine Zeile mit einem zweiten Bild.
- **Hochformat** läuft im schmaleren Portrait-Rhythmus.

Die Galerie-Vorschau zeigt Reihenfolge und Rhythmus ziemlich genau. Bilder können direkt verschoben werden.

Unter **Weiter im Archiv** werden genau zwei Projekte ausgewählt. Ein neues Projekt erscheint nicht automatisch auf der Startseite oder bei einer Leistung. Es wird nur dort sichtbar, wo es bewusst ausgewählt oder verknüpft wurde.

Die **Adresse** eines Projekts sollte nach dem Launch stabil bleiben. Falls sie sich ändern muss, zuerst unter **Technik → Weiterleitungen** die alte Adresse weiterleiten und dann die neue veröffentlichen.

## Leistungen

Die **Headline** funktioniert auf der Leistungsübersicht und auf der jeweiligen Detailseite. Die Kapitel bleiben bewusst als klare Titel-und-Text-Paare aufgebaut – kein allgemeiner Pagebuilder, sondern genau die Struktur, die das Design braucht.

Jedes Projektbeispiel besteht aus einem Projekt und einer kurzen **Einordnung** für genau diese Leistung. Die Reihenfolge im CMS ist auch die Reihenfolge auf der Website.

## Studio

Die Studio-Seite ist ein geordneter Stream mit zwei Blocktypen:

- **Text** ist ein zurückhaltendes Rich-Text-Feld für Absätze und Links. Keine zusätzlichen Überschriften oder dekorativen Formatierungen.
- **Bild** kann **Volle Breite** oder **Rechts, drei Spalten** stehen.

Die Blöcke lassen sich frei in die gewünschte Lesereihenfolge bringen. Das Bildformat wird direkt im jeweiligen Block gewählt.

## Kontakt und Social Links

E-Mail, Telefon und Adresse sind fix vorgesehen. Social Links sind bewusst flexibel: Jeder Eintrag hat einen sichtbaren Namen und eine vollständige `https://`-URL. Die Reihenfolge im Array ist die Reihenfolge auf der Website.

## Kundenlogos

Wenn möglich ein sauberes SVG verwenden. PNG und WebP funktionieren ebenfalls.

Mit **Relative Breite** wird nur die optische Größe im Verhältnis zu den anderen Logos verändert. Am besten bei `1` starten und nur ändern, wenn ein Logo sichtbar zu groß oder zu klein wirkt.

Der Kundenname ist auch die zugängliche Bildbeschreibung. Er sollte die Organisation eindeutig benennen.

## Weiterleitungen

Weiterleitungen sind nötig, wenn sich eine bereits veröffentlichte Projekt- oder Leistungsadresse ändert.

- **Von** ist der alte Pfad und beginnt mit `/`.
- **Nach** ist der neue Pfad oder eine vollständige HTTPS-Adresse.
- **Status** ist normalerweise **301 — Permanent**. Temporär nur verwenden, wenn die alte Adresse später wieder zurückkommen soll.

Die Weiterleitungen werden beim Website-Build geprüft. Doppelte Quellen, Selbstverlinkungen oder ungültige Pfade stoppen den Build, bevor etwas Unklares veröffentlicht wird.

## Was du einfach machen kannst

Texte ändern, Bilder croppen, Bildbeschreibungen ergänzen, Blöcke sortieren, Projekte auswählen, Social Links pflegen und Logogrößen feinjustieren: alles ganz normale redaktionelle Arbeit.

Kurz abstimmen sollten wir uns bei:

- neuen oder geänderten URLs;
- dem Löschen verknüpfter Projekte;
- fehlenden Pflichtbildern oder Projektverknüpfungen;
- Änderungen an Domain oder Rechtstexten;
- Migrationen oder Wiederherstellung aus einem alten Datenstand.

`pnpm cms:bootstrap` ist kein normaler CMS-Befehl. Er überschreibt die stabilen Inhalte mit dem ursprünglichen Datenstand und ist nur für einen bewusst geplanten Notfall gedacht.

## Wenn etwas nicht passt

- Ist **Publish** nicht möglich, fehlt meistens ein Pflichtfeld oder eine Verknüpfung. Die Meldung direkt am Feld zeigt, was noch offen ist.
- Ist eine veröffentlichte Änderung noch nicht auf der Website, ein paar Minuten warten und neu laden. Falls sie dann noch fehlt, sollten Sanity-Webhook und Cloudflare-Build geprüft werden.
- Fühlt sich ein Bild im Layout falsch an, zuerst Format, Crop oder Hotspot anpassen – nicht vorschnell eine zweite Datei bauen.
- Eine ältere Fassung lässt sich über die Dokumenthistorie in Sanity wiederherstellen. Danach erneut veröffentlichen.
- Für Hosting, Deploy Hooks, DNS, Access und Rollback gibt es die technische [CMS- und Hosting-Übergabe](cms-hosting-handover.md).
