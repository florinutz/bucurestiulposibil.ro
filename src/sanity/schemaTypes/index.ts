import { type SchemaTypeDefinition } from 'sanity'
import geopoint from './geopoint'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [geopoint],
}
