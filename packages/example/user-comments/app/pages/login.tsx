import React, { useEffect, useRef, useState } from 'react'
import { useLocation, Navigate, Link } from 'react-router-dom'

import LoginFrame from 'tarat-user-login-system/dist/views/login'
import 'tarat-user-login-system/dist/views/login.css'

import { after } from 'tarat/core'

export default function Login () {
  console.log('--- user-comments Login ---')
  const loginRef = useRef<{ hook: any }>()

  const [isLogin, setIsLogin] = useState(loginRef.current?.hook.alreadyLogin())

  useEffect(() => {
    if (loginRef.current) {
      const updateLogin = () => {
        const r = loginRef.current.hook.alreadyLogin()
        setIsLogin(r)
      }
      updateLogin()
      after(updateLogin, [loginRef.current.hook.alreadyLogin])
    }
  }, [])

  return (
    <div>
      {isLogin ? <Link to="/main">back to main</Link> : 'you need login'} <br/>

      <LoginFrame ref={loginRef} />
    </div>
  )
}