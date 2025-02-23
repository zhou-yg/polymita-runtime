import React from 'react'
import { useProgress, useSignal } from '@polymita/next-connect'
import UserInfo from '../../../views/info'
import login from '../../../drivers/login'
import { Navigate } from 'react-router-dom'

export default function User () {
  const loginHook = useSignal(login)
  const progress = useProgress(loginHook)  
  const notLogin = progress.state === 'idle' && !loginHook.alreadyLogin()
  console.log('progress:', progress.state);
  console.log('login:', loginHook.alreadyLogin(), notLogin);
  
  return (
    <div className="bg-slate-100 h-screen flex justify-center" >
      {notLogin ? <Navigate to="/login" replace={true} /> : ''}
      <div className="mt-6">
        <UserInfo {...loginHook} />
      </div>
    </div>
  )
}