import { gql } from '@apollo/client'

export default gql`
    fragment Response on ApplicationResponse {
    id
    value
    timeCreated
    isValid
  }
`