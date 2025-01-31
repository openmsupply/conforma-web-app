import React, { createContext, useContext, useEffect, useState } from 'react'
import { LanguageOption } from './Localisation'
import { getRequest } from '../utils/helpers/fetchMethods'
import getServerUrl from '../utils/helpers/endpoints/endpointUrlBuilder'
// @ts-ignore -- no types declarations available
import Css from 'json-to-css'
import { ParsedUrlQuery } from '../utils/types'

interface Preferences {
  paginationPresets?: number[]
  paginationDefault?: number
  defaultLanguageCode?: string
  brandLogoFileId?: string
  brandLogoOnDarkFileId?: string
  defaultListFilters?: string[]
  showDocumentModal: boolean
  googleAnalyticsId?: string
  siteHost?: string
  userRegistrationCode?: string
  style?: Record<string, object>
  helpLinks?: { text: string; link: string }[]
  footerText?: string
  footerLogoId?: string
  logoutAfterInactivity: number
  publicUrlMap?: Record<string, string | { code: string; urlQuery: ParsedUrlQuery }>
}
interface PrefsState {
  preferences: Preferences
  languageOptions?: LanguageOption[]
  latestSnapshot?: string
  loading: boolean
  maintenanceMode: { enabled: boolean; redirect?: string }
  error?: Error
}

const defaultPrefs: Preferences = {
  showDocumentModal: false,
  logoutAfterInactivity: 60,
  userRegistrationCode: 'UserRegistration',
}

interface PrefsContext extends PrefsState {
  refetchPrefs: () => void
}

const SystemPrefsContext = createContext<PrefsContext>({
  loading: true,
  preferences: defaultPrefs,
  refetchPrefs: () => {},
  maintenanceMode: { enabled: false },
})

export const SystemPrefsProvider = ({ children }: { children: React.ReactNode }) => {
  const [prefsState, setPrefsState] = useState<PrefsState>({
    loading: true,
    preferences: defaultPrefs,
    maintenanceMode: { enabled: false },
  })

  useEffect(() => {
    fetchPrefs()
  }, [])

  const fetchPrefs = async () => {
    getRequest(getServerUrl('prefs'))
      .then((result) => {
        const { languageOptions, preferences, latestSnapshot, maintenanceMode } = result
        setPrefsState({
          languageOptions,
          preferences: { ...defaultPrefs, ...preferences },
          latestSnapshot,
          maintenanceMode,
          loading: false,
        })

        // Install custom CSS into document head
        if (preferences.style) {
          const cssString = Css.of(preferences.style)
          document.head.appendChild(document.createElement('style')).innerHTML = cssString
        }

        // Save the offline-redirect destination to localStorage so we can
        // redirect there if the server is down on a later visit
        if (maintenanceMode?.redirect)
          localStorage.setItem('redirectLocation', maintenanceMode.redirect)
      })
      .catch((err) => {
        setPrefsState({
          loading: false,
          error: err,
          preferences: defaultPrefs,
          maintenanceMode: { enabled: false },
        })
      })
  }

  return (
    <SystemPrefsContext.Provider value={{ ...prefsState, refetchPrefs: fetchPrefs }}>
      {children}
    </SystemPrefsContext.Provider>
  )
}

export const usePrefs = () => useContext(SystemPrefsContext)
