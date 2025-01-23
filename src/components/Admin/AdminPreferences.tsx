import React, { useState, useEffect, Suspense } from 'react'
import { Checkbox, Header, Message, Icon } from 'semantic-ui-react'
import { getRequest, postRequest } from '../../utils/helpers/fetchMethods'
import { useLanguageProvider } from '../../contexts/Localisation'
import usePageTitle from '../../utils/hooks/usePageTitle'
import { useToast, topLeft } from '../../contexts/Toast'
import useConfirmationModal from '../../utils/hooks/useConfirmationModal'
import getServerUrl from '../../utils/helpers/endpoints/endpointUrlBuilder'
import { Loading } from '../common'
import { useViewport } from '../../contexts/ViewportState'
import { usePrefs } from '../../contexts/SystemPrefs'
import { JsonData } from 'json-edit-react'

const JsonEditor = React.lazy(() => import('./JsonEditor/JsonEditor'))

export const AdminPreferences: React.FC = () => {
  const { t, tFormat } = useLanguageProvider()
  usePageTitle(t('PAGE_TITLE_PREFS'))
  const { isMobile } = useViewport()
  const { showToast } = useToast({ position: topLeft })
  const { ConfirmModal: WarningModal, showModal: showWarningModal } = useConfirmationModal({
    type: 'warning',
    title: t('PREFERENCES_SAVE_WARNING'),
    message: t('PREFERENCES_SAVE_MESSAGE'),
    confirmText: t('BUTTON_CONFIRM'),
    awaitAction: false,
  })

  const [prefs, setPrefs] = useState<object>()
  const [overrides, setOverrides] = useState<object | null>()
  const [isSaving, setIsSaving] = useState(false)
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(
    localStorage.getItem('maintenanceMode') === 'ON'
  )
  const { refetchPrefs } = usePrefs()

  useEffect(() => {
    getRequest(getServerUrl('getAllPrefs')).then((result) => {
      setPrefs(result.preferences)
      setOverrides(result.overrides)
    })
  }, [])

  const handleSave = async (data: JsonData) => {
    setIsSaving(true)
    try {
      const result = await postRequest({
        url: getServerUrl('setPrefs'),
        jsonBody: data as object,
        headers: { 'Content-Type': 'application/json' },
      })
      if (result.success) {
        showToast({ title: t('PREFERENCES_SAVED'), style: 'success' })
      } else {
        showToast({ title: t('PREFERENCES_SAVE_PROBLEM'), text: result.message, style: 'error' })
      }
    } catch (err) {
      showToast({
        title: t('PREFERENCES_SAVE_PROBLEM'),
        text: (err as Error).message,
        style: 'error',
      })
    }
    setIsSaving(false)
  }

  const handleSetMaintenanceMode = async () => {
    const value = !maintenanceMode

    setMaintenanceMode(value)
    const { success, enabled } = await postRequest({
      url: getServerUrl('setMaintenanceMode'),
      jsonBody: { enabled: value },
      headers: { 'Content-Type': 'application/json' },
    })
    if (success) {
      if (enabled) localStorage.setItem('maintenanceMode', 'ON')
      refetchPrefs()
      // No need for toast here as should get notification from websocket
      // listener
    } else {
      setMaintenanceMode(!value)
      showToast({ title: `Problem changing Maintenance mode`, style: 'error' })
    }
  }

  return (
    <div id="preferences-panel">
      <WarningModal />
      <Header>{t('PREFERENCES_HEADER')}</Header>
      <p>{tFormat('PREFERENCES_SEE_DOCS')}</p>
      {prefs ? (
        <Suspense fallback={<Loading />}>
          <JsonEditor
            data={prefs}
            onSave={(data) => showWarningModal({ onConfirm: () => handleSave(data) })}
            isSaving={isSaving}
            rootName="preferences"
            collapse={2}
            showArrayIndices={false}
            maxWidth={650}
            restrictDelete={({ level }) => level === 1}
            restrictAdd={({ level }) => level === 0}
            indent={isMobile ? 1 : 2}
          />
        </Suspense>
      ) : (
        <Loading />
      )}
      {overrides && (
        <div style={{ maxWidth: 650, marginTop: '3em' }}>
          <Message info icon style={{ backgroundColor: 'white', marginBottom: 0 }}>
            <Icon name="info circle" color="teal" />
            <Message.Content>{t('PREFERENCES_OVERRIDE_INFO')}</Message.Content>
          </Message>
          <JsonEditor
            data={overrides}
            rootName="overrides"
            collapse={2}
            showArrayIndices={false}
            maxWidth={650}
            restrictDelete={true}
            restrictAdd={true}
            restrictEdit={true}
            indent={isMobile ? 1 : 2}
            showSearch={false}
            showSaveButton={false}
          />
        </div>
      )}
      <div style={{ marginTop: '2em', maxWidth: 650 }}>
        <Header as="h2">{t('PREFERENCES_MAINTENANCE_MODE')}</Header>
        <Message
          header={t('PREFERENCES_MAINTENANCE_WARNING')}
          content={t('PREFERENCES_MAINTENANCE_WARNING_TEXT')}
          warning
        />
        <Checkbox
          style={{ float: 'right' }}
          label="Enable"
          checked={maintenanceMode}
          toggle
          onChange={() => {
            if (!maintenanceMode)
              showWarningModal({
                type: 'warning',
                title: t('PREFERENCES_ENABLE_MAINTENANCE_MODE'),
                message: t('PREFERENCES_ENABLE_MAINTENANCE_TEXT'),
                confirmText: t('BUTTON_CONFIRM'),
                awaitAction: false,
                onConfirm: handleSetMaintenanceMode,
              })
            else handleSetMaintenanceMode()
          }}
        />
      </div>
    </div>
  )
}
