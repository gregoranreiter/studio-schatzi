import {createRoot} from 'react-dom/client'
import {Studio} from 'sanity'
import config from './sanity.config'

const root = document.getElementById('root')

if (!root) throw new Error('Sanity Studio root element is missing')

createRoot(root).render(<Studio config={config} />)
