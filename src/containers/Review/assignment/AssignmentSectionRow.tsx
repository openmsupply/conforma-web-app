import React, { useEffect, useState, SetStateAction } from 'react'
import { Grid, Label } from 'semantic-ui-react'
import useConfirmModal from '../../../utils/hooks/useConfirmModal'
import { useLanguageProvider } from '../../../contexts/Localisation'
import { AssignmentDetails, FullStructure, SectionAssignee } from '../../../utils/types'
import AssigneeDropdown from './AssigneeDropdown'
import useGetAssignmentOptions from './useGetAssignmentOptions'
import Reassignment from './Reassignment'
import AssigneeLabel from './AssigneeLabel'
import useUpdateAssignment from '../../../utils/hooks/useUpdateAssignment'

const NOT_ASSIGNED = 0

type AssignmentSectionRowProps = {
  assignments: AssignmentDetails[]
  sectionCode: string
  reviewLevel: number
  structure: FullStructure
  assignedSections: SectionAssignee
  setAssignedSections: (assingedSections: SectionAssignee) => void
  setEnableSubmit: React.Dispatch<SetStateAction<boolean>>
  setAssignmentError: React.Dispatch<SetStateAction<string | null>>
}
// Component renders options calculated in getAssignmentOptions, and will execute assignment mutation on drop down change
const AssignmentSectionRow: React.FC<AssignmentSectionRowProps> = ({
  assignments,
  sectionCode,
  reviewLevel,
  structure,
  assignedSections,
  setAssignedSections,
  setEnableSubmit,
  setAssignmentError,
}) => {
  const { strings } = useLanguageProvider()
  const { ConfirmModal, showModal } = useConfirmModal({
    title: strings.UNASSIGN_TITLE,
    message: strings.UNASSIGN_MESSAGE,
    OKText: strings.BUTTON_SUBMIT,
  })

  const { submitAssignments } = useUpdateAssignment({
    fullStructure: structure,
  })
  const getAssignmentOptions = useGetAssignmentOptions()
  const [isReassignment, setIsReassignment] = useState(false)
  const [originalAssignee, setOriginalAssignee] = useState<string>()

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

  useEffect(() => {
    if (Object.values(assignedSections).some(({ newAssignee }) => newAssignee !== undefined))
      setEnableSubmit(true)
  }, [assignedSections])

  const assignmentOptions = getAssignmentOptions({
    assignments,
    sectionCode,
    // elements,
    assignee: assignedSections?.[sectionCode]?.newAssignee,
  })
  if (!assignmentOptions) return null

  const onAssigneeSelection = async (assignee: number) => {
    // When review isLastLevel then all sections are assigned to same user (similar to consolidation)
    if (isLastLevel()) {
      let allSectionsToUserId: SectionAssignee = {}
      Object.keys(assignedSections).forEach(
        (sectionCode) => (allSectionsToUserId[sectionCode] = { newAssignee: assignee as number })
      )
      setAssignedSections(allSectionsToUserId)
    } else
      setAssignedSections({
        ...assignedSections,
        [sectionCode]: { newAssignee: assignee as number },
      })
  }

  const isLastLevel = (): boolean => assignments.length > 0 && assignments[0].isLastLevel

  const unassignAssignee = async () => {
    const unassignment = assignments.find(
      (assignment) => assignment.reviewer.id === assignmentOptions.selected
    )
    const sectionToUnassign = null
    // NOTE: We currently unassign ALL sections from a reviewer at once. If we
    // want to change this to only unassign the selected section, then enable
    // the commented-out lines below instead of the line above. Ideally this
    // would be user-selectable

    // const sectionToUnassign: SectionAssignee = {
    //   [sectionCode]: { previousAssignee: unassignment?.reviewer.id, newAssignee: undefined },
    // }
    if (!unassignment) return
    try {
      await submitAssignments(Number(reviewLevel), sectionToUnassign, [unassignment])
    } catch (e) {
      console.log(e)
      setAssignmentError(strings.ASSIGNMENT_ERROR_UNASSIGN)
    }
  }

  const isSelfAssignment = !assignmentOptions.options.some(
    ({ text }) => text != strings.ASSIGNMENT_YOURSELF
  )

  const levelName =
    structure.stages
      .find(({ stage: { number } }) => number === structure.info.current.stage.number)
      ?.levels.find(({ number }) => reviewLevel === number)?.name || strings.ERROR_LEVEL_NOT_FOUND

  return (
    <Grid columns={2} className="section-single-row-box-container">
      <Grid.Row className="assigning-row">
        <Grid.Column className="review-level" width={7}>
          <Label className="simple-label">
            {strings.REVIEW_FILTER_LEVEL}: <strong>{levelName}</strong>
          </Label>
        </Grid.Column>
        <Grid.Column className="centered-flex-box-row" width={9}>
          {originalAssignee ? (
            <AssigneeLabel
              assignee={originalAssignee}
              isCompleted={assignmentOptions.isCompleted}
              isSelfAssigned={isSelfAssignment}
              isReassignment={isReassignment}
              setIsReassignment={setIsReassignment}
              setIsUnassignment={() => showModal({ onOK: () => unassignAssignee() })}
            />
          ) : (
            assignmentOptions.options.length > 1 && (
              <>
                <Label className="simple-label" content={strings.LABEL_REVIEWER} />
                <AssigneeDropdown
                  assignmentOptions={assignmentOptions}
                  sectionCode={sectionCode}
                  onChangeMethod={(selected: number) => onAssigneeSelection(selected)}
                />
              </>
            )
          )}
        </Grid.Column>
      </Grid.Row>
      {isReassignment && (
        <Grid.Row>
          <Reassignment
            assignments={assignments}
            sectionCode={sectionCode}
            isLastLevel={isLastLevel}
            previousAssignee={assignmentOptions.selected}
            assignedSections={assignedSections}
            setAssignedSections={setAssignedSections}
          />
        </Grid.Row>
      )}
      <ConfirmModal />
    </Grid>
  )
}

export default AssignmentSectionRow
