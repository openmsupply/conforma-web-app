import React, { ChangeEvent, useEffect } from 'react'
import {
  Button,
  Dimmer,
  Form,
  Icon,
  Loader,
  Modal,
  Segment,
  Image,
  Message,
} from 'semantic-ui-react'
import { LookUpTableImportCsvContext } from '../contexts'
import config from '../../config'
import axios from 'axios'
import { useLanguageProvider } from '../../contexts/Localisation'
import getServerUrl from '../../utils/helpers/endpoints/endpointUrlBuilder'
import { UploadButton } from '../../components/common'

const ImportCsvModal: React.FC<any> = ({
  onImportSuccess,
  onClose,
  open = false,
  tableLabel = '',
  dataViewCode = '',
  tableStructureID = 0,
}: any) => {
  const { t } = useLanguageProvider()
  const { state, dispatch } = React.useContext(LookUpTableImportCsvContext)
  const {
    uploadModalOpen,
    file,
    tableName: name,
    dataViewCode: code,
    submittable,
    submitting,
    errors,
    success,
  } = state

  useEffect(() => {
    dispatch({ type: open ? 'OPEN_MODAL' : 'CLOSE_MODAL' })
    if (open) {
      dispatch({ type: 'SET_TABLE_NAME', payload: tableLabel })
      dispatch({ type: 'SET_CODE', payload: dataViewCode })
    }
  }, [open, dataViewCode, tableLabel])

  useEffect(() => {
    dispatch({
      type: 'SUBMITTABLE',
      payload:
        uploadModalOpen && file !== null && (tableStructureID ? true : name !== '' && code !== ''),
    })
  }, [uploadModalOpen, file, name])

  const fileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target as HTMLInputElement
    if (!input.files?.length) return
    dispatch({ type: 'SET_FILE', payload: input.files[0] })
  }

  const onImportCSV = async (_: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    dispatch({ type: 'SUBMITTING', payload: true })

    const formData: any = new FormData()
    formData.append('file', file)

    const JWT = localStorage.getItem(config.localStorageJWTKey || '')
    const authHeader = JWT ? { Authorization: 'Bearer ' + JWT } : undefined

    await axios
      .post(
        tableStructureID
          ? getServerUrl('lookupTable', { action: 'update', id: tableStructureID, name, code })
          : getServerUrl('lookupTable', { action: 'import', name, code }),
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            ...authHeader,
          },
        }
      )
      .then(function (response: any) {
        const successResponse = response.data
        onImportSuccess()
        dispatch({ type: 'SET_SUCCESS_MESSAGES', payload: JSON.parse(successResponse.message) })
      })
      .catch(function (error: any) {
        let myErrors = []
        if (error.response) {
          const errorResponse = error.response.data
          if (errorResponse.name === 'ValidationErrors') {
            myErrors = JSON.parse(errorResponse.message)
          } else {
            myErrors.push(errorResponse.message)
          }
        } else if (error.request) {
          myErrors.push(error.request.message)
        } else {
          myErrors.push(error.message)
        }

        dispatch({ type: 'SET_ERROR_MESSAGES', payload: myErrors })
      })
  }

  return (
    <Modal
      onClose={() => dispatch({ type: 'CLOSE_MODAL' })}
      onOpen={() => dispatch({ type: 'OPEN_MODAL' })}
      open={uploadModalOpen}
    >
      <Modal.Header>
        {!tableLabel ? t('LOOKUP_TABLE_IMPORT') : `${t('LOOKUP_TABLE_IMPORT_INTO')} ${tableLabel}`}
      </Modal.Header>
      <Modal.Content>
        {submitting ? (
          <Segment basic placeholder>
            <Dimmer active inverted>
              <Loader inverted content={t('LABEL_SUBMITTING')} />
            </Dimmer>
            <Image src="https://react.semantic-ui.com/images/wireframe/short-paragraph.png" />
          </Segment>
        ) : errors.length > 0 ? (
          <Message error header={t('ERROR_FOUND')} list={[...errors]} />
        ) : success.length > 0 ? (
          <Message
            positive
            header={
              !tableStructureID
                ? t('LOOKUP_TABLE_SUCCESS_CREATED', tableLabel)
                : t('LOOKUP_TABLE_SUCCESS_UPDATED', tableLabel)
            }
            list={[...success]}
          />
        ) : (
          <Form>
            <Form.Field>
              <label>{t('LOOKUP_TABLE_NAME')}</label>
              <input
                placeholder={t('LOOKUP_TABLE_NAME')}
                value={name || ''}
                onChange={(event) =>
                  dispatch({ type: 'SET_TABLE_NAME', payload: event.target.value })
                }
              />
            </Form.Field>
            <Form.Field>
              <label>{t('LOOKUP_TABLE_CODE')}</label>
              <input
                placeholder={t('LOOKUP_TABLE_DV_CODE')}
                value={code || ''}
                onChange={(event) => dispatch({ type: 'SET_CODE', payload: event.target.value })}
              />
            </Form.Field>
            <Form.Field>
              <label>{t('LABEL_FILE_UPLOAD_TITLE')}</label>
              <UploadButton
                as="label"
                htmlFor="file"
                type="button"
                animated="fade"
                handleFiles={fileChange}
                InputProps={{ id: 'file' }}
              >
                <Button.Content visible>
                  <Icon name="file" />
                </Button.Content>
                <Button.Content hidden content={t('LABEL_FILE_UPLOAD')} />
              </UploadButton>
              <Form.Input
                fluid
                label={t('LABEL_FILE_UPLOAD_CHOSEN')}
                placeholder={t('LABEL_FILE_UPLOAD_PLACEHOLDER')}
                readOnly
                value={file?.name || ''}
              />
            </Form.Field>
          </Form>
        )}
      </Modal.Content>
      <Modal.Actions>
        <Button color="black" onClick={onClose} content={t('BUTTON_CLOSE')} />
        {errors.length > 0 || success.length > 0 ? (
          <Button
            content={success ? t('LOOKUP_TABLE_IMPORT_OTHER') : t('LABEL_TRY_AGAIN')}
            labelPosition="right"
            icon="download"
            color={success ? 'green' : 'orange'}
            onClick={(_) => dispatch({ type: 'OPEN_MODAL' })}
          />
        ) : (
          <Button
            content={t('LABEL_FILE_IMPORT_CSV')}
            labelPosition="right"
            icon="download"
            onClick={(event) => onImportCSV(event)}
            disabled={!submittable}
            positive
          />
        )}
      </Modal.Actions>
    </Modal>
  )
}

export default React.memo(ImportCsvModal)
