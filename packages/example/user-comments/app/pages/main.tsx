import React, { useEffect, useRef } from 'react'
import s from './main.module.less'
import Comments from '../../views/comments'
import { useNavigate } from "react-router-dom";

export default function Main () {

  const navigate = useNavigate()

  return (
    <div className={s.mainBox}>

      <Comments onLogin={() => {
        navigate('/login')
      }} />
    </div>
  )
}
