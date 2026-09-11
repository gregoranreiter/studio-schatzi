import {HomeIcon} from '@sanity/icons/Home'
import {defineArrayMember, defineField, defineType} from 'sanity'

export const homePage = defineType({
  name: 'homePage',
  title: 'Startseite',
  type: 'document',
  icon: HomeIcon,
  fields: [
    defineField({name: 'headline', title: 'Headline', type: 'text', rows: 3, validation: (rule) => rule.required()}),
    defineField({
      name: 'projects',
      title: 'Ausgewählte Projekte',
      type: 'array',
      of: [defineArrayMember({type: 'homeProject'})],
      validation: (rule) => rule.required().min(1).max(6).unique(),
    }),
  ],
  preview: {prepare: () => ({title: 'Startseite'})},
})
