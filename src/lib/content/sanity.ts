import {createClient} from '@sanity/client'
import {createImageUrlBuilder} from '@sanity/image-url'
import type {PortableTextBlock} from '@portabletext/types'
import type {
  ClientLogo,
  ContactPage,
  Project,
  ResponsiveImage,
  Service,
  SiteContent,
  StudioContentBlock,
} from './types'

export const sanityProjectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID || 'cun0jylh'
export const sanityDataset = import.meta.env.PUBLIC_SANITY_DATASET || 'production'

const client = createClient({
  projectId: sanityProjectId,
  dataset: sanityDataset,
  apiVersion: '2025-02-19',
  useCdn: false,
  perspective: 'published',
  requestTagPrefix: 'studio-schatzi',
})

const imageBuilder = createImageUrlBuilder({projectId: sanityProjectId, dataset: sanityDataset})

type RawDimensions = {width: number; height: number; aspectRatio?: number}
type RawImage = {
  asset?: {_type?: 'reference'; _ref?: string}
  dimensions?: RawDimensions
  crop?: {top?: number; bottom?: number; left?: number; right?: number}
  hotspot?: {x?: number; y?: number; height?: number; width?: number}
  alt?: string
  backgroundTone?: string
  layout?: 'wide' | 'half' | 'portrait' | 'full' | 'rightThreeColumns'
}

type RawProject = {
  slug?: string
  title?: string
  shortTitle?: string
  summary?: string
  description?: string
  scope?: string[]
  cover?: RawImage
  gallery?: RawImage[]
  related?: string[]
}

type RawService = {
  slug?: string
  title?: string
  headline?: string
  chapters?: Array<{title?: string; text?: string}>
  casesIntro?: string
  cases?: Array<{project?: string; text?: string}>
}

type RawSiteContent = {
  home?: {
    headline?: string
    projects?: Array<{placement?: 'full' | 'left' | 'right'; projectSlug?: string}>
  }
  projects?: RawProject[]
  services?: RawService[]
  studio?: {
    headline?: string
    content?: Array<{
      _type?: 'studioRichTextBlock' | 'studioImageBlock'
      _key?: string
      body?: PortableTextBlock[]
      image?: RawImage
      alt?: string
      layout?: 'full' | 'rightThreeColumns'
    }>
  }
  contact?: ContactPage
  clientLogos?: Array<Partial<ClientLogo>>
}

const siteContentQuery = `{
  "home": *[_id == "homePage"][0]{
    headline,
    projects[]{placement, "projectSlug": project->slug.current}
  },
  "projects": *[_type == "project"] | order(archiveOrder asc){
    "slug": slug.current,
    title,
    shortTitle,
    summary,
    description,
    scope,
    cover{alt, backgroundTone, asset, crop, hotspot, "dimensions": asset->metadata.dimensions},
    gallery[]{alt, layout, asset, crop, hotspot, "dimensions": asset->metadata.dimensions},
    "related": relatedProjects[]->slug.current
  },
  "services": *[_type == "service"] | order(displayOrder asc){
    "slug": slug.current,
    title,
    headline,
    chapters[]{title, text},
    casesIntro,
    cases[]{text, "project": project->slug.current}
  },
  "studio": *[_id == "studioPage"][0]{
    headline,
    content[]{
      _type,
      _key,
      body,
      alt,
      layout,
      image{asset, crop, hotspot, "dimensions": asset->metadata.dimensions}
    }
  },
  "contact": *[_id == "contactPage"][0]{email, phone, address, socialLinks[]{label, url}},
  "clientLogos": *[_id == "clientLogoSet"][0].logos[]{
    name,
    widthScale,
    "src": asset.asset->url
  }
}`

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Sanity content is missing ${field}`)
  }
  return value
}

function responsiveImage(image: RawImage | undefined, field: string, altOverride?: string): ResponsiveImage {
  if (!image?.asset?._ref || !image.dimensions) {
    throw new Error(`Sanity content is missing ${field}`)
  }

  const crop = image.crop || {}
  const width = Math.round(image.dimensions.width * (1 - (crop.left || 0) - (crop.right || 0)))
  const height = Math.round(image.dimensions.height * (1 - (crop.top || 0) - (crop.bottom || 0)))
  const candidateWidths = [480, 720, 960, 1280, 1600, 2200]
  const widths = [...new Set([...candidateWidths.filter((candidate) => candidate < width), width])]
  const url = (targetWidth: number) => imageBuilder
    .image(image)
    .width(targetWidth)
    .quality(86)
    .auto('format')
    .url()

  return {
    src: url(Math.min(width, 1600)),
    srcset: widths.map((targetWidth) => `${url(targetWidth)} ${targetWidth}w`).join(', '),
    width,
    height,
    alt: requiredString(altOverride ?? image.alt, `${field}.alt`),
  }
}

function mapProject(project: RawProject): Project {
  const slug = requiredString(project.slug, 'project.slug')
  const cover = responsiveImage(project.cover, `project.${slug}.cover`)

  if (!Array.isArray(project.scope) || project.scope.length === 0) {
    throw new Error(`Sanity content is missing project.${slug}.scope`)
  }

  if (!Array.isArray(project.gallery) || project.gallery.length === 0) {
    throw new Error(`Sanity content is missing project.${slug}.gallery`)
  }

  return {
    slug,
    title: requiredString(project.title, `project.${slug}.title`),
    shortTitle: project.shortTitle || undefined,
    summary: requiredString(project.summary, `project.${slug}.summary`),
    description: requiredString(project.description, `project.${slug}.description`),
    scope: project.scope.map((item, index) => requiredString(item, `project.${slug}.scope.${index}`)),
    cover,
    cardImage: project.cover?.crop
      ? {aspectRatio: `${cover.width} / ${cover.height}`, position: 'center'}
      : undefined,
    tone: requiredString(project.cover?.backgroundTone, `project.${slug}.cover.backgroundTone`),
    gallery: project.gallery.map((image, index) => ({
      ...responsiveImage(image, `project.${slug}.gallery.${index}`),
      format: image.layout === 'half' || image.layout === 'portrait' ? image.layout : 'wide',
    })),
    related: (project.related || []).map((item, index) => requiredString(item, `project.${slug}.related.${index}`)),
  }
}

function mapService(service: RawService): Service {
  const slug = requiredString(service.slug, 'service.slug')

  if (!Array.isArray(service.chapters) || service.chapters.length === 0) {
    throw new Error(`Sanity content is missing service.${slug}.chapters`)
  }
  if (!Array.isArray(service.cases) || service.cases.length === 0) {
    throw new Error(`Sanity content is missing service.${slug}.cases`)
  }

  return {
    slug,
    title: requiredString(service.title, `service.${slug}.title`),
    headline: requiredString(service.headline, `service.${slug}.headline`),
    chapters: service.chapters.map((chapter, index) => ({
      title: requiredString(chapter.title, `service.${slug}.chapters.${index}.title`),
      text: requiredString(chapter.text, `service.${slug}.chapters.${index}.text`),
    })),
    casesIntro: requiredString(service.casesIntro, `service.${slug}.casesIntro`),
    cases: service.cases.map((item, index) => ({
      project: requiredString(item.project, `service.${slug}.cases.${index}.project`),
      text: requiredString(item.text, `service.${slug}.cases.${index}.text`),
    })),
  }
}

function assertUniqueSlugs(items: Array<{slug: string}>, type: string) {
  const slugs = new Set<string>()
  for (const item of items) {
    if (slugs.has(item.slug)) throw new Error(`Sanity contains a duplicate ${type} slug: ${item.slug}`)
    slugs.add(item.slug)
  }
}

export async function fetchSanityContent(): Promise<SiteContent> {
  const raw = await client.fetch<RawSiteContent>(siteContentQuery, {}, {tag: 'site-content'})

  if (!Array.isArray(raw.projects) || raw.projects.length === 0) throw new Error('Sanity contains no published projects')
  if (!Array.isArray(raw.services) || raw.services.length === 0) throw new Error('Sanity contains no published services')

  const projects = raw.projects.map(mapProject)
  const services = raw.services.map(mapService)
  assertUniqueSlugs(projects, 'project')
  assertUniqueSlugs(services, 'service')

  const projectBySlug = new Map(projects.map((project) => [project.slug, project]))
  const homeProjects = raw.home?.projects?.map((item, index) => {
    const projectSlug = requiredString(item.projectSlug, `home.projects.${index}.project`)
    const project = projectBySlug.get(projectSlug)
    if (!project) throw new Error(`The home page references an unpublished project: ${projectSlug}`)
    if (!item.placement) throw new Error(`Sanity content is missing home.projects.${index}.placement`)
    return {project, placement: item.placement}
  }) || []

  const studioContent: StudioContentBlock[] = (raw.studio?.content || []).map((block, index) => {
    const key = requiredString(block._key, `studio.content.${index}._key`)
    if (block._type === 'studioRichTextBlock') {
      if (!Array.isArray(block.body) || block.body.length === 0) {
        throw new Error(`Sanity content is missing studio.content.${index}.body`)
      }
      return {_type: 'studioRichTextBlock', _key: key, body: block.body}
    }
    if (block._type === 'studioImageBlock') {
      return {
        _type: 'studioImageBlock',
        _key: key,
        image: responsiveImage(block.image, `studio.content.${index}.image`, block.alt),
        layout: block.layout || 'rightThreeColumns',
      }
    }
    throw new Error(`Unsupported Studio block at studio.content.${index}`)
  })

  const contact = raw.contact
  if (!contact) throw new Error('Sanity content is missing contactPage')

  const clientLogos: ClientLogo[] = (raw.clientLogos || []).map((logo, index) => ({
    name: requiredString(logo.name, `clientLogos.${index}.name`),
    src: requiredString(logo.src, `clientLogos.${index}.src`),
    widthScale: typeof logo.widthScale === 'number' ? logo.widthScale : 1,
  }))

  const content: SiteContent = {
    home: {
      headline: requiredString(raw.home?.headline, 'home.headline'),
      projects: homeProjects,
    },
    projects,
    services,
    studio: {
      headline: requiredString(raw.studio?.headline, 'studio.headline'),
      content: studioContent,
    },
    contact: {
      email: requiredString(contact.email, 'contact.email'),
      phone: requiredString(contact.phone, 'contact.phone'),
      address: requiredString(contact.address, 'contact.address'),
      socialLinks: Array.isArray(contact.socialLinks)
        ? contact.socialLinks.map((link, index) => ({
            label: requiredString(link.label, `contact.socialLinks.${index}.label`),
            url: requiredString(link.url, `contact.socialLinks.${index}.url`),
          }))
        : [],
    },
    clientLogos,
  }

  for (const service of services) {
    for (const item of service.cases) {
      if (!projectBySlug.has(item.project)) {
        throw new Error(`Service ${service.slug} references an unpublished project: ${item.project}`)
      }
    }
  }

  return content
}
