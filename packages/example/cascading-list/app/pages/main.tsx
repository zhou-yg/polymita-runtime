import React, { useState } from 'react'
import { useSignal } from '@polymita/connect/dist/react'
import Cascading from '../../views/cascading'
import cascadingHook, { Folder } from '@/drivers/cascading'

import NewFolders from '@/views/folder'
import NewItems from '@/views/item'

export default function Main () {
  const cascading = useSignal(cascadingHook)

  return (
    <div>
      <div style={{ width: '600px', background: '#fff' }}>
        <Cascading {...cascading} />
      </div>

      <div className="m-2 p-2 flex" style={{ height: '500px', background: '#eee' }}>
        <div style={{ width: '300px', marginRight: '4px' }}>
          <NewFolders title="我的文件夹" {...cascading} />
        </div>
        <div style={{ width: '300px' }}>
          <NewItems title="我的文件" {...cascading} />
        </div>
      </div>
    </div>
  )
}