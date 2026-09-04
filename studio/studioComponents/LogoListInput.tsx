import {Box, Flex, Stack, Text} from '@sanity/ui'
import type {ArrayOfObjectsInputProps} from 'sanity'
import {Canvas, CanvasInset, CanvasLabel, useFileAssetUrls} from './VisualPrimitives'

type LogoValue = {
  _key?: string
  name?: string
  widthScale?: number
  asset?: {asset?: {_ref?: string}}
}

export function LogoListInput(props: ArrayOfObjectsInputProps) {
  const value = (props.value || []) as LogoValue[]
  const urls = useFileAssetUrls(value.map((item) => item.asset?.asset?._ref))
  return (
    <Stack gap={4}>
      <Canvas shadow={1}>
        <CanvasInset>
          <CanvasLabel size={1}>Relative Größe und Reihenfolge</CanvasLabel>
          <Flex align="center" gap={4} wrap="wrap">
            {value.map((item, index) => {
              const ref = item.asset?.asset?._ref || ''
              const url = urls[ref]
              const scale = item.widthScale || 1
              return (
                <Box key={item._key || index} style={{width: `${Math.min(36, 14 * scale)}%`, minWidth: 90, maxWidth: 260}}>
                  {url
                    ? <img src={url} alt="" style={{display: 'block', maxHeight: 70, width: '100%', objectFit: 'contain', filter: 'brightness(0)'}} />
                    : <Text size={1} weight="medium">{item.name || 'Logo'}</Text>}
                </Box>
              )
            })}
          </Flex>
        </CanvasInset>
      </Canvas>
      {props.renderDefault(props)}
    </Stack>
  )
}
