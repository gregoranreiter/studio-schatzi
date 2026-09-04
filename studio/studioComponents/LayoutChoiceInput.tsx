import {Box, Button, Grid, Stack, Text} from '@sanity/ui'
import {set, type StringInputProps} from 'sanity'

type Choice = {
  value: string
  label: string
  columns: string
}

type Props = StringInputProps & {choices: Choice[]}

export function LayoutChoiceInput({choices, onChange, readOnly, value}: Props) {
  return (
    <Grid gridTemplateColumns={choices.length} gap={2}>
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
              <Grid gridTemplateColumns={4} gap={1} style={{height: 38}}>
                {[1, 2, 3, 4].map((column) => (
                  <Box
                    key={column}
                    style={{
                      background: choice.columns.includes(String(column)) ? 'currentColor' : 'transparent',
                      border: '1px solid currentColor',
                      borderRadius: 2,
                      opacity: choice.columns.includes(String(column)) ? 1 : 0.22,
                    }}
                  />
                ))}
              </Grid>
              <Text size={1} weight="medium" align="center">{choice.label}</Text>
            </Stack>
          </Button>
        )
      })}
    </Grid>
  )
}
