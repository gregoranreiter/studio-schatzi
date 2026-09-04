import {createReadStream, existsSync} from 'node:fs'
import {basename, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {getCliClient} from 'sanity/cli'
import {clientLogos} from '../../src/data/client-logos'
import {projects} from '../../src/data/projects'
import {services} from '../../src/data/services'
import {splitProjectScope} from '../../src/lib/project-scope'

const client = getCliClient({apiVersion: '2025-02-19'})
const scriptDirectory = resolve(fileURLToPath(new URL('.', import.meta.url)))
const repositoryRoot = resolve(scriptDirectory, '../..')

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

type AssetReference = {_type: 'reference'; _ref: string}
type SeedDocument = {_id: string; _type: string; [key: string]: unknown}

const uploadedAssets = new Map<string, AssetReference>()

if (!process.argv.includes('--confirm-overwrite')) {
  throw new Error('Bootstrap stopped: pass --confirm-overwrite only when intentionally restoring the repository snapshot over Sanity content.')
}

function localAssetPath(source: string) {
  const path = resolve(repositoryRoot, 'public', source.replace(/^\//, ''))

  if (!existsSync(path)) {
    throw new Error(`Asset not found: ${source}`)
  }

  return path
}

function uploadFilename(source: string) {
  return source.replace(/^\/images\//, '').replaceAll('/', '-')
}

async function uploadAsset(type: 'image' | 'file', source: string): Promise<AssetReference> {
  const cacheKey = `${type}:${source}`
  const cached = uploadedAssets.get(cacheKey)

  if (cached) return cached

  const path = localAssetPath(source)
  const filename = uploadFilename(source) || basename(path)
  process.stdout.write(`Uploading ${source}\n`)

  // Sanity stores assets by content hash, so reruns reuse identical file data.
  const asset = await client.assets.upload(type, createReadStream(path), {filename})
  const reference: AssetReference = {_type: 'reference', _ref: asset._id}
  uploadedAssets.set(cacheKey, reference)
  return reference
}

function reference(documentId: string) {
  return {_type: 'reference', _ref: documentId}
}

function projectId(slug: string) {
  return `project-${slug}`
}

function serviceId(slug: string) {
  return `service-${slug}`
}

function portableText(paragraphs: string[]) {
  return paragraphs.map((text, index) => ({
    _type: 'block',
    _key: `paragraph-${index + 1}`,
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: `span-${index + 1}`, text, marks: []}],
  }))
}

async function migrate() {
  process.stdout.write('Preparing project media…\n')

  const projectDocuments = await Promise.all(projects.map(async (project, index) => {
    const coverAsset = await uploadAsset('image', project.cover)
    const gallery = await Promise.all(project.gallery.map(async (image, imageIndex) => ({
      _type: 'projectImage',
      _key: `gallery-${imageIndex + 1}`,
      asset: await uploadAsset('image', image.src),
      alt: image.alt,
      layout: image.format || 'wide',
    })))

    const visibleHeight = project.coverVisibleHeight
    const crop = visibleHeight
      ? {
          _type: 'sanity.imageCrop',
          top: 0,
          bottom: Math.max(0, 1 - visibleHeight),
          left: 0,
          right: 0,
        }
      : undefined

    return {
      _id: projectId(project.slug),
      _type: 'project',
      title: project.title,
      shortTitle: project.shortTitle,
      slug: {_type: 'slug', current: project.slug},
      summary: project.summary,
      description: project.description,
      scope: splitProjectScope(project.scope),
      cover: {
        _type: 'image',
        asset: coverAsset,
        alt: project.coverAlt,
        backgroundTone: project.tone,
        ...(crop ? {crop} : {}),
      },
      gallery,
      relatedProjects: project.related.map((slug, relatedIndex) => ({
        ...reference(projectId(slug)),
        _key: `related-${relatedIndex + 1}`,
      })),
      archiveOrder: index + 1,
    }
  }))

  process.stdout.write('Preparing customer logos…\n')
  const logos = await Promise.all(clientLogos.map(async (logo, index) => ({
    _type: 'clientLogo',
    _key: `logo-${index + 1}`,
    name: logo.name,
    asset: {
      _type: 'file',
      asset: await uploadAsset('file', logo.src),
    },
    widthScale: logo.widthScale || 1,
  })))

  process.stdout.write('Writing project documents…\n')
  let projectTransaction = client.transaction()
  for (const document of projectDocuments) {
    projectTransaction = projectTransaction.createOrReplace(document)
  }
  await projectTransaction.commit()

  const serviceDocuments: SeedDocument[] = services.map((service, index) => ({
    _id: serviceId(service.slug),
    _type: 'service',
    title: service.title,
    slug: {_type: 'slug', current: service.slug},
    headline: service.headline,
    chapters: service.chapters.map((chapter, chapterIndex) => ({
      _type: 'serviceChapter',
      _key: `chapter-${chapterIndex + 1}`,
      title: chapter.title,
      text: chapter.text,
    })),
    casesIntro: service.casesIntro,
    cases: service.cases.map((item, caseIndex) => ({
      _type: 'serviceCase',
      _key: `case-${caseIndex + 1}`,
      project: reference(projectId(item.project)),
      text: item.text,
    })),
    cta: {
      _type: 'serviceCta',
      statement: service.ctaText,
      linkLabel: service.ctaLink,
      emailSubject: service.ctaSubject,
    },
    displayOrder: index + 1,
  }))

  const singletonDocuments: SeedDocument[] = [
    {
      _id: 'homePage',
      _type: 'homePage',
      headline: 'Wir geben sehr guten Unternehmen eine Form, die sehr gut hängen bleibt.',
      projects: homeLayout.map((item, index) => ({
        _type: 'homeProject',
        _key: `home-project-${index + 1}`,
        project: reference(projectId(item.slug)),
        placement: item.placement,
      })),
    },
    {
      _id: 'studioPage',
      _type: 'studioPage',
      headline: 'Studio Schatzi ist ein unabhängiges Studio für Gestaltung und Strategie in Linz.',
      content: [{
        _type: 'studioRichTextBlock',
        _key: 'studio-text-1',
        body: portableText(studioParagraphs),
      }],
    },
    {
      _id: 'contactPage',
      _type: 'contactPage',
      email: 'post@studioschatzi.at',
      phone: '+43 681 10 65 60 21',
      address: 'Hauptplatz 23,\n4020 Linz',
      socialLinks: [],
    },
    {
      _id: 'clientLogoSet',
      _type: 'clientLogoSet',
      logos,
    },
  ]

  process.stdout.write('Writing services and singleton pages…\n')
  let contentTransaction = client.transaction()
  for (const document of [...serviceDocuments, ...singletonDocuments]) {
    contentTransaction = contentTransaction.createOrReplace(document)
  }
  await contentTransaction.commit()

  const counts = await client.fetch<Record<string, number>>(
    '{"projects": count(*[_type == "project"]), "services": count(*[_type == "service"]), "singletons": count(*[_id in ["homePage", "studioPage", "contactPage", "clientLogoSet"]])}',
  )

  process.stdout.write(`Migration complete: ${counts.projects} projects, ${counts.services} services, ${counts.singletons} singleton pages.\n`)
}

migrate().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
