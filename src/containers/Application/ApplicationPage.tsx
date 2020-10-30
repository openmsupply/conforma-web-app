import React, { useEffect } from 'react'
import { useRouter } from '../../utils/hooks/useRouter'
import { Loading, ProgressBar } from '../../components'
import { Grid, Label, Segment } from 'semantic-ui-react'
import useLoadApplication from '../../utils/hooks/useLoadApplication'
import { TemplateSectionPayload } from '../../utils/types'
import ElementsArea from './ElementsArea'
import { useApplicationState } from '../../contexts/ApplicationState'

const ApplicationPage: React.FC = () => {
  const { setApplicationState } = useApplicationState()
  const { query, push } = useRouter()
  const { mode, serialNumber, sectionCode, page } = query

  const { error, loading, application, templateSections } = useLoadApplication({
    serialNumber: serialNumber as string,
  })

  useEffect(() => {
    if (application) setApplicationState({ type: 'setApplicationId', id: application.id })
  }, [application])

  const currentSection = templateSections.find(({ code }) => code == sectionCode)

  // const { responsesByCode } = useGetResponsesByCode({ serialNumber: serialNumber as string })

  const changePagePayload = {
    serialNumber: serialNumber as string,
    sectionCode: sectionCode as string,
    currentPage: Number(page),
    sections: templateSections,
    push,
  }

  const checkPagePayload = {
    sectionCode: sectionCode as string,
    currentPage: Number(page),
    sections: templateSections,
  }

  return error ? (
    <Label content="Problem to load application" error={error} />
  ) : loading ? (
    <Loading />
  ) : application && serialNumber && currentSection ? (
    <Segment.Group>
      <Grid stackable>
        <Grid.Column width={4}>
          <ProgressBar templateSections={templateSections} />
        </Grid.Column>
        <Grid.Column width={12} stretched>
          <ElementsArea
            applicationId={application.id}
            sectionTitle={currentSection.title}
            sectionTempId={currentSection.id}
            sectionPage={Number(page)}
            isFirstPage={checkFirstPage(checkPagePayload)}
            isLastPage={checkLastPage(checkPagePayload)}
            onPreviousClicked={() => previousButtonHandler(changePagePayload)}
            onNextClicked={() => nextPageButtonHandler(changePagePayload)}
          />
        </Grid.Column>
      </Grid>
    </Segment.Group>
  ) : (
    <Label content="Application's section can't be displayed" />
  )
}

interface checkPageProps {
  sectionCode: string
  currentPage: number
  sections: TemplateSectionPayload[]
}

function checkFirstPage({ sectionCode, currentPage, sections }: checkPageProps): boolean {
  const previousPage = currentPage - 1
  const currentSection = sections.find(({ code }) => code === sectionCode)
  if (!currentSection) {
    console.log('Problem to find currentSection!')
    return true
  }
  return previousPage > 0 ||
    (previousPage === 0 && sections.find(({ index }) => index === currentSection.index - 1))
    ? false
    : true
}

function checkLastPage({ sectionCode, currentPage, sections }: checkPageProps): boolean {
  const nextPage = currentPage + 1
  const currentSection = sections.find(({ code }) => code === sectionCode)
  if (!currentSection) {
    console.log('Problem to find currentSection!')
    return true
  }
  return nextPage <= currentSection.totalPages ||
    (nextPage > currentSection.totalPages &&
      sections.find(({ index }) => index === currentSection.index + 1))
    ? false
    : true
}

interface changePageProps {
  serialNumber: string
  sectionCode: string
  currentPage: number
  sections: TemplateSectionPayload[]
  push: (path: string) => void
}

function previousButtonHandler({
  serialNumber,
  currentPage,
  sectionCode,
  sections,
  push,
}: changePageProps) {
  const currentSection = sections.find(({ code }) => code === sectionCode)
  if (!currentSection) {
    console.log('Problem to find currentSection!')
    return
  }
  const previousPage = currentPage - 1
  //It should go back a section!
  if (previousPage === 0) {
    const foundSection = sections.find(({ index }) => index === currentSection.index - 1)
    if (foundSection) {
      const { code: previousSection, totalPages: lastPage } = foundSection
      push(`../../${serialNumber}/${previousSection}/page${lastPage}`)
    } else {
      console.log('Problem to load previous page (not found)!')
    }
  } else {
    push(`../../${serialNumber}/${sectionCode}/page${previousPage}`)
  }
}

function nextPageButtonHandler({
  serialNumber,
  currentPage,
  sectionCode,
  sections,
  push,
}: changePageProps) {
  const nextPage = currentPage + 1
  const currentSection = sections.find(({ code }) => code === sectionCode)
  if (!currentSection) {
    console.log('Problem to find currentSection!')
    return
  }
  if (nextPage > currentSection.totalPages) {
    const foundSection = sections.find(({ index }) => index === currentSection.index + 1)
    if (foundSection) {
      const { code: nextSection } = foundSection
      push(`../../${serialNumber}/${nextSection}/page1`)
    } else {
      push('../summary')
    }
  } else {
    push(`../../${serialNumber}/${sectionCode}/page${nextPage}`)
  }
}

export default ApplicationPage
