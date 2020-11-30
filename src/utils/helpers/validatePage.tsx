import {
  ApplicationElementStates,
  ElementState,
  ProgressStatus,
  ResponsesByCode,
  ResponseFull,
} from '../../utils/types'

import { TemplateElementCategory } from '../../utils/generated/graphql'

export enum PROGRESS_STATUS {
  NOT_VALID = 'NOT_VALID',
  VALID = 'VALID',
  INCOMPLETE = 'INCOMPLETE',
}

export const getCombinedStatus = (pages: ProgressStatus[] | undefined): ProgressStatus => {
  if (!pages) return PROGRESS_STATUS.VALID
  if (pages.some((status) => status === PROGRESS_STATUS.NOT_VALID)) return PROGRESS_STATUS.NOT_VALID
  if (pages.some((status) => status === PROGRESS_STATUS.INCOMPLETE))
    return PROGRESS_STATUS.INCOMPLETE
  return PROGRESS_STATUS.VALID
}

interface validatePageProps {
  elementsState: ApplicationElementStates
  responses: ResponsesByCode
  currentSectionIndex: number
  page: number
  // validationMode?: ValidationMode
}

/**
 * @function: validate a page
 * Returns page validation status (VALID, NOT_VALID or INCOMPLETE) after checking statuses
 * of all required question and other filled question:
 * NOT_VALID: Any question has an invalid response
 * INCOMPLETE: At least one required question is empty (and no other invalid questions)
 * VALID: All required questions (and other filled questions) have valid responses
 */
const validatePage = ({
  elementsState,
  responses,
  currentSectionIndex,
  page,
}: validatePageProps): ProgressStatus => {
  // Filter visible elements in the current page
  const visibleQuestions = Object.values(elementsState).filter(
    ({ sectionIndex, isVisible, page: pageNum, category }) => {
      console.log(sectionIndex, isVisible, pageNum, page)
      return (
        isVisible &&
        currentSectionIndex === sectionIndex &&
        pageNum === page &&
        category === TemplateElementCategory.Question
      )
    }
  )

  // Generate array with current status of responses for each question to verify
  const responsesStatuses = visibleQuestions.reduce(
    (responsesStatuses: ProgressStatus[], { code, isRequired }: ElementState) => {
      const { text, isValid } = responses[code] as ResponseFull
      const emptyResponse = !text || isValid === null
      if (isRequired && emptyResponse) return [...responsesStatuses, PROGRESS_STATUS.INCOMPLETE]
      // If not required and empty response -> Should return as valid
      else if (emptyResponse) return [...responsesStatuses, PROGRESS_STATUS.VALID]
      return [...responsesStatuses, isValid ? PROGRESS_STATUS.VALID : PROGRESS_STATUS.NOT_VALID]
    },
    []
  )

  // Return the result of combined status for the page
  return getCombinedStatus(responsesStatuses)
}

export default validatePage
