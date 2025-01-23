import React, { useState } from 'react'
import { Header, Button, Checkbox, Icon } from 'semantic-ui-react'
import { postRequest } from '../../utils/helpers/fetchMethods'
import { LanguageOption, useLanguageProvider } from '../../contexts/Localisation'
import usePageTitle from '../../utils/hooks/usePageTitle'
import { useToast, topLeft } from '../../contexts/Toast'
import useConfirmationModal from '../../utils/hooks/useConfirmationModal'
import { exportLanguages } from '../../utils/localisation/exportLanguages'
import { importLanguages } from '../../utils/localisation/importLanguages'
import getServerUrl from '../../utils/helpers/endpoints/endpointUrlBuilder'
import { UploadButton } from '../common'

const AdminLocalisations: React.FC = () => {
  const { refetchLanguages, languageOptionsFull: languageOptions, t } = useLanguageProvider()
  usePageTitle(t('PAGE_TITLE_LOCALISATION'))
  const [exportDisabled, setExportDisabled] = useState(true)
  const [importDisabled, setImportDisabled] = useState(true)
  const { showToast } = useToast({ position: topLeft })
  const { ConfirmModal: WarningModal, showModal: showWarningModal } = useConfirmationModal({
    type: 'warning',
    title: t('LOCALISATION_DELETE_WARNING_TITLE'),
    confirmText: t('BUTTON_CONFIRM'),
  })
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const handleSelect = async (language: LanguageOption) => {
    const enabled = !language.enabled
    const result = await postRequest({
      url: getServerUrl('localisation', { action: 'enable', code: language.code, enabled }),
    })
    if (result.success) {
      console.log(`Language updated: ${language.code}`)
      refetchLanguages()
    } else {
      showToast({ title: t('LOCALISATION_REMOVE_ERROR'), text: result.message, style: 'error' })
      console.error(result.message)
    }
  }

  const handleRemove = async (language: LanguageOption) => {
    const result = await postRequest({
      url: getServerUrl('localisation', { action: 'remove', code: language.code }),
    })
    if (result.success) {
      console.log(`Language removed: ${language.code}`)
      showToast({
        title: t('LOCALISATION_REMOVE_SUCCESS', {
          language: language.languageName,
          code: language.code,
        }),
        text: '',
        style: 'success',
      })
    } else {
      showToast({
        title: t('LOCALISATION_REMOVE_ERROR'),
        text: result?.message ?? t('LOCALISATION_REMOVE_PROBLEM'),
        style: 'error',
      })
      console.error(result.message)
    }
    refetchLanguages()
  }

  const handleExport = async () => {
    const result = await exportLanguages(
      languageOptions.filter((lang) => exportDisabled || lang.enabled)
    )
    if (result.success)
      showToast({
        title: t('LOCALISATION_EXPORT_SUCCESS'),
        text: t('LOCALISATION_EXPORT_SUCCESS_MESSAGE'),
        style: 'success',
      })
    else {
      showToast({
        title: t('LOCALISATION_REMOVE_ERROR'),
        text: `${t('LOCALISATION_EXPORT_PROBLEM')}: ${result?.message}`,
        style: 'error',
      })
      console.error(result.message)
    }
  }

  const handleFileImport = async (e: any) => {
    const file = e.target.files[0]
    const reader = new FileReader()
    reader.onload = (event) => {
      if (!event.target?.result) {
        showToast({
          title: t('LOCALISATION_REMOVE_ERROR'),
          text: t('LOCALISATION_FILE_PROBLEM'),
          style: 'error',
        })
        return
      }
      importLanguages(event.target.result as string, importDisabled, t).then(
        ({ success, message }) => {
          if (success) {
            showToast({
              title: t('LOCALISATION_INSTALL_SUCCESS'),
              text: message,
              style: 'success',
            })
          } else {
            showToast({ title: t('LOCALISATION_REMOVE_ERROR'), text: message, style: 'error' })
          }
          refetchLanguages(true)
        }
      )
    }
    reader.readAsText(file)
  }

  return (
    <div id="localisation-panel">
      <WarningModal />
      <Header>{t('LOCALISATION_HEADER')}</Header>
      <Header as="h4">{t('LOCALISATION_CURRENTLY_INSTALLED')}</Header>
      <div className="flex-row">
        <p className="smaller-text">Enabled</p>
      </div>
      {languageOptions.map((language, index) => (
        <div
          style={{ position: 'relative' }}
          onMouseEnter={() => setHoverIndex(index)}
          onMouseLeave={() => setHoverIndex(null)}
          key={language.code}
        >
          <LanguageRow language={language} index={index} handleSelect={handleSelect} />
          {hoverIndex === index && (
            <Icon
              name="times circle outline"
              size="large"
              className="clickable"
              style={{ position: 'absolute', right: 4, top: -4, color: 'grey' }}
              onClick={() =>
                showWarningModal({
                  message: t('LOCALISATION_DELETE_WARNING_MESSAGE', {
                    language: language.languageName,
                    code: language.code,
                  }),
                  onConfirm: () => handleRemove(language),
                })
              }
            />
          )}
        </div>
      ))}
      <Header as="h5">{t('LOCALISATION_EXPORT_MESSAGE') + ':'}</Header>
      <div className="flex-row-start-center" style={{ gap: 20 }}>
        <Button primary content={t('LABEL_EXPORT')} onClick={handleExport} />
        <Checkbox
          checked={exportDisabled}
          onChange={() => setExportDisabled(!exportDisabled)}
          label={t('LOCALISATION_INCLUDE_DISABLED')}
        />
      </div>
      <Header as="h5">{t('LOCALISATION_IMPORT_MESSAGE')}</Header>
      <div className="flex-row-start-center" style={{ gap: 20 }}>
        <UploadButton primary content={t('LABEL_IMPORT')} handleFiles={handleFileImport} />
        <Checkbox
          checked={importDisabled}
          onChange={() => setImportDisabled(!importDisabled)}
          label={t('LOCALISATION_INCLUDE_DISABLED')}
        />
      </div>
    </div>
  )
}

const LanguageRow: React.FC<{
  language: LanguageOption
  handleSelect: (language: LanguageOption, index: number) => void
  index: number
}> = ({ language, handleSelect, index }) => {
  return (
    <div className="flex-row-start-center row-format">
      <Checkbox checked={language.enabled} onChange={() => handleSelect(language, index)} />
      <div className="flex-column">
        <p style={{ marginBottom: 0 }}>
          <strong>{language.languageName}</strong>
        </p>
        <p className="smaller-text">{language.description}</p>
      </div>
      <p style={{ fontSize: '2em', flexGrow: 1, textAlign: 'right' }}>{language.flag}</p>
    </div>
  )
}

export default AdminLocalisations
