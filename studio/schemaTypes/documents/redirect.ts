import {LinkIcon} from '@sanity/icons/Link'
import {defineField, defineType} from 'sanity'

export const redirect = defineType({
  name: 'redirect',
  title: 'Weiterleitung',
  type: 'document',
  icon: LinkIcon,
  fields: [
    defineField({
      name: 'from',
      title: 'Von',
      type: 'string',
      description: 'Relativer Pfad, beginnend mit /.',
      validation: (rule) => rule.required().regex(/^\/(?!\/).+/, {name: 'relativer Pfad'}),
    }),
    defineField({
      name: 'to',
      title: 'Nach',
      type: 'string',
      validation: (rule) => rule.required().regex(/^\/(?!\/).+/, {name: 'relativer Pfad'}),
    }),
    defineField({name: 'permanent', title: 'Permanent', type: 'boolean', initialValue: true}),
  ],
  preview: {select: {title: 'from', subtitle: 'to'}},
})
