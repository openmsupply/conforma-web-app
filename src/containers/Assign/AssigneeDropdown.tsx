import React, { useEffect } from 'react'
import { Dropdown, Message } from 'semantic-ui-react'
import strings from '../../utils/constants'

interface AssigneeProps {
  assignmentError: boolean
  assignmentOptions: {
    isCompleted: boolean
    selected: number
    options: {
      key: number
      value: number
      text: string
    }[]
  }
  checkIsLastLevel: (assignee: number) => boolean
  onSelection: (assignee: number) => void
  shouldAssignState: [number | boolean, React.Dispatch<React.SetStateAction<number | boolean>>]
}

const AssigneeDropdown: React.FC<AssigneeProps> = ({
  assignmentError,
  assignmentOptions,
  checkIsLastLevel,
  onSelection,
  shouldAssignState: [shouldAssign, setShouldAssign],
}) => {
  // Do auto-assign for other sections when assignee is selected
  // for assignment in another row when shouldAssign == assignee index
  // Note: This is required to be passed on as props to be processed
  // in each row since the fullStructure is related to each section
  useEffect(() => {
    // Option -1 (UNASSIGNED) or -2 (Re-assign) shouldn't change others
    if ((shouldAssign as number) < 1) return
    onSelection(shouldAssign as number)
  }, [shouldAssign])

  const onAssigneeSelection = async (_: any, { value }: any) => {
    onSelection(value as number)
    // When review isLastLevel then all sections are assigned to same user (similar to consolidation)
    if (checkIsLastLevel(value)) setShouldAssign(value as number)
  }

  const { isCompleted, options, selected } = assignmentOptions

  if (assignmentError) return <Message error title={strings.ERROR_GENERIC} />
  return (
    <Dropdown
      className="reviewer-dropdown"
      options={options}
      value={selected}
      disabled={isCompleted}
      onChange={onAssigneeSelection}
    />
  )
}

export default AssigneeDropdown
