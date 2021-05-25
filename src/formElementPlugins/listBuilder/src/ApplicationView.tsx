import React, { useEffect, useState } from 'react'
import {
  Button,
  Modal,
  Form,
  Segment,
  Table,
  TableHeaderCell,
  TableCell,
  Card,
  Icon,
  Label,
} from 'semantic-ui-react'
import { ApplicationViewProps } from '../../types'
import { ResponseFull } from '../../../utils/types'
import { TemplateElement, TemplateElementCategory } from '../../../utils/generated/graphql'
import ApplicationViewWrapper from '../../ApplicationViewWrapper'
import strings from '../constants'

enum DisplayType {
  CARDS = 'cards',
  TABLE = 'table',
}

interface InputResponseField {
  isValid?: boolean
  value: ResponseFull
}

type ListItem = { [code: string]: InputResponseField }

const ApplicationView: React.FC<ApplicationViewProps> = ({
  element,
  parameters,
  onSave,
  onUpdate,
  Markdown,
  initialValue,
  currentResponse,
  applicationData,
  allResponses,
}) => {
  const { isEditable } = element
  const {
    label,
    description,
    createModalButtonText = strings.BUTTON_LAUNCH_MODAL,
    modalText,
    addButtonText = strings.BUTTON_ADD,
    updateButtonText = strings.BUTTON_UPDATE,
    deleteItemText = strings.BUTTON_DELETE,
    inputFields,
    displayFormat = getDefaultDisplayFormat(inputFields),
    displayType = DisplayType.CARDS,
  } = parameters

  const [currentInputResponses, setCurrentInputResponses] = useState<ListItem>(
    resetCurrentResponses(inputFields)
  )

  const [listItems, setListItems] = useState<ListItem[]>(initialValue?.list ?? [])
  const [selectedListItem, setSelectedListItem] = useState<number | null>(null)
  const [open, setOpen] = useState(false)
  const [inputError, setInputError] = useState(false)

  useEffect(() => {
    onSave({
      text: listItems.length > 0 ? createTextString(listItems, inputFields) : undefined,
      list: listItems,
    })
  }, [listItems])

  // This is sent to ApplicationViewWrapper and runs instead of the default responseMutation
  const innerElementUpdate =
    (code: string) =>
    async ({ variables: response }: { variables: InputResponseField }) => {
      const newResponses = { ...currentInputResponses, [code]: response }
      setCurrentInputResponses(newResponses)
      if (!anyErrorItems(newResponses, inputFields)) setInputError(false)
    }

  const updateList = async () => {
    if (anyErrorItems(currentInputResponses, inputFields)) {
      setInputError(true)
      return
    }
    // Add item
    if (selectedListItem === null) {
      setListItems([...listItems, currentInputResponses])
    } else {
      // Or update existing item
      const newList = [...listItems]
      newList[selectedListItem] = currentInputResponses
      setListItems(newList)
    }
    setCurrentInputResponses(resetCurrentResponses(inputFields))
    setOpen(false)
    setSelectedListItem(null)
  }

  const editItem = async (index: number) => {
    if (!isEditable) return
    setSelectedListItem(index)
    setCurrentInputResponses(listItems[index])
    setOpen(true)
  }

  const deleteItem = async (index: number) => {
    setListItems(listItems.filter((_, i) => i !== index))
    setOpen(false)
    setCurrentInputResponses(resetCurrentResponses(inputFields))
  }

  const listDisplayProps: ListLayoutProps = {
    listItems,
    displayFormat,
    editItem,
    deleteItem,
    fieldTitles: inputFields.map((e: TemplateElement) => e.title),
    codes: inputFields.map((e: TemplateElement) => e.code),
    Markdown,
    isEditable,
  }

  const DisplayComponent =
    displayType === DisplayType.TABLE ? (
      <ListTableLayout {...listDisplayProps} />
    ) : (
      <ListCardLayout {...listDisplayProps} />
    )

  return (
    <>
      <label>
        <Markdown text={label} semanticComponent="noParagraph" />
      </label>
      <Markdown text={description} />
      <Button
        primary
        content={createModalButtonText}
        onClick={() => setOpen(true)}
        disabled={!isEditable}
      />
      <Modal
        size="tiny"
        onClose={() => {
          setOpen(false)
          setSelectedListItem(null)
          setCurrentInputResponses(resetCurrentResponses(inputFields))
          setInputError(false)
        }}
        onOpen={() => setOpen(true)}
        open={open}
      >
        <Segment>
          <Form>
            <Markdown text={modalText} />
            {inputFields.map((field: TemplateElement, index: number) => {
              const element = buildElement(field, index)
              return (
                <ApplicationViewWrapper
                  key={`list-${element.code}`}
                  element={element}
                  isStrictPage={inputError}
                  allResponses={allResponses}
                  currentResponse={currentInputResponses[element.code].value}
                  onSaveUpdateMethod={innerElementUpdate(element.code)}
                  applicationData={applicationData}
                />
              )
            })}
            <Button
              primary
              content={selectedListItem !== null ? updateButtonText : addButtonText}
              onClick={updateList}
            />
            {displayType === 'table' && selectedListItem !== null && (
              <Button
                secondary
                content={deleteItemText}
                onClick={() => deleteItem(selectedListItem)}
              />
            )}
            {inputError && <p>{strings.ERROR_LIST_ITEMS_NOT_VALID}</p>}
          </Form>
        </Segment>
      </Modal>
      {DisplayComponent}
    </>
  )
}

export default ApplicationView

const buildElement = (field: TemplateElement, index: number) => ({
  id: index,
  code: field.code,
  pluginCode: field.elementTypePluginCode as string,
  category: field.category as TemplateElementCategory,
  title: field.title as string,
  parameters: field.parameters,
  validationExpression: field?.validation || true,
  validationMessage: field?.validationMessage || '',
  isRequired: field.isRequired ?? true,
  // Hard-coded visisbility and editability (for now)
  isEditable: true,
  isVisible: true,
  // "Dummy" values, but required for element props:
  elementIndex: 0,
  page: 0,
  sectionIndex: 0,
  helpText: null,
  sectionCode: '0',
})

const getDefaultDisplayFormat = (inputFields: TemplateElement[]) => {
  const displayString = inputFields.reduce(
    (acc: string, { code, title }) => acc + `**${title}**: \${${code}}  \n`,
    ''
  )
  return { header: '', meta: '', description: displayString }
}

const resetCurrentResponses = (inputFields: TemplateElement[]) =>
  inputFields.reduce((acc, { code }) => ({ ...acc, [code]: { value: { text: undefined } } }), {})

const anyInvalidItems = (currentInput: ListItem) =>
  Object.values(currentInput).some((response) => response.isValid === false)

const anyIncompleteItems = (currentInput: ListItem, inputFields: TemplateElement[]) =>
  Object.values(currentInput).some(
    (response, index) => inputFields[index]?.isRequired !== false && !response.value?.text
  )

const anyErrorItems = (currentInput: ListItem, inputFields: TemplateElement[]) =>
  anyInvalidItems(currentInput) || anyIncompleteItems(currentInput, inputFields)

const substituteValues = (parameterisedString: string, item: ListItem) => {
  const getValueFromCode = (_: string, $: string, code: string) => item[code].value.text || ''
  return parameterisedString.replace(/(\${)(.*?)(})/gm, getValueFromCode)
}

const createTextString = (listItems: ListItem[], inputFields: TemplateElement[]) =>
  listItems.reduce(
    (outputAcc, item) =>
      outputAcc +
      inputFields.reduce(
        (innerAcc, field) => innerAcc + `${field.title}: ${item[field.code].value.text}, `,
        ''
      ) +
      '\n',
    ''
  )

// Separate components, so can be shared with SummaryView
export interface ListLayoutProps {
  listItems: ListItem[]
  displayFormat: { header?: string; meta?: string; description: string }
  Markdown: any
  fieldTitles?: string[]
  codes?: string[]
  editItem?: Function
  deleteItem?: Function
  isEditable?: boolean
}

export const ListCardLayout: React.FC<ListLayoutProps> = ({
  listItems,
  displayFormat,
  editItem = () => {},
  deleteItem = () => {},
  Markdown,
  isEditable = true,
}) => {
  const { header, meta, description } = displayFormat
  return (
    <>
      {listItems.map((item, index) => (
        <Card key={`list-item-${index}`}>
          <Card.Content>
            {isEditable && (
              <Label floating onClick={() => deleteItem(index)}>
                <Icon name="delete" />
              </Label>
            )}
            {header && (
              <Card.Header onClick={() => editItem(index)}>
                <Markdown text={substituteValues(header, item)} semanticComponent="noParagraph" />
              </Card.Header>
            )}
            {meta && (
              <Card.Meta onClick={() => editItem(index)}>
                <Markdown text={substituteValues(meta, item)} semanticComponent="noParagraph" />
              </Card.Meta>
            )}
            {description && (
              <Card.Description onClick={() => editItem(index)}>
                <Markdown
                  text={substituteValues(description, item)}
                  semanticComponent="noParagraph"
                />
              </Card.Description>
            )}
          </Card.Content>
        </Card>
      ))}
    </>
  )
}

export const ListTableLayout: React.FC<ListLayoutProps> = ({
  listItems,
  fieldTitles = [],
  codes = [],
  editItem = () => {},
  // deleteItem = () => {},
  isEditable = true,
}) => {
  return (
    <Table celled selectable={isEditable}>
      <Table.Header>
        <Table.Row>
          {fieldTitles.map((title) => (
            <TableHeaderCell key={`list-header-field-${title}`}>{title}</TableHeaderCell>
          ))}
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {listItems.map((item, index) => (
          <Table.Row key={`list-row-${index}`} onClick={() => editItem(index)}>
            {codes.map((code, cellIndex) => (
              <TableCell key={`list-cell-${index}-${cellIndex}`}>{item[code].value.text}</TableCell>
            ))}
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  )
}
