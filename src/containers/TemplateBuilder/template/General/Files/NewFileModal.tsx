import { Button, Form, Icon, Message, Modal } from 'semantic-ui-react'
import { UploadButton } from '../../../../../components/common'
import { useLanguageProvider } from '../../../../../contexts/Localisation'
import { useState } from 'react'
import { postRequest } from '../../../../../utils/helpers/fetchMethods'
import getServerUrl from '../../../../../utils/helpers/endpoints/endpointUrlBuilder'
import { useUserState } from '../../../../../contexts/UserState'

interface ModalProps {
  open: boolean
  closeModal: () => void
  linkFile: (fileId: number) => Promise<void>
}

const DEFAULT_SUBFOLDER = '_carbone_templates'

export const NewFileModal: React.FC<ModalProps> = ({ open, closeModal, linkFile }) => {
  const { t } = useLanguageProvider()
  const {
    userState: { currentUser },
  } = useUserState()
  const [file, setFile] = useState<File>()
  const [description, setDescription] = useState<string>()
  const [subfolder, setSubfolder] = useState<string>(DEFAULT_SUBFOLDER)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()

  const reset = () => {
    setFile(undefined)
    setDescription(undefined)
    setSubfolder(DEFAULT_SUBFOLDER)
    setError(undefined)
    closeModal()
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e?.target.files?.[0]
    if (file) setFile(file)
  }

  const handleSubmit = async () => {
    if (!file) return
    setLoading(true)
    setError(undefined)
    try {
      const fileData = new FormData()
      await fileData.append('file', file)
      const result = await postRequest({
        url: getServerUrl('upload', {
          userId: currentUser?.userId,
          description,
          subfolder,
        }),
        otherBody: fileData,
      })
      if (result.success) {
        const id = result.fileData[0].id
        await linkFile(id)
        reset()
      } else {
        console.log(result)
        setError(result.error)
      }
    } catch (err) {
      setError((err as Error).message)
    }
    setLoading(false)
  }

  const canSubmit = file && subfolder

  return (
    <Modal open={open}>
      <Modal.Header>Template File Upload</Modal.Header>
      <Modal.Description style={{ paddingLeft: '2em', paddingRight: '2em', paddingTop: '1em' }}>
        Upload a file to link it to this template. Once uploaded, you'll see its unique file ID in
        the list, which you can refer to in Actions.
      </Modal.Description>
      <Modal.Content>
        <Form>
          <Form.Field>
            <label>Upload file</label>
            <UploadButton
              as="label"
              htmlFor="file"
              type="button"
              animated="fade"
              handleFiles={handleFile}
              InputProps={{ id: 'file' }}
            >
              <Button.Content visible>
                {file ? <span>{file.name}</span> : <Icon name="file" />}
              </Button.Content>
              <Button.Content hidden content={t('LABEL_FILE_UPLOAD')} />
            </UploadButton>
          </Form.Field>
          <Form.Field>
            <label>{t('TEMPLATE_LABEL_DESCRIPTION')}</label>
            <input
              placeholder={'Please provide a helpful description'}
              value={description || ''}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Form.Field>
          <Form.Field>
            <label>{'Subfolder'}</label>
            <input value={subfolder} onChange={(e) => setSubfolder(e.target.value)} />
          </Form.Field>
          {error && <Message negative>There was a problem: {error}</Message>}
        </Form>
      </Modal.Content>
      <Modal.Actions>
        <Button color="black" onClick={reset} content={t('BUTTON_CLOSE')} />
        <Button
          content={'Upload'}
          onClick={handleSubmit}
          disabled={!canSubmit}
          positive
          loading={loading}
        />
      </Modal.Actions>
    </Modal>
  )
}
