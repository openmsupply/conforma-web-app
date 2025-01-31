import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from '../../utils/hooks/useRouter'
import { Link } from 'react-router-dom'
import { Header, Icon, Segment, Container } from 'semantic-ui-react'
import { useLanguageProvider } from '../../contexts/Localisation'
import Markdown from '../../utils/helpers/semanticReactMarkdown'
import { getRequest } from '../../utils/helpers/fetchMethods'
import isLoggedIn from '../../utils/helpers/loginCheck'
import getServerUrl from '../../utils/helpers/endpoints/endpointUrlBuilder'

interface Verification {
  success: boolean
  message: string
}

const Verify: React.FC = () => {
  const { t } = useLanguageProvider()
  const {
    query: { uid },
  } = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [verification, setVerification] = useState<Verification>()
  const done = useRef(false)

  const verifyUrl = getServerUrl('verify', { uid })

  useEffect(() => {
    getRequest(verifyUrl).then((result) => {
      // Effect runs twice in Development, which gets a "false" result on second
      // time, so we use the mutable "done" ref to only allow "verification"
      // state to be updated once.
      if (!done.current) {
        done.current = true
        setVerification(result)
        setIsLoading(false)
      }
    })
  }, [])

  if (isLoading) return <p>Loading...</p>

  const icon = verification?.success ? (
    <Icon name="check circle" className="success-colour" size="huge" />
  ) : (
    <Icon name="times circle" className="error-colour" size="huge" />
  )

  return (
    <Container id="application-summary">
      <Segment basic textAlign="center" id="submission-header">
        <Header as="h4" icon>
          {icon}
          {!verification?.success && t('LABEL_VERIFICATION_FAILED')}
        </Header>
        <Markdown text={verification?.message || ''} />
      </Segment>
      <Segment basic textAlign="center" id="submission-nav">
        <p>
          <Link to={'/'}>
            <strong>{isLoggedIn() ? t('MENU_ITEM_DASHBOARD') : t('LABEL_LOG_IN')}</strong>
          </Link>
        </p>
      </Segment>
    </Container>
  )
}

export default Verify
