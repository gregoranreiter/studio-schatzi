import {Card, Stack, Text} from '@sanity/ui'
import type {ObjectInputProps} from 'sanity'

type ContactValue = {
  email?: string
  phone?: string
  address?: string
  socialLinks?: Array<{_key?: string; label?: string; url?: string}>
}

export function ContactPageInput(props: ObjectInputProps) {
  const value = (props.value || {}) as ContactValue
  return (
    <Stack gap={5}>
      <Card padding={5} radius={0} shadow={1} style={{background: '#fffa91', color: '#090909'}}>
        <Stack gap={3}>
          <Text size={3} weight="medium">{value.email || 'E-Mail-Adresse'}</Text>
          <Text size={3} weight="medium">{value.phone || 'Telefonnummer'}</Text>
          <Text size={3} style={{whiteSpace: 'pre-line'}}>{value.address || 'Adresse'}</Text>
          {(value.socialLinks || []).map((link, index) => (
            <Text key={link._key || index} size={2} weight="medium">{link.label || 'Social Link'} ↗</Text>
          ))}
        </Stack>
      </Card>
      {props.renderDefault(props)}
    </Stack>
  )
}
