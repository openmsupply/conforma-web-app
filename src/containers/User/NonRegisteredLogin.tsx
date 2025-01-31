import React, { useState, useEffect } from 'react'
import { useRouter } from '../../utils/hooks/useRouter'
import isLoggedIn from '../../utils/helpers/loginCheck'
import { attemptLogin } from '../../utils/helpers/attemptLogin'
import { useUserState } from '../../contexts/UserState'
import { useLanguageProvider } from '../../contexts/Localisation'
import { LoginPayload, ParsedUrlQuery } from '../../utils/types'
import config from '../../config'
import queryString from 'query-string'

interface NonRegisteredLoginProps {
  templateCode?: string
  urlQuery?: ParsedUrlQuery
  redirect?: string
}

const NonRegisteredLogin: React.FC<NonRegisteredLoginProps> = ({
  templateCode,
  urlQuery,
  redirect,
}) => {
  const { t } = useLanguageProvider()

  const [networkError, setNetworkError] = useState('')
  const { push, query, location } = useRouter()
  const { onLogin, userState } = useUserState()

  useEffect(() => {
    // Don't let a logged in user go to NonRegistered content
    const username = userState.currentUser?.username
    if (isLoggedIn() && username !== config.nonRegisteredUser) {
      push('/')
      return
    }

    // Log in as 'nonRegistered' user to be able to apply for publicly available
    // templates (e.g. PasswordReset, UserRegistration)
    attemptLogin({
      username: config.nonRegisteredUser,
      password: '',
      sessionId: (query.sessionId as string) ?? undefined,
      onLoginSuccess,
    }).catch((error) => {
      setNetworkError(error.message)
    })
  }, [])

  const onLoginSuccess = async (loginResult: LoginPayload) => {
    const { JWT, user, templatePermissions, orgList } = loginResult
    await onLogin(JWT, user, templatePermissions, orgList)

    // Make sure any custom query properties are included in the subsequent
    // re-direct
    const urlQueryString = location.search.replace('?', '')
    const originalQueryString = urlQueryString ? '&' + urlQueryString : ''

    const queryStringFromPrefs = queryString.stringify(urlQuery ?? {})

    const fullQueryString = queryStringFromPrefs
      ? `${originalQueryString}&${queryStringFromPrefs}`
      : originalQueryString

    if (redirect) {
      push(redirect)
      return
    }

    push(`/application/new?type=${templateCode}${fullQueryString}`)
  }

  if (networkError) return <p>{networkError}</p>
  else return <p>{t('LOGIN_REDIRECT_TO_REGISTRATION')}</p>
}

export default NonRegisteredLogin
