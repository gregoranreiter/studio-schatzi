import type {StringInputProps} from 'sanity'
import {LayoutChoiceInput} from './LayoutChoiceInput'

export function HomePlacementInput(props: StringInputProps) {
  return <LayoutChoiceInput {...props} choices={[
    {value: 'full', label: 'Volle Breite', columns: '1234'},
    {value: 'left', label: 'Links', columns: '123'},
    {value: 'right', label: 'Rechts', columns: '234'},
  ]} />
}
