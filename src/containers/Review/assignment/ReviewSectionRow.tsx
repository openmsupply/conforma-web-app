import React from 'react'
import { Grid, Message } from 'semantic-ui-react'
import { Loading } from '../../../components'
import {
  ReviewSectionRowAssigned,
  ReviewSectionRowLastActionDate,
  ReviewSectionRowProgress,
  ReviewSectionRowAction,
} from '../../../components/Review'
import { useLanguageProvider } from '../../../contexts/Localisation'
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
  assignment: AssignmentDetails
  previousAssignment: AssignmentDetails
  fullApplicationStructure: FullStructure
  shouldAssignState: [number, React.Dispatch<React.SetStateAction<number>>]
}

const ReviewSectionRow: React.FC<ReviewSectionRowProps> = ({
  sectionId,
  assignment,
  previousAssignment,
  fullApplicationStructure,
  shouldAssignState,
}) => {
  const { strings } = useLanguageProvider()
  const { fullReviewStructure, error } = useGetReviewStructureForSections({
    reviewAssignment: assignment,
    fullApplicationStructure,
    filteredSectionIds: [sectionId],
  })

  if (error) return <Message error title={strings.ERROR_GENERIC} list={[error]} />
  if (!fullReviewStructure) return <Loading />

  const section = fullReviewStructure.sortedSections?.find(
    (section) => section.details.id === sectionId
  )

  if (!section) return null

  const thisReview = fullReviewStructure?.thisReview
  const isAssignedToCurrentUser = !!section?.assignment?.isAssignedToCurrentUser

  const props: ReviewSectionComponentProps = {
    fullStructure: fullReviewStructure,
    section,
    assignment,
    previousAssignment,
    thisReview,
    action: section?.assignment?.action || ReviewAction.unknown,
    isConsolidation: section.assignment?.isConsolidation || false,
    isAssignedToCurrentUser,
    shouldAssignState,
  }

  const canRenderRow =
    section?.assignment?.isAssignedToCurrentUser ||
    section?.assignment?.action === ReviewAction.canSelfAssign ||
    section?.assignment?.action === ReviewAction.canMakeDecision ||
    section?.assignment?.isReviewable

  return (
    <>
      {canRenderRow && (
        <Grid className="review-section-row" verticalAlign="middle">
          <Grid.Row columns={4}>
            <ReviewSectionRowAssigned {...props} />
            <ReviewSectionRowLastActionDate {...props} />
            <ReviewSectionRowProgress {...props} />
            <ReviewSectionRowAction {...props} />
          </Grid.Row>
        </Grid>
      )}
    </>
  )
}

export default ReviewSectionRow