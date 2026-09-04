import {BlockContentIcon} from '@sanity/icons/BlockContent'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {StudioContentInput} from '../../studioComponents/StudioContentInput'

export const studioPage = defineType({
  name: 'studioPage',
  title: 'Studio',
  type: 'document',
  icon: BlockContentIcon,
  fields: [
    defineField({name: 'headline', title: 'Headline', type: 'text', rows: 3, validation: (rule) => rule.required()}),
    defineField({
      name: 'content',
      title: 'Inhalt',
      type: 'array',
      components: {input: StudioContentInput},
      of: [
        defineArrayMember({type: 'studioRichTextBlock'}),
        defineArrayMember({type: 'studioImageBlock'}),
      ],
      validation: (rule) => rule.required().min(1),
    }),
  ],
  preview: {prepare: () => ({title: 'Studio'})},
})
