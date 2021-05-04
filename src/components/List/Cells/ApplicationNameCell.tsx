import React from 'react'
import { Link } from 'react-router-dom'
import { Header } from 'semantic-ui-react'
import { CellProps } from '../../../utils/types'

const ApplicationNameCell: React.FC<CellProps> = ({ application }) => (
  <Link
    // size="small"
    // as={Link}
    to={`/application/${application.serial || 0}`}
    // content=
  >
    {application.name as string}
  </Link>
)

export default ApplicationNameCell
