import React, { useEffect, useState } from 'react'
import { Button, Header, Message, Container } from 'semantic-ui-react'
import { ApplicationProps, MethodToCallProps, ResponsesByCode, User } from '../../utils/types'
import useSubmitApplication from '../../utils/hooks/useSubmitApplication'
import { useUserState } from '../../contexts/UserState'
import { ApplicationStatus } from '../../utils/generated/graphql'
import { useRouter } from '../../utils/hooks/useRouter'
import { Loading, SectionWrapper } from '../../components'
import { useLanguageProvider } from '../../contexts/Localisation'
import useQuerySectionActivation from '../../utils/hooks/useQuerySectionActivation'
import usePageTitle from '../../utils/hooks/usePageTitle'
import { Link } from 'react-router-dom'

const isProductionBuild = process.env.NODE_ENV === 'production' // To-do: add to config

const ApplicationSummary: React.FC<ApplicationProps> = ({
  structure: fullStructure,
  requestRevalidation,
}) => {
  const { t } = useLanguageProvider()
  const { replace, push, query } = useRouter()
  const [error, setError] = useState(false)

  const {
    userState: { currentUser },
  } = useUserState()

  usePageTitle(t('PAGE_TITLE_APPLICATION', fullStructure.info.serial))

  const { submit } = useSubmitApplication({
    serialNumber: fullStructure?.info.serial as string,
    currentUser: currentUser as User,
  })

  const { isSectionActive, toggleSection } = useQuerySectionActivation({
    defaultActiveSectionCodes: Object.keys(fullStructure?.sections),
  })

  useEffect(() => {
    if (!fullStructure) return

    if (query.dev === 'true' && !isProductionBuild) return

    // Re-direct based on application status
    if (fullStructure.info.current.status === ApplicationStatus.ChangesRequired)
      replace(`/application/${fullStructure.info.serial}`)

    // This shouldn't be needed, but just for extra defence -- if the validity
    // check below is allowed to proceed on completed applications, it gets into
    // an infinite re-direct loop
    if (fullStructure.info.current.status === ApplicationStatus.Completed) return

    // Re-direct if application is not valid
    if (fullStructure.info.firstStrictInvalidPage) {
      const { sectionCode, pageNumber } = fullStructure.info.firstStrictInvalidPage
      replace(`/application/${fullStructure.info.serial}/${sectionCode}/Page${pageNumber}`)
    }
  }, [fullStructure])

  const handleSubmit = () => {
    requestRevalidation &&
      requestRevalidation(
        async ({ firstStrictInvalidPage, setStrictSectionPage }: MethodToCallProps) => {
          if (firstStrictInvalidPage && query.dev !== 'true' && isProductionBuild) {
            const { sectionCode, pageNumber } = firstStrictInvalidPage
            setStrictSectionPage(firstStrictInvalidPage)
            replace(`/application/${fullStructure.info.serial}/${sectionCode}/Page${pageNumber}`)
          } else {
            try {
              await submit(fullStructure)
              push(`/application/${fullStructure?.info.serial}/submission`)
            } catch (e) {
              console.log(e)
              setError(true)
            }
          }
        }
      )
  }

  if (error) return <Message error header={t('ERROR_APPLICATION_SUBMIT')} list={[error]} />
  if (!fullStructure) return <Loading />
  const {
    sections,
    stages,
    responsesByCode,
    info: {
      name,
      serial,
      current: { status },
      isChangeRequest,
    },
  } = fullStructure

  const isSubmitted = status !== ApplicationStatus.Draft

  return (
    <Container id="application-summary" className="white-container-decoration">
      <div id="application-summary-header">
        <Header
          as="h2"
          textAlign="center"
          content={isSubmitted ? t('TITLE_APPLICATION_SUBMITTED') : t('TITLE_APPLICATION_SUMMARY')}
          subheader={
            <Header.Subheader
              className="center-text"
              content={isSubmitted ? name : t('SUBTITLE_APPLICATION_SUMMARY')}
            />
          }
        />
      </div>
      <div id="application-summary-content">
        <div id="application-sections">
          {Object.values(sections)
            .filter(({ details }) => details.active)
            .map((section) => (
              <SectionWrapper
                key={`ApplicationSection_${section.details.id}`}
                isActive={isSectionActive(section.details.code)}
                toggleSection={toggleSection(section.details.code)}
                section={section}
                responsesByCode={responsesByCode as ResponsesByCode}
                applicationData={fullStructure.info}
                stages={stages.map(({ stage }) => stage)}
                serial={serial}
                isSummary
                canEdit={status === ApplicationStatus.Draft}
                isUpdating={isChangeRequest}
              />
            ))}
        </div>
        {status === ApplicationStatus.Draft ? (
          <div id="application-submit">
            <Button
              primary
              className="button-wide"
              onClick={handleSubmit}
              content={t('BUTTON_SUBMIT_APPLICATION')}
            />
            <p>
              <Link to={`/application/${fullStructure.info.serial}`}>
                <strong>{t('LABEL_APPLICATION_BACK')}</strong>
              </Link>
            </p>
          </div>
        ) : null}
      </div>
    </Container>
  )
}

export default ApplicationSummary
