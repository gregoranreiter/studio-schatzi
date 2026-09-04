import {ProjectsIcon} from '@sanity/icons/Projects'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {GalleryInput} from '../../studioComponents/GalleryInput'

export const project = defineType({
  name: 'project',
  title: 'Projekt',
  type: 'document',
  icon: ProjectsIcon,
  orderings: [{title: 'Archiv', name: 'archive', by: [{field: 'archiveOrder', direction: 'asc'}]}],
  fields: [
    defineField({name: 'title', title: 'Titel', type: 'string', validation: (rule) => rule.required()}),
    defineField({name: 'shortTitle', title: 'Kurztitel', type: 'string', description: 'Nur verwenden, wenn der volle Titel in einer kleinen Vorschau nicht funktioniert.'}),
    defineField({
      name: 'slug',
      title: 'Adresse',
      type: 'slug',
      options: {source: 'title', maxLength: 96},
      description: 'Nach der Veröffentlichung nur gemeinsam mit einer Weiterleitung ändern.',
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'summary', title: 'Kurzbeschreibung', type: 'text', rows: 3, validation: (rule) => rule.required()}),
    defineField({name: 'description', title: 'Projektbeschreibung', type: 'text', rows: 6, validation: (rule) => rule.required()}),
    defineField({
      name: 'scope',
      title: 'Leistungen im Projekt',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      validation: (rule) => rule.required().min(1).unique(),
    }),
    defineField({
      name: 'cover',
      title: 'Titelbild',
      type: 'image',
      options: {hotspot: true},
      fields: [
        defineField({name: 'alt', title: 'Bildbeschreibung', type: 'string', validation: (rule) => rule.required().max(180)}),
        defineField({
          name: 'backgroundTone',
          title: 'Hintergrundfarbe',
          type: 'string',
          description: 'Hexadezimale Farbe, die beim Laden und an Bildrändern sichtbar sein kann.',
          validation: (rule) => rule.required().regex(/^#[0-9a-fA-F]{6}$/, {name: 'Hex-Farbe'}),
        }),
      ],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'gallery',
      title: 'Galerie',
      type: 'array',
      components: {input: GalleryInput},
      of: [defineArrayMember({type: 'projectImage'})],
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: 'relatedProjects',
      title: 'Weiter im Archiv',
      type: 'array',
      of: [defineArrayMember({type: 'reference', to: [{type: 'project'}]})],
      validation: (rule) => rule.required().length(2).unique(),
    }),
    defineField({name: 'archiveOrder', title: 'Position im Archiv', type: 'number', validation: (rule) => rule.required().integer().min(1)}),
  ],
  preview: {
    select: {title: 'title', subtitle: 'scope.0', media: 'cover'},
    prepare({title, subtitle, media}) {
      return {title, subtitle, media}
    },
  },
})
