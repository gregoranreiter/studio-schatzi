import {Select} from '@sanity/ui'
import {useEffect, useState} from 'react'
import {set, unset, useClient, type ReferenceInputProps} from 'sanity'
import {API_VERSION} from './VisualPrimitives'

type ProjectOption = {_id: string; title: string}

export function ProjectReferenceSelectInput({onChange, readOnly, renderDefault, value, ...props}: ReferenceInputProps) {
  const client = useClient({apiVersion: API_VERSION})
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    client.fetch<ProjectOption[]>(
      '*[_type == "project"] | order(archiveOrder asc, title asc){_id,title}',
      {},
      {perspective: 'published'},
    ).then((documents) => {
      if (active) setProjects(documents)
    }).catch(() => {
      if (active) setFailed(true)
    })

    return () => {
      active = false
    }
  }, [client])

  if (failed) return renderDefault({onChange, readOnly, renderDefault, value, ...props})

  return (
    <Select
      disabled={readOnly}
      fontSize={2}
      padding={3}
      value={value?._ref || ''}
      onChange={(event) => {
        const projectId = event.currentTarget.value
        onChange(projectId ? set({_type: 'reference', _ref: projectId}) : unset())
      }}
    >
      <option value="">Projekt auswählen</option>
      {projects.map((project) => (
        <option key={project._id} value={project._id}>{project.title}</option>
      ))}
    </Select>
  )
}
