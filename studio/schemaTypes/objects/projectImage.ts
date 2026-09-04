import {ImageIcon} from '@sanity/icons/Image'
import {defineField, defineType} from 'sanity'
import {GalleryLayoutInput} from '../../studioComponents/GalleryLayoutInput'

export const projectImage = defineType({
  name: 'projectImage',
  title: 'Projektbild',
  type: 'image',
  icon: ImageIcon,
  options: {hotspot: true},
  fields: [
    defineField({
      name: 'alt',
      title: 'Bildbeschreibung',
      type: 'string',
      description: 'Beschreibt den Bildinhalt knapp für Screenreader.',
      validation: (rule) => rule.required().max(180),
    }),
    defineField({
      name: 'layout',
      title: 'Format im Raster',
      type: 'string',
      initialValue: 'wide',
      options: {
        list: [
          {title: 'Breit', value: 'wide'},
          {title: 'Halb', value: 'half'},
          {title: 'Hochformat', value: 'portrait'},
        ],
      },
      components: {input: GalleryLayoutInput},
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {title: 'alt', subtitle: 'layout', media: 'asset'},
    prepare({title, subtitle, media}) {
      const labels: Record<string, string> = {wide: 'Breit', half: 'Halb', portrait: 'Hochformat'}
      return {title: title || 'Bildbeschreibung fehlt', subtitle: labels[subtitle] || 'Format wählen', media}
    },
  },
})
