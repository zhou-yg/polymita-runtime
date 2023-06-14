import React from 'react'
import mdDriver from '../../drivers/mdList'
import { useTarat } from 'tarat/connect'
import { Link } from 'react-router-dom'

import LoadingButton from '@mui/lab/LoadingButton'

export default function List () {
  const md = useTarat(mdDriver)

  function create () {
    md.addMD()
  }

  const hasMarkdown = md.list().length > 0

  return (
    <div className="">
      <div className="p-4 flex">
        <input onChange={e => md.title(() => e.target.value)} value={md.title()} className="border-x p-2 mr-2 flex-1 border-y" />
        <LoadingButton variant='outlined' onClick={create}>create markdown</LoadingButton>
      </div>

      <ul className="border-x border-y m-4">
        {hasMarkdown ? '' : <div className="m-4 p-4 gray text-slate-300 border-slate-600"> no any markdown </div>}
        {md.list().map((p, i) => {
          return (
            <li key={p.id} className="p-3">
              <Link className="flex" to={`/main?id=${p.id}`}>
                <span className="flex-1 hover:underline">
                  {i+1}.
                  {p.title}
                </span>
                <span>&gt;</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
