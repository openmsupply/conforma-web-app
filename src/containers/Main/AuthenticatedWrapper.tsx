import React from 'react'
import SiteLayout from './SiteLayout'
import { useRouter } from '../../utils/hooks/useRouter'
import isLoggedIn from '../../utils/helpers/loginCheck'
import NonRegisteredLogin from '../User/NonRegisteredLogin'
import { Redirect } from 'react-router'

const AuthenticatedContent: React.FC = () => {
  const { location, query } = useRouter()

  const { pathname, search } = location

  // If there is a sessionId in the URL, then need to login as nonRegistered
  // before continuing
  if (query.sessionId && !isLoggedIn()) return <NonRegisteredLogin redirect={pathname + search} />

  if (isLoggedIn()) return <SiteLayout />

  return <Redirect to={{ pathname: '/login', state: { from: location.pathname } }} />
}

export default AuthenticatedContent
