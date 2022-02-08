import React from 'react'
import { Label, ModalProps } from 'semantic-ui-react'
import { useLanguageProvider } from '../../../contexts/Localisation'

interface AssigneeLabelProps {
  assignee: string
  isReassignment: boolean
  setIsReassignment: React.Dispatch<React.SetStateAction<boolean>>
  setIsUnassignment: () => void
}

const AssigneeLabel: React.FC<AssigneeLabelProps> = ({
  assignee,
  isReassignment,
  setIsReassignment,
  setIsUnassignment,
}) => {
  const { strings } = useLanguageProvider()
  return (
    <>
      <Label
        className="simple-label"
        content={isReassignment ? strings.LABEL_UNASSIGN_FROM : strings.LABEL_REVIEWER}
      />
      <Label content={assignee} />
      {!isReassignment && (
        <>
          <a className="user-action clickable" onClick={() => setIsReassignment(true)}>
            {strings.ACTION_RE_ASSIGN}
          </a>
          <span>{' | '}</span>
        </>
      )}
      <a className="user-action clickable" onClick={setIsUnassignment}>
        {strings.ACTION_UNASSIGN}
      </a>
    </>
  )
}

export default AssigneeLabel
