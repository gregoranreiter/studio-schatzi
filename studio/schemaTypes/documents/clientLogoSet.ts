import {ImagesIcon} from '@sanity/icons/Images'
import {defineArrayMember, defineField, defineType} from 'sanity'

export const clientLogoSet = defineType({
  name: 'clientLogoSet',
  title: 'Kundenlogos',
  type: 'document',
  icon: ImagesIcon,
  fields: [
    defineField({
      name: 'logos',
      title: 'Logos',
      type: 'array',
      of: [defineArrayMember({type: 'clientLogo'})],
      validation: (rule) => rule.required().min(1),
    }),
  ],
  preview: {prepare: () => ({title: 'Kundenlogos'})},
})
