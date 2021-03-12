import { gql } from '@apollo/client'

// For review responses linked to applicationResponses, we want to get either submitted responses
// Or draft response that belong to current user
export default gql`
  query getReviewNew($reviewAssignmentId: Int!, $userId: Int!) {
    reviewAssignment(id: $reviewAssignmentId) {
      id
      isLastLevel
      reviewer {
        id
        firstName
        lastName
      }
      reviewQuestionAssignments {
        nodes {
          id
          templateElementId
        }
      }
      application {
        id
        serial
        applicationResponses {
          nodes {
            ...Response
            reviewResponses(
              orderBy: TIME_UPDATED_DESC
              filter: {
                or: [
                  { status: { equalTo: SUBMITTED } }
                  {
                    and: [
                      { status: { equalTo: DRAFT } }
                      { review: { reviewer: { id: { equalTo: $userId } } } }
                    ]
                  }
                ]
              }
            ) {
              nodes {
                ...reviewResponseFragment
              }
            }
          }
        }
      }
      reviews {
        nodes {
          id
          status
          reviewDecisions {
            nodes {
              id
              comment
              decision
            }
          }
          reviewResponses(orderBy: TIME_UPDATED_DESC) {
            nodes {
              ...reviewResponseFragment
              applicationResponse {
                templateElementId
              }
            }
          }
        }
      }
    }
  }
`
