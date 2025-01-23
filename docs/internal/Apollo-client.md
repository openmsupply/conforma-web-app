## References

Apollo-client tutorial: https://www.apollographql.com/docs/tutorial/client/

Install Graphql-codegen tutorial: https://medium.com/make-it-heady/part-2-building-full-stack-web-app-with-postgraphile-and-react-client-side-1c5085c5a182

## Run the Back-end server

[Repo documentation](https://github.com/msupply-foundation/conforma-server/pull/1)

## Create a App config file

- Create a new file to store common paths and configurations:
  `touch config.json`

- Open `config.json` and for now just add the localhost for back-end:

```
{
    "server": "http://localhost:8080/graphql"
}
```

- Open the Typescript config file `tsconfig.json` and add inside `compilerOptions`:

`"resolveJsonModule": true`

## Apollo client

`Apollo client` This package will be used for fetching (queries and mutations) from the Graphql server. It has also other cool features such as cache management, subscription for live update, local state management and inbuilt async control for states such as **isLoading** and **error**.

`Graphql-codegen` Used for Typescript to import Types from your GraphQl server

### Install dependencies (Apollo client)

`yarn add @apollo/client graphql`

### Install dev dependencies (Graphql-codegen packages for importing types)

`yarn add -D @graphql-codegen/cli @graphql-codegen/typescript @graphql-codegen/typescript-operations @graphql-codegen/typescript-react-apollo`

### Setup Graphql-codegen

- Run graphql-codegen configuration wizard:

`yarn graphql-codegen init`

- This will launch a CLI wizard. Next, we’ll follow the steps in this list:

* The application is built with React.
* The schema is located at http://localhost:8080/graphql
* Set our operations and fragments location to ./src/components/\*_/_.ts so that it will search all our TypeScript files for query declarations.
* Use the default plugins “TypeScript”, “TypeScript Operations”, “TypeScript React Apollo.”
* Update the generated destination to src/generated/graphql.tsx (.tsx is required by the react-apollo plugin).
* Do not generate an introspection file.
* Use the default codegen.yml file.
* Make our run script called: codegen.

This will create a codegen.yml file in the root.

- Open the `codegen.yml` file and change as the following:

```
overwrite: true
schema: 'http://localhost:8080/graphql'
documents:
  - './src/components/**/*.ts'
  - './src/graphql/**/*.ts'
generates:
  src/generated/graphql.tsx:
    plugins:
      - 'typescript'
      - 'typescript-operations'
      - 'typescript-react-apollo'
    config:
      withHooks: true
```

### Create Graphql structure foldes

- Create new folders inside src to keep all graphql generate types, queries and mutations:
  `mkdir -p src/generated`\
  `mkdir -p src/graphql/queries`\
  `mkdir -p src/graphql/mutations`\

- Add one example query to a file (this avoid an error on the codegen that also will create types for your defined queries & mutations):
  `touch src/graphql/queries/getApplications.query.ts`

- Open `getApplications.query.ts` and copy the following:

```
import { gql } from '@apollo/client'

export default gql`
    query getApplications {
        applications {
            nodes {
                id
                serial
                name
                outcome
                template {
                    code
                    id
                    templateName
                }
            }
    }
}
`
```

- Run the codegen script now to generate the file `graphql.tsx`:
  `yarn codegen`

Now those generated **GraphQL Types** can be imported from `src/generated/graphql.tsx` to the componenets.

- There is something missing on this config since it asks for a missing package at some point:
  ? Please choose a version of "@graphql-codegen/typescript-react-apollo" from this list: 2.0.6

### Setup for Apollo-client

We are starting the Apollo client connect to a running backend with Graphql using cache management for not fetching the same query twice (we will use subscription later to update the local cached queries). Then passing the client to a provider.

The ApolloProvider component is similar to React’s context provider: it wraps your React app and places the client on the context, which allows you to access it from anywhere in your component tree.

- Open `src/index.tsx` and copy the following:

```
import React from 'react'
import ReactDOM from 'react-dom'
import App from './components/App'
import * as config from '../config.json'
import '../semantic/src/semantic.less'

import { ApolloClient,
        InMemoryCache,
        NormalizedCacheObject,
        ApolloProvider
         } from '@apollo/client';

const client: ApolloClient<NormalizedCacheObject> = new ApolloClient({
    uri: config.server,
    cache: new InMemoryCache()
});

ReactDOM.render(
    <ApolloProvider client={client}>
      <App />
    </ApolloProvider>,
    document.getElementById('root')
);
```

### Add first query and mutation

- Create 1 component to show when loading a page:

`touch src/components/Loading.tsx`

- Open `Loading.tsx` and copy the following:

```
import React from 'react'
import { Loader } from 'semantic-ui-react'

const Loading = () => <Loader active size="massive" />

export default Loading
```

- Create 2 new components to list and edit Applications:

`cd src/components`\
`mkdir ApplicationsList.tsx ApplicationEdit.tsc`

- Open `ApplicationsList.tsx` and copy the following:

```
import React, { useState, useEffect } from 'react'
import { useQuery } from "@apollo/client"
import { Container, Table } from 'semantic-ui-react'
import { Application } from '../generated/graphql'
import getApplications from '../graphql/queries/getApplications.query'

import Loading from './Loading'
import ApplicationEdit from './ApplicationEdit'

const ApplicationsList: React.FC = () => {
  const [applications, setApplications] = useState<Array<Application> | null>()
  const {
    data,
    loading,
    error
  } = useQuery(getApplications)

  const [values, setValues] = useState({
      id: 0,
      name: '',
  })

  const editApplication = (applicationId: number, applicationName: string) => {
      setValues({
          ...values,
          id: applicationId,
          name: applicationName,
      })
  }

  useEffect(() => {
    if (data) {
      if (data && data.applications && data.applications.nodes) {
        setApplications(data.applications.nodes)
      }
    }
    if (error) {
      console.log(error)
    }
  }, [data, error])

  return (
    loading ?
      <Loading/>
      :
      <Container>
        <Table sortable stackable selectable>
          <Table.Header>
          {applications &&
            applications.length > 0 &&
            Object.entries(applications[0]).map(([key, value]) =>
              (typeof value === 'object') ?
              Object.entries(value).map(([childKey, childValue]) =>
              <Table.HeaderCell key={`app_header_${childKey}`}>
                {childKey}
              </Table.HeaderCell>)
              :
              <Table.HeaderCell key={`app_header_${key}`}>
                {key}
              </Table.HeaderCell>)}
          </Table.Header>
          <Table.Body>
            {applications &&
            applications.length > 0 &&
            applications.map((application: Application, index: number) => (
            <Table.Row
              onClick={() => editApplication(application.id, application.name)}
              key={application.id} >
              {Object.values(application).map((value) =>
              (typeof value === 'object') ?
              Object.values(value).map((property) =>
                <Table.Cell key={`app_${index}_${property}`}>
                  {property}
                </Table.Cell>)
              :
              <Table.Cell key={`app_${index}_${value}`}>
                {value}
              </Table.Cell>)}
            </Table.Row>
            ))}
          </Table.Body>
        </Table>
        <ApplicationEdit id={values.id} name={values.name} />
      </Container>
  )
}

export default ApplicationsList
```

- Add one mutation:
  `touch src/graphql/mutations/updateApplicationById.mutation.ts`

- Open `updateApplicationById.mutation.ts` and copy the following:

```
import { gql } from '@apollo/client'

export default gql`
    mutation updateApplicationById($id: Int!, $applicationPatch: ApplicationPatch!) {
        updateApplicationById(input: {id: $id, applicationPatch: $applicationPatch}) {
            application {
                id
                name
            }
        }
    }
`
```

- Open `ApplicationsEdit.tsx` and copy the following:

```
import React, { useState, useEffect } from 'react'
import { useMutation } from "@apollo/client"
import updateApplicationById from '../graphql/mutations/updateApplicationById.mutation'

interface updateApplicationProps {
    id: number
    name: string
}

const ApplicationEdit: React.FC<updateApplicationProps> = (props: updateApplicationProps) => {
    const { id, name } = props
    const [values, setValues] = useState({
        id: id,
        name: name,
    })

    useEffect(() => {
        setValues({
            ...values,
            id: id,
            name: name,
        })
    }, [id, name])

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const target = event.target
        const val = target.value
        setValues({
            ...values,
            name: val,
        })
    }

    const [updateApplication, { loading, error }] = useMutation(updateApplicationById,
        {
            onCompleted: (data) => console.log("Data from mutation", data),
            onError: (error) => console.error("Error creating a post", error),
    });

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      // the mutate function also doesn't return a promise
      updateApplication({ variables: {
                            id: values.id,
                            applicationPatch: {
                                name: values.name,
                            },
                        } });
    }

    return (
        <div>
            <form onSubmit={handleSubmit}>
                <input
                    name="name"
                    id="name"
                    value={values.name}
                    onChange={handleChange}
                />
                <button type="submit">Save</button>
            </form>
            {error && <p>{error.message}</p>}
        </div>
    )
}

export default ApplicationEdit
```

### Link new components on the App Route:

- Open `App.js` and copy the following:

```
import React from "react"
import { hot } from 'react-hot-loader'
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom'
import { Grid, Segment } from 'semantic-ui-react'

import ApplicationsList from './ApplicationList'
import AppMenu from './AppMenu'
import Footer from './Footer'
import Register from './Register'
import Home from './Home'
import NoMatch from './NoMatch'

const App: React.FC = () => {
  return (
    <div>
        <Router>
            <Grid>
                <Grid.Column width={4}>
                    <AppMenu
                            items={[
                                ['Home', '/'],
                                ['Register', '/form'],
                                ['Applications List', '/applications']
                            ]}
                        />
                </Grid.Column>
                <Grid.Column stretched width={12}>
                    <Segment>
                        <Switch>
                            <Route path='/' exact component={Home} />
                            <Route path='/form' component={Register} />
                            <Route path='/applications' component={ApplicationsList} />
                            <Route component={NoMatch} />
                        </Switch>
                    </Segment>
                </Grid.Column>
            </Grid>
        </Router>
        <Footer />
    </div>
    )
}

declare const module: any
export default hot(module)(App)
```

## VS code extension for typing GraphQL

- Install extension on VS code:
  ![Apollo-client](/images/Apollo-client-extension.png)

- Create one apollo config file on the root to point to your server:

`touch apollo.config.js`

- Open `apollo.config.js` and copy the following:

```
import * as config from './config.json'

module.exports = {
  client: {
    service: {
      name: "Conforma",
      url: config.server
    }
  }
}
```

# Summary

Apollo cient setup

## Basics:

- **Query**
- **Mutation**
- **Graphql Types generated**
- **Graphql folder**
- **React hooks**

## Back

- [Home](Home.md)
- [Webpack](Webpack.md)

### Next

- [Auth & App Router]
- [Themes]
