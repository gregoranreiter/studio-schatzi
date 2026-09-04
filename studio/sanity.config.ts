import {HomeIcon} from '@sanity/icons/Home'
import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {schemaTypes} from './schemaTypes'
import {singletonActions, singletonTemplates, structure} from './structure'

// A Sanity project ID is public configuration: it is embedded in every Studio
// build and in image CDN URLs. Environment variables remain available for
// previewing another project without changing the repository.
const projectId = process.env.SANITY_STUDIO_PROJECT_ID || 'cun0jylh'

export default defineConfig({
  name: 'studio-schatzi',
  title: 'Studio Schatzi',
  icon: HomeIcon,
  projectId,
  dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  plugins: [structureTool({structure})],
  schema: {
    types: schemaTypes,
    templates: singletonTemplates,
  },
  document: {
    actions: singletonActions,
  },
})
