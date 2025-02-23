import React, { useEffect, useRef, useState } from 'react'
import { useLocation, Navigate, Link } from 'react-router-dom'

import LoginFrame from 'tarat-user-login-system/dist/views/login'
import 'tarat-user-login-system/dist/views/login.css'
import loginDriver from '@/drivers/compose/login'

import { after } from '@polymita/signal-model'
import { useProgress, useSignal } from '@polymita/next-connect'

export default function Login () {
  console.log('--- user-comments Login ---')

  const loginHook = useSignal(loginDriver)
  const progress = useProgress(loginHook)  
  const alreadyLogin = progress.state === 'idle' && loginHook.alreadyLogin()
  console.log('alreadyLogin: ', progress.state, loginHook.alreadyLogin(), '=>', alreadyLogin);

  const [isLogin, setIsLogin] = useState(loginHook.alreadyLogin())

  useEffect(() => {
    const updateLogin = () => {
      const r = loginHook.alreadyLogin()
      setIsLogin(r)
    }
    updateLogin()
    after(updateLogin, [loginHook.alreadyLogin])
  }, [])

  return (
    <div>
      {isLogin ? <Link to="/main">back to main</Link> : 'you need login'} <br/>

      <LoginFrame {...loginHook} />
    </div>
  )
}