import React from 'react'
import { Loader, Segment } from 'semantic-ui-react'
import { useLanguageProvider } from '../../contexts/Localisation'

export const Loading: React.FC = () => {
  const { t } = useLanguageProvider()
  return (
    <Segment basic style={{ height: '50vh' }}>
      <Loader active size="massive">
        {t('LABEL_LOADING')}
      </Loader>
    </Segment>
  )
}
