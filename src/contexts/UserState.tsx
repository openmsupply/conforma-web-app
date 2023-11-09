import React, { createContext, useContext, useReducer, useRef, useMemo } from 'react'
import { useApolloClient } from '@apollo/client'
import fetchUserInfo from '../utils/helpers/fetchUserInfo'
import { Position, useToast } from './Toast'
import { OrganisationSimple, TemplatePermissions, User } from '../utils/types'
import config from '../config'
import { usePrefs } from './SystemPrefs'
import { useRouter } from '../utils/hooks/useRouter'
import { useLanguageProvider } from './Localisation'
import { LoginInactivityTimer } from './LoginInactivityTimer'

type UserState = {
  currentUser: User | null
  templatePermissions: TemplatePermissions
  orgList: OrganisationSimple[]
  isLoading: boolean
  isNonRegistered: boolean | null
}

type OnLogin = (
  JWT: string,
  user?: User,
  templatePermissions?: TemplatePermissions,
  orgList?: OrganisationSimple[]
) => void

export type UserActions =
  | {
      type: 'resetCurrentUser'
    }
  | {
      type: 'setCurrentUser'
      newUser: User
      newPermissions: TemplatePermissions
      newOrgList: OrganisationSimple[]
    }
  | {
      type: 'setLoading'
      isLoading: boolean
    }

type UserProviderProps = { children: React.ReactNode }

const reducer = (state: UserState, action: UserActions) => {
  switch (action.type) {
    case 'resetCurrentUser':
      return initialState
    case 'setCurrentUser':
      const { newUser, newPermissions, newOrgList } = action
      return {
        ...state,
        currentUser: newUser,
        templatePermissions: newPermissions,
        orgList: newOrgList,
        isNonRegistered: newUser.username === config.nonRegisteredUser,
        // tokenExpiryTime: newTokenExpiryTime,
      }
    case 'setLoading':
      const { isLoading } = action
      return {
        ...state,
        isLoading,
      }
    default:
      return state
  }
}

const initialState: UserState = {
  currentUser: null,
  templatePermissions: {},
  orgList: [],
  isLoading: false,
  isNonRegistered: null,
}

// By setting the typings here, we ensure we get intellisense in VS Code
const initialUserContext: {
  userState: UserState
  setUserState: React.Dispatch<UserActions>
  onLogin: OnLogin
  logout: () => void
  refreshJWT: () => void
} = {
  userState: initialState,
  setUserState: () => {},
  onLogin: () => {},
  logout: () => {},
  refreshJWT: () => {},
}

const UserContext = createContext(initialUserContext)

export function UserProvider({ children }: UserProviderProps) {
  const { t } = useLanguageProvider()
  const [state, dispatch] = useReducer(reducer, initialState)
  const userState = state
  const setUserState = dispatch
  const client = useApolloClient()
  const { push } = useRouter()
  const { preferences } = usePrefs()
  const { showToast, clearAllToasts } = useToast()

  let refreshTokenTimer = useRef(0)

  const loginTimer = useMemo(
    () =>
      new LoginInactivityTimer({
        idleTime: 1,
        // preferences.logoutAfterInactivity,
        onLogout: () => {
          logout()
          showToast({
            title: t('MENU_LOGOUT'),
            text: t('LOGOUT_INACTIVITY_ALERT'),
            style: 'negative',
            position: Position.bottomLeft,
            timeout: 0,
          })
        },
      }),
    []
  )

  const logout = () => {
    clearInterval(refreshTokenTimer.current)
    refreshTokenTimer.current = 0
    // Delete everything EXCEPT language preference in localStorage
    const language = localStorage.getItem('language')
    localStorage.clear()
    if (language) localStorage.setItem('language', language)
    client.clearStore()
    setUserState({ type: 'resetCurrentUser' })
    push('/login')
  }

  const delayedLogout = () => {
    const delay = 10 // seconds
    showToast({
      title: t('LOGOUT_ON_NETWORK_ERROR'),
      text: t('LOGOUT_ON_NETWORK_ERROR_MESSAGE', delay),
      style: 'error',
      timeout: delay * 1000,
    })
    setTimeout(logout, delay * 1000)
  }

  const onLogin: OnLogin = (JWT: string, user, templatePermissions, orgList) => {
    if (refreshTokenTimer.current !== 0) {
      console.error('Timer already running!')
      return
    }
    // NOTE: quotes are required in 'undefined', refer to https://github.com/openmsupply/conforma-web-app/pull/841#discussion_r670822649
    clearAllToasts()
    if (JWT == 'undefined' || JWT == undefined) {
      delayedLogout()
      return
    }
    dispatch({ type: 'setLoading', isLoading: true })
    localStorage.setItem(config.localStorageJWTKey, JWT)
    if (!user || !templatePermissions || !user.permissionNames)
      fetchUserInfo({ dispatch: setUserState }, delayedLogout)
    else {
      dispatch({
        type: 'setCurrentUser',
        newUser: user,
        newPermissions: templatePermissions || {},
        newOrgList: orgList || [],
      })
      dispatch({ type: 'setLoading', isLoading: false })
    }

    loginTimer.start()
    refreshTokenTimer.current = window.setInterval(
      refreshJWT,
      // Max prevents timer starting with negative or 0 value
      Math.max((preferences.logoutAfterInactivity - 1) * 60_000, 60_000)
    )
  }

  const refreshJWT = () => {
    console.log(new Date(), 'Refreshing auth token...')
    fetchUserInfo({ dispatch: setUserState }, delayedLogout)
  }

  // Initial check for persisted user in local storage
  const JWT = localStorage.getItem(config.localStorageJWTKey)
  // NOTE: quotes are required in 'undefined', refer to https://github.com/openmsupply/conforma-web-app/pull/841#discussion_r670822649
  if (JWT === 'undefined') logout()
  if (JWT && !userState.currentUser && !userState.isLoading) {
    onLogin(JWT)
  }

  // Return the state and reducer to the context (wrap around the children)
  return (
    <UserContext.Provider value={{ userState, setUserState, onLogin, logout, refreshJWT }}>
      {children}
    </UserContext.Provider>
  )
}

/**
 * To use and set the state of the user from anywhere in the app
 * - @returns an object with a reducer function `setUserState` and the `userState`
 */
export const useUserState = () => useContext(UserContext)
