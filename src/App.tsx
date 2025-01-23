import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom'
import { ApolloClient, ApolloProvider, createHttpLink, NormalizedCacheObject } from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
import { onError } from '@apollo/client/link/error'
import { persistCache } from 'apollo3-cache-persist'
import '../semantic/src/semantic.less'
import getServerUrl from './utils/helpers/endpoints/endpointUrlBuilder'
import config from './config'
import cache from './cache'
import { usePrefs } from './contexts/SystemPrefs'
import { ToastProvider } from './contexts/Toast'
import { LanguageOption, LanguageProvider } from './contexts/Localisation'
import { AdminLogin } from './containers/User/Login'
import { AppWrapper } from './containers/Main'
import { Loading } from './components'

// Adds authorisation header with token from local storage (to be used on every
// request) see
// https://www.apollographql.com/docs/react/networking/authentication/#header
const authLink = setContext((_, { headers }) => {
  const JWT = localStorage.getItem(config.localStorageJWTKey)
  return {
    headers: {
      ...headers,
      authorization: JWT ? `Bearer ${JWT}` : '',
    },
  }
})

// Needed to link or 'chain' commands in Apollo Clients (so that headers can be
// added to every apollo request) see
// https://www.apollographql.com/docs/react/networking/authentication/#header
const httpLink = createHttpLink({
  uri: ({ operationName }) => {
    // return `http://localhost:8080/graphql?dev=${operationName}`
    return `${getServerUrl('graphQL')}?dev=${operationName}`
  },
})

const errorLink = onError(({ graphQLErrors }) => {
  if (graphQLErrors)
    graphQLErrors.forEach((err) => {
      if (err.message === 'invalid signature') {
        console.log('Authentication error, logging out...')
        location.reload()
      }
    })
})

// On iPhone, focusing on input fields causes the viewport to auto-zoom in. We
// can prevent this by setting `maximum-scale=1`, but this makes Android devices
// not be able to manually zoom at all, hence we need to conditionally apply it.
// See https://weblog.west-wind.com/posts/2023/Apr/17/Preventing-iOS-Safari-Textbox-Zooming
if (navigator.userAgent.indexOf('iPhone') > -1) {
  document
    .querySelector('[name=viewport]')
    ?.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1')
}

function App() {
  const [client, setClient] = useState<ApolloClient<NormalizedCacheObject> | undefined>(undefined)
  const { preferences, languageOptions, error, loading, refetchPrefs, maintenanceMode } = usePrefs()

  useEffect(() => {
    const client = new ApolloClient({
      link: authLink.concat(errorLink).concat(httpLink),
      cache,
    })
    setClient(client)

    persistCache({
      cache,
      storage: window.localStorage,
      /**
       * Storage options.
       */
      // Maximum size of cache to persist (in bytes).
      // Defaults to 1048576 (1 MB). For unlimited cache size, provide false.
      // If exceeded, persistence will pause and app will start up cold on next launch.
      maxSize: 3_145_728, // 3MB

      /**
       * Debugging options.
       */
      // Enable console logging.
      // debug: boolean,
    }).then(() => {
      // TODO: Check when this would run!
      client.onResetStore(async () => cache.reset())
      setClient(client)
    })
    return () => {}
  }, [])

  if (error) {
    console.error(error)
    // Redirect to a previously stored "downtime" site
    const redirect = localStorage.getItem('redirectLocation')
    if (redirect && config.isProductionBuild) {
      console.log("Can't load preferences, re-directing to downtime site")
      window.location.href = redirect
      return null
    } else return <p>Can't load preferences. {error?.message}</p>
  }

  return client && !loading ? (
    <ApolloProvider client={client}>
      <Router>
        <ToastProvider>
          <LanguageProvider
            languageOptions={languageOptions as LanguageOption[]}
            defaultLanguageCode={preferences?.defaultLanguageCode as string}
            refetchPrefs={refetchPrefs}
          >
            <Switch>
              {maintenanceMode.enabled && (
                <Route exact path="/admin-login">
                  <AdminLogin />
                </Route>
              )}
              <Route>
                <AppWrapper />
              </Route>
            </Switch>
          </LanguageProvider>
        </ToastProvider>
      </Router>
    </ApolloProvider>
  ) : (
    <Loading />
  )
}

export default App
