// This file should be identical to the back-end "evaluatorFunctions.ts". It
// allows us to preview the "objectFunctions" operator in the Template Builder
// Actions config

import { DateTime, Duration } from 'luxon'

interface FilterOptions {
  key?: string
  rule?: 'exclude' | 'include'
  values: string | string[]
}

type FormatDate =
  | string
  | {
      format: string
      locale?: string
    }

// Date formats for "getLocalisedDate"
const dateFormats = {
  short: DateTime.DATE_SHORT,
  med: DateTime.DATE_MED,
  medWeekday: DateTime.DATE_MED_WITH_WEEKDAY,
  full: DateTime.DATE_FULL,
  huge: DateTime.DATE_HUGE,
  shortDateTime: DateTime.DATETIME_SHORT,
  medDateTime: DateTime.DATETIME_MED,
  fullDateTime: DateTime.DATETIME_FULL,
  hugeDateTime: DateTime.DATETIME_HUGE,
}

export const functions: Record<string, any> = {
  filterArray: {
    function: (valuesArray: unknown[], options: FilterOptions) => {
      const { key, rule = 'exclude', values } = options

      const compareValues = Array.isArray(values) ? values : [values]

      const isObject = (element: unknown) =>
        typeof element === 'object' && !Array.isArray(element) && element !== null

      return valuesArray.filter((element) => {
        if (key && isObject(element))
          return Object.entries(element as Object).find(
            ([objKey, value]) =>
              objKey === key &&
              (rule === 'include' ? compareValues.includes(value) : !compareValues.includes(value))
          )
        else
          return rule === 'include'
            ? compareValues.includes(element as string)
            : !compareValues.includes(element as string)
      })
    },
    description:
      'Filter an array based on the presence of certain values in an the array, or on a certain key on an array of objects',
    argsDefault: [[1, 2, 3, 4, 5], { values: [3, 5], rule: 'exclude' }],
  },
  generateExpiry: {
    function: (duration: Duration, startDate?: string | Date) => {
      const date = startDate
        ? typeof startDate === 'string'
          ? DateTime.fromISO(startDate)
          : DateTime.fromJSDate(startDate)
        : DateTime.now()

      return date.plus(duration).toJSDate()
    },
    description:
      'Return a Date object that is a certain duration away from either now, or a specified start date',
    argsDefault: [{ years: 1 }],
  },
  getYear: {
    function: (type?: 'short'): string =>
      type === 'short'
        ? String(new Date().getFullYear()).slice(2)
        : String(new Date().getFullYear()),
    description:
      'Get the current year. If parameter "short" is provided, will give the 2 digit version of the year.',
  },
  getFormattedDate: {
    function: (formatString: FormatDate, inputDate?: string | Date) => {
      const date = inputDate
        ? typeof inputDate === 'string'
          ? DateTime.fromISO(inputDate)
          : DateTime.fromJSDate(inputDate)
        : DateTime.now()

      if (typeof formatString === 'string') return date.toFormat(formatString)
      const { format, locale } = formatString
      return date.toFormat(format, { locale })
    },
    description:
      'Returns ISO date string or JS Date as formatted Date (using Luxon). Returns current date if date not supplied as 2nd arg.',
    argsDefault: ['yyyy LLL dd'],
  },
  getLocalisedDateTime: {
    function: (
      inputDate: string | Date,
      format: 'short' | 'med' | 'medWeekday' | 'full' | 'huge' = 'med',
      locale?: string
    ) => {
      const date = inputDate
        ? typeof inputDate === 'string'
          ? DateTime.fromISO(inputDate)
          : DateTime.fromJSDate(inputDate)
        : DateTime.now()

      const localisedFormat = dateFormats[format]

      if (locale) date.setLocale(locale)

      return date.toLocaleString(localisedFormat)
    },
    description: 'Returns ISO date string or JS Date in a localised Date format. ',
    argsDefault: ['2020-12-23', 'med'],
  },
  getJSDate: {
    function: (date?: string) => (date ? DateTime.fromISO(date).toJSDate() : new Date()),
    description:
      'Returns JS Date object from ISO date string. Assumes current timestamp if not supplied as arg',
  },
  getISODate: {
    function: (date?: Date) => (date ? DateTime.fromJSDate(date).toISO() : DateTime.now().toISO()),
    description:
      'Returns ISO date-time string from JS Date object. Assumes current timestamp if not supplied as arg',
  },
  extractNumber: {
    function: (input: string) => {
      const numberMatch = input.match(/-?\d*\.?\d+/gm)
      if (!numberMatch) return 0
      return Number(numberMatch[0])
    },
    description: 'Extracts any numeric content from a string: https://regex101.com/r/HG5MFW/1',
    argsDefault: ['The time is 420 🌿'], // => 420
  },
  isExpired: {
    function: (date: Date | string | null) => {
      if (date === null) return true
      const testDate = typeof date === 'string' ? new Date(date) : date

      return testDate.getTime() <= Date.now()
    },
    description:
      'Returns true if input date is before (or on) the current date. Also returns true if null',
    argsDefault: ['2025-02-12T10:23:09.790Z'],
  },
  removeAccents: {
    function: (input: string) => input.normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
    description:
      'Remove diacritics (accented characters) from strings -- see https://stackoverflow.com/questions/990904/remove-accents-diacritics-in-a-string-in-javascript',
    argsDefault: ['Renée, Zoë & Jokūbas'], // => "Renee, Zoe & Jokubas"
  },
  lowerCase: {
    function: (text: string) => text.toLowerCase(),
    description: 'Convert string to lowercase',
    argsDefault: ['STOP SHOUTING!!!'], // ==> "stop shouting"
  },

  // The following can now be performed by native operators. Please remove once
  // all templates have been migrated to use them:
  multiply: {
    function: (num1: number, num2: number, decimals: number) => {
      const product = num1 * num2
      const roundingMultiplier = 10 ** decimals
      return isNaN(roundingMultiplier)
        ? product
        : Math.round(product * roundingMultiplier) / roundingMultiplier
    },
    description: 'Multiple two numbers -- PLEASE UPGRADE TO NATIVE OPERATOR',
  },
  split: {
    function: (text: string, delimiter: string = ',') => {
      const values = text.split(delimiter)
      return values.map((v) => v.trim())
    },
    description: 'Split string into array using a delimiter -- PLEASE UPGRADE TO NATIVE OPERATOR',
  },
}
