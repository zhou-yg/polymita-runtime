import React from 'react'
import { useProgress, useTarat } from 'tarat/connect'
import Login from '../../views/login.jsx'
import login from '../../drivers/login'
import { Navigate } from 'react-router-dom'

export const meta = () => ({
  title: '测试登录页面'
})

// document.title = 'Welcome!'

export default () => {

  const loginHook = useTarat(login)
  const progress = useProgress(loginHook)  
  const alreadyLogin = progress.state === 'idle' && loginHook.alreadyLogin()
  console.log('alreadyLogin: ', progress.state, loginHook.alreadyLogin(), '=>', alreadyLogin);

  return (
    <div className="w-full h-screen bg-slate-100 flex justify-center">
      {alreadyLogin ? <Navigate to="/user/info" replace={true} /> : ''}
      <div className="mt-6">
        <Login {...loginHook} title={
          <h2 className="text-xl">LOGIN EXAMPLE</h2>
        } type="login" />
      </div>
    </div>
  )
}
