import React, { useState, useRef } from 'react'
import { Header, Button, Checkbox, Icon, ModalProps } from 'semantic-ui-react'
import { postRequest } from '../../utils/helpers/fetchMethods'
import config from '../../config'
import { LanguageOption, useLanguageProvider } from '../../contexts/Localisation'
import usePageTitle from '../../utils/hooks/usePageTitle'
import useToast from '../../utils/hooks/useToast'
import ModalWarning from '../Main/ModalWarning'
import { exportLanguages } from '../../utils/localisation/exportLanguages'
import { importLanguages } from '../../utils/localisation/importLanguages'

export const AdminLocalisations: React.FC = () => {
  const {
    strings,
    refetchPrefs: refetchLanguages,
    languageOptionsFull,
    selectedLanguage,
    setLanguage,
  } = useLanguageProvider()
  usePageTitle(strings.PAGE_TITLE_LOCALISATION)
  const fileInputRef = useRef<any>(null)
  const [installedLanguages, setInstalledLanguages] =
    useState<LanguageOption[]>(languageOptionsFull)
  const [exportDisabled, setExportDisabled] = useState(true)
  const [importDisabled, setImportDisabled] = useState(true)
  const [toastComponent, showToast] = useToast({ position: 'top-left' })
  const [showModalWarning, setShowModalWarning] = useState<ModalProps>({ open: false })
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const handleSelect = async (language: LanguageOption, index: number) => {
    const enabled = language.enabled
    const currentLanguages = [...installedLanguages]
    const newLanguages = [...installedLanguages]
    const updatedLanguage = { ...language, enabled: !enabled }
    newLanguages[index] = updatedLanguage
    setInstalledLanguages(newLanguages)
    updateOnServer(updatedLanguage, currentLanguages)
    setLanguage('en_nz')
  }

  const updateOnServer = async (
    updatedLanguage: LanguageOption,
    currentLanguages: LanguageOption[]
  ) => {
    const result = await postRequest({
      url: `${config.serverREST}/admin/enable-language?code=${updatedLanguage.code}&enabled=${updatedLanguage.enabled}`,
    })
    if (result.success) console.log('Language updated')
    else {
      // revert local state
      setInstalledLanguages(currentLanguages)
      showToast({ title: 'Error', text: result.message, style: 'error' })
      console.error(result.message)
    }
  }

  const handleRemove = async (language: LanguageOption) => {
    setShowModalWarning({
      open: true,
      title: strings.LOCALISATION_DELETE_WARNING_TITLE,
      message: strings.LOCALISATION_DELETE_WARNING_MESSAGE.replace(
        '%1',
        language.languageName
      ).replace('%2', language.code),
      option: strings.BUTTON_CONFIRM,
      optionCancel: strings.OPTION_CANCEL,
      onCancel: () => setShowModalWarning({ open: false }),
      onClick: async () => {
        setShowModalWarning({ open: false })
        const result = await postRequest({
          url: `${config.serverREST}/admin/remove-language?code=${language.code}`,
        })
        if (result.success) {
          console.log('Language removed')
          refetchLanguages()
          showToast({
            title: strings.LOCALISATION_REMOVE_SUCCESS.replace('%1', language.languageName).replace(
              '%2',
              language.code
            ),
            text: '',
            style: 'success',
          })
        } else {
          showToast({
            title: 'Error',
            text: result?.message ?? strings.LOCALISATION_REMOVE_PROBLEM,
            style: 'error',
          })
          console.error(result.message)
        }
      },
      onClose: () => setShowModalWarning({ open: false }),
    })
  }

  const handleFileImport = async (e: any) => {
    const file = e.target.files[0]
    const reader = new FileReader()
    reader.onload = (event) => {
      if (!event.target?.result) {
        showToast({ title: 'Error', text: strings.LOCALISATION_FILE_PROBLEM, style: 'error' })
        return
      }
      importLanguages(event.target.result as string, importDisabled, strings).then(
        ({ success, message }) => {
          refetchLanguages()
          if (success) {
            showToast({
              title: strings.LOCALISATION_INSTALL_SUCCESS,
              text: message,
              style: 'success',
            })
            return
          } else {
            showToast({ title: 'Error', text: message, style: 'error' })
            return
          }
        }
      )
    }
    reader.readAsText(file)
  }

  return (
    <div id="localisation-panel">
      {toastComponent}
      <ModalWarning {...showModalWarning} />
      <Header as="h1">Localisation</Header>
      <Header as="h4">Currently installed languages</Header>
      <div className="flex-row">
        <p className="smaller-text">Enabled</p>
      </div>
      {installedLanguages.map((language, index) => (
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
              onClick={() => handleRemove(language)}
            />
          )}
        </div>
      ))}
      <Header as="h5">{strings.LOCALISATION_EXPORT_MESSAGE + ':'}</Header>
      <div className="flex-row-start-center" style={{ gap: 20 }}>
        <Button
          primary
          content={strings.LABEL_EXPORT}
          onClick={() => exportLanguages(exportDisabled)}
        />
        <Checkbox
          checked={exportDisabled}
          onChange={() => setExportDisabled(!exportDisabled)}
          label={strings.LOCALISATION_INCLUDE_DISABLED}
        />
      </div>
      <Header as="h5">{strings.LOCALISATION_IMPORT_MESSAGE}</Header>
      <div className="flex-row-start-center" style={{ gap: 20 }}>
        <input
          type="file"
          ref={fileInputRef}
          hidden
          name="file-upload"
          multiple={false}
          accept=".csv"
          onChange={handleFileImport}
        />
        <Button
          primary
          content={strings.LABEL_IMPORT}
          onClick={() => fileInputRef?.current?.click()}
        />
        <Checkbox
          checked={importDisabled}
          onChange={() => setImportDisabled(!importDisabled)}
          label={strings.LOCALISATION_INCLUDE_DISABLED}
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
    <div
      className="flex-row-start-center"
      style={{
        gap: 20,
        width: '90%',
        backgroundColor: 'white',
        marginBottom: 5,
        padding: 10,
        borderRadius: 8,
      }}
    >
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
