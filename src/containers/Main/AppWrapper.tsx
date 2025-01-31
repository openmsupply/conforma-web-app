import React from 'react'
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom'
import ReactGA from 'react-ga4'
import Login from '../User/Login'
import Verify from '../User/Verification'
import { UserProvider, useUserState } from '../../contexts/UserState'
import { useLanguageProvider } from '../../contexts/Localisation'
import NonRegisteredLogin from '../User/NonRegisteredLogin'
import AuthenticatedContent from './AuthenticatedWrapper'
import { Loading } from '../../components'
import { usePrefs } from '../../contexts/SystemPrefs'
import { trackerTestMode } from './Tracker'
import { ViewportStateProvider } from '../../contexts/ViewportState'
import { ServerStatusListener } from './ServerStatusListener'
import { ParsedUrlQuery } from '../../utils/types'

const AppWrapper: React.FC = () => {
  const { error, loading } = useLanguageProvider()
  const { preferences } = usePrefs()

  if (error) {
    console.error(error)
    return <p>Can't load language provider. {error.message}</p>
  }

  if (loading) {
    return <Loading />
  }

  // Register Google Analytics tracker if a tracking ID and host are specified
  // in prefs.
  const hostMatch = trackerTestMode || window.location.hostname === preferences?.siteHost
  if (preferences?.googleAnalyticsId && hostMatch) {
    ReactGA.initialize([
      {
        trackingId: preferences.googleAnalyticsId,
      },
    ])
  }

  const publicUrls = getPublicUrls(preferences?.publicUrlMap)

  return (
    <Router>
      <ViewportStateProvider>
        <UserProvider>
          <ServerStatusListener>
            <Switch>
              {publicUrls.map(({ url, templateCode, urlQuery }) => (
                <Route key={url} exact path={`/${url}`}>
                  <NonRegisteredLogin templateCode={templateCode} urlQuery={urlQuery} />
                </Route>
              ))}
              <Route exact path="/register">
                <NonRegisteredLogin
                  templateCode={preferences.userRegistrationCode ?? 'UserRegistration'}
                />
              </Route>
              <Route exact path="/reset-password">
                <NonRegisteredLogin templateCode="PasswordReset" />
              </Route>
              <Route exact path="/verify">
                <Verify />
              </Route>
              <Route exact path="/logout">
                <Logout />
              </Route>
              <Route exact path="/login">
                <Login />
              </Route>
              <Route>
                <AuthenticatedContent />
              </Route>
            </Switch>
          </ServerStatusListener>
        </UserProvider>
      </ViewportStateProvider>
    </Router>
  )
}

export default AppWrapper

const Logout: React.FC = () => {
  const { logout } = useUserState()
  logout()
  return null
}

const getPublicUrls = (
  urlPrefs?: Record<string, string | { code: string; urlQuery: ParsedUrlQuery }>
) => {
  if (!urlPrefs) return []
  return Object.entries(urlPrefs).map(([url, value]) => {
    if (typeof value === 'string') return { url, templateCode: value }
    return { url, templateCode: value.code, urlQuery: value.urlQuery }
  })
}
