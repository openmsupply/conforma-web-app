import { TemplateElementCategory } from '../../generated/graphql'
import { ElementStateNEW, FullStructure, PageNEW, Progress, SectionStateNEW } from '../../types'

const initialProgress = {
  doneNonRequired: 0,
  doneRequired: 0,
  completed: false,
  totalNonRequired: 0,
  totalRequired: 0,
  totalSum: 0,
  valid: true,
  firstIncompletePage: Infinity,
}

const calculateCompleted = (totalSum: number, doneRequired: number, doneNonRequired: number) => {
  const totalDone = doneRequired + doneNonRequired
  return totalSum === totalDone
}

const getSectionProgress = (pages: PageNEW[]): Progress => {
  const sectionProgress = pages.reduce(
    (sectionProgress: Progress, { number, progress }) => {
      if (!progress) return sectionProgress
      sectionProgress.doneNonRequired += progress.doneNonRequired || 0
      sectionProgress.totalNonRequired += progress.totalNonRequired || 0
      sectionProgress.doneRequired += progress.doneRequired || 0
      sectionProgress.totalRequired += progress.totalRequired || 0
      sectionProgress.totalSum = sectionProgress.totalRequired + sectionProgress.doneNonRequired
      sectionProgress.completed = calculateCompleted(
        sectionProgress.totalSum,
        sectionProgress.doneRequired,
        sectionProgress.doneNonRequired
      )
      if (!progress.valid) sectionProgress.valid = false
      if (
        sectionProgress.firstIncompletePage &&
        number < sectionProgress.firstIncompletePage &&
        (!progress.valid || progress.doneRequired < progress.totalRequired)
      )
        sectionProgress.firstIncompletePage = number
      return sectionProgress
    },
    { ...initialProgress }
  )
  if (sectionProgress.firstIncompletePage === Infinity) sectionProgress.firstIncompletePage = null
  return sectionProgress
}

export const generateResponsesProgress = (structure: FullStructure) => {
  let firstIncompleteSectionCode = ''
  let firstIncompleteSectionIndex = Infinity
  let firstIncompletePageInSection = Infinity
  const updateFirstInvalid = (section: SectionStateNEW, page: PageNEW) => {
    if (
      section.details.index <= firstIncompleteSectionIndex &&
      page.number < firstIncompletePageInSection &&
      (!page.progress.valid || page.progress.doneRequired < page.progress.totalRequired)
    ) {
      firstIncompletePageInSection = page.number
      firstIncompleteSectionIndex = section.details.index
      firstIncompleteSectionCode = section.details.code
    }
  }
  Object.values(structure.sections).forEach((section) => {
    Object.values(section.pages).forEach((page) => {
      page.progress = { ...initialProgress }
      page.state
        .filter(({ element }) => {
          const { category, isVisible, isEditable } = element as ElementStateNEW
          return isVisible && isEditable && category === TemplateElementCategory.Question
        })
        .forEach(({ element, response }) => {
          const { progress } = page
          const { isRequired } = element as ElementStateNEW
          if (isRequired) progress.totalRequired++
          else progress.totalNonRequired++
          if (response?.text) {
            if (isRequired) progress.doneRequired++
            else progress.doneNonRequired++
          }
          if (typeof response !== 'undefined' && response?.isValid == false) progress.valid = false
          progress.totalSum = progress.totalRequired + progress.doneNonRequired
          progress.completed = calculateCompleted(
            progress.totalSum,
            progress.doneRequired,
            progress.doneNonRequired
          )
        })
      updateFirstInvalid(section, page)
    })
    section.progress = getSectionProgress(Object.values(section.pages))
  })
  structure.info.firstIncompletePage = firstIncompleteSectionCode
    ? {
        sectionCode: firstIncompleteSectionCode,
        pageNumber: firstIncompletePageInSection,
      }
    : null
}
