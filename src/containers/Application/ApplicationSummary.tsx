import React, { useEffect, useState } from 'react'
import { ApplicationProps, FullStructure, ResponsesByCode, User } from '../../utils/types'
import useGetFullApplicationStructure from '../../utils/hooks/useGetFullApplicationStructure'
import useSubmitApplication from '../../utils/hooks/useSubmitApplication'
import { useUserState } from '../../contexts/UserState'
import { ApplicationStatus } from '../../utils/generated/graphql'
import { useRouter } from '../../utils/hooks/useRouter'
import { Loading } from '../../components'
import { SectionWrapper } from '../../components/Application'
import strings from '../../utils/constants'
import { Button, Header, Message, Container } from 'semantic-ui-react'

const ApplicationSummary: React.FC<ApplicationProps> = ({ structure }) => {
  const { replace, push } = useRouter()
  const [shouldRevalidate, setShouldRevalidate] = useState(false)
  const [isRevalidated, setIsRevalidated] = useState(false)
  const {
    userState: { currentUser },
  } = useUserState()
  const { error, fullStructure } = useGetFullApplicationStructure({
    structure,
    shouldRevalidate,
  })

  const { error: submitError, processing, submitted, submit } = useSubmitApplication({
    serialNumber: fullStructure?.info.serial as string,
    currentUser: currentUser as User,
  })

  useEffect(() => {
    if (!fullStructure || submitted) return
    // Re-direct if application is not valid
    if (fullStructure.info.firstStrictInvalidPage) {
      const { sectionCode, pageNumber } = fullStructure.info.firstStrictInvalidPage
      replace(`/applicationNEW/${fullStructure.info.serial}/${sectionCode}/Page${pageNumber}`)
    }
    if (shouldRevalidate) setIsRevalidated(true)
  }, [fullStructure])

  const handleSubmit = () => {
    setShouldRevalidate(true)
  }

  useEffect(() => {
    // This should only run after user has clicked Submit
    // and revalidation has completed successfully
    if (!fullStructure?.responsesByCode) return
    submit(Object.values(fullStructure?.responsesByCode))
  }, [isRevalidated])

  useEffect(() => {
    if (submitted) push(`/applicationNEW/${fullStructure?.info.serial}/submission`)
  }, [submitted])

  if (error) return <Message error header={strings.ERROR_APPLICATION_PAGE} list={[error]} />
  if (submitError)
    return <Message error header={strings.ERROR_APPLICATION_SUBMIT} list={[submitError]} />
  if (!fullStructure || processing) return <Loading />
  const { sections, responsesByCode, info } = fullStructure
  return (
    <Container>
      <Header as="h1" content={strings.TITLE_APPLICATION_SUBMIT} />
      {Object.values(sections).map((section) => (
        <SectionWrapper
          key={`ApplicationSection_${section.details.id}`}
          section={section}
          responsesByCode={responsesByCode as ResponsesByCode}
          serial={info.serial}
          isSummary
          canEdit={info.current?.status === ApplicationStatus.Draft}
        />
      ))}
      {info.current?.status === ApplicationStatus.Draft ? (
        <Button content={strings.BUTTON_APPLICATION_SUBMIT} onClick={handleSubmit} />
      ) : null}
      {/* <ModalWarning showModal={showModal} /> */}
    </Container>
  )
}

export default ApplicationSummary
