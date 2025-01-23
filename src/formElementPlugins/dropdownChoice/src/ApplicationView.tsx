import React, { useState, useEffect } from 'react'
import { Dropdown, Label } from 'semantic-ui-react'
import { ResponseFull } from '../../../utils/types'
import { ApplicationViewProps } from '../../types'
import { useLanguageProvider } from '../../../contexts/Localisation'
import { substituteValues } from '../../../utils/helpers/utilityFunctions'
import useDefault from '../../useDefault'
import './styles.css'

// From
// https://learn.microsoft.com/en-us/javascript/api/@azure/keyvault-certificates/requireatleastone
type RequireAtLeastOne<T> = {
  [K in keyof T]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<keyof T, K>>>
}[keyof T]

type ObjectOption = { [key: string]: any }
type ObjectOptions = { options: ObjectOption[] } & RequireAtLeastOne<{
  optionsDisplayProperty: string
  optionsDisplayExpression: string
}>
type StringOptions = {
  options: string[]
  optionsDisplayProperty: never
  optionsDisplayExpression: never
}

const ApplicationView: React.FC<ApplicationViewProps> = ({
  element,
  parameters,
  currentResponse,
  validationState,
  onSave,
  Markdown,
  getDefaultIndex,
}) => {
  const { getPluginTranslator } = useLanguageProvider()
  const t = getPluginTranslator('dropdownChoice')
  const {
    label,
    description,
    placeholder,
    search,
    options,
    optionsDisplayProperty,
    optionsDisplayExpression,
    hasOther,
    multiSelect = false,
    default: defaultValue,
  } = parameters as {
    label?: string
    description?: string
    placeholder?: string
    search?: boolean
    hasOther?: boolean
    multiSelect?: boolean
    default?: string | number
  } & (ObjectOptions | StringOptions)

  const [selectedIndex, setSelectedIndex] = useState<number | undefined | number[]>(
    currentResponse?.optionIndex ?? undefined
  )

  const [addedOption, setAddedOption] = useState<string | null>(null)

  const { isEditable, isRequired } = element

  useEffect(() => {
    // This deals with the case when a default response has been externally set
    // (e.g. by a ListBuilder) and only a selection (with no index) has been
    // provided.
    if (options[0] === 'Loading...') return
    if (currentResponse?.selection && currentResponse?.optionIndex === undefined)
      setSelectedIndex(getDefaultIndex(currentResponse?.selection, options))
    // If the options list has changed, we need to update the currently selected
    // item with the new contents (without changing the selected index)
    else if (currentResponse?.optionIndex !== undefined) handleChange(currentResponse?.optionIndex)
  }, [options])

  useDefault({
    defaultValue,
    currentResponse,
    parameters,
    additionalDependencies: [options],
    onChange: (defaultOption: any) => {
      const optionIndex = getDefaultIndex(defaultOption, options)
      if (optionIndex === -1 && hasOther) addItemHandler(defaultOption)
      else handleChange(optionIndex)
    },
  })

  const addItemHandler = (text: string) => {
    setAddedOption(text)
    const newIndex = options.length

    if (Array.isArray(selectedIndex)) {
      setSelectedIndex([...selectedIndex, newIndex])
      handleChange([...selectedIndex, newIndex], text)
    } else {
      setSelectedIndex(newIndex)
      handleChange(newIndex, text)
    }
  }

  const handleChange = (value: number | string | number[], addedText?: string) => {
    const optionIndex: number | string | number[] = value

    // For multi-select
    if (Array.isArray(optionIndex)) {
      if (optionIndex.length === 0) {
        setSelectedIndex([])
        setAddedOption(null)
        onSave(null)
        return
      }
      setSelectedIndex(optionIndex)
      onSave({
        optionIndex: optionIndex,
        text:
          optionIndex
            .map((i) => getTextValue(options, i, optionsDisplayProperty, optionsDisplayExpression))
            .join(', ') + (addedText ?? ''),
        selection: optionIndex.map((i) => (options[i] ? options[i] : addedText)),
        isCustomOption: !!addedText,
      })
      return
    }

    // optionIndex becomes an empty string when selection is cleared
    setSelectedIndex(typeof optionIndex === 'string' ? undefined : optionIndex)
    if (typeof optionIndex === 'number') {
      if (optionIndex === options.length)
        // Save custom-added option
        onSave({
          text: addedText,
          selection: addedText,
          optionIndex,
          isCustomOption: true,
        })
      // Save regular option
      else
        onSave({
          text: getTextValue(
            options,
            optionIndex,
            optionsDisplayProperty,
            optionsDisplayExpression
          ),
          selection: options[optionIndex],
          optionIndex,
          isCustomOption: false,
        })
    }
    // Reset response if selection cleared
    else if (optionIndex === '') {
      setAddedOption(null)
      onSave(null)
    }
  }

  return (
    <>
      {label && (
        <label>
          <Markdown text={label} semanticComponent="noParagraph" />
        </label>
      )}
      <Markdown text={description} />
      <Dropdown
        fluid
        multiple={multiSelect}
        selection
        clearable={isEditable && !isRequired}
        disabled={!isEditable}
        search={search || hasOther}
        allowAdditions={hasOther}
        additionLabel={t('ADD_CUSTOM_OPTION_LABEL')}
        onAddItem={(_, data) => addItemHandler(data.value as string)}
        placeholder={placeholder}
        options={getDropdownOptions(
          options,
          currentResponse,
          addedOption,
          setAddedOption,
          optionsDisplayProperty,
          optionsDisplayExpression
        )}
        onChange={(_, data) => handleChange(data.value as string | number)}
        value={selectedIndex}
        error={!validationState.isValid ? true : undefined}
      />
      {validationState.isValid ? null : (
        <Label pointing prompt content={validationState?.validationMessage} />
      )}
    </>
  )
}

export default ApplicationView

const getDropdownOptions = (
  options: (ObjectOption | string)[],
  currentResponse: ResponseFull | null,
  addedOption: string | null,
  setAddedOption: (value: string) => void,
  displayProperty?: string,
  displayExpression?: string
) => {
  if (options[0] === 'Loading...') return [{ key: 'loading', text: 'Loading...', value: 0 }]
  // Figure out if the currentResponse contains an added custom response. This
  // is just for initial loading if we've had to wait for the list of options to
  // populate
  let initialCustomResponse: string | null
  if (Array.isArray(currentResponse?.optionIndex)) {
    const highestIndex = Math.max(...(currentResponse?.optionIndex ?? []))
    initialCustomResponse =
      !addedOption && highestIndex > options.length - 1
        ? currentResponse?.selection[currentResponse?.selection.length - 1]
        : null
  } else
    initialCustomResponse =
      !addedOption &&
      currentResponse?.optionIndex === options.length &&
      typeof currentResponse.selection === 'string'
        ? currentResponse.selection
        : null

  if (initialCustomResponse) setAddedOption(initialCustomResponse)

  const dropdownOptions = options.map((option, index) => ({
    key: `${index}_${option}`,
    text:
      (displayProperty || displayExpression) && typeof option !== 'string'
        ? displayExpression
          ? substituteValues(displayExpression, option)
          : option[displayProperty as string]
        : option,
    value: index,
  }))

  if (initialCustomResponse || addedOption)
    dropdownOptions.push({
      key: `${options.length}_${initialCustomResponse || addedOption}`,
      text: initialCustomResponse || addedOption,
      value: options.length,
    })

  return dropdownOptions
}

const getTextValue = (
  options: (object | string)[],
  optionIndex: number,
  displayProperty?: string,
  displayExpression?: string
): string => {
  if (typeof options[optionIndex] === 'object') {
    if (!displayProperty && !displayExpression) return 'Missing display property or expression'
    return options[optionIndex]
      ? displayExpression
        ? substituteValues(displayExpression, options[optionIndex] as ObjectOption)
        : (options[optionIndex] as ObjectOption)[displayProperty as string]
      : ''
  }

  return options[optionIndex] as string
}
