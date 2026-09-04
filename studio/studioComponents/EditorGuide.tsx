import {ArrowTopRightIcon} from '@sanity/icons/ArrowTopRight'
import {Box, Card, Flex, Heading, Stack, Text} from '@sanity/ui'
import styled from 'styled-components'

const GUIDE_URL = 'https://github.com/gregoranreiter/studio-schatzi/blob/main/docs/cms-editor-guide.md'
const SITE_URL = 'https://studio-schatzi-site.fragrant-buffer.workers.dev'

const Page = styled.div`
  margin: 0 auto;
  max-width: 880px;
`

const Intro = styled(Card)`
  background: #fffa91;
  color: #090909;
`

const GuideLink = styled.a`
  align-items: center;
  border: 1px solid currentColor;
  color: inherit;
  display: inline-flex;
  gap: 0.45rem;
  padding: 0.7rem 0.9rem;
  text-decoration: none;

  &:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 3px;
  }
`

const areas = [
  ['Startseite', 'Headline, Projektauswahl, Reihenfolge und Platzierung'],
  ['Projekte', 'Copy, Bilder, Galerie-Rhythmus und Verknüpfungen'],
  ['Leistungen', 'Kapitel, Projektbeispiele und eigener Kontaktimpuls'],
  ['Studio', 'Geordnete Text- und Bildblöcke im Vier-Spalten-Raster'],
  ['Kontakt', 'Kontaktdaten und flexible Social Links'],
  ['Kundenlogos', 'Reihenfolge und relative visuelle Größe'],
]

export function EditorGuide() {
  return (
    <Box padding={[4, 5, 6]}>
      <Page>
        <Stack gap={6}>
          <Intro padding={[4, 5, 6]} radius={0} shadow={1}>
            <Stack gap={4}>
              <Text size={1} weight="medium">START & HILFE</Text>
              <Heading as="h1" size={4}>Inhalte pflegen, ohne das Design neu bauen zu müssen.</Heading>
              <Text size={2} style={{lineHeight: 1.5, maxWidth: 650}}>
                Bereich öffnen, Inhalt bearbeiten, die gelbe Komposition prüfen und veröffentlichen. Die sichtbaren Optionen entsprechen den echten Layout-Entscheidungen der Website.
              </Text>
              <Flex gap={3} wrap="wrap">
                <GuideLink href={SITE_URL} target="_blank" rel="noreferrer">
                  Website öffnen <ArrowTopRightIcon />
                </GuideLink>
                <GuideLink href={GUIDE_URL} target="_blank" rel="noreferrer">
                  Vollständige Anleitung <ArrowTopRightIcon />
                </GuideLink>
              </Flex>
            </Stack>
          </Intro>

          <Stack gap={4}>
            <Heading as="h2" size={2}>Der einfache Ablauf</Heading>
            <Flex gap={3} wrap="wrap">
              {['1  Bereich öffnen', '2  Inhalt & Komposition prüfen', '3  Publish'].map((step) => (
                <Card key={step} border padding={4} radius={0} style={{flex: '1 1 210px'}}>
                  <Text size={2} weight="medium">{step}</Text>
                </Card>
              ))}
            </Flex>
            <Card padding={4} radius={0} tone="caution">
              <Text size={1} style={{lineHeight: 1.5}}>
                Aktuell wird die statische Website nach Publish noch manuell neu bereitgestellt. Die automatische Veröffentlichung ist der nächste technische Einrichtungsschritt.
              </Text>
            </Card>
          </Stack>

          <Stack gap={4}>
            <Heading as="h2" size={2}>Inhalte</Heading>
            <Stack gap={2}>
              {areas.map(([title, description]) => (
                <Card key={title} border padding={4} radius={0}>
                  <Flex gap={4} align="flex-start" wrap="wrap">
                    <Box style={{flex: '0 0 130px'}}><Text size={2} weight="medium">{title}</Text></Box>
                    <Box style={{flex: '1 1 280px'}}><Text size={2} muted style={{lineHeight: 1.4}}>{description}</Text></Box>
                  </Flex>
                </Card>
              ))}
            </Stack>
          </Stack>

          <Stack gap={3}>
            <Heading as="h2" size={2}>Vor dem Veröffentlichen</Heading>
            <Text size={2} style={{lineHeight: 1.5}}>
              Bilder brauchen eine Bildbeschreibung. Öffentliche URLs bleiben stabil; Änderungen erhalten zuerst eine Weiterleitung. Neue Projekte erscheinen nur dort, wo sie bewusst ausgewählt oder verknüpft wurden.
            </Text>
          </Stack>
        </Stack>
      </Page>
    </Box>
  )
}
