import {Card, Text} from '@sanity/ui'
import {createImageUrlBuilder} from '@sanity/image-url'
import {useEffect, useMemo, useState} from 'react'
import {useClient} from 'sanity'
import styled from 'styled-components'

export const API_VERSION = '2026-09-04'

export const Canvas = styled(Card)`
  background: #fffa91;
  border-radius: 0;
  color: #090909;
  overflow: hidden;
`

export const CanvasInset = styled.div`
  padding: clamp(16px, 3vw, 32px);
`

export const FourColumnGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: clamp(6px, 1.25vw, 14px);
`

export const CanvasLabel = styled(Text)`
  display: block;
  margin-bottom: 12px;
  opacity: 0.58;
`

export const VisualImage = styled.img`
  background: #ece9df;
  display: block;
  height: 100%;
  object-fit: cover;
  width: 100%;
`

export type SanityImageSource = {
  asset?: {_ref?: string}
  crop?: unknown
  hotspot?: unknown
}

export function useStudioImageUrl(source: SanityImageSource | undefined, width = 900, height?: number) {
  const client = useClient({apiVersion: API_VERSION})
  return useMemo(() => {
    if (!source?.asset?._ref) return undefined
    let image = createImageUrlBuilder(client).image(source).width(width).auto('format')
    if (height) image = image.height(height).fit('crop')
    return image.url()
  }, [client, height, source, width])
}

export type ProjectReference = {
  _id: string
  title?: string
  cover?: SanityImageSource
}

export function useReferencedProjects(referenceIds: Array<string | undefined>) {
  const client = useClient({apiVersion: API_VERSION})
  const ids = useMemo(() => Array.from(new Set(referenceIds.filter(Boolean) as string[])), [referenceIds.join('|')])
  const [projects, setProjects] = useState<Record<string, ProjectReference>>({})

  useEffect(() => {
    if (!ids.length) {
      setProjects({})
      return
    }

    const draftIds = ids.map((id) => `drafts.${id}`)
    let active = true
    client.fetch<ProjectReference[]>(
      '*[_type == "project" && (_id in $ids || _id in $draftIds)]{_id,title,cover}',
      {ids, draftIds},
      {perspective: 'raw'},
    ).then((documents) => {
      if (!active) return
      const next: Record<string, ProjectReference> = {}
      for (const document of documents) {
        const id = document._id.replace(/^drafts\./, '')
        if (!next[id] || document._id.startsWith('drafts.')) next[id] = document
      }
      setProjects(next)
    }).catch(() => {
      if (active) setProjects({})
    })

    return () => {
      active = false
    }
  }, [client, ids.join('|')])

  return projects
}
