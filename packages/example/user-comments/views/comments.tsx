import mainHook from '../drivers/main'
import topicDriver from '../drivers/topic'
import { useTarat, useProgress, useDriver } from 'tarat/connect'
import React, { useState } from 'react'
import s from './comments.module.less'
import { Link } from 'react-router-dom'

const LoginAction: React.FC<{
  onLogin?: () => void
  onSign?: () => void
}> = props => {
  return (
    <div className={s.loginAction}>
      <div className={s.loginRow}>
        <button onClick={props.onLogin} >去登录</button>
      </div>
      <div className={s.loginRow}>
        <button onClick={props.onSign}>去注册</button>
      </div>
    </div>
  )
}

const Comments: React.FC<{
  onLogin?: () => void
  onSign?: () => void
}> = (props) => {

  const main = useTarat(mainHook)

  console.log('main.notLogin(): ', main.notLogin());

  const notLogin = main.notLogin()

  const ud = main.userData()

  return (
    <div className={s.comments}>
      {ud ? (
        <div className={s.user}>
          name: {ud.name}

          <Link to="/login">profile</Link>
        </div>
      ) : ''}

      {notLogin ? (
        <LoginAction onLogin={props.onLogin} onSign={props.onSign} />
      ) : ''}

      <div className={s.header} >
        <label htmlFor="inputName">
          topic:
        </label>
        <input id="inputName" value={main.inputName()} onChange={e => {
          main.inputName(() => e.target.value)
        }} />
        <button onClick={() => main.add() }>create</button>
      </div>

      {main.topics().length ? '' : (
        <div className={s.noTopic}>
          no topic
        </div>
      )}
      <div className={s.topics}>
        <ol>
          {main.topics().map((o, i) => {
            return (
              <li key={o.id} className={s.topicOne}>
                <div className={s.title}>
                  {i + 1}.&nbsp;
                  {o.title}
                </div>
                <span className={s.close} onClick={() => main.removeTopic(o.id)}>
                  X
                </span>
              </li>
            )
          })}
        </ol>
      </div>

    </div>
  )
 }

export default Comments