import React, { useEffect, useState } from 'react'
import { Button, Modal, Form, Segment, Icon } from 'semantic-ui-react'
import { ApplicationViewProps } from '../../types'
import { User } from '../../../utils/types'
import {
  DisplayType,
  InputResponseField,
  ListBuilderParameters,
  ListItem,
  ListLayoutProps,
} from './types'
import { TemplateElement } from '../../../utils/generated/graphql'
import functions from '../../../containers/TemplateBuilder/evaluatorGui/evaluatorFunctions'
import config from '../../../config'
import ApplicationViewWrapper from '../../ApplicationViewWrapper'
import {
  buildElements,
  getDefaultDisplayFormat,
  resetCurrentResponses,
  anyErrorItems,
  createTextString,
  combineResponses,
  buildDataArray,
} from './helpers'
import {
  ListCardLayout,
  ListTableLayout,
  ListInlineLayout,
  ListListLayout,
} from './displayComponents'
import { useLanguageProvider } from '../../../contexts/Localisation'
import { useUserState } from '../../../contexts/UserState'
import useDefault from '../../useDefault'
import { useViewport } from '../../../contexts/ViewportState'

const ApplicationView: React.FC<ApplicationViewProps> = ({
  element,
  parameters,
  onSave,
  // onUpdate,
  Markdown,
  validationState,
  currentResponse,
  applicationData,
  allResponses,
}) => {
  const { getPluginTranslator } = useLanguageProvider()
  const t = getPluginTranslator('listBuilder')
  const { isMobile } = useViewport()

  const { isEditable } = element
  const {
    label,
    description,
    createModalButtonText = t('BUTTON_LAUNCH_MODAL'),
    modalText,
    addButtonText = t('BUTTON_ADD'),
    updateButtonText = t('BUTTON_UPDATE'),
    deleteItemText = t('BUTTON_DELETE'),
    inputFields,
    displayFormat = getDefaultDisplayFormat(inputFields),
    displayType = DisplayType.CARDS,
    default: defaultValue,
    textFormat,
    dataFormat = textFormat,
    inlineOpen = false,
    tableExcludeColumns = [],
    maxItems = Infinity,
    // These affect viewing tables on Mobile only
    hideFromMobileTableIfEmpty,
    minMobileTableLabelWidth,
    maxMobileTableLabelWidth,
  } = parameters as ListBuilderParameters
  const {
    userState: { currentUser },
  } = useUserState()

  interface InputState {
    currentResponses: ListItem
    currentElementsState?: any
    selectedListItemIndex: number | null
    isOpen: boolean
    error: boolean
  }

  const defaultInputState: InputState = {
    currentResponses: resetCurrentResponses(inputFields),
    selectedListItemIndex: null,
    isOpen: false,
    error: false,
  }

  const [inputState, setInputState] = useState<InputState>(defaultInputState)
  const [listItems, setListItems] = useState<ListItem[]>(currentResponse?.list ?? [])

  const graphQLEndpoint = applicationData.config.getServerUrl('graphQL')
  const JWT = localStorage.getItem(config.localStorageJWTKey)
  const evaluatorConfig = {
    objects: { currentUser, applicationData, responses: allResponses, functions },
    APIfetch: fetch,
    graphQLConnection: { fetch: fetch.bind(window), endpoint: graphQLEndpoint },
    headers: { Authorization: 'Bearer ' + JWT },
  }

  useEffect(() => {
    buildElements(
      inputFields,
      allResponses,
      inputState.currentResponses,
      currentUser as User,
      applicationData
    ).then((elements) =>
      setInputState((prevState) => ({ ...prevState, currentElementsState: elements }))
    )
  }, [inputState.currentResponses, allResponses])

  useDefault({
    defaultValue,
    currentResponse,
    parameters,
    onChange: (defaultList) => setListItems(defaultList ?? []),
  })

  useEffect(() => {
    buildDataArray(listItems, inputFields, evaluatorConfig, dataFormat).then((data) =>
      onSave({
        text:
          listItems.length > 0 ? createTextString(listItems, inputFields, textFormat) : undefined,
        list: listItems,
        data,
      })
    )
  }, [listItems])

  // This is sent to ApplicationViewWrapper and runs instead of the default responseMutation
  const innerElementUpdate =
    (code: string) =>
    async ({ variables: response }: { variables: InputResponseField }) => {
      // need to get most recent state of inputState, thus using callback
      setInputState((currentInputState) => {
        const newResponses = { ...currentInputState.currentResponses, [code]: response }
        const error = !anyErrorItems(newResponses, inputFields) ? false : inputState.error
        return { ...currentInputState, currentResponses: newResponses, error }
      })
    }

  const updateList = async () => {
    if (anyErrorItems(inputState.currentResponses, inputFields)) {
      setInputState({ ...inputState, error: true })
      return
    }
    // Add item
    if (inputState.selectedListItemIndex === null) {
      setListItems([...listItems, inputState.currentResponses])
    } else {
      // Or update existing item
      const newList = [...listItems]
      newList[inputState.selectedListItemIndex] = { ...inputState.currentResponses }
      setListItems(newList)
    }
    setInputState(defaultInputState)
  }

  const editItem = async (index: number, openPanel = true) => {
    setInputState((prev) => ({
      ...prev,
      currentResponses: listItems[index],
      selectedListItemIndex: index,
      isOpen: openPanel,
    }))
  }

  const deleteItem = async (index: number) => {
    setListItems(listItems.filter((_, i) => i !== index))
    setInputState((_) => defaultInputState)
  }

  const listDisplayProps: ListLayoutProps = {
    listItems,
    inputFields,
    displayFormat,
    editItem: isEditable ? editItem : () => {},
    deleteItem: isEditable ? deleteItem : () => {},
    Markdown,
    isEditable,
  }

  const DisplayComponent =
    displayType === DisplayType.TABLE ? (
      <ListTableLayout
        {...listDisplayProps}
        excludeColumns={tableExcludeColumns}
        hideFromMobileIfEmpty={hideFromMobileTableIfEmpty}
        minMobileLabelWidth={minMobileTableLabelWidth}
        maxMobileLabelWidth={maxMobileTableLabelWidth}
      />
    ) : displayType === DisplayType.INLINE ? (
      <ListInlineLayout
        {...listDisplayProps}
        responses={allResponses}
        currentUser={currentUser as User}
        applicationData={applicationData}
        editItemText={t('BUTTON_EDIT')}
        deleteItemText={deleteItemText}
        updateButtonText={updateButtonText}
        innerElementUpdate={innerElementUpdate}
        updateList={updateList}
        initialOpen={inlineOpen}
      />
    ) : displayType === DisplayType.LIST ? (
      <ListListLayout {...listDisplayProps} />
    ) : (
      <ListCardLayout {...listDisplayProps} />
    )

  const ListInputForm = (
    <>
      <Markdown text={modalText} />
      {inputState.currentElementsState &&
        inputFields.map((field: TemplateElement) => {
          const element = inputState.currentElementsState?.[field.code]
          return (
            <ApplicationViewWrapper
              key={`list-${element.code}`}
              element={element}
              isStrictPage={inputState.error}
              allResponses={combineResponses(allResponses, inputState.currentResponses)}
              currentResponse={inputState.currentResponses[element.code].value}
              onSaveUpdateMethod={innerElementUpdate(element.code)}
              applicationData={applicationData}
            />
          )
        })}
      <Button
        primary
        content={inputState.selectedListItemIndex !== null ? updateButtonText : addButtonText}
        onClick={updateList}
      />
      {displayType === DisplayType.TABLE && inputState.selectedListItemIndex !== null && (
        <Button
          secondary
          content={deleteItemText}
          onClick={() => deleteItem(inputState.selectedListItemIndex as number)}
        />
      )}
      {displayType === DisplayType.INLINE && (
        <Button
          secondary
          content={t('BUTTON_CANCEL')}
          onClick={() => setInputState({ ...inputState, isOpen: false })}
        />
      )}
      {inputState.error && (
        <p className="alert">
          <Icon name="attention" />
          {t('ERROR_LIST_ITEMS_NOT_VALID')}
        </p>
      )}
    </>
  )

  return (
    <>
      {label && (
        <label>
          <Markdown text={label} semanticComponent="noParagraph" />
        </label>
      )}
      <Markdown text={description} />
      {displayType !== DisplayType.LIST && listItems.length < maxItems && (
        <Button
          primary
          content={createModalButtonText}
          onClick={() => setInputState({ ...inputState, isOpen: true })}
          disabled={!isEditable}
        />
      )}
      {!validationState.isValid && (
        <p className="alert">
          <Icon name="attention" />
          {validationState.validationMessage || t('VALIDATION_MESSAGE_DEFAULT')}
        </p>
      )}
      {displayType !== DisplayType.INLINE && (
        <Modal
          size="tiny"
          onClose={() => setInputState(defaultInputState)}
          onOpen={() => setInputState({ ...inputState, isOpen: true })}
          open={inputState.isOpen}
          closeIcon={isMobile}
        >
          <Modal.Content>
            <Form>{ListInputForm}</Form>
          </Modal.Content>
        </Modal>
      )}
      {displayType === DisplayType.INLINE && inputState.isOpen && (
        <Segment className="inline-form fit-content">{ListInputForm}</Segment>
      )}
      {DisplayComponent}
      {/* In LIST view, show the Button below the list */}
      {displayType === DisplayType.LIST && listItems.length < maxItems && (
        <Button
          primary
          size="small"
          content={createModalButtonText}
          onClick={() => setInputState({ ...inputState, isOpen: true })}
          disabled={!isEditable}
          style={{ marginTop: 5 }}
        />
      )}
    </>
  )
}

export default ApplicationView
