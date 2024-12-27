import { useEffect, useState } from 'react'
import { getRequest } from '../../../../../utils/helpers/fetchMethods'
import getServerUrl from '../../../../../utils/helpers/endpoints/endpointUrlBuilder'
import { DataView } from '../../../../../utils/generated/graphql'
import { useTemplateState } from '../../TemplateWrapper'

interface DataViewDetails {
  data: DataView
  applicantAccessible: boolean
  inTemplateElements: boolean
  inOutputTables: boolean
}

export type DataViewFilter =
  | 'IN_ELEMENTS'
  | 'IN_OUTCOMES'
  | 'SUGGESTED'
  | 'ALL'
  | 'APPLICANT_ACCESSIBLE'

export const useDataViews = (filter: DataViewFilter) => {
  const { template, dataViewJoins } = useTemplateState()
  const [dataViewDetails, setDataViewDetails] = useState<DataViewDetails[]>([])
  const [menuItems, setMenuItems] = useState<DataView[]>([])
  const [error, setError] = useState<string>('')

  const dataViews = (dataViewJoins.map((node) => {
    const details = dataViewDetails.find((d) => d.data.id === node?.dataView?.id)
    return {
      ...node?.dataView,
      dataViewJoinId: node.id,
      inTemplateElements: details?.inTemplateElements ?? false,
      inOutputTables: details?.inOutputTables ?? false,
      applicantAccessible: details?.applicantAccessible ?? false,
    }
  }) ?? []) as (DataView & {
    dataViewJoinId: number
    inTemplateElements: boolean
    inOutputTables: boolean
    applicantAccessible: boolean
  })[]

  const currentlyLinkedDataViewIDs = dataViews.map(({ identifier }) => identifier)

  useEffect(() => {
    getRequest(
      getServerUrl('templateImportExport', {
        action: 'getDataViewDetails',
        id: template.id,
      })
    )
      .then((result) => {
        setDataViewDetails(result)
      })
      .catch((err) => {
        setError('Error: ' + err.message)
      })
  }, [dataViewJoins])

  useEffect(() => {
    setMenuItems(getDataViewMenuItems(dataViewDetails, currentlyLinkedDataViewIDs, filter))
  }, [filter, dataViewDetails])

  return {
    current: dataViews,
    menuItems,
    // unconnectedElementSuggestions,
    // unconnectedOutcomeSuggestions,
    error,
  }
}

const getDataViewMenuItems = (
  dataViewDetails: DataViewDetails[],
  currentlyLinkedDataViewIDs: string[],
  filter: DataViewFilter
) => {
  let menuDataViews: DataViewDetails[] = []
  switch (filter) {
    case 'ALL':
      menuDataViews = dataViewDetails
      break
    case 'IN_ELEMENTS':
      menuDataViews = dataViewDetails.filter((dv) => dv.inTemplateElements)
      break
    case 'IN_OUTCOMES':
      menuDataViews = dataViewDetails.filter((dv) => dv.inOutputTables)
      break
    case 'SUGGESTED':
      menuDataViews = dataViewDetails.filter((dv) => dv.inTemplateElements || dv.inOutputTables)
      break
    case 'APPLICANT_ACCESSIBLE':
      menuDataViews = dataViewDetails.filter((dv) => dv.applicantAccessible)
      break
  }

  return menuDataViews
    .filter((dv) => !currentlyLinkedDataViewIDs.includes(dv.data.identifier))
    .map((dv) => dv.data)
}
