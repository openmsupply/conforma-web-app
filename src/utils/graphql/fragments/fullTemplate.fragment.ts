import { gql } from '@apollo/client'

export default gql`
  fragment FullTemplate on Template {
    ...templateFragment
    nodeId
    configApplications: applications(filter: { isConfig: { equalTo: true } }, orderBy: ID_DESC) {
      nodes {
        serial
        id
      }
    }
    version
    versionTimestamp
    templateSections(orderBy: INDEX_ASC) {
      nodes {
        ...Section
        templateElementsBySectionId(orderBy: INDEX_ASC) {
          nodes {
            ...elementFragment
          }
        }
      }
    }
    templateActions(orderBy: SEQUENCE_ASC) {
      nodes {
        actionCode
        condition
        eventCode
        id
        parameterQueries
        sequence
        trigger
        description
        templateId
      }
    }
    templatePermissions {
      nodes {
        allowedSections
        canSelfAssign
        id
        levelNumber
        permissionName {
          id
          name
          permissionPolicyId
          permissionPolicy {
            defaultRestrictions
            description
            name
            id
            rules
            type
          }
        }
        restrictions
        stageNumber
        permissionNameId
      }
    }
    templateStages(orderBy: NUMBER_ASC) {
      nodes {
        id
        number
        colour
        title
        description
        templateStageReviewLevelsByStageId(orderBy: NUMBER_ASC) {
          nodes {
            description
            id
            name
            number
          }
        }
      }
    }
  }
`
