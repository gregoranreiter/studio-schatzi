import {createImageUrlBuilder} from '@sanity/image-url'
import type {Project, ResponsiveImage} from './types'

type RawDimensions = {width: number; height: number; aspectRatio?: number}
export type RawImage = {
  asset?: {_type?: 'reference'; _ref?: string}
  dimensions?: RawDimensions
  crop?: {top?: number; bottom?: number; left?: number; right?: number}
  hotspot?: {x?: number; y?: number; height?: number; width?: number}
  alt?: string
  backgroundTone?: string
  layout?: 'wide' | 'half' | 'portrait' | 'full' | 'rightThreeColumns'
}

export type RawProject = {
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

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Sanity content is missing ${field}`)
  }
  return value
}

export function createProjectMapper(projectId: string, dataset: string) {
  const imageBuilder = createImageUrlBuilder({projectId, dataset})

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

  return {responsiveImage, mapProject}
}
