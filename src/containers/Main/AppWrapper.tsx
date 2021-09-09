import React from 'react'
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom'
import { hot } from 'react-hot-loader'
import Login from '../User/Login'
import Verify from '../User/Verification'
import { UserProvider } from '../../contexts/UserState'
import NonRegisteredOptions from '../User/NonRegisteredOptions'
import AuthenticatedContent from './AuthenticatedWrapper'

const AppWrapper: React.FC = () => {
  return (
    <Router>
      <UserProvider>
        <Switch>
          <Route exact path="/login">
            <Login />
          </Route>
          <Route exact path="/register">
            <NonRegisteredOptions option="register" />
          </Route>
          <Route exact path="/reset-password">
            <NonRegisteredOptions option="reset-password" />
          </Route>
          <Route exact path="/verify">
            <Verify />
          </Route>
          <Route>
            <AuthenticatedContent />
          </Route>
        </Switch>
      </UserProvider>
    </Router>
  )
}

declare const module: any
export default hot(module)(AppWrapper)
