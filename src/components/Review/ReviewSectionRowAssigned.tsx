import React from 'react'
import { Grid } from 'semantic-ui-react'
import { ReviewAction, ReviewSectionComponentProps } from '../../utils/types'
import {
  CurrentSelfAssignmentLabel,
  TheirSelfAssignmentLabel,
  CurrentReviewInProgressLabel,
  TheirReviewInProgressLabel,
  CurrentReviewLockedLabel,
  TheirReviewLockedLabel,
} from './ReviewLabel'

const ReviewSectionRowAssigned: React.FC<ReviewSectionComponentProps> = ({
  isAssignedToCurrentUser,
  action,
  assignment,
}) => {
  const getLabel = () => {
    switch (action) {
      case ReviewAction.canSelfAssign:
        return isAssignedToCurrentUser ? (
          <CurrentSelfAssignmentLabel />
        ) : (
          <TheirSelfAssignmentLabel {...assignment.reviewer} />
        )
      case ReviewAction.canSelfAssignLocked:
      case ReviewAction.canContinueLocked:
        return isAssignedToCurrentUser ? (
          <CurrentReviewLockedLabel />
        ) : (
          <TheirReviewLockedLabel {...assignment.reviewer} />
        )
      default:
        return isAssignedToCurrentUser ? (
          <CurrentReviewInProgressLabel />
        ) : (
          <TheirReviewInProgressLabel {...assignment.reviewer} />
        )
    }
  }
  return <Grid.Column className="padding-zero">{getLabel()}</Grid.Column>
}

export default ReviewSectionRowAssigned
