import React, { useEffect } from 'react'
import { Grid, Message } from 'semantic-ui-react'
import { LoadingSmall } from '../../../components/common'
import {
  ReviewSectionRowAssigned,
  ReviewSectionRowLastActionDate,
  ReviewSectionRowProgress,
  ReviewSectionRowAction,
} from '../../../components/Review'
import { useLanguageProvider } from '../../../contexts/Localisation'
import { useReviewStructureState } from '../../../contexts/ReviewStructuresState'
import useGetReviewStructureForSections from '../../../utils/hooks/useGetReviewStructureForSection'
import {
  AssignmentDetails,
  FullStructure,
  ReviewAction,
  ReviewSectionComponentProps,
} from '../../../utils/types'

// Component renders a line for review assignment within a section
// to be used in ReviewHome and Expansions
type ReviewSectionRowProps = {
  sectionId: number
  fullStructure: FullStructure
  reviewAssignment: AssignmentDetails
}

const ReviewSectionRow: React.FC<ReviewSectionRowProps> = ({
  sectionId,
  fullStructure,
  reviewAssignment,
}) => {
  const { t } = useLanguageProvider()
  const { reviewStructuresState, setReviewStructureState } = useReviewStructureState()

  const shouldUpdate = Object.entries(reviewStructuresState).find(
    ([key, { loading }]) => Number(key) === reviewAssignment.id && loading
  )

  const { reviewStructure: reviewStructureForSections, error } = useGetReviewStructureForSections({
    reviewAssignment,
    reviewStructure: fullStructure,
    awaitMode: !shouldUpdate,
  })

  useEffect(() => {
    if (reviewStructureForSections && shouldUpdate) {
      setReviewStructureState({
        type: 'addAssignmentDetails',
        reviewStructure: reviewStructureForSections,
        assignment: reviewAssignment,
      })
    }
  }, [reviewStructureForSections])

  if (error) return <Message error title={t('ERROR_GENERIC')} list={[error]} />
  if (reviewStructuresState[reviewAssignment.id]?.loading) return <LoadingSmall />

  const reviewStructure = reviewStructuresState[reviewAssignment.id].review as FullStructure
  const section = reviewStructure.sortedSections?.find(
    (section) => section.details.id === sectionId
  )
  if (!reviewStructure || !section) return null

  const sectionCode = section?.details.code
  const assignmentId = reviewAssignment.id

  // TODO: Make sure this fields is correctly set considering assignedSections
  const isAssignedToCurrentUser = !!section?.assignment?.isAssignedToCurrentUser

  const props: ReviewSectionComponentProps = {
    reviewStructure,
    reviewAssignment,
    section,
    action: section?.assignment?.action || ReviewAction.unknown,
    isConsolidation: section.assignment?.isConsolidation || false,
    isAssignedToCurrentUser,
  }

  // A few checks required to render only if there is an
  // action associated to the current user to click
  const canRenderRow =
    section?.assignment?.isAssignedToCurrentUser ||
    section?.assignment?.action === ReviewAction.canMakeDecision ||
    section?.assignment?.isReviewable

  return (
    <div key={`section_${sectionCode}_assignment_${assignmentId}`}>
      {canRenderRow && (
        <Grid stackable columns={4} verticalAlign="middle">
          <ReviewSectionRowAssigned {...props} />
          <ReviewSectionRowLastActionDate {...props} />
          <ReviewSectionRowProgress {...props} />
          <ReviewSectionRowAction {...props} />
        </Grid>
      )}
    </div>
  )
}

export default ReviewSectionRow
