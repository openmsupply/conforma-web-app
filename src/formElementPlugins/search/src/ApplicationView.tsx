const DEBOUNCE_TIMEOUT = 350 //milliseconds

import React, { useEffect, useState } from 'react'
import { Search, Label, Card, Icon, Form, List, ListItem } from 'semantic-ui-react'
import { ApplicationViewProps } from '../../types'
import { useUserState } from '../../../contexts/UserState'
import { useLanguageProvider } from '../../../contexts/Localisation'
import { substituteValues } from '../../../utils/helpers/utilityFunctions'
import FigTree from '../../../figTreeEvaluator'
import useDebounce from './useDebounce'
import './styles.css'
import useDefault from '../../useDefault'
import { SemanticICONS } from 'semantic-ui-react/dist/commonjs/generic'
import { EvaluatorNode } from 'fig-tree-evaluator'

interface DisplayFormat {
  title?: string
  subtitle?: string
  description?: string
  simple?: boolean
}

interface SearchParameters {
  label?: string
  description?: string
  placeholder: string
  source: EvaluatorNode
  icon: SemanticICONS
  multiSelect: boolean
  minCharacters: number
  restrictCase?: 'upper' | 'lower'
  trimWhiteSpace?: boolean
  inputPattern?: string
  inputExample?: string
  inputErrorMessage?: string
  displayFormat: { title: string; subtitle: string; description: string }
  resultFormat: { title: string; description: string }
  textFormat: string
  displayType: 'card' | 'list' | 'input'
  default: Response | Response[]
  searchErrorMap: Record<string, string>
}

const ApplicationView: React.FC<ApplicationViewProps> = ({
  element,
  parameters,
  currentResponse,
  validationState,
  onSave,
  Markdown,
  applicationData,
  allResponses,
}) => {
  const { getPluginTranslator } = useLanguageProvider()
  const t = getPluginTranslator('search')
  const {
    label,
    description,
    placeholder = t('DEFAULT_PLACEHOLDER'),
    source,
    icon = 'search',
    multiSelect = false,
    minCharacters = 1,
    restrictCase,
    trimWhiteSpace = false,
    inputPattern,
    inputExample = 'a',
    inputErrorMessage = t('INPUT_ERROR'),
    displayFormat = { title: '', subtitle: '', description: '' },
    resultFormat = displayFormat,
    textFormat = '',
    displayType = 'card',
    default: defaultValue,
    searchErrorMap = {},
  } = parameters as SearchParameters

  const {
    userState: { currentUser },
  } = useUserState()

  const inputRegex = inputPattern ? new RegExp(inputPattern) : undefined

  const [searchText, setSearchText] = useState(
    displayType === 'input' && !!currentResponse?.selection
      ? substituteValues(
          displayFormat.title ?? displayFormat.description,
          currentResponse.selection[0]
        )
      : ''
  )
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [selection, setSelection] = useState<any[]>(
    currentResponse?.selection
      ? Array.isArray(currentResponse.selection)
        ? currentResponse.selection
        : [currentResponse.selection]
      : []
  )
  const [searchError, setSearchError] = useState<string>()
  const [inputError, setInputError] = useState(false)
  const [_, setIsFocused] = useState(false)
  const [resultsOpen, setResultsOpen] = useState(false)
  const { isEditable } = element

  const [debounceOutput, setDebounceInput] = useDebounce<string>('', DEBOUNCE_TIMEOUT)

  useDefault({
    defaultValue,
    currentResponse,
    parameters,
    onChange: (defaultSelection) => {
      if (!defaultSelection) {
        setSelection([])
        return
      }
      setSelection(Array.isArray(defaultSelection) ? defaultSelection : [defaultSelection])
      setSearchText(
        displayType === 'input' && !!currentResponse?.selection
          ? substituteValues(displayFormat.title ?? displayFormat.description, defaultSelection)
          : ''
      )
    },
  })

  useEffect(() => {
    onSave({
      text: getTextFormat(textFormat, selection),
      selection,
    })
  }, [selection])

  useEffect(() => {
    if (!debounceOutput || inputError) return
    evaluateSearchQuery(debounceOutput)
  }, [debounceOutput])

  const evaluateSearchQuery = (text: string) => {
    const search = { text }
    FigTree.evaluate(source, {
      data: { search, currentUser, applicationData, responses: allResponses },
    })
      .then((results: any) => {
        if (results == null) {
          setResults([])
        } else if (!Array.isArray(results)) setResults([results])
        else setResults(results)
        setDebounceInput('')
        setLoading(false)
        setResultsOpen(true)
        setSearchError(undefined)
      })
      .catch((err) => {
        setSearchError(getMappedErrorMessage(err.message, searchErrorMap))
        console.error('Search error:', err.message)
        setDebounceInput('')
        setLoading(false)
        setResults([])
      })
  }

  const handleChange = (e: any) => {
    // With "Input" style, we clear the selection if the user changes the input
    // string (otherwise it remains even though it's not displayed anywhere)
    if (displayType === 'input') setSelection([])

    let text = trimWhiteSpace ? e.target.value.trim() : e.target.value

    if (restrictCase === 'upper') text = text.toUpperCase()
    if (restrictCase === 'lower') text = text.toUpperCase()

    const inputValid = partialMatch(text, inputExample, inputRegex)

    if (!inputValid) {
      setInputError(true)
      setLoading(false)
    } else setInputError(false)

    setSearchText(text)

    if (text.length < minCharacters) {
      setResultsOpen(false)
      return
    }
    setDebounceInput(text)
    if (inputValid) {
      setLoading(true)
      setResultsOpen(false)
    }
  }

  const handleSelect = (_: any, data: any) => {
    setResultsOpen(false)
    const selectedResult = results[data.result.index]
    if (!selectedResult) return // Don't select "Loading" item
    if (!multiSelect) setSelection([selectedResult])
    else setSelection([...selection, selectedResult])
    setSearchText(
      displayType === 'input'
        ? substituteValues(displayFormat.title ?? displayFormat.description, selectedResult)
        : ''
    )
    setInputError(false)
  }

  const handleFocus = (e: any) => {
    setIsFocused(true)
    setSearchError(undefined)
    if (displayType === 'input' && !loading && !inputError && searchText.length >= minCharacters)
      setResultsOpen(true)
    // This makes the component perform a new search when re-focusing (if no
    // selection already), as changes in other elements may have changed some of
    // the dynamic parameters in this element
    if (searchText.length > 0 && selection.length === 0) handleChange(e)
  }

  const deleteItem = async (index: number) => {
    setSelection(selection.filter((_, i) => i !== index))
  }

  const createResultsArray = (results: any[], resultsFormat: DisplayFormat) => {
    const { title, description } = resultsFormat
    const noFormatProvided = !title && !description
    return results.map((result: any, index: number) => {
      const titleString = noFormatProvided
        ? getDefaultString(result, t('MESSAGE_NO_RESULTS'))
        : title
        ? substituteValues(title, result)
        : ''
      const descriptionString = noFormatProvided
        ? getDefaultString(result, t('MESSAGE_NO_RESULTS'), 'description')
        : description
        ? substituteValues(description, result)
        : ''
      return {
        index,
        key: `result-${index}`,
        title: titleString,
        description: descriptionString,
      }
    })
  }

  const displayProps: DisplayProps = {
    selection,
    displayFormat,
    displayType,
    deleteItem: isEditable ? deleteItem : () => {},
    Markdown,
    isEditable,
  }

  const isError = !validationState.isValid || inputError || searchError
  const errorMessage = inputError
    ? inputErrorMessage
    : !validationState.isValid
    ? validationState?.validationMessage ?? t('VALIDATION_ERROR')
    : searchError

  return (
    <>
      {label && (
        <label>
          <Markdown text={label} semanticComponent="noParagraph" />
        </label>
      )}
      <Markdown text={description} />
      <Form.Field key={`search-${label}`} error={isError}>
        <Search
          value={searchText}
          loading={loading}
          onFocus={handleFocus}
          onSearchChange={handleChange}
          onResultSelect={handleSelect}
          minCharacters={minCharacters}
          placeholder={placeholder}
          results={
            loading ? [{ title: t('MESSAGE_LOADING') }] : createResultsArray(results, resultFormat)
          }
          disabled={!isEditable}
          input={{ icon, iconPosition: 'left' }}
          noResultsMessage={t('MESSAGE_NO_RESULTS')}
          onBlur={() => setIsFocused(false)}
          open={resultsOpen}
        />
        {!errorMessage ? null : <Label pointing prompt content={errorMessage} />}
      </Form.Field>
      {displayType !== 'input' && <DisplaySelection {...displayProps} />}
    </>
  )
}

const getTextFormat = (textFormat: string, selection: any[]): string | undefined => {
  if (selection.length === 0) return undefined
  if (textFormat) {
    const strings = selection.map((item) => substituteValues(textFormat, item))
    return strings.join(', ')
  }
  // Default "text" field -- needs to return consistent string regardless of
  // object field order
  const strings = selection.map((item) => {
    const itemFields = Object.entries(item)
      .sort()
      .map(([key, value]) => `${key}: ${value}`)
    return `{${itemFields.join(', ')}}`
  })
  return strings.join(', ')
}

const getMappedErrorMessage = (
  message: string | undefined,
  searchErrorMap: Record<string, string>
) => {
  if (!message) return 'Unknown error'
  for (const key of Object.keys(searchErrorMap)) {
    if (message.startsWith(key)) return searchErrorMap[key]
  }
  return message
}
export interface DisplayProps {
  selection: any[]
  displayFormat: DisplayFormat
  displayType: 'card' | 'list' | 'input'
  Markdown: any
  deleteItem?: (index: number) => void
  isEditable?: boolean
}

export const DisplaySelection: React.FC<DisplayProps> = ({
  selection,
  displayFormat,
  displayType,
  deleteItem = () => {},
  Markdown,
  isEditable = true,
}) => {
  const { getPluginTranslator } = useLanguageProvider()
  const t = getPluginTranslator('search')
  const { title, subtitle, description } = displayFormat
  const showFallbackString = !title && !subtitle && !description
  return displayType === 'list' || displayType === 'input' ? (
    <List bulleted={selection.length > 1}>
      {selection.map((item, index) => (
        <ListItem key={index} className="search-list-item">
          <div className="flex-row-start">
            {title ? (
              <Markdown text={substituteValues(title, item)} semanticComponent="noParagraph" />
            ) : description ? (
              <Markdown
                text={substituteValues(description, item)}
                semanticComponent="noParagraph"
              />
            ) : (
              getDefaultString(item, t('MESSAGE_NO_RESULTS'), 'description')
            )}{' '}
            {isEditable && (
              <Icon
                className="search-list-item-icon"
                link
                name="close"
                circular
                fitted
                size="small"
                color="blue"
                onClick={() => deleteItem(index)}
                style={{ position: 'relative', top: -2, left: 5 }}
              />
            )}
          </div>
        </ListItem>
      ))}
    </List>
  ) : (
    <>
      {selection.map((item, index) => (
        <Card key={`list-item-${index}`}>
          <Card.Content>
            {isEditable && (
              <Label floating onClick={() => deleteItem(index)}>
                <Icon name="delete" />
              </Label>
            )}
            {title && (
              <Card.Header>
                <Markdown text={substituteValues(title, item)} semanticComponent="noParagraph" />
              </Card.Header>
            )}
            {subtitle && (
              <Card.Meta>
                <Markdown text={substituteValues(subtitle, item)} semanticComponent="noParagraph" />
              </Card.Meta>
            )}
            <Card.Description>
              <Markdown
                text={
                  description
                    ? substituteValues(description, item)
                    : getFallbackString(item, showFallbackString)
                }
                semanticComponent="noParagraph"
              />
            </Card.Description>
          </Card.Content>
        </Card>
      ))}
    </>
  )
}

const getFallbackString = (item: any, showFallbackString: boolean) =>
  showFallbackString
    ? Object.keys(item).reduce((str, field) => str + `${field}: ${item[field]}  \n`, '')
    : ''

type ResultsField = 'title' | 'description'
// If a displayFormat is not defined, results will display some combination of
// the first two fields in the object
const getDefaultString = (
  result: any,
  noResultString: string,
  fieldType: ResultsField = 'title'
) => {
  if (!(result instanceof Object)) return result
  const fields = Object.keys(result)
  switch (fields.length) {
    case 0:
      return fieldType === 'title' ? noResultString : ''
    case 1:
      return fieldType === 'title' ? fields[0] : result[fields[0]]
    default:
      return fieldType === 'title'
        ? `${fields[0]}: ${result[fields[0]]}`
        : `${fields[1]}: ${result[fields[1]]}`
  }
}

// In order to check that user input is consistent with regex pattern, even when
// it's only partially completed (and therefore won't match the regex), we
// combine it with a known correct example and then test it against the pattern.
const partialMatch = (text: string, example: string, pattern?: RegExp) => {
  if (!pattern) return true
  const fullString = text + example.slice(text.length)

  return pattern.test(fullString)
}

export default ApplicationView
