import React, { useState } from 'react'
import { Container, Header, Label, Message, Segment } from 'semantic-ui-react'
import {
  AssignedSectionsByLevel,
  AssignmentDetails,
  Filters,
  FullStructure,
  SectionDetails,
} from '../../../utils/types'
import { useLanguageProvider } from '../../../contexts/Localisation'
import { Stage } from '../../../components/Review'
import { Loading, NoMatch } from '../../../components/common'
import ReviewLevel from './ReviewLevel'
import {
  ReviewStateProvider,
  useReviewStructureState,
} from '../../../contexts/ReviewStructuresState'
import AssignmentSubmit from './AssignmentSubmit'
import AssignAll from './AssignAll'
import { ApplicationOutcome } from '../../../utils/generated/graphql'
import useLoadAssignments from '../../../utils/hooks/useLoadAssignments'
import AssignmentSectionRow from './AssignmentSectionRow'
import ReviewSectionRow from './ReviewSectionRow'
import { useViewport } from '../../../contexts/ViewportState'

const AssignmentTab: React.FC<{
  fullApplicationStructure: FullStructure
}> = ({ fullApplicationStructure: fullStructure }) => {
  const sectionCodes = Object.keys(fullStructure.sections)
  const { t } = useLanguageProvider()
  const { isMobile } = useViewport()
  const [enableSubmit, setEnableSubmit] = useState<boolean>(false)
  const [assignedSectionsByLevel, setAssignedSectionsByLevel] = useState<AssignedSectionsByLevel>(
    {}
  )
  const [filters, setFilters] = useState<Filters | null>(null)
  const [assignmentError, setAssignmentError] = useState<string | null>(null)

  const { error, loading, assignmentsFiltered, assignmentGroupedLevel, isFullyAssigned } =
    useLoadAssignments({
      info: fullStructure.info,
      sectionCodes,
      filters,
    })

  if (error) return <Message error header={t('ERROR_REVIEW_PAGE')} list={[error]} />

  const {
    info: {
      current: {
        stage: { name: stageName, colour: stageColour },
      },
    },
  } = fullStructure

  const assignAllSections = (reviewerId: number) => {
    const alreadyAssignedSections = new Set(
      assignmentsFiltered.map((assignment) => assignment.assignedSections).flat()
    )
    const allowedSections = assignmentsFiltered.find(
      (assignment) => assignment.reviewer.id === reviewerId
    )?.allowedSections

    // An empty (originally NULL) allowedSections array means "Allow all"
    if (allowedSections?.length === 0) allowedSections.push(...sectionCodes)

    const newAssignments: any = {}
    allowedSections?.forEach((section) => {
      if (!alreadyAssignedSections.has(section))
        newAssignments[section] = { newAssignee: reviewerId }
    })

    const currentReviewLevel = Math.max(Number(Object.keys(assignmentGroupedLevel)))
    setAssignedSectionsByLevel({ ...assignedSectionsByLevel, [currentReviewLevel]: newAssignments })
  }

  const defaultAssignedSections = Object.values(fullStructure.sections).reduce(
    (assignedSections, { details: { code } }) => ({
      ...assignedSections,
      [code]: { newAssignee: undefined },
    }),
    {}
  )

  const AssignmentSection: React.FC<SectionDetails> = ({ id, title, code }) => {
    const { reviewStructuresState } = useReviewStructureState()
    return (
      <Segment key={id}>
        <Header className="section-title" as="h5" content={title} />
        {Object.entries(assignmentGroupedLevel).map(([level, assignments]) => (
          <div className="flex-column" key={`assignment-group-level-${level}`}>
            {fullStructure.info.outcome === ApplicationOutcome.Pending && (
              <AssignmentSectionRow
                assignments={assignments}
                sectionCode={code}
                reviewLevel={Number(level)}
                structure={fullStructure}
                assignedSections={assignedSectionsByLevel[level] || defaultAssignedSections}
                setAssignedSections={(assignedSections) =>
                  setAssignedSectionsByLevel({
                    ...assignedSectionsByLevel,
                    [level]: assignedSections,
                  })
                }
                setEnableSubmit={setEnableSubmit}
                setAssignmentError={setAssignmentError}
              />
            )}
            {(assignments as AssignmentDetails[]).map((assignment) =>
              reviewStructuresState[assignment.id] && assignment.isCurrentUserReviewer ? (
                <ReviewSectionRow
                  key={`review-row-section-${code}-assignment-${assignment.id}`}
                  sectionId={id}
                  fullStructure={fullStructure}
                  reviewAssignment={assignment}
                />
              ) : null
            )}
          </div>
        ))}
      </Segment>
    )
  }

  return (
    <Container id="assignment-tab">
      {assignmentError && (
        <Message
          icon="warning"
          size="small"
          error
          header={t('ASSIGNMENT_ERROR_TITLE')}
          content={assignmentError}
        />
      )}
      <div className="flex-row-space-between-center" id="review-filters-container">
        <ReviewLevel filters={filters} setFilters={setFilters} structure={fullStructure} />
        <div className="centered-flex-box-row">
          {!isMobile && <Label className="uppercase-label" content={t('REVIEW_OVERVIEW_STAGE')} />}
          <Stage name={stageName} colour={stageColour || ''} />
        </div>
      </div>
      {loading ? (
        <Loading />
      ) : !assignmentsFiltered || assignmentsFiltered.length === 0 ? (
        <NoMatch />
      ) : (
        <ReviewStateProvider assignments={assignmentsFiltered}>
          {Object.values(fullStructure.sections).map(({ details }) => (
            <AssignmentSection key={`assignment-section-${details.code}`} {...details} />
          ))}
        </ReviewStateProvider>
      )}
      {!isFullyAssigned && (
        <AssignAll assignments={assignmentsFiltered} setReviewerForAll={assignAllSections} />
      )}
      {fullStructure.info.outcome === ApplicationOutcome.Pending && (
        <AssignmentSubmit
          fullStructure={fullStructure}
          assignedSectionsByLevel={assignedSectionsByLevel}
          assignmentsFiltered={assignmentsFiltered}
          enableSubmit={enableSubmit}
          setAssignmentError={setAssignmentError}
        />
      )}
    </Container>
  )
}

export default AssignmentTab
