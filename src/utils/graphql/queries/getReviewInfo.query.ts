import { gql } from '@apollo/client'

export default gql`
  query getReviewInfo($reviewerId: Int!, $applicationId: Int) {
    reviewAssignments(
      condition: { reviewerId: $reviewerId, applicationId: $applicationId }
      orderBy: TIME_CREATED_DESC
    ) {
      nodes {
        id
        level
        status
        timeCreated
        level
        isLastLevel
        reviews {
          nodes {
            id
            status
            trigger
            timeCreated
            reviewDecisions {
              nodes {
                id
                decision
              }
            }
          }
        }
        stage {
          title
          id
        }
        reviewQuestionAssignments {
          nodes {
            id
          }
        }
      }
    }
  }
`
