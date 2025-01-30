// A websocket connection to listen for either:
// - server gone offline (connection breaks)
// - system placed in "Maintenance" mode by Admin
// In either case, the user will be re-directed to a placeholder "Under
//   Maintenance" site, as specified in Server preferences

// Enable TESTING_MODE to see the same behaviour in Development as it would be
// in Production
const TESTING_MODE = false

import React, { useEffect, useRef, useState } from 'react'
import useWebSocket from 'react-use-websocket'
import { useUserState } from '../../contexts/UserState'
import { Position, useToast } from '../../contexts/Toast'
import isLoggedIn from '../../utils/helpers/loginCheck'
import getServerUrl from '../../utils/helpers/endpoints/endpointUrlBuilder'
import { usePrefs } from '../../contexts/SystemPrefs'
import { useLanguageProvider } from '../../contexts/Localisation'
import config from '../../config'

interface RedirectStatus {
  destination: string | null
  state: null | 'delayed' | 'immediate'
}
// "delayed" -- means redirect notification came while the user was already
// using the site, so we give them a little warning

// "immediate" -- means notification came on first load, so we redirect
// immediately before user even sees the site

const frontendVersion = config.version

export const ServerStatusListener: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useLanguageProvider()
  const {
    userState: { currentUser },
    onLogin,
  } = useUserState()
  const { maintenanceMode } = usePrefs()
  const [redirectStatus, setRedirectStatus] = useState<RedirectStatus>({
    destination: null,
    state: null,
  })
  const [serverDisconnected, setServerDisconnected] = useState(false)
  const { isProductionBuild } = config
  const timerId = useRef<number | undefined>()

  const productionBehaviour = isProductionBuild || TESTING_MODE

  useWebSocket(getServerUrl('serverStatus'), {
    onOpen: () => {
      if (serverDisconnected && productionBehaviour) {
        setServerDisconnected(false)
        clearAllToasts()
        showToast({
          title: t('SERVER_RECONNECTED'),
          text: t('SERVER_RECONNECTED_TEXT'),
          style: 'success',
        })
        // This will force logout if the server's private key has changed
        const JWT = localStorage.getItem(config.localStorageJWTKey) ?? ''
        onLogin(JWT)
      }
    },
    onClose: (event) => {
      console.log('Close event', event)
      if (event.code === 1006) setServerDisconnected(true)
    },
    onError: (error) => {
      console.log('Error', error)
    },
    onMessage: (message) => {
      const data = JSON.parse(message.data)
      console.log('Message', data)
      if (typeof data !== 'object') return
      // Version check -- force reload if different to server version:
      if (data.version && data.version !== frontendVersion) {
        console.log('New version:', data.version)
        console.log('Reloading...')
        showToast({
          title: t('SERVER_VERSION_MISMATCH'),
          text: t('SERVER_VERSION_MISMATCH_TEXT'),
          style: 'warning',
        })
        setTimeout(() => location.reload(), 5_000)
      }

      // Maintenance Mode
      if (data.maintenanceMode === false) {
        window.clearTimeout(timerId.current)
        timerId.current = undefined
        showToast({
          title: t('SERVER_MAINTENANCE_OFF'),
          text: t('SERVER_MAINTENANCE_OFF_TEXT'),
          style: 'positive',
        })
        localStorage.removeItem('maintenanceMode')
      } else if (data.maintenanceMode) {
        setRedirectStatus({
          destination: data.redirect,
          state: data.force ? 'immediate' : 'delayed',
        })
        localStorage.setItem('maintenanceMode', 'ON')
      }
    },
    shouldReconnect: (event) => event.code === 1006,
    reconnectAttempts: 6,
    reconnectInterval: () => {
      console.log('Attempting to reconnect')
      return 5000
    },
    onReconnectStop: () => {
      console.log('Unable to reconnect, giving up...')
      if (maintenanceMode.redirect && productionBehaviour)
        window.location.href = maintenanceMode.redirect
    },
  })
  const { showToast, clearAllToasts } = useToast({ style: 'negative', position: Position.topLeft })

  // This effect handles the site intentionally being put into a "maintenance"
  // state (by an Admin)
  useEffect(() => {
    if ((isLoggedIn() && !currentUser) || !redirectStatus.state) return

    if (currentUser?.isAdmin) {
      if (redirectStatus.state === 'delayed')
        window.setTimeout(() => {
          showToast({
            title: t('SERVER_MAINTENANCE_ON'),
            text: t('SERVER_MAINTENANCE_ON_TEXT'),
            timeout: 10_000,
            style: 'warning',
          })
        }, 500)
      return
    }

    if (!productionBehaviour) return

    if (redirectStatus.state === 'immediate') {
      window.location.href = redirectStatus.destination as string
      return
    }

    showToast({
      title: t('SERVER_UNAVAILABLE'),
      text: t('SERVER_UNAVAILABLE_TEXT'),
      timeout: 9_000,
    })
    timerId.current = window.setTimeout(() => {
      window.location.href = redirectStatus.destination as string
    }, 10_000)
  }, [redirectStatus, currentUser])

  // This effect handles the server unexpectedly becoming unavailable
  useEffect(() => {
    if (serverDisconnected && productionBehaviour) {
      showToast({
        title: t('SERVER_OFFLINE'),
        text: t('SERVER_OFFLINE_TEXT'),
        timeout: 60_000,
        style: 'error',
      })
    }
  }, [serverDisconnected])

  if (isLoggedIn() && !currentUser) return null

  return <>{children}</>
}
