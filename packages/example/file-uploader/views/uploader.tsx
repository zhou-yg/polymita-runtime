import { useTarat } from 'tarat/connect'
import React, { useState } from 'react'
import uploaderHook from '@/drivers/uploader'

const Uploader = (props: ReturnType<typeof uploaderHook>) => {

  const uploader = props; // useTarat(uploaderHook)

  const f = uploader.inputFile()
  const OSSLink = uploader.OSSLink()

  const isImg = /\.(png|jpg)$/.test(OSSLink?.link)

  return (
    <div>
      <p>
      {!isImg && f && OSSLink ? <a href={OSSLink.link} target="_blank" >{f.name}</a> : ''}
      {isImg && f && OSSLink ? <img src={OSSLink.link} width="200" ></img> : ''}
      </p>
      <br/ >
      <input type="file" defaultValue="" onChange={e => {
        const f = e.target.files[0]
        uploader.inputFile(() => f)
      }} />
    </div>
  )
}

export default Uploader