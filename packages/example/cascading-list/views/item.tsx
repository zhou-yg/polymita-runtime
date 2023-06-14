import React, { useEffect, useState } from 'react'
import cascadingHook, { Folder } from '../drivers/cascading'

import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Input from '@mui/material/Input'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import format from 'date-fns/format'
import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined'

export interface IItemsProps {
  title?: string
}

const Items: React.FC<
  ReturnType<typeof cascadingHook> & IItemsProps
> = props => {
  const cascadingItems = props

  const items = cascadingItems.items()
  const currentItemId = cascadingItems.currentItemId()
  const currentItem = items.find(f => f.id === currentItemId)

  const renameItemInput = cascadingItems.renameItemInput()

  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null)

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex row justify-end my-2" style={{ height: '40px' }}>
        <IconButton>
          <NoteAddOutlinedIcon onClick={() => cascadingItems.createItem()} />
        </IconButton>
        <IconButton>
          <DeleteOutlineIcon onClick={() => cascadingItems.removeItem()} />
        </IconButton>
      </div>
      <div className="w-full flex-1 bg-white overflow-auto">
        {items.length > 0 ? (
          <List>
            {items.map((item, index) => {
              const current = currentItemId === item.id
              const showInput = item.id === renameItemInput.id
              const time = format(
                new Date(item.modifiedAt),
                'yyyy-MM-dd HH:mm:ss'
              )
              return (
                <ListItem
                  divider={index !== items.length - 1}
                  onClick={() => cascadingItems.currentItemId(() => item.id)}
                  key={item.id}
                  disablePadding
                >
                  <ListItemButton
                    selected={current}
                    sx={{
                      '&:hover': {
                        '.MuiIconButton-root': {
                          visibility: 'visible'
                        }
                      }
                    }}
                  >
                    <ListItemText
                      primary={
                        showInput ? (
                          <Input
                            value={renameItemInput.name}
                            onChange={e => {
                              cascadingItems.renameItemInput(v => {
                                v.name = e.target.value
                              })
                            }}
                            onBlur={() => {
                              cascadingItems.renameItem()
                            }}
                            onKeyDown={e => {
                              if (['Escape', 'Enter'].includes(e.key)) {
                                cascadingItems.renameItem()
                              }
                            }}
                          />
                        ) : (
                          item.name
                        )
                      }
                      secondary={time}
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
        ) : (
          ''
        )}

        {items.length === 0 ? (
          <div className="flex w-full h-full items-center justify-center text-slate-300">
            无记录
          </div>
        ) : (
          ''
        )}
      </div>

      <Menu
        onClose={() => setMenuAnchorEl(null)}
        anchorEl={menuAnchorEl}
        open={!!menuAnchorEl}
      >
        <MenuItem
          onClick={() => {
            cascadingItems.startItemRename(currentItem)
            setMenuAnchorEl(null)
          }}
        >
          重命名
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuAnchorEl(null)
            cascadingItems.removeItem(currentItem)
          }}
        >
          删除
        </MenuItem>
      </Menu>
    </div>
  )
}

export default Items
