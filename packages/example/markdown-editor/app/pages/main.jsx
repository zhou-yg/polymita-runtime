import React from 'react'
import Editor from '@/views/editor'
import mdEditor from '@/drivers/mdEditor'
import { Link, useSearchParams } from 'react-router-dom'
import { useSignal, useProgress } from '@polymita/next-connect'

export default function Main () {
  const searchParams = useSearchParams()  
  const mdId = searchParams[0].get('id')
  const mdHook = useSignal(mdEditor, { id: mdId ? parseInt(mdId) : mdId })
  const editorProgress = useProgress(mdHook)
  console.log('editorProgress: ', editorProgress);

  return (
    <div className="px-4 flex flex-col" style={{ height: '100vh' }}>
      <Link className="underline" to="/list" >&lt; back</Link>
      <div className='flex-1'>
        <Editor {...mdHook} editorProgress={editorProgress} />
      </div>
    </div>
  )
}
