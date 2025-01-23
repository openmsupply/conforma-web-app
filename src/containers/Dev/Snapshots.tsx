import React, { useState, useEffect } from 'react'
import {
  Button,
  Icon,
  Input,
  Label,
  Loader,
  Modal,
  Table,
  Header,
  SemanticCOLORS,
  Dropdown,
  Form,
  List,
} from 'semantic-ui-react'
import config from '../../config'
import getServerUrl from '../../utils/helpers/endpoints/endpointUrlBuilder'
import { getRequest, postRequest } from '../../utils/helpers/fetchMethods'
import useConfirmationModal from '../../utils/hooks/useConfirmationModal'
import { useToast } from '../../contexts/Toast'
import { DateTime } from 'luxon'
import TextIO from '../TemplateBuilder/shared/TextIO'
import { downloadFile, fileSizeWithUnits } from '../../utils/helpers/utilityFunctions'
import { useRouter } from '../../utils/hooks/useRouter'
import { Tooltip, UploadButton } from '../../components/common'
import { usePrefs } from '../../contexts/SystemPrefs'
import { BrowserNotifications } from '../../utils/browserNotifications'

type ArchiveType = { type: 'full' | 'none' | 'partial'; from?: string; to?: string }
interface SnapshotData {
  name: string
  filename: string
  size: number
  timestamp: string
  version: string
  archive?: ArchiveType
}

interface ArchiveInfo {
  timestamp: number
  uid: string
  archiveFolder: string
  prevArchiveFolder: string | null
  prevUid: string | null
  totalFileSize?: number
}

interface ListData {
  snapshots: SnapshotData[]
  currentArchives: ArchiveInfo[]
}

type SnapshotType = 'snapshots' | 'archives'

const Snapshots: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [snapshotError, setSnapshotError] = useState<{ message: string; error: string } | null>(
    null
  )
  const { query, updateQuery } = useRouter()
  const [displayType, setDisplayType] = useState<SnapshotType>(
    (query.type as SnapshotType) ?? 'snapshots'
  )
  const [expandedSnapshots, setExpandedSnapshots] = useState<string[]>([])
  const [archive, setArchive] = useState<number | 'full' | 'none'>()
  const [archiveEnd, setArchiveEnd] = useState<number>()
  const [refetchData, setRefetchData] = useState(false)
  const { maintenanceMode } = usePrefs()

  const [data, setData] = useState<ListData | null>(null)

  const { ConfirmModal, showModal } = useConfirmationModal({ type: 'warning', awaitAction: false })
  const { showToast } = useToast({ style: 'success' })

  const JWT = localStorage.getItem(config.localStorageJWTKey)
  const isProductionBuild = config.isProductionBuild

  BrowserNotifications.checkPermission()

  useEffect(() => {
    updateQuery({ type: displayType })
    setData(null)
    setSnapshotError(null)
    getList(displayType)
  }, [displayType, refetchData])

  const getList = async (displayType: SnapshotType) => {
    try {
      setData(
        await getRequest(
          getServerUrl('snapshot', { action: 'list', archive: displayType === 'archives' })
        )
      )
    } catch (e) {}
  }

  const normaliseSnapshotName = (name: string) =>
    // Not word, not digit
    name.replace(/[^\w\d-]/g, '_')

  const takeSnapshot = async (name: string) => {
    if (!name) return

    localStorage.setItem('defaultSnapshotName', name)

    setIsLoading(true)
    try {
      const resultJson = await postRequest({
        url: getServerUrl('snapshot', {
          action: 'take',
          name: normaliseSnapshotName(name),
          archive: displayType === 'archives',
        }),
        jsonBody: {
          archive:
            typeof archive === 'string'
              ? archive
              : archive === undefined
              ? 'full'
              : { from: archive, to: archiveEnd },
        },
        headers: { 'Content-Type': 'application/json' },
      })

      if (resultJson.success) {
        await getList(displayType)
        setIsLoading(false)
        BrowserNotifications.notify({
          title: 'Snapshot saved',
          body: name,
          onFocus: () => {
            if (displayType === 'snapshots') location.reload()
          },
        })
        if (document.hasFocus() && displayType === 'snapshots') location.reload()
        return
      }
      setSnapshotError(resultJson)
      BrowserNotifications.notify({
        title: 'Problem taking snapshot',
        body: name,
      })
    } catch (error) {
      setSnapshotError({
        message: 'Front end error while taking snapshot',
        error: (error as Error).message,
      })
      BrowserNotifications.notify({
        title: 'Problem taking snapshot',
        body: name,
      })
    }
  }

  const useSnapshot = async (name: string) => {
    const maintenanceModeAlreadyEnabled = maintenanceMode.enabled
    if (!maintenanceModeAlreadyEnabled && isProductionBuild) {
      console.log('Enabling maintenance mode')
      await postRequest({
        url: getServerUrl('setMaintenanceMode'),
        jsonBody: { enabled: true },
        headers: { 'Content-Type': 'application/json' },
      })
    }
    setIsLoading(true)
    try {
      const resultJson = await postRequest({
        url: getServerUrl('snapshot', { action: 'use', name }),
        timeout: 10 * 60, // Ten minutes
      })

      if (resultJson.success) {
        setIsLoading(false)
        BrowserNotifications.notify({
          title: 'Snapshot loaded',
          body: name,
          onFocus: () => location.reload(),
        })
        return
      }
      setSnapshotError(resultJson)
      BrowserNotifications.notify({
        title: 'Problem loading snapshot',
        body: name,
      })
    } catch (error) {
      setSnapshotError({
        message: 'Front end error while loading snapshot',
        error: (error as Error).message,
      })
      BrowserNotifications.notify({
        title: 'Problem loading snapshot',
        body: name,
      })
    } finally {
      // Only re-enable maintenance mode if it wasn't already on before
      // snapshot load
      if (!maintenanceModeAlreadyEnabled && isProductionBuild) {
        console.log('Disabling maintenance mode')
        await postRequest({
          url: getServerUrl('setMaintenanceMode'),
          jsonBody: { enabled: false },
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }
  }

  const deleteSnapshot = async (name: string) => {
    setIsLoading(true)
    try {
      const resultJson = await postRequest({
        url: getServerUrl('snapshot', {
          action: 'delete',
          name,
          archive: displayType === 'archives',
        }),
      })
      if (resultJson.success) {
        await getList(displayType)
        setIsLoading(false)
        return
      }
      setSnapshotError(resultJson)
    } catch (error) {
      setSnapshotError({
        message: 'Front end error while deleting snapshot',
        error: (error as Error).message,
      })
    }
  }

  const uploadSnapshot = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target?.files) return

    const file = event.target.files[0]

    setIsLoading(true)
    try {
      const data = new FormData()
      data.append('file', file)

      const resultJson = await postRequest({
        otherBody: data,
        url: getServerUrl('snapshot', { action: 'upload' }),
      })

      if (resultJson.success) {
        await getList(displayType)
        setIsLoading(false)
        BrowserNotifications.notify({
          title: 'Snapshot uploaded',
          body: file.name,
        })
        return
      }
      setSnapshotError(resultJson)
      BrowserNotifications.notify({
        title: 'Problem uploading snapshot',
        body: file.name,
      })
    } catch (error) {
      setSnapshotError({
        message: 'Front end error while uploading snapshot',
        error: (error as Error).message,
      })
      BrowserNotifications.notify({
        title: 'Problem uploading snapshot',
        body: file.name,
      })
    }
  }

  const renderSingleSnapshot = (
    { name, filename, timestamp, archive, size }: SnapshotData,
    hasChildren = false
  ) => (
    <Table.Row key={filename}>
      <Table.Cell style={{ padding: 5 }}>
        <div className="flex-row-space-between" style={{ width: '100%', padding: 5 }}>
          <div className="flex-row" style={{ gap: 10 }}>
            <strong>{name}</strong>
            <span className="smaller-text">{size ? fileSizeWithUnits(size) : 'Size unknown'}</span>
          </div>
          <div className="flex-row" style={{ gap: 5 }}>
            {displayType === 'snapshots' && (
              <Icon
                size="large"
                className="clickable"
                name="play circle"
                onClick={() => {
                  if (isProductionBuild)
                    showModal({
                      title: 'Are you sure?',
                      message: `This will overwrite ALL existing data on: ${window.location.host}`,
                      onConfirm: () => useSnapshot(filename),
                    })
                  else useSnapshot(filename)
                }}
              />
            )}
            <Icon
              name="download"
              size="large"
              className="clickable blue"
              onClick={async () => {
                showToast({ title: 'Download started...', timeout: 2000 })
                await downloadFile(
                  getServerUrl('snapshot', {
                    action: 'download',
                    name: filename,
                    archive: displayType === 'archives',
                  }),
                  `${displayType === 'archives' ? 'ARCHIVE_' : ''}${filename}.zip`,
                  {
                    headers: { Authorization: `Bearer ${JWT}` },
                  }
                )
                showToast({
                  title: 'Download complete',
                  text: `${displayType === 'archives' ? 'ARCHIVE_' : ''}${filename}`,
                  timeout: 0,
                })
                BrowserNotifications.notify({ title: 'Snapshot downloaded', body: name })
              }}
            />

            <Icon
              size="large"
              className="clickable"
              name="trash alternate"
              onClick={async () => {
                await deleteSnapshot(filename)
                showToast({
                  title: `${displayType === 'archives' ? 'Archive snapshot' : 'Snapshot'} deleted`,
                  text: name,
                })
              }}
            />
          </div>
        </div>
        <div className="flex-row" style={{ gap: 10, padding: 5 }}>
          <TextIO
            text={DateTime.fromISO(timestamp).toLocaleString(DateTime.DATETIME_SHORT)}
            title="Timestamp"
            additionalStyles={{ margin: 0 }}
          />
          {archive && (
            <div className="flex-row-start-center" style={{ gap: 5 }}>
              {archive.type !== 'none' && (
                <>
                  <TextIO
                    title={`Archive`}
                    text={`${DateTime.fromISO(
                      archive.from ?? ''
                    ).toLocaleString()} – ${DateTime.fromISO(archive.to ?? '').toLocaleString()}`}
                    additionalStyles={{ margin: 0 }}
                  />
                  <Tooltip
                    message={`### Archives\n\nFrom: **${DateTime.fromISO(
                      archive.from ?? ''
                    ).toLocaleString(DateTime.DATETIME_MED)}**  \nTo: **${DateTime.fromISO(
                      archive.to ?? ''
                    ).toLocaleString(DateTime.DATETIME_MED)}**`}
                    iconStyle={{ marginLeft: 0, height: 'auto' }}
                  />
                </>
              )}
              {renderArchiveLabel(archive)}
            </div>
          )}
        </div>
        {hasChildren && (
          <div
            className="flex-row-start-center clickable"
            onClick={(e: React.MouseEvent<HTMLElement>) => {
              if (e.getModifierState('Meta') || e.getModifierState('Control')) {
                setExpandedSnapshots([])
                return
              }
              if (expandedSnapshots.includes(name))
                setExpandedSnapshots(expandedSnapshots.filter((el) => el !== name))
              else setExpandedSnapshots([...expandedSnapshots, name])
            }}
          >
            <Icon
              size="large"
              name="dropdown"
              style={{
                transform: expandedSnapshots.includes(name) ? 'rotate(0deg)' : 'rotate(-90deg)',
                transition: '0.2s',
              }}
            />
            <p className="smaller-text">Show all</p>
          </div>
        )}
      </Table.Cell>
    </Table.Row>
  )

  const renderSnapshotList = () => {
    if (!data) return null
    const nestedSnapshots = getNestedSnapshots(data.snapshots)
    return nestedSnapshots.map((snapshot) => (
      <React.Fragment key={snapshot.filename}>
        {renderSingleSnapshot(snapshot, snapshot.otherVersions.length > 0)}
        {expandedSnapshots.includes(snapshot.name) && (
          <Table.Row>
            <Table.Cell style={{ background: 'transparent', paddingRight: 0 }}>
              <Table style={{ marginTop: -14, marginBottom: -10 }}>
                <Table.Body>
                  {snapshot.otherVersions.map((snapshot) => renderSingleSnapshot(snapshot))}
                </Table.Body>
              </Table>
            </Table.Cell>
          </Table.Row>
        )}
      </React.Fragment>
    ))
  }

  const resetLoading = () => {
    setSnapshotError(null)
    setIsLoading(false)
  }

  const renderLoadingAndError = () => (
    <Modal open={isLoading} onClose={resetLoading}>
      {snapshotError ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Label size="large" color="red">
            {snapshotError.message}
            <Icon name="close" onClick={resetLoading} />
          </Label>
          <div style={{ margin: 20 }}>
            {snapshotError.error.split('\n').map((line) => (
              <>
                <span>{line}</span>
                <br />
              </>
            ))}
          </div>
        </div>
      ) : (
        <Loader active>Loading</Loader>
      )}
    </Modal>
  )

  const renderArchiveLabel = (archive?: ArchiveType) => {
    if (!archive) return null
    let color: SemanticCOLORS
    let text: string
    switch (archive.type) {
      case 'full':
        color = 'green'
        text = 'FULL'
        break
      case 'partial':
        color = 'orange'
        text = 'PARTIAL'
        break
      default:
        color = 'red'
        text = 'No archive'
    }
    return <Label content={text} color={color} size="mini" />
  }

  const renderNewSnapshot = () => {
    const [name, setName] = useState(localStorage.getItem('defaultSnapshotName') ?? '')
    const archiveOptions =
      data && data.currentArchives?.length > 0
        ? [
            { key: 'full', value: 'full', text: 'Include full archive' },
            ...data?.currentArchives.map(({ timestamp, uid, totalFileSize }) => ({
              text: `${DateTime.fromMillis(timestamp).toLocaleString(DateTime.DATETIME_SHORT)}${
                totalFileSize ? ` (${fileSizeWithUnits(totalFileSize)})` : ''
              }`,
              value: timestamp,
              key: uid,
            })),
          ]
        : []
    if (displayType === 'snapshots' && archiveOptions.length > 0)
      archiveOptions.unshift({ key: 'none', value: 'none', text: 'No archive' })

    const archiveEndOptions =
      typeof archive === 'number'
        ? archiveOptions.filter(({ value }) => typeof value === 'number' && value >= archive)
        : []

    const hasArchives = data && data.currentArchives?.length > 0

    const totalSelectionSize = getTotalSize(archive, archiveEnd, data?.currentArchives)

    return (
      <Table.Row>
        <Table.Cell className="flex-row-start-center" style={{ gap: 10, padding: 15 }}>
          <div className="flex-column" style={{ gap: 10, width: '100%' }}>
            <Input
              onChange={(_, { value }) => setName(value)}
              value={name}
              placeholder="Enter snapshot name"
              style={{ width: 250 }}
            />
            {hasArchives && (
              <>
                <div className="flex-row-start-center" style={{ gap: 10 }}>
                  {typeof archive === 'number' && <span>From: </span>}
                  <Dropdown
                    placeholder="Select earliest archive"
                    selection
                    clearable
                    value={archive}
                    options={archiveOptions}
                    onChange={(_, { value }) => {
                      setArchive(value as number | 'none' | 'full')
                      if (
                        value === 'none' ||
                        value === 'full' ||
                        (value as number) > (archiveEnd ?? 0)
                      )
                        setArchiveEnd(undefined)
                    }}
                    style={{ maxWidth: 400, fontSize: '90%' }}
                  />
                  {typeof archive === 'number' &&
                    data &&
                    data?.currentArchives.filter(({ timestamp }) => timestamp > archive).length >
                      0 && (
                      <>
                        <span>to: </span>
                        <Dropdown
                          placeholder="Select latest archive"
                          selection
                          clearable
                          value={archiveEnd}
                          options={archiveEndOptions}
                          onChange={(_, { value }) => {
                            setArchiveEnd(value === '' ? undefined : (value as number))
                          }}
                          style={{ maxWidth: 400, fontSize: '90%' }}
                        />
                      </>
                    )}
                </div>
                {totalSelectionSize && (
                  <div className="flex-row-start-center" style={{ gap: 6 }}>
                    Total selected size:
                    {typeof totalSelectionSize === 'number' ? (
                      <span>
                        {fileSizeWithUnits(totalSelectionSize)}{' '}
                        <span className="smaller-text">(before zip compression)</span>
                      </span>
                    ) : (
                      <em>{totalSelectionSize}</em>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          <div className="flex-column" style={{ gap: 10 }}>
            <Header as="h4" style={{ marginBottom: 0, textAlign: 'center', maxWidth: 250 }}>
              {`Create new ${displayType === 'archives' ? 'Archive ' : ''}snapshot`}
            </Header>
            <Button
              primary
              disabled={
                !name || (hasArchives && !archive) || (displayType === 'archives' && !archive)
              }
              onClick={() => {
                takeSnapshot(name)
              }}
              content="Save"
            />
          </div>
        </Table.Cell>
      </Table.Row>
    )
  }

  const renderMissingArchives = (missingArchives: ArchiveInfo[]) => {
    return (
      <Table.Row>
        <Table.Cell className="flex-row-start-center">
          <div className="flex-column-start-start" style={{ margin: 8 }}>
            <p style={{ marginBottom: 6, marginTop: 0 }}>
              The following archives are not present in any archive snapshot:
            </p>
            <List bulleted style={{ textAlign: 'left' }}>
              {missingArchives.map((archive) => (
                <List.Item key={archive.uid} className="slightly-smaller-text">
                  {DateTime.fromMillis(archive.timestamp).toLocaleString(DateTime.DATETIME_MED)} |{' '}
                  {archive.uid}
                </List.Item>
              ))}
            </List>
          </div>
        </Table.Cell>
      </Table.Row>
    )
  }

  const renderArchiveFiles = () => {
    const [days, setDays] = useState(7)
    const [loading, setLoading] = useState(false)

    const archiveFiles = async () => {
      setLoading(true)
      const result = await getRequest(getServerUrl('archiveFiles', { days }))
      showToast({
        title: result === null ? 'Nothing to archive' : 'Archive complete',
        text: result === null ? undefined : `${result.numFiles} files archived`,
        style: result ? 'success' : 'warning',
      })
      setLoading(false)
      setRefetchData(!refetchData)
    }

    return (
      <div style={{ display: displayType === 'snapshots' ? 'none' : 'block' }}>
        <Header as="h3">Create a new archive</Header>
        <div className="flex-row-space-between-center" style={{ marginTop: 10 }}>
          <div className="flex-row-start-center" style={{ gap: 5 }}>
            Archive files older than
            <Form.Input
              size="mini"
              type="number"
              min={1}
              value={days}
              onChange={(e) => {
                const num = Number(e.target.value)
                if (num < 1) setDays(1)
                else setDays(num)
              }}
              style={{ maxWidth: 65 }}
            />
            days
          </div>
          <Button
            primary
            inverted
            loading={loading}
            onClick={() =>
              showModal({
                title: 'Make a new archive?',
                message: `This will archive system files older than ${days} days. Are you sure?`,
                onConfirm: archiveFiles,
              })
            }
          >
            Archive <Icon name="archive" style={{ paddingLeft: 5, transform: 'translateY(0px)' }} />
          </Button>
        </div>
      </div>
    )
  }

  const renderUploadSnapshot = () => {
    return (
      <div>
        <UploadButton primary inverted handleFiles={uploadSnapshot}>
          Upload <Icon name="upload" style={{ paddingLeft: 5 }} />
        </UploadButton>
      </div>
    )
  }

  const missingArchives = data ? getMissingArchives(data) : []

  return (
    <div id="list-container" style={{ minWidth: 500, maxWidth: 750 }}>
      <ConfirmModal />
      <Header>Snapshots</Header>
      <div className="flex-row-space-between">
        <div className="flex-row-start-center" style={{ gap: 10 }}>
          Show:
          <Dropdown
            selection
            value={displayType}
            options={[
              { key: 'snapshots', value: 'snapshots', text: 'Snapshots' },
              { key: 'archives', value: 'archives', text: 'Archive snapshots' },
            ]}
            onChange={(_, { value }) => setDisplayType(value as SnapshotType)}
            style={{ maxWidth: 350 }}
          />
        </div>
        {renderUploadSnapshot()}
      </div>
      <Table stackable style={{ marginTop: 0 }}>
        <Table.Body>
          {renderNewSnapshot()}
          {missingArchives.length > 0 && renderMissingArchives(missingArchives)}
          {renderSnapshotList()}
        </Table.Body>
      </Table>
      {renderLoadingAndError()}
      {renderArchiveFiles()}
    </div>
  )
}

const getMissingArchives = ({ currentArchives, snapshots }: ListData) => {
  const availableArchives = new Set<string>()
  snapshots.forEach(({ archive }) => {
    if (!archive) return
    const from = archive.from ? DateTime.fromISO(archive.from).toMillis() : 0
    const to = archive.to ? DateTime.fromISO(archive.to).toMillis() : Infinity
    currentArchives.forEach((archive) => {
      if (archive.timestamp >= from && archive.timestamp <= to) availableArchives.add(archive.uid)
    })
  })
  return currentArchives.filter(({ uid }) => !availableArchives.has(uid))
}

const getTotalSize = (
  archiveStart: number | 'full' | 'none' | undefined,
  archiveEnd: number | undefined,
  currentArchives: ArchiveInfo[] | undefined
) => {
  if (!currentArchives) return null
  if (!archiveStart || archiveStart === 'none') return null
  const start = archiveStart === 'full' ? 0 : archiveStart ?? 0
  const end = archiveEnd ?? Infinity

  const includedArchives = currentArchives.filter(
    (archive) => archive.timestamp >= start && archive.timestamp <= end
  )
  if (includedArchives.some((archive) => !archive.totalFileSize)) return 'Unknown'

  return includedArchives.reduce((sum, archive) => sum + (archive.totalFileSize ?? 0), 0)
}

const getNestedSnapshots = (snapshots: SnapshotData[]) => {
  const nestedSnapshots: (SnapshotData & { otherVersions: SnapshotData[] })[] = []
  snapshots.forEach((snapshot) => {
    const outer = nestedSnapshots.find((el) => el.name === snapshot.name)
    if (outer) outer.otherVersions.push(snapshot)
    else nestedSnapshots.push({ ...snapshot, otherVersions: [] })
  })
  return nestedSnapshots
}

export default Snapshots
