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
    versionId
    versionTimestamp
    parentVersionId
    versionComment
    versionHistory
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
        code
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
        canMakeFinalDecision
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
            singleReviewerAllSections
          }
        }
      }
    }
    templateDataViewJoins {
      nodes {
        id
        dataView {
          identifier
          code
          id
          tableName
          title
          permissionNames
          priority
        }
      }
    }
  }
`
