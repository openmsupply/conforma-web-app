import React, { CSSProperties, useState } from 'react'
import { Dropdown, Grid, Message } from 'semantic-ui-react'
import strings from '../../utils/constants'
import { ReviewAssignmentStatus } from '../../utils/generated/graphql'
import useUpdateReviewAssignment from '../../utils/hooks/useUpdateReviewAssignment'
import { AssignmentDetails, FullStructure } from '../../utils/types'

const NOT_ASSIGNED = 0
const UNASSIGN = -1

type AssignmentSectionRowProps = {
  assignments: AssignmentDetails[]
  sectionCode: string
  structure: FullStructure
}
// Component renders options calculated in getAssignmentOptions, and will execute assignment mutation on drop down change
const AssignmentSectionRow: React.FC<AssignmentSectionRowProps> = (props) => {
  const { structure, sectionCode, assignments } = props
  const [assignmentError, setAssignmentError] = useState(false)

  const { assignSectionToUser } = useUpdateReviewAssignment(structure)

  const onAssignment = async (_: any, { value: newValue }: any) => {
    if (newValue === NOT_ASSIGNED || newValue === value) return
    if (newValue === UNASSIGN) return console.log('un assignment not implemented')
    const assignment = assignments.find((assignment) => assignment.reviewer.id === newValue)
    if (!assignment) return

    try {
      await assignSectionToUser({ assignment, sectionCode })
    } catch (e) {
      console.log(e)
      setAssignmentError(true)
    }
  }

  const assignmentOptions = getAssignmentOptions(props)

  if (!assignmentOptions) return null

  const { options, selected: value } = assignmentOptions

  if (assignmentError) return <Message error title={strings.ERROR_GENERIC} />
  return (
    <Grid columns="equal" verticalAlign="middle" style={inlineStyles.grid}>
      <Grid.Column floated="left">
        <div style={inlineStyles.container}>
          <div style={inlineStyles.title}>{strings.LABEL_REVIEWED_BY}</div>
          <Dropdown
            options={options}
            value={value}
            onChange={onAssignment}
            style={inlineStyles.dropdown}
          />
        </div>
      </Grid.Column>
    </Grid>
  )
}

const getOptionFromAssignment = ({ reviewer, isCurrentUserReviewer }: AssignmentDetails) => ({
  key: reviewer.id,
  value: reviewer.id,
  text: isCurrentUserReviewer
    ? strings.ASSIGNMENT_YOURSELF
    : `${reviewer.firstName || ''} ${reviewer.lastName || ''}`,
})

const getAssignmentOptions = ({ assignments, sectionCode }: AssignmentSectionRowProps) => {
  const currentSectionAssignable = assignments.filter(
    ({ assignableSectionRestrictions }) =>
      assignableSectionRestrictions.length === 0 ||
      assignableSectionRestrictions.includes(sectionCode)
  )

  const currentUserAssignable = currentSectionAssignable.filter(
    (assignment) => assignment.isCurrentUserAssigner
  )

  // Dont' want to render assignment section row if they have no actions
  if (currentUserAssignable.length === 0) return null

  // This could differ from currentUserAssignable list because self assignable assignments don't have assigner
  const currentlyAssigned = assignments.find(
    (assignment) =>
      assignment.status === ReviewAssignmentStatus.Assigned &&
      matchAssignmentToSection(assignment, sectionCode)
  )

  // For now just show an option to un assign
  if (currentlyAssigned)
    return {
      selected: currentlyAssigned.reviewer.id,
      options: [
        getOptionFromAssignment(currentlyAssigned),
        {
          key: UNASSIGN,
          value: UNASSIGN,
          text: strings.ASSIGNMENT_UNASSIGN,
        },
      ],
    }

  return {
    selected: NOT_ASSIGNED,
    options: [
      ...currentUserAssignable.map((assignment) => getOptionFromAssignment(assignment)),
      {
        key: NOT_ASSIGNED,
        value: NOT_ASSIGNED,
        text: strings.ASSIGNMENT_NOT_ASSIGNED,
      },
    ],
  }
}
// Find at least one reviewQuestion assignment in assignment that matches sectionCode
const matchAssignmentToSection = (assignment: AssignmentDetails, sectionCode: string) =>
  assignment.reviewQuestionAssignments.some(
    (reviewQuestionAssignment) =>
      reviewQuestionAssignment.templateElement?.section?.code === sectionCode
  )

// Styles - TODO: Move to LESS || Global class style (semantic)
const inlineStyles = {
  grid: { borderRadius: 10 },
  container: { display: 'flex', alignItems: 'center' } as CSSProperties,
  title: { fontWeight: 500 } as CSSProperties,
  dropdown: {
    border: '2px solid rgb(150,150, 150)',
    marginLeft: 10,
    fontSize: 12,
    padding: 10,
    fontWeight: 800,
    paddingTop: 2,
    paddingBottom: 2,
    borderRadius: 4,
  } as CSSProperties,
}

export default AssignmentSectionRow
