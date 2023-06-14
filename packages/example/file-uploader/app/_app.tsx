import React from 'react'

const App: React.FunctionComponent<{
  children: React.ReactNode
}> = props => {

  return (
    <div className="file-uploader-app">
      {props.children}
    </div>
  )
}

export default App