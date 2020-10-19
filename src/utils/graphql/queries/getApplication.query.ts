import { gql } from '@apollo/client'

export default gql`
  query getApplication($serial: Int!) {
    applications(condition: { serial: $serial }) {
      nodes {
        id
        serial
        name
        outcome
        template {
          code
          id
          name
        }
        applicationSections {
          nodes {
            templateSection {
              id
              title
              code
              templateElementsBySectionId {
                nodes {
                  code
                  elementTypePluginCode
                }
              }
            }
          }
        }
        applicationResponses {
          nodes {
            value
            templateElement {
              code
            }
          }
        }
      }
    }
  }
`
