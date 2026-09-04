import {Badge, Box, Stack, Text} from '@sanity/ui'
import type {ArrayOfObjectsInputProps} from 'sanity'
import styled from 'styled-components'
import {FourColumnGrid, useReferencedProjects, useStudioImageUrl, VisualImage} from './VisualPrimitives'

type HomeProjectValue = {
  _key?: string
  placement?: 'full' | 'left' | 'right'
  project?: {_ref?: string}
}

const ProjectFrame = styled.div<{placement: string}>`
  grid-column: ${({placement}) => placement === 'full' ? '1 / -1' : placement === 'left' ? '1 / 4' : '2 / -1'};
  margin-bottom: 14px;
`

const ImageFrame = styled.div`
  aspect-ratio: 16 / 9;
  overflow: hidden;
`

const HomeImage = styled(VisualImage)`
  background: transparent;
`

const PreviewLabel = styled(Text)`
  display: block;
  margin-bottom: 12px;
`

function ProjectVisual({item, title, cover}: {item: HomeProjectValue; title?: string; cover?: Parameters<typeof useStudioImageUrl>[0]}) {
  const imageUrl = useStudioImageUrl(cover, 900, 506)
  const placement = item.placement || 'right'
  return (
    <ProjectFrame placement={placement}>
      <ImageFrame>{imageUrl && <HomeImage src={imageUrl} alt="" />}</ImageFrame>
      <Box paddingTop={2}>
        <Text size={1} weight="medium">{title || 'Projekt auswählen'}</Text>
      </Box>
    </ProjectFrame>
  )
}

export function HomeProjectsInput(props: ArrayOfObjectsInputProps) {
  const value = (props.value || []) as HomeProjectValue[]
  const projects = useReferencedProjects(value.map((item) => item.project?._ref))

  return (
    <Stack gap={4}>
      <Box>
        <PreviewLabel size={1}>Komposition der Startseite</PreviewLabel>
        <FourColumnGrid>
          {value.map((item, index) => {
            const ref = item.project?._ref || ''
            const project = projects[ref]
            return <ProjectVisual key={item._key || `${ref}-${index}`} item={item} title={project?.title} cover={project?.cover} />
          })}
        </FourColumnGrid>
        {!value.length && <Badge tone="caution">Noch keine Projekte ausgewählt</Badge>}
      </Box>
      {props.renderDefault(props)}
    </Stack>
  )
}
