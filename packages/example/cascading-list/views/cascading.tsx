import React, { useEffect, useState } from 'react'
import PlusSquareOutlined from '@ant-design/icons/PlusSquareOutlined'
import FolderOutlined from '@ant-design/icons/FolderOutlined'
import SettingOutlined from '@ant-design/icons/SettingOutlined'
import EditOutlined from '@ant-design/icons/EditOutlined'
import DeleteOutlined from '@ant-design/icons/DeleteOutlined'
import cascadingHook, { Folder } from '../drivers/cascading'

const Files: React.FC<ReturnType<typeof cascadingHook>> = props => {
  const cascading = props

  const hasItems = cascading.items().length > 0

  const ciid = cascading.currentItemId()

  const renameInput = cascading.renameItemInput()

  return (
    <div className="px-2 h-full">
      {!hasItems ? (
        <div className="h-full flex items-center justify-center">
          无记录
          <button
            onClick={() => {
              cascading.createItem()
            }}
            className="ml-2 block text-xs text-slate-600 px-2 border-x border-y"
          >
            新建
          </button>
        </div>
      ) : (
        <>
          {cascading.items().map(item => {
            const current = item.id === ciid
            const cls = current ? 'bg-slate-100 text-black p-2' : 'mx-2 my-1'
            const settingCls = current
              ? 'ml-2'
              : 'ml-2 hidden group-hover:inline'

            return (
              <div
                key={item.id}
                onClick={e => {
                  cascading.switchCurrentItem(item)
                }}
                className={`cursor-pointer group flex items-center ${cls}`}
              >
                {renameInput.id === item.id ? (
                  <input
                    value={renameInput.name}
                    onChange={e => {
                      cascading.renameItemInput(v => {
                        v.name = e.target.value
                      })
                    }}
                    onBlur={() => cascading.renameItem()}
                    className="flex-1 text-black p-2"
                  />
                ) : (
                  <span className="mr-2 flex-1">{item.name}</span>
                )}

                <DeleteOutlined
                  onClick={e => {
                    cascading.removeItem(item)
                  }}
                  className={settingCls}
                />
                <EditOutlined
                  onClick={e => {
                    cascading.startItemRename(item)
                  }}
                  className={settingCls}
                />
              </div>
            )
          })}
          <button
            onClick={() => {
              cascading.createItem()
            }}
            className="flex items-center text-xs text-slate-600 px-2"
          >
            <PlusSquareOutlined /> <span className="ml-1">新建文件</span>
          </button>
        </>
      )}
    </div>
  )
}

const CascadingFolder: React.FC<{
  cascading: ReturnType<typeof cascadingHook>
  folder?: Folder
  currentId: number
}> = React.memo(props => {
  if (!props.folder) {
    return
  }
  const { cascading, folder, currentId } = props
  const current = folder.id === currentId
  const cls = current ? 'bg-black text-white p-2' : 'mx-2 my-1'
  const settingCls = current ? '' : 'hidden group-hover:inline'

  const renameInput = cascading.renameFolderInput()

  const [showSetting, setSetting] = useState(false)

  return (
    <div
      onClick={e => {
        cascading.switchCurrentFolder(folder)
      }}
      className={`group relative cursor-pointer flex items-center ${cls}`}
    >
      <FolderOutlined />

      {folder.id === renameInput.id ? (
        <input
          key={folder.id}
          value={renameInput.name}
          onChange={e => {
            cascading.renameFolderInput(v => {
              v.name = e.target.value
            })
          }}
          onBlur={() => cascading.renameFolder()}
          onKeyDown={e => {
            if (['Escape', 'Enter'].includes(e.key)) {
              cascading.renameFolder()
            }
          }}
          className="ml-1 flex-1 mr-2 text-black p-2"
        />
      ) : (
        <span className="ml-1 flex-1 mr-2">{folder.name}</span>
      )}

      <SettingOutlined
        onClick={e => {
          setSetting(true)
          function fn() {
            setSetting(false)
            document.removeEventListener('click', fn)
          }
          setTimeout(() => {
            document.addEventListener('click', fn)
          }, 150)
        }}
        className={settingCls}
      />

      {current && showSetting ? (
        <div className="bg-white shadow absolute top-full right-0 z-10 -translate-y-2">
          <button
            onClick={() => cascading.startRename(folder)}
            className="w-full text-black text-sm p-2 hover:bg-black hover:text-white"
          >
            重命名
          </button>
          <button
            onClick={() => cascading.removeFolder(folder)}
            className="w-full text-black text-sm p-2 hover:bg-black hover:text-white"
          >
            删除
          </button>
        </div>
      ) : (
        ''
      )}
    </div>
  )
})

const Cascading: React.FC<
  ReturnType<typeof cascadingHook> & { title?: string }
> = props => {
  const { title = '我的文件夹' } = props
  const cascading = props

  const cfid = cascading.currentFolderId()

  return (
    <div>
      <div className="p-2  text-black flex">
        <div className="p-2 bg-slate-200 flex-1">
          <header className="text-sm">{title}</header>
          <div className="my-2">
            {cascading.folders().map(folder => (
              <CascadingFolder
                key={folder.id}
                cascading={cascading}
                currentId={cfid}
                folder={folder}
              />
            ))}
          </div>
          <button
            onClick={() => {
              cascading.createFolder()
            }}
            className="ml-2 flex items-center text-sm text-slate-600"
          >
            <PlusSquareOutlined /> <span className="ml-1">新建文件夹</span>
          </button>
        </div>
        <div className="flex-1">
          {cascading.currentFolderId() ? <Files {...cascading} /> : ''}
        </div>
      </div>
    </div>
  )
}

export default Cascading
