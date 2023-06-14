import React, { useEffect, useState } from 'react'
import cascadingHook, { Folder } from '../drivers/cascading'

import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import CreateNewFolderOutlinedIcon from '@mui/icons-material/CreateNewFolderOutlined'
import Typography from '@mui/material/Typography'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import { Button, Divider, IconButton } from '@mui/material'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Input from '@mui/material/Input'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'

export interface IFolderProps {
  title?: string
}

const Folders: React.FC<
  ReturnType<typeof cascadingHook> & IFolderProps
> = props => {
  const { title = '' } = props

  const cascadingFolder = props

  const folders = props.folders()
  const currentFolderId = props.currentFolderId()
  const currentFolder = folders.find(f => f.id === currentFolderId)

  const renameFolderInput = cascadingFolder.renameFolderInput()

  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null)

  return (
    <div className="w-full h-full flex flex-col">
      <div
        className="flex items-center shrink-0 mt-2 mb-2"
        style={{ height: '40px' }}
      >
        {title ? (
          <span className="flex-1">
            <Typography variant="h6" component="div">
              {title}
            </Typography>
          </span>
        ) : (
          ''
        )}
      </div>
      <div className="w-full bg-white flex-1 flex flex-col overflow-auto">
        <div className="flex-1 overflow-auto">
          <List>
            {folders.map(folder => {
              const current = currentFolderId === folder.id
              const showInput = folder.id === renameFolderInput.id
              return (
                <ListItem key={folder.id} disablePadding>
                  <ListItemButton
                    onClick={() => {
                      cascadingFolder.currentFolderId(() => folder.id)
                    }}
                    selected={current}
                    sx={[
                      {
                        '&:hover': {
                          '.MuiIconButton-root': {
                            visibility: 'visible'
                          }
                        }
                      }
                    ]}
                  >
                    <ListItemIcon sx={{ mr: -1 }}>
                      <FolderOutlinedIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        showInput ? (
                          <Input
                            value={renameFolderInput.name}
                            onChange={e => {
                              cascadingFolder.renameFolderInput(v => {
                                v.name = e.target.value
                              })
                            }}
                            onBlur={() => {
                              console.trace('blur')
                              cascadingFolder.renameFolder()
                            }}
                            onKeyDown={e => {
                              if (['Escape', 'Enter'].includes(e.key)) {
                                cascadingFolder.renameFolder()
                              }
                            }}
                          />
                        ) : (
                          folder.name
                        )
                      }
                    />
                    <IconButton
                      sx={{ visibility: current ? 'visible' : 'hidden' }}
                      onClick={e => {
                        setMenuAnchorEl(e.currentTarget)
                      }}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </ListItemButton>
                </ListItem>
              )
            })}
          </List>
        </div>
        <Divider />
        <ListItem disablePadding>
          <ListItemButton onClick={() => cascadingFolder.createFolder()}>
            <ListItemIcon sx={{ mr: -1 }}>
              <CreateNewFolderOutlinedIcon />
            </ListItemIcon>
            添加文件夹
          </ListItemButton>
        </ListItem>
      </div>
      <Menu
        onClose={() => setMenuAnchorEl(null)}
        anchorEl={menuAnchorEl}
        open={!!menuAnchorEl}
      >
        <MenuItem
          onClick={() => {
            cascadingFolder.startRename(currentFolder)
            setMenuAnchorEl(null)
          }}
        >
          重命名
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuAnchorEl(null)
            cascadingFolder.removeFolder(currentFolder)
          }}
        >
          删除
        </MenuItem>
      </Menu>
    </div>
  )
}

export default Folders
