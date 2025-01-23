import React, { useState } from 'react'
import { Button, Grid, Icon, Popup } from 'semantic-ui-react'
import { Link, RouteComponentProps, withRouter } from 'react-router-dom'
import { useRouter } from '../../utils/hooks/useRouter'
import { TemplatesDetails } from '../../utils/types'
import { Loading } from '../../components/common'

interface AppMenuProps extends RouteComponentProps {
  templatePermissions: TemplatesDetails
}

const AppMenu: React.FC<AppMenuProps> = ({ templatePermissions }) => {
  const [isOpen, setIsOpen] = useState(false)
  const {
    query: { type },
  } = useRouter()

  return (
    <Popup
      position="bottom right"
      trigger={<Icon name="chevron down" style={{ paddingLeft: 10 }} />}
      on="click"
      onOpen={() => setIsOpen(true)}
      onClose={() => setIsOpen(false)}
      open={isOpen}
      style={{ zIndex: 20 }}
    >
      {templatePermissions ? (
        <Grid divided columns="equal">
          <Grid.Column>
            {templatePermissions.map(({ name, code }) => (
              <Grid.Row key={`app_menu_${name}`}>
                <Button
                  // basic
                  fluid
                  color="grey"
                  content={name}
                  active={type === code}
                  as={Link}
                  to={`/applications?type=${code}`}
                  onClick={() => setIsOpen(false)}
                />
              </Grid.Row>
            ))}
          </Grid.Column>
        </Grid>
      ) : (
        <Loading />
      )}
    </Popup>
  )
  // return (
  //   templatePermissions && (
  //     <Dropdown.Menu position="bottom right">
  //       <Dropdown.Item
  //         key={`app_menu_home`}
  //         content={<Header as="h5" inverted icon="home" />}
  //         active={pathname === '/dashboard'}
  //         as={Link}
  //         to={'/dashboard'}
  //       />
  //       {templatePermissions.map(({ name, code, permissions }) => (
  //         <Dropdown.Item
  //           key={`app_menu_${name}`}
  //           content={name}
  //           active={type === code}
  //           as={Link}
  //           to={`/applications?type=${code}`}
  //         />
  //       ))}
  //     </Dropdown.Menu>
  //   )
  // )
}

export default withRouter(AppMenu)
