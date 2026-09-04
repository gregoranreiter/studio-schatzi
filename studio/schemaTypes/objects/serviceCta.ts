import {EnvelopeIcon} from '@sanity/icons/Envelope'
import {defineField, defineType} from 'sanity'
import {ServiceCtaInput} from '../../studioComponents/ServiceCtaInput'

export const serviceCta = defineType({
  name: 'serviceCta',
  title: 'Kontaktimpuls',
  type: 'object',
  icon: EnvelopeIcon,
  components: {input: ServiceCtaInput},
  fields: [
    defineField({name: 'statement', title: 'Einladung', type: 'text', rows: 3, validation: (rule) => rule.required()}),
    defineField({name: 'linkLabel', title: 'Linktext', type: 'string', validation: (rule) => rule.required().max(80)}),
    defineField({name: 'emailSubject', title: 'E-Mail-Betreff', type: 'string', validation: (rule) => rule.required().max(120)}),
  ],
})
