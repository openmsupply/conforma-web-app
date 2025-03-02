// Converts Markdown text into Semantic UI components
// Uses ReactMarkdown library: https://www.npmjs.com/package/react-markdown

// If no semanticComponent prop is supplied, will return standard HTML.

import React from 'react'
import ReactMarkdown, { ReactMarkdownProps } from 'react-markdown'
import { Link } from 'react-router-dom'
import { Message, Icon, Header } from 'semantic-ui-react'

type SemanticComponent = 'Message' | 'noParagraph' // Enum for available renderers
interface MarkdownBlockProps {
  text: string
  semanticComponent?: SemanticComponent
  info?: boolean
  error?: boolean
  newTabLinks?: boolean
}
type Renderers = {
  [key: string]: any
}

const MarkdownBlock: React.FC<MarkdownBlockProps> = (props) => {
  const { text, semanticComponent, info, error, newTabLinks } = props

  // These methods override the default HTML output for each type of
  // Markdown node (heading, paragraph, etc.) so we can render them as Semantic
  // components instead.
  // Please add additional renderer methods here as required.
  const renderers: Renderers = {
    Message: {
      root: (input: ReactMarkdownProps) => {
        return <Message children={input.children} info={info} error={error} />
      },
      heading: ({ node: { children } }: any) => {
        const headingText = children?.[0]?.value
        return (
          <Message.Header>
            <Header
              as="h4"
              icon={info ? <Icon name="info circle" /> : null}
              content={headingText}
            />
          </Message.Header>
        )
      },
    },
    // Prevents returned HTML from being wrapped in <p></p> tags
    noParagraph: { paragraph: 'span' },
  }

  const renderer = semanticComponent ? renderers[semanticComponent] : null

  // Forces Markdown-generated links to use React-Router <Link> component,
  // otherwise it does a page reload. Only applies to local links, external ones
  // are handled through regular <a> tags
  const linkRenderer = {
    link: (props: any) => {
      return !props.href.startsWith('http') ? (
        <Link
          to={{ pathname: props.href }}
          target={newTabLinks ? '_blank' : undefined}
          onClick={(e) => e.stopPropagation()}
        >
          {props.children}
        </Link>
      ) : (
        // All external links should open in new tab regardless
        <a href={props.href} target="_blank">
          {props.children}
        </a>
      )
    },
  }

  return (
    <ReactMarkdown children={text} renderers={{ ...renderer, ...linkRenderer }}></ReactMarkdown>
  )
}

export default MarkdownBlock
