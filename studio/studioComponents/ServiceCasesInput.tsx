import {Box, Grid, Stack, Text} from '@sanity/ui'
import type {ArrayOfObjectsInputProps} from 'sanity'
import {Canvas, CanvasInset, CanvasLabel, useReferencedProjects, useStudioImageUrl, VisualImage} from './VisualPrimitives'

type CaseValue = {_key?: string; project?: {_ref?: string}; text?: string}

function CaseVisual({item, project}: {item: CaseValue; project?: ReturnType<typeof useReferencedProjects>[string]}) {
  const imageUrl = useStudioImageUrl(project?.cover, 900, 506)
  return (
    <Grid gridTemplateColumns={4} gap={3} style={{marginBottom: 24}}>
      <Box style={{gridColumn: '1 / 4', aspectRatio: '16 / 9', background: '#ece9df', overflow: 'hidden'}}>
        {imageUrl && <VisualImage src={imageUrl} alt="" />}
      </Box>
      <Stack gap={3} paddingTop={2}>
        <Text size={1} weight="medium">{project?.title || 'Projekt auswählen'}</Text>
        <Text size={1} muted>{item.text || 'Einordnung fehlt'}</Text>
      </Stack>
    </Grid>
  )
}

export function ServiceCasesInput(props: ArrayOfObjectsInputProps) {
  const value = (props.value || []) as CaseValue[]
  const projects = useReferencedProjects(value.map((item) => item.project?._ref))
  return (
    <Stack gap={4}>
      <Canvas shadow={1}>
        <CanvasInset>
          <CanvasLabel size={1}>Projektbeispiele auf der Leistungsseite</CanvasLabel>
          {value.map((item, index) => {
            const ref = item.project?._ref || ''
            return <CaseVisual key={item._key || index} item={item} project={projects[ref]} />
          })}
        </CanvasInset>
      </Canvas>
      {props.renderDefault(props)}
    </Stack>
  )
}
