import React, { useState, forwardRef, useImperativeHandle } from 'react'
import { useTarat } from 'tarat/connect'
import login from '../drivers/login'
import s from './login.module.less'
import classnames from 'classnames'

const SignFrame = (props) => {
  const loginHook = props; // useTarat(login)

  const errorContent = loginHook?.errorTip()

  return (
    <div>
      <div className={s.row + ' p-2'} >
        <input placeholder="username" onInput={e => {
          loginHook.inputName(() => e.target.value)
        }} className="border-x border-y"  />
      </div>
      <div className={s.row + ' p-2'} >
        <input placeholder="password" onBlur={e => {
          loginHook.inputPassword(() => e.target.value)
        }} className="border-x border-y"  />
      </div>
      <div className={s.row + ' p-2'} >
        <input placeholder="confirm password" onBlur={e => {
          loginHook.repeatPassword(() => e.target.value)
        }} className="border-x border-y"  />
      </div>
      {errorContent ? (
        <div className="p-2 text-red-400">
          {errorContent}
        </div>
      ) : ''}
      <div className="p-2">
        <button
          disabled={!!errorContent}
          className={`
            border-x border-y p-2 w-full rounded ${!!errorContent ? 'bg-gray-200 cursor-not-allowed' : 'hover:text-white hover:bg-black'}
          `}
          onClick={() => loginHook.sign()}>Sign</button>
      </div>
      <div className="p-2 flex justify-between items-center">
        <span className="flex items-center">
          <span>sign and auto login</span>
          <input type="checkbox" checked={loginHook.signAndAutoLogin()} onChange={e => {
            loginHook.signAndAutoLogin(() => e.target.checked)
          }}  className="ml-1 relative top-px"/>
        </span>
        <button
          onClick={() => {
            props.setLoginType(LoginTypes.login)
          }} className="hover:underline underline-offset-2">goto login &gt;</button>
      </div>
    </div>
  )
}

const LoginFrame = (props) => {
  const loginHook = props; // useTarat(login)

  return (
    <div>
      <div className={s.row + ' p-2'} >
        <input placeholder="username" onInput={e => {
          loginHook.inputName(() => e.target.value)
        }} className="border-x border-y"  />
      </div>
      <div className={s.row + ' p-2'} >
        <input placeholder="password" onInput={e => {
          loginHook.inputPassword(() => e.target.value)
        }} className="border-x border-y"  />
      </div>
      {loginHook?.errorTip() ? (
        <div className="p-2 text-red-500">
          {loginHook?.errorTip()}
        </div>
      ) : ''}
      <div className="p-2">
        {/* <div>
          <button onClick={() => loginHook.sign()}>Sign</button>
          sign and auto login <input type="checkbox" checked={loginHook.signAndAutoLogin()} onChange={e => {
            loginHook.signAndAutoLogin(() => e.target.checked)
          }} />
        </div> */}
        <button
          className="border-x border-y p-2 w-full rounded hover:text-white hover:bg-black"
          onClick={() => loginHook.login()}>Login</button>
      </div>
      <div className="p-2 flex justify-end">
        <button onClick={() => {
          props.setLoginType(LoginTypes.sign)
        }} className="hover:underline underline-offset-2">goto sign &gt;</button>
      </div>
    </div>
  )
}

const LoginTypes = {
  login: 'login',
  sign: 'sign'
}

const LoginBox = (props, ref) => {
  const loginHook = props; // useTarat(login)
  
  useImperativeHandle(ref, () => ({
    hook: loginHook
  }))

  const [loginType, setLoginType] = useState(props.type || LoginTypes.login)

  const alreadyLogin = loginHook.alreadyLogin()

  return (
    <div className={`${s.login} shadow rounded`}>
      <div className="text-center mb-4">{props.title}</div>
      
      {alreadyLogin ? (
        'already login'
      ) :  null}

      {!alreadyLogin && loginType === LoginTypes.login ? <LoginFrame {...loginHook} setLoginType={setLoginType} /> : '' }
      {!alreadyLogin && loginType === LoginTypes.sign ? <SignFrame {...loginHook} setLoginType={setLoginType} /> : '' }

      <hr className="m-2" />

      <pre>
        <code>
          loginType: {loginType} <br/>
          alreadyLogin(): {String(loginHook.alreadyLogin())} <br/>
          signAndAutoLogin(): {String(loginHook.signAndAutoLogin())} <br/>
          errorTip: {String(loginHook.errorTip())} <br/>
        </code>
      </pre>
    </div>
  )
}

export default forwardRef(LoginBox)
