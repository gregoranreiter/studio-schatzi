import {BlockContentIcon} from '@sanity/icons/BlockContent'
import {CaseIcon} from '@sanity/icons/Case'
import {CogIcon} from '@sanity/icons/Cog'
import {EnvelopeIcon} from '@sanity/icons/Envelope'
import {HomeIcon} from '@sanity/icons/Home'
import {HelpCircleIcon} from '@sanity/icons/HelpCircle'
import {ImagesIcon} from '@sanity/icons/Images'
import {ProjectsIcon} from '@sanity/icons/Projects'
import type {DocumentActionComponent, Template, TemplateResolver} from 'sanity'
import type {StructureBuilder, StructureResolver} from 'sanity/structure'
import {EditorGuide} from './studioComponents/EditorGuide'

const singletonTypes = new Set(['homePage', 'studioPage', 'contactPage', 'clientLogoSet'])

const singletonItem = (
  S: StructureBuilder,
  type: string,
  id: string,
  title: string,
  icon: React.ComponentType,
) => S.listItem()
  .id(id)
  .title(title)
  .icon(icon)
  .child(S.document().schemaType(type).documentId(id).title(title))

export const structure: StructureResolver = (S) => S.list()
  .title('Inhalte')
  .items([
    S.listItem()
      .id('editorGuide')
      .title('Start & Hilfe')
      .icon(HelpCircleIcon)
      .child(S.component().id('editorGuide').title('Start & Hilfe').component(EditorGuide)),
    S.divider(),
    singletonItem(S, 'homePage', 'homePage', 'Startseite', HomeIcon),
    S.divider(),
    S.documentTypeListItem('project').title('Projekte').icon(ProjectsIcon),
    S.documentTypeListItem('service').title('Leistungen').icon(CaseIcon),
    S.divider(),
    singletonItem(S, 'studioPage', 'studioPage', 'Studio', BlockContentIcon),
    singletonItem(S, 'contactPage', 'contactPage', 'Kontakt', EnvelopeIcon),
    singletonItem(S, 'clientLogoSet', 'clientLogoSet', 'Kundenlogos', ImagesIcon),
    S.divider(),
    S.listItem()
      .title('Technik')
      .icon(CogIcon)
      .child(S.documentTypeList('redirect').title('Weiterleitungen')),
  ])

export const singletonActions = (
  previous: DocumentActionComponent[],
  context: {schemaType: string},
) => singletonTypes.has(context.schemaType)
  ? previous.filter((action) => action.action !== 'duplicate' && action.action !== 'delete')
  : previous

export const singletonTemplates: TemplateResolver = (previous: Template[]) => (
  previous.filter((template) => !singletonTypes.has(template.schemaType))
)
