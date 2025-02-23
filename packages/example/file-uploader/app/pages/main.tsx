import React, { useEffect, useRef } from 'react'
import { useSignal } from '@polymita/next-connect'
import Uploader from '@/views/uploader'
import uploaderHook from '@/drivers/uploader'

export default function Main () {
  const uploader = useSignal(uploaderHook)

  return (
    <div>
      <Uploader {...uploader} />
    </div>
  )
}