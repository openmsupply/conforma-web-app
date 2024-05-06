// A websocket connection to listen for either:
// - server gone offline (connection breaks)
// - system placed in "Maintenance" mode by Admin
// In either case, the user will be re-directed to a placeholder "Under
//   Maintenance" site, as specified in Server preferences

import React, { useEffect } from 'react'
import useWebSocket, { ReadyState } from 'react-use-websocket'
import { useUserState } from '../../contexts/UserState'
import { Position, useToast } from '../../contexts/Toast'
import { usePrefs } from '../../contexts/SystemPrefs'

export const ServerStatusListener: React.FC = ({ children }) => {
  const {
    userState: { currentUser },
  } = useUserState()
  const { maintenanceMode, error: prefsError } = usePrefs()
  const { lastMessage, readyState } = useWebSocket('ws://localhost:8080/server-status')
  const { showToast } = useToast({ style: 'negative', position: Position.topLeft })

  const goMaintenanceMode = (redirect: string, serverDown = false) => {
    // Admin is allowed to keep using the site in Maintenance mode
    if (currentUser?.isAdmin && !serverDown) {
      window.setTimeout(() => {
        showToast({
          title: 'Maintenance mode enabled',
          text: "If you weren't the person who enabled this, you should stop what you're doing and log out until maintenance is complete",
          timeout: 10_000,
          style: 'warning',
        })
      }, 500)
      return
    }

    window.setTimeout(
      () =>
        showToast({
          title: 'Server unavailable',
          text: 'The server has gone offline or is under maintenance. You will be re-directed to a holding page in 10 seconds',
          timeout: 9_000,
        }),
      // Small delay to prevent Firefox bug where websocket is considered
      // disconnected even after a page refresh
      500
    )
    window.setTimeout(() => {
      window.location.href = redirect
    }, 10_000)
  }

  if (maintenanceMode.enabled) {
    console.log(currentUser)
    // On initial load, if server in maintenance mode, re-direct immediately so
    // user never sees site
    if (!currentUser?.isAdmin)
      maintenanceMode.redirect && (window.location.href = maintenanceMode.redirect)
    return null
  }

  useEffect(() => {
    if (!lastMessage) return
    const { maintenanceMode, redirect } = JSON.parse(lastMessage.data)
    localStorage.setItem('redirectLocation', redirect)

    if (readyState === ReadyState.CLOSED) goMaintenanceMode(redirect, true)

    if (maintenanceMode) goMaintenanceMode(redirect)
  }, [lastMessage, readyState])
  return <>{children}</>
}