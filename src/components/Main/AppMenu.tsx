import React from 'react'
import { Menu } from 'semantic-ui-react'
import { Link, RouteComponentProps, withRouter } from 'react-router-dom'
import { useRouter } from '../../utils/hooks/useRouter'
import { useUserState } from '../../contexts/UserState'

interface AppMenuProps extends RouteComponentProps {
  items: Array<Array<String>>
}

const AppMenu: React.FC<AppMenuProps> = (props: AppMenuProps) => {
  const { pathname } = useRouter()
  const {
    userState: { templatePermissions },
  } = useUserState()

  let menuItems = []
  for (let i = 0; i < props.items.length; i++) {
    if (props.items[i].length !== 2) {
      console.error('AppMenu: items format should be ["name", "route"]')
      break
    }
    const name = props.items[i][0]
    const route = props.items[i][1]

    menuItems.push(
      <Menu.Item header key={`app_menu_${name}`} active={pathname === route} as={Link} to={route}>
        {name}
      </Menu.Item>
    )
  }

  return (
    <Menu fluid vertical tabular>
      {menuItems}
      <pre>{JSON.stringify(templatePermissions)}</pre>
    </Menu>
  )
}

export default withRouter(AppMenu)
