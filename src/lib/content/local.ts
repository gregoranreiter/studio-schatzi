import type {PortableTextBlock} from '@portabletext/types'
import {clientLogos as legacyClientLogos} from '../../data/client-logos'
import {projects as legacyProjects} from '../../data/projects'
import {services as legacyServices} from '../../data/services'
import {splitProjectScope} from '../project-scope'
import type {Project, SiteContent} from './types'

const projects: Project[] = legacyProjects.map((project) => ({
  slug: project.slug,
  title: project.title,
  shortTitle: project.shortTitle,
  summary: project.summary,
  description: project.description,
  scope: splitProjectScope(project.scope),
  cover: {
    src: project.cover,
    alt: project.coverAlt,
  },
  coverVisibleHeight: project.coverVisibleHeight,
  cardImage: project.cardImage,
  tone: project.tone,
  gallery: project.gallery.map((image) => ({
    src: image.src,
    alt: image.alt,
    format: image.format,
  })),
  related: project.related,
}))

const projectBySlug = new Map(projects.map((project) => [project.slug, project]))

const homeLayout = [
  {slug: 'auf-der-matte', placement: 'full'},
  {slug: 'karrer-oehlinger-architekten', placement: 'right'},
  {slug: 'gretzl', placement: 'left'},
  {slug: 'chrispi-architektur', placement: 'right'},
] as const

const studioParagraphs = [
  'Raphi arbeitet mit Unternehmen, die etwas Eigenes vorhaben und dafür einen klaren Ausdruck suchen. Am Anfang steht das genaue Hinschauen: Was ist wirklich besonders, was muss sich verändern und was darf bleiben?',
  'Aus dieser Klarheit entsteht Gestaltung, die nicht aufgesetzt wirkt. Eine Marke kann ruhig oder lebendig sein, streng oder spielerisch. Wichtig ist, dass sie eine Haltung trägt und im Alltag funktioniert.',
  'Studio Schatzi begleitet Projekte von der Positionierung über das visuelle System bis zu Kampagne und Webauftritt. Umfang und Team richten sich nach der Aufgabe. Der Austausch bleibt dabei direkt, konzentriert und persönlich.',
]

const studioBody: PortableTextBlock[] = studioParagraphs.map((text, index) => ({
  _type: 'block',
  _key: `paragraph-${index + 1}`,
  style: 'normal',
  markDefs: [],
  children: [{_type: 'span', _key: `span-${index + 1}`, text, marks: []}],
}))

export const localSiteContent: SiteContent = {
  home: {
    headline: 'Wir geben sehr guten Unternehmen eine Form, die sehr gut hängen bleibt.',
    projects: homeLayout.flatMap(({slug, placement}) => {
      const project = projectBySlug.get(slug)
      return project ? [{project, placement}] : []
    }),
  },
  projects,
  services: legacyServices.map((service) => ({
    slug: service.slug,
    title: service.title,
    headline: service.headline,
    chapters: service.chapters,
    casesIntro: service.casesIntro,
    cases: service.cases,
  })),
  studio: {
    headline: 'Studio Schatzi ist ein unabhängiges Studio für Gestaltung und Strategie in Linz.',
    content: [{_type: 'studioRichTextBlock', _key: 'studio-text-1', body: studioBody}],
  },
  contact: {
    email: 'post@studioschatzi.at',
    phone: '+43 681 10 65 60 21',
    address: 'Hauptplatz 23,\n4020 Linz',
    socialLinks: [],
  },
  clientLogos: legacyClientLogos.map((logo) => ({
    name: logo.name,
    src: logo.src,
    width: logo.width,
    height: logo.height,
    widthScale: logo.widthScale || 1,
  })),
}
