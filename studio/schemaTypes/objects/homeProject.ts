import {ProjectsIcon} from '@sanity/icons/Projects'
import {defineField, defineType} from 'sanity'
import {HomePlacementInput} from '../../studioComponents/HomePlacementInput'

export const homeProject = defineType({
  name: 'homeProject',
  title: 'Projekt auf der Startseite',
  type: 'object',
  icon: ProjectsIcon,
  fields: [
    defineField({
      name: 'project',
      title: 'Projekt',
      type: 'reference',
      to: [{type: 'project'}],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'placement',
      title: 'Platzierung',
      type: 'string',
      initialValue: 'right',
      options: {
        list: [
          {title: 'Volle Breite', value: 'full'},
          {title: 'Links, drei Spalten', value: 'left'},
          {title: 'Rechts, drei Spalten', value: 'right'},
        ],
        layout: 'radio',
      },
      components: {input: HomePlacementInput},
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {
      title: 'project.title',
      media: 'project.cover',
      placement: 'placement',
    },
    prepare({title, media, placement}) {
      const labels: Record<string, string> = {
        full: 'Volle Breite',
        left: 'Links, drei Spalten',
        right: 'Rechts, drei Spalten',
      }
      return {title: title || 'Projekt auswählen', subtitle: labels[placement] || 'Platzierung wählen', media}
    },
  },
})
