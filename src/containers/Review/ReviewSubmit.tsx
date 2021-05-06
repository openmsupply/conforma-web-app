import React, { useState } from 'react'
import { Button, Form, Label, ModalProps } from 'semantic-ui-react'
import { ModalWarning } from '../../components'
import ModalConfirmation from '../../components/Main/ModalConfirmation'
import ReviewComment from '../../components/Review/ReviewComment'
import ReviewDecision from '../../components/Review/ReviewDecision'
import strings from '../../utils/constants'
import { Decision, ReviewStatus } from '../../utils/generated/graphql'
import useGetDecisionOptions from '../../utils/hooks/useGetDecisionOptions'
import { useRouter } from '../../utils/hooks/useRouter'
import useSubmitReview from '../../utils/hooks/useSubmitReview'
import messages from '../../utils/messages'
import { FullStructure } from '../../utils/types'

type ReviewSubmitProps = {
  structure: FullStructure
  scrollTo: (code: string) => void
}

const ReviewSubmit: React.FC<ReviewSubmitProps> = (props) => {
  const { structure } = props
  const thisReview = structure?.thisReview
  const reviewDecision = thisReview?.reviewDecision
  const {
    decisionOptions,
    getDecision,
    setDecision,
    getAndSetDecisionError,
    isDecisionError,
  } = useGetDecisionOptions(structure.canSubmitReviewAs, thisReview)

  return (
    <Form id="review-submit-area">
      <ReviewDecision
        decisionOptions={decisionOptions}
        setDecision={setDecision}
        isDecisionError={isDecisionError}
        isEditable={thisReview?.status == ReviewStatus.Draft}
      />
      <ReviewComment
        isEditable={thisReview?.status == ReviewStatus.Draft}
        reviewDecisionId={Number(reviewDecision?.id)}
      />
      <ReviewSubmitButton
        {...props}
        getDecision={getDecision}
        getAndSetDecisionError={getAndSetDecisionError}
      />
    </Form>
  )
}

type ReviewSubmitButtonProps = {
  getDecision: () => Decision
  getAndSetDecisionError: () => boolean
}

const ReviewSubmitButton: React.FC<ReviewSubmitProps & ReviewSubmitButtonProps> = ({
  scrollTo,
  structure,
  getDecision,
  getAndSetDecisionError,
}) => {
  const {
    location: { pathname },
    replace,
  } = useRouter()

  const [showModalConfirmation, setShowModalConfirmation] = useState<ModalProps>({ open: false })
  const [showWarningModal, setShowWarningModal] = useState<ModalProps>({ open: false })
  // TODO: Show on message
  const [submissionError, setSubmissionError] = useState<boolean>(false)
  const submitReview = useSubmitReview(Number(structure.thisReview?.id))
  const setAttemptSubmission = () => (structure.attemptSubmission = true)
  const attemptSubmissionFailed = structure.attemptSubmission && structure.firstIncompleteReviewPage

  const setWarning = (message: {}) => {
    setShowWarningModal({
      open: true,
      ...message,
      onClick: () => setShowWarningModal({ open: false }),
      onClose: () => setShowWarningModal({ open: false }),
    })
  }

  const onClick = () => {
    const firstIncompleteReviewPage = structure.firstIncompleteReviewPage

    // Check INCOMPLETE
    if (firstIncompleteReviewPage) {
      const { sectionCode, pageNumber } = firstIncompleteReviewPage

      replace(`${pathname}?activeSections=${sectionCode}`)
      scrollTo(`${sectionCode}P${pageNumber}`)
      setAttemptSubmission()
      return
    }

    // Check DECISION was made
    const decisionError = getAndSetDecisionError()
    if (decisionError) {
      setWarning(messages.REVIEW_DECISION_SET_FAIL)
      return
    }

    // Can SUBMIT
    setShowModalConfirmation({ open: true, ...messages.REVIEW_SUBMISSION_CONFIRM })
  }

  const submission = async () => {
    try {
      await submitReview(structure, getDecision())
    } catch (e) {
      console.log(e)
      setShowModalConfirmation({ open: false })
      setSubmissionError(true)
    }
  }

  if (structure.thisReview?.status !== ReviewStatus.Draft) return null

  return (
    <Form.Field>
      <Button
        primary
        className={attemptSubmissionFailed ? 'alert wide-button' : 'wide-button'}
        onClick={() => onClick()}
        content={strings.BUTTON_REVIEW_SUBMIT}
      />
      {attemptSubmissionFailed && (
        <Label className="simple-label alert-text" content={messages.REVIEW_SUBMISSION_FAIL} />
      )}
      <ModalWarning showModal={showWarningModal} />
      <ModalConfirmation
        modalProps={showModalConfirmation}
        onClick={() => submission()}
        onClose={() => setShowWarningModal({ open: false })}
      />
    </Form.Field>
  )
}
export default ReviewSubmit
