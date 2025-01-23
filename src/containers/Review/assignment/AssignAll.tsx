import React, { useState } from 'react'
import { Dropdown, Label } from 'semantic-ui-react'
import { Tooltip } from '../../../components/common'
import { useLanguageProvider } from '../../../contexts/Localisation'
import { useUserState } from '../../../contexts/UserState'
import { AssignmentDetails } from '../../../utils/types'

interface AssignAllProps {
  assignments: AssignmentDetails[]
  setReviewerForAll: (value: number) => void
}

const AssignAll: React.FC<AssignAllProps> = ({ assignments, setReviewerForAll }) => {
  const {
    userState: { currentUser },
  } = useUserState()
  const { t } = useLanguageProvider()
  const [selected, setSelected] = useState<number | string>('')
  const options = getReviewerList(assignments, currentUser?.userId ?? 0, t('ASSIGNMENT_YOURSELF'))

  // We only want to show when we're not in last level, as that auto-assigns
  // already
  const isLastLevel = assignments.length > 0 && assignments[0].isLastLevel

  if (isLastLevel || options.length === 0) return null

  return (
    <div className="flex-row-start-center" id="review-assign-all">
      <Label className="uppercase-label" content={t('ASSIGN_ALL_TO')} />
      <Dropdown
        className="reviewer-dropdown"
        placeholder={t('ASSIGNMENT_NOT_ASSIGNED')}
        options={options}
        value={selected}
        scrolling
        search
        onChange={(_, { value }) => {
          setReviewerForAll(value as number)
          setSelected(value as number | string)
        }}
      />
      <Tooltip
        message={t('ASSIGN_ALL_TOOLTIP')}
        maxWidth={400}
        iconStyle={{ height: '1.4em' }}
        triggerEvent="hover"
      />
    </div>
  )
}

const getReviewerList = (
  assignments: AssignmentDetails[],
  currentUserId: number,
  selfString: string
) => {
  const assigneeOptions = assignments
    // We don't want to filter here, as when the back-end has "allowedSections =
    // null", it means "allow all". Worst case, if the reviewer really is
    // allowed "no sections" (which shouldn't happen), then they'll show up in
    // the menu, but still won't actually be able to be assigned
    // .filter((assignment) => assignment.allowedSections.length > 0)
    .map(({ reviewer }) => ({
      key: reviewer.id,
      value: reviewer.id,
      text:
        currentUserId === reviewer.id ? selfString : `${reviewer.firstName} ${reviewer.lastName}`,
    }))

  // Move current user "Yourself" to top of list
  const currentUserOption = assigneeOptions.find((option) => option.value === currentUserId)

  // Sort and Remove currentUser from the list (to be added at the top)
  const sortedOptions = assigneeOptions
    .filter((option) => option.key !== currentUserId)
    .sort((a, b) => (a.text < b.text ? -1 : 1))

  if (currentUserOption) sortedOptions.unshift(currentUserOption)

  return sortedOptions
}

export default AssignAll
