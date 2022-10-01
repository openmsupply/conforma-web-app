/*
This filter is based <DataViewSearchableList>, but without the List part
*/

import React, { useState, useEffect } from 'react'
import { Input } from 'semantic-ui-react'
import { FilterContainer, FilterTitle } from '../../List/ListFilters/common'
import { useLanguageProvider } from '../../../contexts/Localisation'
import useDebounce from '../../../formElementPlugins/search/src/useDebounce'
import { FiltersCommon } from '../../List/ListFilters/types'

type TextSearchFilterProps = FiltersCommon & {
  setFilterText: (text: string) => void
  currentValue: string
}

export const DataViewTextSearchFilter: React.FC<TextSearchFilterProps> = ({
  setFilterText,
  title,
  onRemove,
  currentValue,
}) => {
  const { strings } = useLanguageProvider()
  const [searchText, setSearchText] = useState<string>(currentValue)
  const [debounceOutput, setDebounceInput] = useDebounce(searchText)

  useEffect(() => {
    setFilterText(debounceOutput)
  }, [debounceOutput])

  return (
    <FilterContainer
      title={title}
      onRemove={onRemove}
      replacementTrigger={
        <FilterTitle
          title={title ?? ''}
          criteria={searchText}
          icon={searchText ? 'search' : undefined}
        />
      }
    >
      <Input
        id="this-one"
        icon="search"
        placeholder={strings.FILTER_START_TYPING}
        iconPosition="left"
        className="search"
        value={searchText}
        onClick={(e: any) => e.stopPropagation()}
        onChange={(_, { value }) => {
          setSearchText(value)
          setDebounceInput(value)
        }}
      />
    </FilterContainer>
  )
}