import React, { ReactNode } from 'react'
import { Icon, Label } from 'semantic-ui-react'
import strings from '../../utils/constants'
import { User } from '../../utils/generated/graphql'
interface ReviewLabelProps {
  reviewer?: User
  message?: string
}

export const ReviewInProgressLabel: React.FC<ReviewLabelProps> = ({ reviewer }) =>
  reviewer ? (
    <LabelWrapper labelContent={`${strings.REVIEW_IN_PROGRESS_BY} `} reviewer={reviewer} />
  ) : (
    <LabelWrapper
      labelContent={strings.LABEL_ASSIGNED_TO_YOU}
      iconNode={<Icon name="circle" size="tiny" color="blue" />}
      showAsRelevantInfo={true}
    />
  )

export const ReviewLockedLabel: React.FC<ReviewLabelProps> = ({ reviewer }) => (
  <LabelWrapper
    labelContent={`${strings.LABEL_ASSIGNMENT_LOCKED} ${
      reviewer ? '' : strings.ASSIGNMENT_YOURSELF
    }`}
    iconNode={<Icon name="ban" size="small" color="pink" />}
    reviewer={reviewer}
  />
)

export const ReviewLabel: React.FC<ReviewLabelProps> = ({ reviewer, message }) => (
  <LabelWrapper labelContent={message || strings.REVIEW_NOT_FOUND} reviewer={reviewer} />
)

export const ReviewSelfAssignmentLabel: React.FC<ReviewLabelProps> = ({ reviewer }) => (
  <LabelWrapper
    labelContent={
      reviewer ? `${strings.LABEL_ASSIGNMENT_AVAILABLE} ` : strings.LABEL_ASSIGNMENT_SELF
    }
    reviewer={reviewer}
  />
)

export const ReviewByLabel: React.FC<{ user?: User }> = ({ user }) => {
  const doneByYourself = !user
  const reviewLabel = `${strings.REVIEW_IN_PROGRESS_BY} ${
    doneByYourself ? strings.ASSIGNMENT_YOURSELF : ''
  }`
  return <LabelWrapper labelContent={reviewLabel} reviewer={user} />
}

export const ConsolidationByLabel: React.FC<{ user?: User }> = ({ user }) => {
  const doneByYourself = !user
  const consolidationLabel = `${strings.REVIEW_CONSOLIDATION_BY} ${
    doneByYourself ? strings.ASSIGNMENT_YOURSELF : ''
  }`
  return <LabelWrapper labelContent={consolidationLabel} reviewer={user} />
}

interface LabelWrapperProps {
  reviewer?: User
  iconNode?: ReactNode
  labelContent: string
  showAsRelevantInfo?: boolean
}

const LabelWrapper: React.FC<LabelWrapperProps> = ({
  iconNode,
  labelContent,
  reviewer,
  showAsRelevantInfo = false,
}) => (
  <Label
    className={`simple-label ${showAsRelevantInfo ? 'relevant-text' : ''}`}
    icon={iconNode}
    content={
      <>
        {labelContent}
        {reviewer && <ReviewerLabel {...reviewer} />}
      </>
    }
  />
)

const ReviewerLabel: React.FC<User> = ({ firstName, lastName }) => (
  <Label className="simple-label info-text" content={`${firstName || ''} ${lastName || ''}`} />
)
