import {
  compose,
  inputComputeInServer,
  prisma,
  state,
  writePrisma
} from '@polymita/signal-model'
import rename from './rename'
import indexes from '@/models/indexes.json'

export type { RenameTarget } from './rename'

export interface Folder {
  id?: number
  name: string
  rm: boolean
  items: FolderItem[]
}

export interface FolderItem {
  id?: number
  name: string
  folderId?: number
  modifiedAt: Date
}

export const INITIAL_FOLDER_NAME = '新建文件夹'
const INITIAL_ITEM_NAME = '新建文件'

export enum ETypes {
  folder = 'folder',
  item = 'item'
}

function cascading() {
  const folders = prisma<Folder[]>(indexes.folder, () => ({}))

  const renameFolderCompose = compose(rename)

  const folderName = state(INITIAL_FOLDER_NAME)

  const createOrUpdateFolers = writePrisma(folders, () => ({
    name: folderName()
  }))

  const removeFolders = writePrisma(folders, () => ({
    rm: true
  }))

  const createFolder = inputComputeInServer(function* () {
    yield createOrUpdateFolers.create()
    folderName(() => INITIAL_FOLDER_NAME)
  })

  const updateFolder = inputComputeInServer(function* () {
    yield createOrUpdateFolers.update(renameFolderCompose.currentId())
    folderName(() => INITIAL_FOLDER_NAME)
  })

  const removeFolder = inputComputeInServer(function* (folder?: Folder) {
    yield removeFolders.remove(folder.id || renameFolderCompose.currentId())
    renameFolderCompose.currentId(() => folders()[0]?.id)
  })

  const renameFolder = inputComputeInServer(function* () {
    const input = renameFolderCompose.renameInput()
    if (input.id) {
      folderName(() => input.name)
      yield updateFolder()
      renameFolderCompose.endRename()
    }
  })

  const items = prisma<FolderItem[]>(indexes.item, () => {
    const fid = renameFolderCompose.currentId()
    if (fid) {
      return {
        where: {
          folderId: fid
        }
      }
    }
  })

  const myItemId = state<number>()

  const renameItemCompose = compose(rename)

  const itemName = state(INITIAL_ITEM_NAME)

  const writeItems = writePrisma(items, () => ({
    folder: {
      connect: {
        id: renameFolderCompose.currentId()
      }
    },
    name: itemName()
  }))

  const createItem = inputComputeInServer(function* () {
    yield writeItems.create()
    itemName(() => INITIAL_ITEM_NAME)
  })

  const updateItem = inputComputeInServer(function* () {
    yield writeItems.update(renameItemCompose.currentId())
    itemName(() => INITIAL_ITEM_NAME)
  })

  const removeItem = inputComputeInServer(function* (item?: FolderItem) {
    yield writeItems.remove(item.id || renameItemCompose.currentId())
    myItemId(() => folders()[0]?.id)
  })

  const renameItem = inputComputeInServer(function* () {
    const input = renameItemCompose.renameInput()
    if (input.id) {
      itemName(() => input.name)
      yield updateItem()
      renameItemCompose.endRename()
    }
  })

  const ss = state('')

  return {
    ss,
    // folder
    folders,
    folderName,
    currentFolderId: renameFolderCompose.currentId,
    switchCurrentFolder: renameFolderCompose.switchCurrent,
    createFolder,
    updateFolder,
    removeFolder,
    // folder rename
    renameFolderInput: renameFolderCompose.renameInput,
    startRename: renameFolderCompose.startRename,
    renameFolder,
    // item
    items,
    writeItems,
    itemName,
    currentItemId: renameItemCompose.currentId,
    switchCurrentItem: renameItemCompose.switchCurrent,
    createItem,
    updateItem,
    removeItem,
    // item rename
    renameItemInput: renameItemCompose.renameInput,
    startItemRename: renameItemCompose.startRename,
    renameItem
  }
}

export default cascading
