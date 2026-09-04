import {Box, Card, Stack, Text} from '@sanity/ui'
import type {ObjectInputProps} from 'sanity'

type CtaValue = {statement?: string; linkLabel?: string; emailSubject?: string}

export function ServiceCtaInput(props: ObjectInputProps) {
  const value = (props.value || {}) as CtaValue
  return (
    <Stack gap={4}>
      <Card padding={4} radius={0} shadow={1} style={{background: '#fffa91', color: '#090909'}}>
        <Stack gap={4}>
          <Text size={3} weight="medium">{value.statement || 'Einladung formulieren'}</Text>
          <Box>
            <Card as="span" padding={3} radius={6} style={{display: 'inline-block', background: '#090909', color: '#faf9f6'}}>
              <Text size={1} weight="medium">{value.linkLabel || 'Linktext'}</Text>
            </Card>
          </Box>
          <Text size={1} muted>E-Mail-Betreff: {value.emailSubject || 'noch offen'}</Text>
        </Stack>
      </Card>
      {props.renderDefault(props)}
    </Stack>
  )
}
