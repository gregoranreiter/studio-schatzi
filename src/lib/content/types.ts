import type {PortableTextBlock} from '@portabletext/types'

export type ResponsiveImage = {
  src: string
  srcset?: string
  width?: number
  height?: number
  alt: string
}

export type ProjectImage = ResponsiveImage & {
  format?: 'wide' | 'half' | 'portrait'
}

export type Project = {
  slug: string
  title: string
  shortTitle?: string
  summary: string
  description: string
  scope: string[]
  cover: ResponsiveImage
  coverVisibleHeight?: number
  cardImage?: {aspectRatio: string; position: string}
  tone: string
  gallery: ProjectImage[]
  related: string[]
}

export type ServiceChapter = {
  title: string
  text: string
}

export type ServiceCase = {
  project: string
  text: string
}

export type ServiceCta = {
  statement: string
  linkLabel: string
  emailSubject: string
}

export type Service = {
  slug: string
  title: string
  headline: string
  chapters: ServiceChapter[]
  casesIntro: string
  cases: ServiceCase[]
  cta: ServiceCta
}

export type HomePage = {
  headline: string
  projects: Array<{
    project: Project
    placement: 'full' | 'left' | 'right'
  }>
}

export type StudioContentBlock =
  | {
      _type: 'studioRichTextBlock'
      _key: string
      body: PortableTextBlock[]
    }
  | {
      _type: 'studioImageBlock'
      _key: string
      image: ResponsiveImage
      layout: 'full' | 'rightThreeColumns'
    }

export type StudioPage = {
  headline: string
  content: StudioContentBlock[]
}

export type SocialLink = {
  label: string
  url: string
}

export type ContactPage = {
  email: string
  phone: string
  address: string
  socialLinks: SocialLink[]
}

export type ClientLogo = {
  name: string
  src: string
  width?: number
  height?: number
  widthScale: number
}

export type SiteContent = {
  home: HomePage
  projects: Project[]
  services: Service[]
  studio: StudioPage
  contact: ContactPage
  clientLogos: ClientLogo[]
}
