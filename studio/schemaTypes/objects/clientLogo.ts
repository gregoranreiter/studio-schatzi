import {ImageIcon} from '@sanity/icons/Image'
import {defineField, defineType} from 'sanity'

export const clientLogo = defineType({
  name: 'clientLogo',
  title: 'Kundenlogo',
  type: 'object',
  icon: ImageIcon,
  fields: [
    defineField({name: 'name', title: 'Kundenname', type: 'string', validation: (rule) => rule.required()}),
    defineField({
      name: 'asset',
      title: 'Logo',
      type: 'file',
      options: {accept: 'image/svg+xml,image/png,image/webp'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'widthScale',
      title: 'Relative Breite',
      type: 'number',
      description: '1 entspricht der normalen Breite.',
      initialValue: 1,
      validation: (rule) => rule.required().min(0.5).max(2.5).precision(2),
    }),
  ],
  preview: {
    select: {title: 'name', subtitle: 'widthScale'},
    prepare({title, subtitle}) {
      return {title: title || 'Kundenname fehlt', subtitle: `Breite × ${subtitle || 1}`}
    },
  },
})
