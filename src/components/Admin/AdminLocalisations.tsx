import React, { useEffect, useState, useRef } from 'react'
import { Header, Button, Checkbox, Icon, ModalProps } from 'semantic-ui-react'
import { getRequest, postRequest } from '../../utils/helpers/fetchMethods'
import config from '../../config'
import { LanguageOption, useLanguageProvider } from '../../contexts/Localisation'
import usePageTitle from '../../utils/hooks/usePageTitle'
import useToast from '../../utils/hooks/useToast'
import ModalWarning from '../Main/ModalWarning'
import { exportLanguages } from '../../utils/localisation/exportLanguages'
import { importLanguages } from '../../utils/localisation/importLanguages'

export const AdminLocalisations: React.FC = () => {
  const { strings } = useLanguageProvider()
  usePageTitle(strings.PAGE_TITLE_LOCALISATION)
  const fileInputRef = useRef<any>(null)
  const [exportDisabled, setExportDisabled] = useState(true)
  const [importDisabled, setImportDisabled] = useState(true)
  const [installedLanguages, setInstalledLanguages] = useState<LanguageOption[]>([])
  const [toastComponent, showToast] = useToast({ position: 'top-left' })
  const [showModalWarning, setShowModalWarning] = useState<ModalProps>({ open: false })
  const [refreshLanguages, setRefreshLanguages] = useState(true)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  useEffect(() => {
    if (!refreshLanguages) return
    getRequest(`${config.serverREST}/public/get-prefs`).then((prefs) =>
      setInstalledLanguages(prefs.languageOptions)
    )
    setRefreshLanguages(false)
  }, [refreshLanguages])

  const handleSelect = async (language: LanguageOption, index: number) => {
    const enabled = language.enabled
    const currentLanguages = [...installedLanguages]
    const newLanguages = [...installedLanguages]
    const updatedLanguage = { ...language, enabled: !enabled }
    newLanguages[index] = updatedLanguage
    setInstalledLanguages(newLanguages)
    updateOnServer(updatedLanguage, currentLanguages)
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
      title: 'Are you sure?',
      message: `This will uninstall language ${language.languageName} (${language.code}) from your system`,
      option: 'Confirm',
      optionCancel: 'Cancel',
      onCancel: () => setShowModalWarning({ open: false }),
      onClick: async () => {
        setShowModalWarning({ open: false })
        const result = await postRequest({
          url: `${config.serverREST}/admin/remove-language?code=${language.code}`,
        })
        if (result.success) {
          console.log('Language removed')
          setRefreshLanguages(true)
          showToast({
            title: `${language.languageName} (${language.code}) successfully removed`,
            text: '',
            style: 'success',
          })
        } else {
          showToast({
            title: 'Error',
            text: result?.message ?? 'Problem removing language',
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
        showToast({ title: 'Error', text: 'Problem processing file', style: 'error' })
        return
      }
      importLanguages(event.target.result as string, importDisabled).then(
        ({ success, message }) => {
          setRefreshLanguages(true)
          if (success) {
            showToast({
              title: 'Languages successfully installed',
              text: '',
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
        >
          <LanguageRow
            language={language}
            key={language.code}
            index={index}
            handleSelect={handleSelect}
          />
          {hoverIndex === index && (
            <Icon
              name="times circle outline"
              size="large"
              style={{ position: 'absolute', right: 4, top: -4, color: 'grey' }}
              onClick={() => handleRemove(language)}
            />
          )}
        </div>
      ))}
      <Header as="h5">Export language files as spreadsheet (CSV):</Header>
      <div className="flex-row-start-center" style={{ gap: 20 }}>
        <Button primary content="Export" onClick={() => exportLanguages(exportDisabled)} />
        <Checkbox
          checked={exportDisabled}
          onChange={() => setExportDisabled(!exportDisabled)}
          label="Include disabled languages"
        />
      </div>
      <Header as="h5">Import language files:</Header>
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
        <Button primary content="Import" onClick={() => fileInputRef?.current?.click()} />
        <Checkbox
          checked={importDisabled}
          onChange={() => setImportDisabled(!importDisabled)}
          label="Include disabled languages"
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
    // <div className="flex-row">
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
    // {/* <Icon name="delete" /> */}
    // </div>
  )
}
