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
    defineField({
      name: 'status',
      title: 'Status',
      type: 'number',
      description: 'Für normale dauerhafte URL-Änderungen 301 verwenden.',
      initialValue: 301,
      options: {
        list: [
          {title: '301 — Permanent', value: 301},
          {title: '302 — Temporär', value: 302},
          {title: '307 — Temporär, Methode beibehalten', value: 307},
          {title: '308 — Permanent, Methode beibehalten', value: 308},
        ],
        layout: 'radio',
      },
      validation: (rule) => rule.required().integer().custom((value) => (
        value === undefined || [301, 302, 307, 308].includes(value)
          ? true
          : 'Status muss 301, 302, 307 oder 308 sein.'
      )),
    }),
  ],
  preview: {
    select: {title: 'from', to: 'to', status: 'status'},
    prepare({title, to, status}) {
      return {title, subtitle: `${status || 301} → ${to || 'Ziel fehlt'}`}
    },
  },
})
