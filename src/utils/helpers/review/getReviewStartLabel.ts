import strings from '../../constants'

export enum REVIEW_STATUS {
  DRAFT = 'Draft',
  PENDING = 'Pending',
  CHANGES_REQUESTED = 'ChangesRequested',
  SUBMITTED = 'Submitted',
  LOCKED = 'Locked',
}

const getReviewStartLabel = (status: string) => {
  // TODO: Not use strings here - use the type
  switch (status as REVIEW_STATUS) {
    case REVIEW_STATUS.DRAFT:
      return strings.BUTTON_REVIEW_CONTINUE
    case REVIEW_STATUS.PENDING:
      return strings.BUTTON_REVIEW_RE_REVIEW
    case REVIEW_STATUS.CHANGES_REQUESTED:
      return strings.BUTTON_REVIEW_MAKE_UPDATES
    case REVIEW_STATUS.SUBMITTED || REVIEW_STATUS.LOCKED:
      return strings.BUTTON_REVIEW_VIEW
    default:
      return status
  }
}

export default getReviewStartLabel
