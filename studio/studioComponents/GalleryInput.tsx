import {Badge, Box, Grid, Stack, Text} from '@sanity/ui'
import type {ArrayOfObjectsInputProps} from 'sanity'
import styled from 'styled-components'
import {Canvas, CanvasInset, CanvasLabel, type SanityImageSource, useStudioImageUrl, VisualImage} from './VisualPrimitives'

type GalleryValue = SanityImageSource & {
  _key?: string
  alt?: string
  layout?: 'wide' | 'half' | 'portrait'
}

const GalleryFrame = styled.div<{layout: string}>`
  grid-column: ${({layout}) => layout === 'wide' ? '1 / -1' : 'span 1'};
  min-width: 0;
`

const ImageFrame = styled.div<{layout: string}>`
  aspect-ratio: ${({layout}) => layout === 'portrait' ? '3 / 4' : layout === 'half' ? '4 / 3' : '16 / 9'};
  background: #ece9df;
  overflow: hidden;
`

function GalleryImageVisual({item}: {item: GalleryValue}) {
  const imageUrl = useStudioImageUrl(item, item.layout === 'wide' ? 1000 : 560, item.layout === 'portrait' ? 747 : 560)
  const layout = item.layout || 'wide'
  return (
    <GalleryFrame layout={layout}>
      <ImageFrame layout={layout}>{imageUrl && <VisualImage src={imageUrl} alt="" />}</ImageFrame>
      <Box paddingTop={2}><Text size={1} textOverflow="ellipsis">{item.alt || 'Bildbeschreibung fehlt'}</Text></Box>
    </GalleryFrame>
  )
}

export function GalleryInput(props: ArrayOfObjectsInputProps) {
  const value = (props.value || []) as GalleryValue[]
  return (
    <Stack gap={4}>
      <Canvas shadow={1}>
        <CanvasInset>
          <CanvasLabel size={1}>Rhythmus der Projektgalerie</CanvasLabel>
          <Grid gridTemplateColumns={2} gap={3}>
            {value.map((item, index) => <GalleryImageVisual key={item._key || index} item={item} />)}
          </Grid>
          {!value.length && <Badge tone="caution">Die Galerie ist leer</Badge>}
        </CanvasInset>
      </Canvas>
      {props.renderDefault(props)}
    </Stack>
  )
}
