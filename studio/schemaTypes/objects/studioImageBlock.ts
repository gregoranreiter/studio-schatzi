import {ImageIcon} from '@sanity/icons/Image'
import {defineField, defineType} from 'sanity'
import {StudioImageLayoutInput} from '../../studioComponents/StudioImageLayoutInput'

export const studioImageBlock = defineType({
  name: 'studioImageBlock',
  title: 'Bild',
  type: 'object',
  icon: ImageIcon,
  fields: [
    defineField({
      name: 'image',
      title: 'Bild',
      type: 'image',
      options: {hotspot: true},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'alt',
      title: 'Bildbeschreibung',
      type: 'string',
      validation: (rule) => rule.required().max(180),
    }),
    defineField({
      name: 'layout',
      title: 'Platzierung',
      type: 'string',
      initialValue: 'rightThreeColumns',
      options: {
        list: [
          {title: 'Volle Breite', value: 'full'},
          {title: 'Rechts, drei Spalten', value: 'rightThreeColumns'},
        ],
      },
      components: {input: StudioImageLayoutInput},
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {title: 'alt', subtitle: 'layout', media: 'image'},
    prepare({title, subtitle, media}) {
      return {
        title: title || 'Bildbeschreibung fehlt',
        subtitle: subtitle === 'full' ? 'Volle Breite' : 'Rechts, drei Spalten',
        media,
      }
    },
  },
})
