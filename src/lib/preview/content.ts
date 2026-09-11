import {createProjectMapper, type RawImage, type RawProject} from '../content/project'
import type {HomePage, Project} from '../content/types'

export type PreviewDocument = {
  _id: string
  _type: string
  [key: string]: unknown
}

export type PreviewContent = {home: HomePage; projects: Project[]}

export const emptyProject: Project = {
  slug: '', title: '', summary: '', description: '', scope: [],
  cover: {src: 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=', alt: ''},
  tone: '#f2f0eb', gallery: [], related: [],
}

const text = (value: unknown) => typeof value === 'string' ? value : ''
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' ? value as Record<string, unknown> : {}
const array = (value: unknown): unknown[] => Array.isArray(value) ? value : []
export const publishedId = (id: string) => id.replace(/^drafts\./, '')

// Drafts are resolved in the authenticated Studio; the renderer receives this snapshot.
// Overlay the current editor value even before its debounced save reaches Sanity.
export function buildPreviewContent(documents: PreviewDocument[], current: PreviewDocument | null, projectId: string, dataset: string): PreviewContent {
  const byId = new Map<string, PreviewDocument>()
  for (const doc of documents) {
    const id = publishedId(doc._id)
    if (!byId.has(id) || doc._id.startsWith('drafts.')) byId.set(id, doc)
  }
  if (current) byId.set(publishedId(current._id), current)
  const {mapProject, responsiveImage} = createProjectMapper(projectId, dataset)
  const imageSource = (value: unknown): RawImage | undefined => {
    const image = object(value) as RawImage
    const dimensions = image.asset?._ref?.match(/-(\d+)x(\d+)-[^-]+$/)
    if (!dimensions) return undefined
    return {...image, dimensions: {width: Number(dimensions[1]), height: Number(dimensions[2])}}
  }
  const image = (value: unknown) => {
    const source = imageSource(value)
    return source ? responsiveImage({...source, alt: source.alt || 'Bild'}, 'preview') : emptyProject.cover
  }
  const slugOf = (doc: PreviewDocument | undefined) => text(object(doc?.slug).current)
  const refSlug = (value: unknown) => slugOf(byId.get(publishedId(text(object(value)._ref))))
  const projectsById = new Map<string, Project>()
  for (const [id, doc] of byId) {
    if (doc._type !== 'project') continue
    const cover = imageSource(doc.cover)
    const raw: RawProject = {
      slug: slugOf(doc), title: text(doc.title), shortTitle: text(doc.shortTitle),
      summary: text(doc.summary), description: text(doc.description),
      scope: array(doc.scope).map(text), cover,
      gallery: array(doc.gallery).map(imageSource).filter((item): item is RawImage => Boolean(item)),
      related: array(doc.relatedProjects).map(refSlug).filter(Boolean),
    }
    let project: Project
    try {
      // Valid drafts use precisely the same image and content mapping as a build.
      project = mapProject(raw)
    } catch {
      // Incomplete edits (including deliberately cleared fields) must remain visible.
      const mappedCover = image(doc.cover)
      project = {
        ...emptyProject, slug: raw.slug || `draft-${id}`, title: raw.title || '',
        shortTitle: raw.shortTitle, summary: raw.summary || '', description: raw.description || '',
        scope: raw.scope || [], cover: {...mappedCover, alt: text(cover?.alt)},
        cardImage: cover?.crop ? {aspectRatio: `${mappedCover.width} / ${mappedCover.height}`, position: 'center'} : undefined,
        tone: /^#[0-9a-f]{6}$/i.test(text(cover?.backgroundTone)) ? text(cover?.backgroundTone) : emptyProject.tone,
        gallery: array(doc.gallery).map((value) => ({...image(value), alt: text(object(value).alt), format: object(value).layout === 'half' ? 'half' as const : object(value).layout === 'portrait' ? 'portrait' as const : 'wide' as const})),
        related: raw.related || [],
      }
    }
    projectsById.set(id, project)
  }
  const home = byId.get('homePage')
  return {
    home: {
      headline: text(home?.headline),
      projects: array(home?.projects).flatMap((value) => {
        const item = object(value)
        const project = projectsById.get(publishedId(text(object(item.project)._ref)))
        return project ? [{project, placement: item.placement === 'full' ? 'full' as const : item.placement === 'left' ? 'left' as const : 'right' as const}] : []
      }),
    },
    projects: [...projectsById.values()],
  }
}
