import React, { useState } from 'react'
import { Grid, Icon, Label, Message } from 'semantic-ui-react'
import { useRouter } from '../../utils/hooks/useRouter'
import {
  ChangeRequestsProgress,
  ConsolidationProgress,
  ReviewAction,
  ReviewAssignment,
  ReviewProgress,
  ReviewSectionComponentProps,
} from '../../utils/types'
import { useLanguageProvider } from '../../contexts/Localisation'
import useCreateReview from '../../utils/hooks/useCreateReview'
import useRestartReview from '../../utils/hooks/useRestartReview'
import { ReviewStatus } from '../../utils/generated/graphql'
import useCreateFinalDecisionReview from '../../utils/hooks/useCreateMakeDecisionReview'
import { LoadingSmall } from '../common'

const ReviewSectionRowAction: React.FC<ReviewSectionComponentProps> = (props) => {
  const { t } = useLanguageProvider()
  const { action, isAssignedToCurrentUser } = props

  const getContent = () => {
    switch (action) {
      case ReviewAction.canContinue: {
        if (isAssignedToCurrentUser) {
          return <GenerateActionButton {...props} />
        }
        return (
          <Label className="simple-label">
            <em>{t('REVIEW_STATUS_IN_PROGRESS')}</em>
          </Label>
        )
      }

      case ReviewAction.canView: {
        if (isAssignedToCurrentUser) {
          return <ViewSubmittedReviewButton {...props} />
        }
        return <ViewReviewIcon {...props} />
      }

      case ReviewAction.canStartReview:
      case ReviewAction.canMakeDecision: {
        if (isAssignedToCurrentUser) {
          return <GenerateActionButton {...props} />
        }
        return (
          <Label className="simple-label">
            <em>{t('REVIEW_STATUS_NOT_STARTED')}</em>
          </Label>
        )
      }

      case ReviewAction.canUpdate:
      case ReviewAction.canReStartReview:
      case ReviewAction.canReReview: {
        if (isAssignedToCurrentUser) {
          return <GenerateActionButton {...props} />
        }
        return (
          <Label className="simple-label">
            <em>{t('REVIEW_STATUS_PENDING_ACTION')}</em>
          </Label>
        )
      }

      default:
        return null
    }
  }

  return (
    <Grid.Column
      textAlign="right"
      width={3}
      className="custom-assignment-grid-column"
      style={{ width: '100%' }}
    >
      {getContent()}
    </Grid.Column>
  )
}

const getApplicantChangesUpdatedCount = (reviewProgress?: ReviewProgress) =>
  reviewProgress?.totalNewReviewable || 0

const getReviewerChangesUpdatedCount = (consolidationProgress?: ConsolidationProgress) =>
  consolidationProgress?.totalNewReviewable || 0

const getConsolidatorChangesRequestedCount = (progress?: ChangeRequestsProgress) =>
  progress?.totalChangeRequests || 0

// Possible generate action button: START REVIEW, CONTINUE REVIEW, UPDATE REVIEW, RE-REVIEW or MAKE DECISION
const GenerateActionButton: React.FC<ReviewSectionComponentProps> = ({
  reviewStructure,
  reviewAssignment,
  section: { reviewProgress, consolidationProgress, changeRequestsProgress },
  action,
}) => {
  const { t } = useLanguageProvider()
  const {
    location: { pathname },
    push,
  } = useRouter()
  const [loading, setLoading] = useState(false)

  const [error, setError] = useState(false)

  const restartReview = useRestartReview({ reviewStructure, reviewAssignment })

  const createReview = useCreateReview({ reviewStructure, reviewAssignment })

  const copyPreviousStageReview = useCreateFinalDecisionReview({
    reviewStructure,
    reviewAssignment,
  })

  const getButtonName = () => {
    switch (action) {
      case ReviewAction.canUpdate: {
        const changeRequestsCount = getConsolidatorChangesRequestedCount(changeRequestsProgress)
        return t('ACTION_UPDATE').concat(changeRequestsCount > 0 ? ` (${changeRequestsCount})` : '')
      }
      case ReviewAction.canReReview: {
        const applicantChangesCount = getApplicantChangesUpdatedCount(reviewProgress)
        return t('BUTTON_REVIEW_RE_REVIEW').concat(
          applicantChangesCount > 0 ? ` (${applicantChangesCount})` : ''
        )
      }
      case ReviewAction.canReStartReview: {
        const reviewerChangesCount = getReviewerChangesUpdatedCount(consolidationProgress)
        return t('BUTTON_REVIEW_RE_REVIEW').concat(
          reviewerChangesCount > 0 ? ` (${reviewerChangesCount})` : ''
        )
      }
      case ReviewAction.canMakeDecision:
        return t('ACTION_MAKE_DECISION')
      case ReviewAction.canContinue:
        return t('ACTION_CONTINUE')
      default:
        return t('ACTION_START')
    }
  }

  const doAction = async () => {
    setLoading(true)
    const { isMakeDecision } = reviewStructure.assignment as ReviewAssignment
    let reviewId = reviewStructure.thisReview?.id as number
    if (reviewStructure.thisReview?.current.reviewStatus == ReviewStatus.Draft)
      return push(
        `${pathname}/${reviewId}?activeSections=${
          isMakeDecision ? 'none' : reviewAssignment.assignedSections.join(',')
        }`
      )

    try {
      if (isMakeDecision) {
        reviewId = (await copyPreviousStageReview()).data?.createReview?.review?.id as number
        setLoading(false)
        push(`${pathname}/${reviewId}?activeSections=none`)
      } else if (reviewStructure.thisReview) await restartReview()
      else reviewId = (await createReview()).data?.createReview?.review?.id as number
      setLoading(false)
      push(
        `${pathname}/${reviewId}?activeSections=${
          isMakeDecision ? 'none' : reviewAssignment.assignedSections.join(',')
        }`
      )
    } catch (e) {
      console.log(e)
      setLoading(false)
      return setError(true)
    }
  }

  if (error) return <Message error title={t('ERROR_GENERIC')} />

  return loading ? (
    <LoadingSmall />
  ) : (
    <a className="user-action clickable" onClick={doAction}>
      {getButtonName()}
    </a>
  )
}

const ViewSubmittedReviewButton: React.FC<ReviewSectionComponentProps> = ({
  reviewStructure: reviewStructure,
  section: { details },
}) => {
  const { t } = useLanguageProvider()
  const { pathname, push } = useRouter()
  const reviewId = reviewStructure.thisReview?.id
  return (
    <a
      className="user-action clickable"
      onClick={() => push(`${pathname}/${reviewId}?activeSections=${details.code}`)}
    >
      {t('ACTION_VIEW')}
    </a>
  )
}

// VIEW REVIEW Icon
const ViewReviewIcon: React.FC<ReviewSectionComponentProps> = ({
  reviewStructure: reviewStructure,
  section: { details },
}) => {
  const { pathname, push } = useRouter()

  const reviewId = reviewStructure.thisReview?.id
  return (
    <Icon
      name="chevron right"
      className="dark-grey"
      onClick={() => push(`${pathname}/${reviewId}?activeSections=${details.code}`)}
    />
  )
}

export default ReviewSectionRowAction
