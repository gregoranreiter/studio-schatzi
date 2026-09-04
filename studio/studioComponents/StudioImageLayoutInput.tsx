import type {StringInputProps} from 'sanity'
import {LayoutChoiceInput} from './LayoutChoiceInput'

export function StudioImageLayoutInput(props: StringInputProps) {
  return <LayoutChoiceInput {...props} choices={[
    {value: 'full', label: 'Volle Breite', columns: '1234'},
    {value: 'rightThreeColumns', label: 'Rechts', columns: '234'},
  ]} />
}
