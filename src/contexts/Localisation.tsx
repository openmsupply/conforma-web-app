import React, { createContext, useContext, useEffect, useState } from 'react'
import defaultStrings from '../utils/defaultLanguageStrings'
import { getRequest } from '../utils/helpers/fetchMethods'
import { PluginProvider } from '../formElementPlugins/pluginProvider'
import getServerUrl from '../utils/helpers/endpoints/endpointUrlBuilder'
import { mapValues, mapKeys } from 'lodash-es'
import Markdown from '../utils/helpers/semanticReactMarkdown'

const savedLanguageCode = localStorage.getItem('language')

// For matching {{replacementKey}} in localised strings
const stringReplacementRegex = /{{([A-z0-9]+)}}/gm

const initSelectedLanguage: LanguageOption = {
  code: savedLanguageCode ?? '',
  languageName: '',
  description: '',
  flag: '',
  locale: '',
  enabled: true,
}

type LanguageProviderProps = {
  children: React.ReactNode
  languageOptions: LanguageOption[]
  defaultLanguageCode: string
  refetchPrefs: () => void
}

export type LanguageOption = {
  languageName: string
  description: string
  code: string
  locale: string
  flag: string // To-do: limit to flag emojis
  enabled: boolean
}

export type LanguageStrings = { [Property in keyof typeof defaultStrings]: string }

interface LanguageState {
  languageOptions: LanguageOption[]
  selectedLanguage: LanguageOption
  strings: LanguageStrings
  loading: boolean
  error: any
}

type Substitutions = Record<string, unknown> | string | number

export type TranslateMethod = (
  key: keyof typeof defaultStrings,
  substitutions?: Substitutions
) => string

type TranslateMarkdownMethod = (
  key: keyof typeof defaultStrings,
  substitutions?: Substitutions
) => JSX.Element

export type TranslatePluginMethod = (key: string, substitutions?: Substitutions) => string

const initialContext: {
  selectedLanguage: LanguageOption
  languageOptions: LanguageOption[]
  languageOptionsFull: LanguageOption[]
  loading: boolean
  error: any
  setLanguage: Function
  refetchLanguages: Function
  translate: TranslateMethod
  t: TranslateMethod
  translateMarkdown: TranslateMarkdownMethod
  tFormat: TranslateMarkdownMethod
  getPluginTranslator: (pluginCode: string) => TranslatePluginMethod
} = {
  selectedLanguage: initSelectedLanguage,
  languageOptions: [],
  languageOptionsFull: [],
  loading: true,
  error: null,
  setLanguage: () => {},
  refetchLanguages: () => {},
  translate: () => '',
  t: () => '',
  translateMarkdown: () => <></>,
  tFormat: () => <></>,
  getPluginTranslator: () => () => '',
}

const LanguageProviderContext = createContext(initialContext)

// Get localisation strings from all form element plugins
export const getPluginStrings = () => {
  let pluginStrings = {}
  for (const plugin of Object.values(PluginProvider)) {
    try {
      const strings = plugin.localisation
      pluginStrings = {
        ...pluginStrings,
        ...mapKeys(strings, (_, key) => `${plugin.config.code}.${key}`),
      }
    } catch {
      //
    }
  }
  return pluginStrings
}

const allDefaultStrings = { ...defaultStrings, ...getPluginStrings() }

export function LanguageProvider({
  children,
  languageOptions,
  defaultLanguageCode,
  refetchPrefs,
}: LanguageProviderProps) {
  const [languageState, setLanguageState] = useState<LanguageState>({
    languageOptions,
    selectedLanguage: initSelectedLanguage,
    strings: allDefaultStrings,
    loading: true,
    error: null,
  })
  const [selectedLanguageCode, setSelectedLanguageCode] = useState<string>(
    savedLanguageCode ?? defaultLanguageCode
  )
  const [shouldRefetchStrings, setShouldRefetchStrings] = useState(false)

  // Load initial language and fetch options list
  const updateLanguageState = async (languageCode: string) => {
    setLanguageState({ ...languageState, loading: true })
    const { languageOptions } = languageState
    try {
      const selectedLanguage =
        languageOptions.find((lang: LanguageOption) => lang.code === languageCode) ??
        languageOptions[0]
      // Safety in case stored language code is no longer available on server
      setSelectedLanguageCode(selectedLanguage.code)
      const strings = (await getLanguageStrings(languageCode)) as LanguageStrings
      setLanguageState({
        ...languageState,
        languageOptions,
        selectedLanguage,
        strings,
        loading: false,
      })
      localStorage.setItem('language', languageCode)
    } catch (err) {
      setLanguageState({
        ...languageState,
        loading: false,
        error: err,
      })
      localStorage.removeItem('language')
    }
  }

  // If the selected language is no longer valid (either disabled or uninstalled), then try default, or fallback to first available
  const getValidLanguageCode = () => {
    if (languageOptions.some((lang) => lang.enabled && lang.code === selectedLanguageCode))
      return selectedLanguageCode
    if (languageOptions.some((lang) => lang.enabled && lang.code === defaultLanguageCode))
      return defaultLanguageCode
    else {
      const firstAvailableLanguageCode = languageOptions.filter(({ enabled }) => enabled)[0].code
      console.log(
        `Invalid language code, falling back to first available: ${firstAvailableLanguageCode}`
      )
      return firstAvailableLanguageCode
    }
  }

  // Reload language options from prefs, and (optionally) refresh the current
  // strings
  const refetchLanguages = async (reloadStrings = false) => {
    if (reloadStrings) setShouldRefetchStrings(true)
    refetchPrefs()
  }

  const translate: TranslateMethod = (key, substitutions = {}) =>
    getTranslation(languageState.strings, key, substitutions)

  const translateMarkdown: TranslateMarkdownMethod = (key, substitutions = {}) => {
    return (
      <Markdown
        text={getTranslation(languageState.strings, key, substitutions)}
        semanticComponent="noParagraph"
      />
    )
  }

  // Same as the regular "translate" function, except appends the pluginCode as
  // key. We use the pluginCode as part of the key to avoid collisions if
  // plugins happen to use the same keys as the main app.
  const translatePlugin = (pluginCode: string, key: string, substitutions: Substitutions = {}) => {
    const fullKey = `${pluginCode}.${key}`
    return getTranslation(languageState.strings, fullKey, substitutions)
  }

  // Fetch new language when language code changes
  useEffect(() => {
    updateLanguageState(selectedLanguageCode)
  }, [selectedLanguageCode])

  // Update language state whenever Options refetched from Prefs
  useEffect(() => {
    setLanguageState((state) => ({ ...state, languageOptions }))
    const validCode = getValidLanguageCode()
    if (validCode !== selectedLanguageCode) setSelectedLanguageCode(validCode)
    else if (shouldRefetchStrings) updateLanguageState(validCode)
    setShouldRefetchStrings(false)
  }, [languageOptions])

  return (
    <LanguageProviderContext.Provider
      value={{
        selectedLanguage: languageState.selectedLanguage,
        languageOptions: languageState.languageOptions.filter(
          (lang: LanguageOption) => lang?.enabled
        ),
        languageOptionsFull: languageState.languageOptions,
        loading: languageState.loading,
        error: languageState.error,
        setLanguage: setSelectedLanguageCode,
        refetchLanguages,
        translate,
        t: translate,
        translateMarkdown: translateMarkdown,
        tFormat: translateMarkdown,
        getPluginTranslator: (pluginCode) => (key, substitutions) =>
          translatePlugin(pluginCode, key, substitutions),
      }}
    >
      {children}
    </LanguageProviderContext.Provider>
  )
}

export const useLanguageProvider = () => useContext(LanguageProviderContext)

const getLanguageStrings = async (code: string) => {
  // If default language code not available on server, just use local defaults
  if (code === 'default') return allDefaultStrings
  // Else fetch language file from server
  const fetchedStrings = await getRequest(getServerUrl('language', { code }))
  if (fetchedStrings?.error) throw new Error(`Language code: ${code}, ${fetchedStrings?.message}`)
  return consolidateStrings(allDefaultStrings, fetchedStrings)
}

// Checks all keys from English master list in remoteStrings, and provide
// English fallback if missing or empty string.
const consolidateStrings = (refStrings: LanguageStrings, remoteStrings: LanguageStrings) =>
  mapValues(refStrings, (englishString, key: keyof LanguageStrings) =>
    remoteStrings?.[key] ? remoteStrings?.[key] : englishString
  )

// Returns translated string with substitutions
const getTranslation = (
  strings: Record<string, string>,
  key: string,
  substitutions: Substitutions
) => {
  let localisedString = strings[key]
  if (localisedString === undefined) return key

  if (typeof substitutions === 'string' || typeof substitutions === 'number') {
    const match = localisedString.match(/{{([A-z0-9]+)}}/m)
    if (match) {
      substitutions = { [match[1]]: substitutions }
    } else substitutions = {}
  }

  // "{{count}}" is a special replacement, where an alternative string can be
  // provided for certain numbers, usually a single value (1).
  if ('count' in substitutions) {
    const altKey = `${key}_${substitutions.count}` as keyof typeof strings
    if (strings[altKey]) localisedString = strings[altKey]
  }

  return localisedString.replace(stringReplacementRegex, (match, sub) =>
    String((substitutions as Record<string, unknown>)[sub] ?? match)
  )
}
