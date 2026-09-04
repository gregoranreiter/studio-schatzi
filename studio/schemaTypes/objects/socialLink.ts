import {LinkIcon} from '@sanity/icons/Link'
import {defineField, defineType} from 'sanity'

export const socialLink = defineType({
  name: 'socialLink',
  title: 'Social Link',
  type: 'object',
  icon: LinkIcon,
  fields: [
    defineField({name: 'label', title: 'Bezeichnung', type: 'string', validation: (rule) => rule.required().max(60)}),
    defineField({
      name: 'url',
      title: 'Adresse',
      type: 'url',
      validation: (rule) => rule.required().uri({scheme: ['https']}),
    }),
  ],
  preview: {select: {title: 'label', subtitle: 'url'}},
})
