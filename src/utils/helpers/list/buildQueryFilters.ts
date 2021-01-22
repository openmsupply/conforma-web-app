import { DateTime } from 'luxon'
import { BasicStringObject } from '../../types'
import { ApplicationStatus, ApplicationOutcome } from '../../generated/graphql'

export default function buildQueryFilters(filters: BasicStringObject) {
  const graphQLfilter = Object.entries(filters).reduce((filterObj, [key, value]) => {
    if (!mapQueryToFilterField?.[key]) return filterObj
    return { ...filterObj, ...mapQueryToFilterField[key](value) }
  }, {})
  return graphQLfilter
}
interface FilterMap {
  [key: string]: (value: string) => object
}

const mapQueryToFilterField: FilterMap = {
  type: (value: string) => {
    return { templateCode: { equalToInsensitive: value } }
  },
  // category -- not yet implemented in schema
  stage: (values: string) => {
    return {
      stage: inList(values),
    }
  },
  status: (values: string) => {
    return { status: inEnumList(values, ApplicationStatus) }
  },
  outcome: (values: string) => {
    return { outcome: inEnumList(values, ApplicationOutcome) }
  },
  // action
  // assigned
  // consolidator
  applicant: (values: string) => {
    return {
      or: [
        { applicant: inList(values) },
        { applicantFirstName: inList(values) },
        { applicantLastName: inList(values) },
        { applicantUsername: inList(values) },
      ],
    }
  },
  org: (values: string) => {
    return { orgName: inList(values) }
  },
  lastActiveDate: (value: string) => {
    const [startDate, endDate] = parseDateString(value)
    console.log('Dates:', startDate, endDate)
    return { lastActiveDate: { greaterThanOrEqualTo: startDate, lessThan: endDate } }
  },
  // deadlineDate (TBD)
  search: (value: string) => {
    return {
      or: [
        { name: { includesInsensitive: value } },
        { applicantUsername: { includesInsensitive: value } },
        { applicant: { includesInsensitive: value } },
        { orgName: { includesInsensitive: value } },
        { templateName: { includesInsensitive: value } },
        { stage: { startsWithInsensitive: value } },
      ],
    }
  },
}

const splitCommaList = (values: string) => values.split(',')

// Use this if the values can be free text strings (e.g. stage name)
const inList = (values: string) => {
  return { inInsensitive: splitCommaList(values) }
}

// Use this if the values must conform to an Enum type (e.g. status, outcome)
const inEnumList = (values: string, enumList: any) => {
  return {
    in: splitCommaList(values)
      .map((value) => value.toUpperCase())
      .filter((value) => {
        return Object.values(enumList).includes(value)
      }),
  }
}

const parseDateString = (dateString: string) => {
  if (mapNamedDates?.[dateString]) return mapNamedDates[dateString]
  const [startDate, endDate] = dateString.split(':')
  if (endDate === undefined)
    // Exact date -- add 1 to cover until start of the next day
    return [startDate, datePlusDays(1, startDate)]
  if (endDate === '') return [startDate, undefined] // No end date boundary
  if (startDate === '') return [undefined, endDate] // No start date boundary
  return [startDate, endDate]
}

const datePlusDays = (offset = 0, dateString: string | undefined = undefined) => {
  if (dateString) return DateTime.fromISO(dateString).plus({ days: offset }).toISODate()
  return DateTime.local().plus({ days: offset }).toISODate()
}

interface NamedDateMap {
  [key: string]: string[]
}

const mapNamedDates: NamedDateMap = {
  today: [datePlusDays(), datePlusDays(1)],
  yesterday: [datePlusDays(-1), datePlusDays()],
  'this-week': [datePlusDays(-7), datePlusDays(1)],
  // TO-DO:
  //  last-week,
  //  this-month,
  //  last-month,
  //  this-quarter,
  //  last-quarter,
  //  this-year,
  //  last-year
  //  etc...
}
