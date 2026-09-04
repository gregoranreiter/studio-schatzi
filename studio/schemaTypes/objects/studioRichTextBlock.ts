import {BlockContentIcon} from '@sanity/icons/BlockContent'
import {defineArrayMember, defineField, defineType} from 'sanity'

export const studioRichTextBlock = defineType({
  name: 'studioRichTextBlock',
  title: 'Text',
  type: 'object',
  icon: BlockContentIcon,
  fields: [
    defineField({
      name: 'body',
      title: 'Text',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [{title: 'Absatz', value: 'normal'}],
          lists: [],
          marks: {
            decorators: [],
            annotations: [
              {
                name: 'link',
                title: 'Link',
                type: 'object',
                fields: [
                  defineField({
                    name: 'href',
                    title: 'Adresse',
                    type: 'url',
                    validation: (rule) => rule.required().uri({allowRelative: true, scheme: ['http', 'https', 'mailto', 'tel']}),
                  }),
                ],
              },
            ],
          },
        }),
      ],
      validation: (rule) => rule.required().min(1),
    }),
  ],
  preview: {
    select: {body: 'body'},
    prepare({body}) {
      const text = Array.isArray(body)
        ? body.flatMap((block) => block.children || []).map((child) => child.text || '').join(' ')
        : ''
      return {title: text || 'Leerer Textblock', subtitle: 'Text'}
    },
  },
})
