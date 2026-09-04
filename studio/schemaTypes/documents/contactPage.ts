import {EnvelopeIcon} from '@sanity/icons/Envelope'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {ContactPageInput} from '../../studioComponents/ContactPageInput'

export const contactPage = defineType({
  name: 'contactPage',
  title: 'Kontakt',
  type: 'document',
  icon: EnvelopeIcon,
  components: {input: ContactPageInput},
  fields: [
    defineField({name: 'email', title: 'E-Mail', type: 'string', validation: (rule) => rule.required().email()}),
    defineField({name: 'phone', title: 'Telefon', type: 'string', validation: (rule) => rule.required()}),
    defineField({name: 'address', title: 'Adresse', type: 'text', rows: 3, validation: (rule) => rule.required()}),
    defineField({
      name: 'socialLinks',
      title: 'Social Links',
      type: 'array',
      of: [defineArrayMember({type: 'socialLink'})],
      validation: (rule) => rule.unique(),
    }),
  ],
  preview: {prepare: () => ({title: 'Kontakt'})},
})
