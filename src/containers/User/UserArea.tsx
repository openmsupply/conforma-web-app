import React, { SyntheticEvent } from 'react'
import { Button, Container, Image, List, Dropdown } from 'semantic-ui-react'
import { useUserState } from '../../contexts/UserState'
import { attemptLoginOrg } from '../../utils/helpers/attemptLogin'
import { Link } from 'react-router-dom'
import strings from '../../utils/constants'
import { OrganisationSimple, User, LoginPayload, TemplateInList } from '../../utils/types'
import useGetOutcomeDisplays from '../../utils/hooks/useGetOutcomeDisplays'
import useListTemplates from '../../utils/hooks/useListTemplates'
import { useRouter } from '../../utils/hooks/useRouter'
import config from '../../config'
import { getFullUrl } from '../../utils/helpers/utilityFunctions'
import { OutcomeDisplay, UiLocation } from '../../utils/generated/graphql'
const brandLogo = require('../../../images/brand_logo.png').default

const UserArea: React.FC = () => {
  const {
    userState: { currentUser, orgList, templatePermissions },
    onLogin,
  } = useUserState()
  const {
    templatesData: { templates },
  } = useListTemplates(templatePermissions, false)

  const { displays } = useGetOutcomeDisplays()

  if (!currentUser || currentUser?.username === strings.USER_NONREGISTERED) return null

  return (
    <Container id="user-area" fluid>
      <BrandArea />
      <div id="user-area-left">
        <MainMenuBar
          templates={templates}
          outcomes={(displays?.outcomeDisplays as OutcomeDisplay[]) || []}
        />
        {orgList.length > 0 && <OrgSelector user={currentUser} orgs={orgList} onLogin={onLogin} />}
      </div>
      <UserMenu
        user={currentUser as User}
        templates={templates.filter(({ templateCategory: { uiLocation } }) =>
          uiLocation.includes(UiLocation.User)
        )}
      />
    </Container>
  )
}
interface MainMenuBarProps {
  templates: TemplateInList[]
  outcomes: OutcomeDisplay[]
}
const MainMenuBar: React.FC<MainMenuBarProps> = ({ outcomes, templates }) => {
  const { push, pathname } = useRouter()
  const {
    userState: { isAdmin },
  } = useUserState()
  const outcomeOptions = outcomes.map(({ code, title, tableName }): any => ({
    key: code,
    text: title,
    value: tableName,
  }))

  const templateOptions = templates
    .filter(({ templateCategory: { uiLocation } }) => uiLocation.includes(UiLocation.List))
    .sort((t1, t2) => (t1.templateCategory.title > t2.templateCategory.title ? 1 : -1))
    .map((template) => ({
      key: template.code,
      text: template.name,
      value: template.code,
    }))

  const adminOptions: any = [
    { key: 'templates', text: strings.MENU_ITEM_ADMIN_TEMPLATES, value: '/admin/templates' },
    {
      key: 'lookup_tables',
      text: strings.MENU_ITEM_ADMIN_LOOKUP_TABLES,
      value: '/admin/lookup-tables',
    },
    { key: 'outcomes', text: strings.MENU_ITEM_ADMIN_OUTCOME_CONFIG, value: '/admin/outcomes' },
    { key: 'permissions', text: strings.MENU_ITEM_ADMIN_PERMISSIONS, value: '/admin/permissions' },
    { key: 'plugins', text: strings.MENU_ITEM_ADMIN_PLUGINS, value: '/admin/plugins' },
    {
      key: 'localisations',
      text: strings.MENU_ITEM_ADMIN_LOCALISATION,
      value: '/admin/localisations',
    },
  ]
  // Add Admin templates to Admin menu
  adminOptions.push(
    ...templates
      .filter(({ templateCategory: { uiLocation } }) => uiLocation.includes(UiLocation.Admin))
      .map((template) => ({
        key: template.code,
        text: template.name,
        value: `/application/new?type=${template.code}`,
      }))
  )

  const handleOutcomeChange = (_: SyntheticEvent, { value }: any) => {
    push(`/outcomes/${value}`)
  }

  const handleTemplateChange = (_: SyntheticEvent, { value }: any) => {
    push(`/applications?type=${value}`)
  }

  const handleAdminChange = (_: SyntheticEvent, { value }: any) => {
    push(value)
  }

  const getSelectedLinkClass = (link: string) => {
    const basepath = pathname.split('/')?.[1]
    return link === basepath ? 'selected-link' : ''
  }

  return (
    <div id="menu-bar">
      <List horizontal>
        <List.Item className={getSelectedLinkClass('')}>
          <Link to="/">{strings.MENU_ITEM_DASHBOARD}</Link>
        </List.Item>
        {templateOptions.length > 0 && (
          <List.Item className={getSelectedLinkClass('applications')}>
            <Dropdown
              text={strings.MENU_ITEM_APPLICATION_LIST}
              options={templateOptions}
              onChange={handleTemplateChange}
            />
          </List.Item>
        )}
        {outcomeOptions.length > 1 && (
          <List.Item className={getSelectedLinkClass('outcomes')}>
            <Dropdown
              text={strings.MENU_ITEM_OUTCOMES}
              options={outcomeOptions}
              onChange={handleOutcomeChange}
            />
          </List.Item>
        )}
        {isAdmin && (
          <List.Item className={getSelectedLinkClass('admin')}>
            <Dropdown
              text={strings.MENU_ITEM_ADMIN_CONFIG}
              options={adminOptions}
              onChange={handleAdminChange}
            />
            {/* <Dropdown text={strings.MENU_ITEM_ADMIN_CONFIG}>
              <Dropdown.Menu>
                <Dropdown.Item
                  text={strings.MENU_ITEM_ADMIN_TEMPLATES}
                  onClick={() => push('/admin/templates')}
                />
                <Dropdown.Item
                  text={strings.MENU_ITEM_ADMIN_LOOKUP_TABLES}
                  onClick={() => push('/admin/lookup-tables')}
                />
                <Dropdown.Item
                  text={strings.MENU_ITEM_ADMIN_OUTCOME_CONFIG}
                  onClick={() => push('/admin/outcomes')}
                />
                <Dropdown.Item
                  text={strings.MENU_ITEM_ADMIN_PERMISSIONS}
                  onClick={() => push('/admin/permissions')}
                />
                <Dropdown.Item
                  text={strings.MENU_ITEM_ADMIN_PLUGINS}
                  onClick={() => push('/admin/plugins')}
                />
                <Dropdown.Item
                  text={strings.MENU_ITEM_ADMIN_LOCALISATION}
                  onClick={() => push('/admin/localisations')}
                />
              </Dropdown.Menu>
            </Dropdown> */}
          </List.Item>
        )}
      </List>
    </div>
  )
}

const BrandArea: React.FC = () => {
  return (
    <div id="brand-area" className="hide-on-mobile">
      <Image src={brandLogo} />
      <div>
        <Link to="/">
          <h2 className="brand-area-text">{strings.APP_NAME}</h2>
          <h3 className="brand-area-text">{strings.APP_NAME_SUBHEADER}</h3>
        </Link>
      </div>
    </div>
  )
}

const OrgSelector: React.FC<{ user: User; orgs: OrganisationSimple[]; onLogin: Function }> = ({
  user,
  orgs,
  onLogin,
}) => {
  const LOGIN_AS_NO_ORG = 0 // Ensures server returns no organisation

  const JWT = localStorage.getItem('persistJWT') as string

  const handleChange = async (_: SyntheticEvent, { value: orgId }: any) => {
    await attemptLoginOrg({ orgId, JWT, onLoginOrgSuccess })
  }
  const onLoginOrgSuccess = async ({
    user,
    orgList,
    templatePermissions,
    JWT,
    isAdmin,
  }: LoginPayload) => {
    await onLogin(JWT, user, templatePermissions, orgList, isAdmin)
  }
  const dropdownOptions = orgs.map(({ orgId, orgName }) => ({
    key: orgId,
    text: orgName,
    value: orgId,
  }))
  dropdownOptions.push({
    key: LOGIN_AS_NO_ORG,
    text: strings.LABEL_NO_ORG,
    value: LOGIN_AS_NO_ORG,
  })
  return (
    <div id="org-selector">
      {user?.organisation?.logoUrl && (
        <Image src={getFullUrl(user?.organisation?.logoUrl, config.serverREST)} />
      )}
      <div>
        <Dropdown
          text={user?.organisation?.orgName || strings.LABEL_NO_ORG}
          options={dropdownOptions}
          onChange={handleChange}
        ></Dropdown>
      </div>
    </div>
  )
}

const UserMenu: React.FC<{ user: User; templates: TemplateInList[] }> = ({ user, templates }) => {
  const { logout } = useUserState()
  const { push } = useRouter()
  return (
    <div id="user-menu">
      <Button>
        <Button.Content visible>
          <Dropdown text={`${user?.firstName || ''} ${user?.lastName || ''}`}>
            <Dropdown.Menu>
              {templates.map(({ code, name, icon, templateCategory: { icon: catIcon } }) => (
                <Dropdown.Item
                  key={code}
                  icon={icon || catIcon}
                  text={name}
                  onClick={() => push(`/application/new?type=${code}`)}
                />
              ))}
              <Dropdown.Item icon="log out" text={strings.MENU_LOGOUT} onClick={() => logout()} />
            </Dropdown.Menu>
          </Dropdown>
        </Button.Content>
      </Button>
    </div>
  )
}

export default UserArea
