import React, { useEffect, useRef } from 'react'
import { useTarat } from 'tarat/connect'
import Uploader from '@/views/uploader'
import uploaderHook from '@/drivers/uploader'

export default function Main () {
  const uploader = useTarat(uploaderHook)

  return (
    <div>
      <Uploader {...uploader} />
    </div>
  )
}