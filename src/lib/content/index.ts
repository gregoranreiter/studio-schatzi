import {localSiteContent} from './local'
import {fetchSanityContent} from './sanity'
import type {SiteContent} from './types'

export type * from './types'

let contentPromise: Promise<SiteContent> | undefined

export function getSiteContent(): Promise<SiteContent> {
  if (contentPromise) return contentPromise

  if (import.meta.env.CONTENT_SOURCE === 'local') {
    contentPromise = Promise.resolve(localSiteContent)
    return contentPromise
  }

  contentPromise = fetchSanityContent().catch((error: unknown) => {
    if (import.meta.env.DEV) {
      console.warn('Sanity could not be reached; using the local migration snapshot for this development session.', error)
      return localSiteContent
    }
    throw error
  })

  return contentPromise
}
