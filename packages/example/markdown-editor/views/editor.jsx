import React from 'react'
import MDEditor from 'react-markdown-editor-lite'

import MarkdownIt from 'markdown-it'
// import style manually
import 'react-markdown-editor-lite/lib/index.css'

import LoadingButton from '@mui/lab/LoadingButton'

// Initialize a markdown parser
const mdParser = new MarkdownIt(/* Markdown-it options */)

export default function Editor(props) {
  const { height = 800, editorProgress, ...rest } = props

  const mdEditorHook = rest // useTarat(mdEditor, query)

  const defualtMD = mdEditorHook.displayMD()

  // console.log('saveProgess:', mdEditorHook.saveProgess())
  // const saveLoading = mdEditorHook.saveProgess().state === 'pending'

  return (
    <div className='h-full flex flex-col' >
      <div className="my-2 flex ">
        <input
          value={mdEditorHook.displayTitle()}
          onChange={e => mdEditorHook.inputTitle(() => e.target.value)}
          className="p-2 w-full border-x border-y mr-2"
          placeholder="markdown title"
        />
        <LoadingButton
          variant="outlined" onClick={() => mdEditorHook.save()}>
          保存
        </LoadingButton>
      </div>
      {editorProgress.state === 'idle' ? (
        <div className="mt-2 flex-1">
          <MDEditor
            defaultValue={defualtMD}
            style={{ height: `100%`, borderBottom: 0 }}
            renderHTML={text => {
              return mdParser.render(text)
            }}
            onChange={v => {
              setTimeout(() => {
                mdEditorHook.inputMD(() => v.text)
              })
            }}
          />
        </div>
      ) : (
        ''
      )}
    </div>
  )
}
