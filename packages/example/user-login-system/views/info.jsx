import React, { useState, forwardRef, useImperativeHandle } from 'react'
import { DEFAULT_AVATAR } from '../drivers/login'
import s from './login.module.less'
import EditOutlined from '@ant-design/icons/EditOutlined'
import CloseOutlined from '@ant-design/icons/CloseOutlined'

const UserInfo = (props, ref) => {
  const loginHook = props; // useTarat(login)
  
  useImperativeHandle(ref, () => ({
    hook: loginHook
  }))

  const alreadyLogin = loginHook.alreadyLogin()

  const userData = loginHook.userData()
  console.log('userData: ', userData);

  const edit = loginHook.enableEdit()

  const ff = loginHook.inputFile()

  const display = ff ? URL.createObjectURL(ff) : null

  return (
    <div className={`${s.login} shadow rounded relative`}>
      <div className="absolute top-2 right-2 cursor-pointer">
        {edit ? (
          <CloseOutlined
            onClick={() => loginHook.closeEdit()}
            className="block select-none" />
        ) : (
          <EditOutlined
            onClick={() => loginHook.openEdit()}
            className="block select-none text-gray-500" />
        )}
      </div>
      {alreadyLogin ? (
        <div className="flex items-center flex-col">
          <div className="w-20 h-20 rounded-full">
            <img className="w-full h-full" src={
              display || userData.avatar2?.link || DEFAULT_AVATAR
            } />
          </div>
          {edit ? (
            <div className="mt-2 text-lg w-full" >
              <input
                type="file"
                onChange={e => loginHook.inputFile(() => e.target.files[0])}
                className="border-x w-full border-y px-2 py-1" />
            </div>
          ) : ''}
          <div className="mt-2 text-lg w-full text-center" >
            {edit
              ? (<input
                  onChange={e => loginHook.inputName(() => e.target.value)}
                  value={loginHook.inputName()} className="w-full border-x border-y px-2 py-1" />)
              : userData.name
            }
          </div>
          <div className="w-full mt-1 text-sm text-slate-300 text-center" >
            {edit
              ? (<input
                  onChange={e => loginHook.inputPassword(() => e.target.value)}
                  value={loginHook.inputPassword()} className="w-full text-lg border-x border-y px-2 py-1" />)
              : userData.password
            }
          </div>
          <div className="mt-2">
            <button className="btn" onClick={() => loginHook.logout()}>Logout</button>
            {edit ? (
              <button className="ml-2 btn-primary" onClick={() => loginHook.updateInfo()}>Submit</button>
            ) : ''}
          </div>
        </div>
      ) : 'not login'}
    </div>
  )
}

export default forwardRef(UserInfo)
