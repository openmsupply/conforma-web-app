import React, { useRef } from 'react'
import { Button, ButtonProps } from 'semantic-ui-react'

interface UploadButtonProps extends ButtonProps {
  multiple?: boolean
  handleFiles: React.ChangeEventHandler<HTMLInputElement>
  name?: string // Only needed if there are multiple on page
  InputProps?: React.DetailedHTMLProps<
    React.InputHTMLAttributes<HTMLInputElement>,
    HTMLInputElement
  >
}

export const UploadButton: React.FC<UploadButtonProps> = ({
  handleFiles,
  multiple,
  name,
  children,
  InputProps,
  ...buttonProps
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  buttonProps.onClick = () => fileInputRef.current?.click()

  // For File Upload, a Dummy input button is required, as Semantic Button can't
  // handle file input. Link between this input and Semantic Button done with
  // useRef(fileInputRef)
  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        hidden
        name="file-upload"
        multiple={multiple}
        onChange={handleFiles}
        {...InputProps}
      />
      {children ? <Button {...buttonProps}>{children}</Button> : <Button {...buttonProps} />}
    </>
  )
}
