import {Box, Button, Grid, Stack, Text} from '@sanity/ui'
import {set, type StringInputProps} from 'sanity'

const choices = [
  {value: 'wide', label: 'Breit', width: '100%', ratio: '16 / 9'},
  {value: 'half', label: 'Halb', width: '50%', ratio: '4 / 3'},
  {value: 'portrait', label: 'Hochformat', width: '44%', ratio: '3 / 4'},
]

export function GalleryLayoutInput({onChange, readOnly, value}: StringInputProps) {
  return (
    <Grid gridTemplateColumns={3} gap={2}>
      {choices.map((choice) => {
        const selected = value === choice.value
        return (
          <Button
            key={choice.value}
            mode={selected ? 'default' : 'ghost'}
            tone={selected ? 'primary' : 'default'}
            disabled={readOnly}
            onClick={() => onChange(set(choice.value))}
            padding={3}
          >
            <Stack gap={3}>
              <Box style={{height: 48, display: 'grid', placeItems: 'center'}}>
                <Box style={{width: choice.width, aspectRatio: choice.ratio, maxHeight: 44, background: 'currentColor', borderRadius: 2}} />
              </Box>
              <Text size={1} weight="medium" align="center">{choice.label}</Text>
            </Stack>
          </Button>
        )
      })}
    </Grid>
  )
}
