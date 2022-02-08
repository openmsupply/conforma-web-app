import React, { useEffect, useState } from 'react'
import { Grid, Label, ModalProps } from 'semantic-ui-react'
import ModalConfirmation from '../../../components/Main/ModalConfirmation'
import { useUserState } from '../../../contexts/UserState'
import { useLanguageProvider } from '../../../contexts/Localisation'
import { useUnassignReviewAssignmentMutation } from '../../../utils/generated/graphql'
import { AssignmentDetails, FullStructure, SectionAssignee } from '../../../utils/types'
import AssigneeDropdown from './AssigneeDropdown'
import useGetAssignmentOptions from './useGetAssignmentOptions'
import Reassignment from './Reassignment'
import AssigneeLabel from './AssigneeLabel'

const NOT_ASSIGNED = 0

type AssignmentSectionRowProps = {
  assignments: AssignmentDetails[]
  sectionCode: string
  structure: FullStructure
  assignedSectionsState: [SectionAssignee, React.Dispatch<React.SetStateAction<SectionAssignee>>]
}
// Component renders options calculated in getAssignmentOptions, and will execute assignment mutation on drop down change
const AssignmentSectionRow: React.FC<AssignmentSectionRowProps> = (props) => {
  const { strings } = useLanguageProvider()
  const UNASSIGN_MESSAGE = {
    title: strings.UNASSIGN_TITLE,
    message: strings.UNASSIGN_MESSAGE,
    option: strings.BUTTON_SUBMIT,
  }
  const getAssignmentOptions = useGetAssignmentOptions()
  const { assignments, sectionCode, structure, assignedSectionsState } = props
  const {
    userState: { currentUser },
  } = useUserState()
  const [isReassignment, setIsReassignment] = useState(false)
  const [assignmentError, setAssignmentError] = useState(false)
  const [unassignmentError, setUnassignmentError] = useState(false)
  const [showUnassignmentModal, setShowUnassignmentModal] = useState<ModalProps>({ open: false })
  const [unassignSectionFromUser] = useUnassignReviewAssignmentMutation()
  const [assignedSections] = assignedSectionsState
  const [originalAssignee, setOriginalAssignee] = useState<string>()
  const elements = Object.values(structure?.elementsById || {})

  useEffect(() => {
    if (assignmentOptions?.selected != NOT_ASSIGNED) {
      const foundPreviousAssignee = assignments.find(
        ({ reviewer }) => assignmentOptions?.selected === reviewer.id
      )
      if (foundPreviousAssignee) {
        const { reviewer } = foundPreviousAssignee
        setOriginalAssignee(`${reviewer?.firstName || ''} ${reviewer.lastName || ''}`)
      }
    }
  }, [])

  const assignmentOptions = getAssignmentOptions(
    {
      assignments,
      sectionCode,
      elements,
      assignee: assignedSections[sectionCode]?.newAssignee,
    },
    currentUser
  )
  if (!assignmentOptions) return null

  const onSelectedOption = async (value: number) => {
    if (value === assignmentOptions.selected) return
    // if (value === AssignmentEnum.REASSIGN) setIsReassignment(true)

    // if (value === AssignmentEnum.UNASSIGN) {
    // const unassignment = assignments.find(
    //   (assignment) => assignment.reviewer.id === assignmentOptions.selected
    // )

    // }
  }

  const isLastLevel = (selected: number): boolean => {
    const assignment = assignments.find((assignment) => assignment.reviewer.id === selected)
    if (!assignment) return false
    return assignment.isLastLevel
  }

  const setIsUnassignment = () => {
    if (!showUnassignmentModal.open)
      setShowUnassignmentModal({
        ...UNASSIGN_MESSAGE,
        open: true,
        onClick: () => unassignAssignee(),
        onClose: () => setShowUnassignmentModal({ open: false }),
      })
  }

  const unassignAssignee = async () => {
    const unassignment = assignments.find(
      (assignment) => assignment.reviewer.id === assignmentOptions.selected
    )
    if (!unassignment) return
    try {
      await unassignSectionFromUser({ variables: { unassignmentId: unassignment.id } })
    } catch (e) {
      console.log(e)
      setUnassignmentError(true)
    }
  }

  return (
    <Grid className="section-single-row-box-container">
      <Grid.Row>
        <Grid.Column className="centered-flex-box-row">
          {originalAssignee ? (
            <AssigneeLabel
              assignee={originalAssignee}
              isReassignment={isReassignment}
              setIsReassignment={setIsReassignment}
              setIsUnassignment={setIsUnassignment}
            />
          ) : (
            <>
              <Label className="simple-label" content={strings.LABEL_REVIEWER} />
              <AssigneeDropdown
                assignmentError={assignmentError || unassignmentError}
                assignmentOptions={assignmentOptions}
                sectionCode={sectionCode}
                checkIsLastLevel={isLastLevel}
                onSelection={onSelectedOption}
                assignedSectionsState={assignedSectionsState}
              />
            </>
          )}
        </Grid.Column>
      </Grid.Row>
      <Grid.Row>
        {isReassignment && (
          <Reassignment
            assignments={assignments}
            sectionCode={sectionCode}
            elements={elements}
            isLastLevel={isLastLevel}
            previousAssignee={assignmentOptions.selected}
            assignedSectionsState={assignedSectionsState}
          />
        )}
        <ModalConfirmation {...showUnassignmentModal} />
      </Grid.Row>
    </Grid>
  )
}

export default AssignmentSectionRow
