import {CaseIcon} from '@sanity/icons/Case'
import {defineArrayMember, defineField, defineType} from 'sanity'

export const service = defineType({
  name: 'service',
  title: 'Leistung',
  type: 'document',
  icon: CaseIcon,
  orderings: [{title: 'Reihenfolge', name: 'display', by: [{field: 'displayOrder', direction: 'asc'}]}],
  fields: [
    defineField({name: 'title', title: 'Titel', type: 'string', validation: (rule) => rule.required()}),
    defineField({name: 'slug', title: 'Adresse', type: 'slug', options: {source: 'title'}, validation: (rule) => rule.required()}),
    defineField({name: 'headline', title: 'Headline', type: 'text', rows: 4, validation: (rule) => rule.required()}),
    defineField({
      name: 'chapters',
      title: 'Kapitel',
      type: 'array',
      of: [defineArrayMember({type: 'serviceChapter'})],
      validation: (rule) => rule.required().min(1),
    }),
    defineField({name: 'casesIntro', title: 'Einleitung zu den Projekten', type: 'text', rows: 3, validation: (rule) => rule.required()}),
    defineField({
      name: 'cases',
      title: 'Projektbeispiele',
      type: 'array',
      of: [defineArrayMember({type: 'serviceCase'})],
      validation: (rule) => rule.required().min(1).unique(),
    }),
    defineField({name: 'displayOrder', title: 'Reihenfolge', type: 'number', validation: (rule) => rule.required().integer().min(1)}),
  ],
  preview: {select: {title: 'title', subtitle: 'headline'}},
})
