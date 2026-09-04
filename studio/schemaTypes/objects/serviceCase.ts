import {CaseIcon} from '@sanity/icons/Case'
import {defineField, defineType} from 'sanity'

export const serviceCase = defineType({
  name: 'serviceCase',
  title: 'Projektbeispiel',
  type: 'object',
  icon: CaseIcon,
  fields: [
    defineField({
      name: 'project',
      title: 'Projekt',
      type: 'reference',
      to: [{type: 'project'}],
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'text', title: 'Einordnung', type: 'text', rows: 4, validation: (rule) => rule.required()}),
  ],
  preview: {
    select: {title: 'project.title', subtitle: 'text', media: 'project.cover'},
    prepare({title, subtitle, media}) {
      return {title: title || 'Projekt auswählen', subtitle, media}
    },
  },
})
