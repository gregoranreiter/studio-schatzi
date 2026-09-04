import {Badge, Box, Stack, Text} from '@sanity/ui'
import type {ArrayOfObjectsInputProps} from 'sanity'
import styled from 'styled-components'
import {Canvas, CanvasInset, CanvasLabel, FourColumnGrid, portableTextToPlainText, type SanityImageSource, useStudioImageUrl, VisualImage} from './VisualPrimitives'

type RichTextValue = {_key?: string; _type: 'studioRichTextBlock'; body?: unknown}
type ImageValue = {_key?: string; _type: 'studioImageBlock'; image?: SanityImageSource; alt?: string; layout?: 'full' | 'rightThreeColumns'}
type StudioContentValue = RichTextValue | ImageValue

const ContentRow = styled.div<{columns: string}>`
  grid-column: ${({columns}) => columns};
  margin-bottom: clamp(18px, 4vw, 42px);
  min-width: 0;
`

const TextPreview = styled.div`
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: clamp(13px, 1.6vw, 20px);
  line-height: 1.25;
  white-space: pre-wrap;
`

function StudioImageVisual({item}: {item: ImageValue}) {
  const imageUrl = useStudioImageUrl(item.image, 1000)
  const columns = item.layout === 'full' ? '1 / -1' : '2 / -1'
  return (
    <ContentRow columns={columns}>
      <Box style={{aspectRatio: '16 / 9', background: '#ece9df', overflow: 'hidden'}}>
        {imageUrl && <VisualImage src={imageUrl} alt="" />}
      </Box>
      <Box paddingTop={2}><Text size={1}>{item.alt || 'Bildbeschreibung fehlt'}</Text></Box>
    </ContentRow>
  )
}

export function StudioContentInput(props: ArrayOfObjectsInputProps) {
  const value = (props.value || []) as StudioContentValue[]
  return (
    <Stack gap={4}>
      <Canvas shadow={1}>
        <CanvasInset>
          <CanvasLabel size={1}>Vier-Spalten-Komposition</CanvasLabel>
          <FourColumnGrid>
            {value.map((item, index) => item._type === 'studioImageBlock'
              ? <StudioImageVisual key={item._key || index} item={item} />
              : (
                <ContentRow key={item._key || index} columns="2 / 4">
                  <TextPreview>{portableTextToPlainText(item.body) || 'Leerer Textblock'}</TextPreview>
                </ContentRow>
              ))}
          </FourColumnGrid>
          {!value.length && <Badge tone="caution">Noch kein Inhalt</Badge>}
        </CanvasInset>
      </Canvas>
      {props.renderDefault(props)}
    </Stack>
  )
}
