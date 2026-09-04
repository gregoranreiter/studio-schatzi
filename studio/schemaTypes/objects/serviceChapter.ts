import {BlockContentIcon} from '@sanity/icons/BlockContent'
import {defineField, defineType} from 'sanity'

export const serviceChapter = defineType({
  name: 'serviceChapter',
  title: 'Kapitel',
  type: 'object',
  icon: BlockContentIcon,
  fields: [
    defineField({name: 'title', title: 'Titel', type: 'text', rows: 2, validation: (rule) => rule.required()}),
    defineField({name: 'text', title: 'Text', type: 'text', rows: 6, validation: (rule) => rule.required()}),
  ],
  preview: {select: {title: 'title', subtitle: 'text'}},
})
