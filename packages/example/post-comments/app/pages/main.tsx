import React, { createContext, useState } from 'react'
import s from './main.module.less'
import TopicList from '../../views/topicList'
import { Link, Outlet } from 'react-router-dom'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import FormControlLabel from '@mui/material/FormControlLabel'

const roles = {
  0: {
    name: 'zhou-yg',
    id: 0,
  },
  1: {
    name: 'Imperius',
    id: 1,
  },
  2: {
    name: 'Diablo',
    id: 2,
  },
}

export const RoleContext = createContext<typeof roles['0']>(null)

export default function Main () {
  const [value, setValue] = useState(0);

  const onChange = (e) => {
    setValue(e.target.value);
  }

  const currentRole = roles[value]

  return (
    <div className={s.main}>
      <div className={s.content}>
        <TopicList renderItem={(v, i) => {
          return (
            <Link to={`topic/${v.id}`} className={s.item}>
              <span>
                {i+1}.{v.title}
              </span>
              <span>&gt;</span>
            </Link>
          )
        }} />
      </div>
      <div className={s.topics}>
        <RoleContext.Provider value={currentRole}>
          <Outlet />
        </RoleContext.Provider>
        <div className={s.roles}>
          <p>
            current: <span style={{ fontWeight: 'bold' }}>{currentRole.name}</span> ({currentRole.id})
          </p>
          <span style={{ marginRight: '10px' }}>
            select role:
          </span>
          <RadioGroup onChange={onChange} value={value}>
            <FormControlLabel value={0} label="zhouyg" control={<Radio />} ></FormControlLabel>
            <FormControlLabel value={1} label="angel" control={<Radio />} ></FormControlLabel>
            <FormControlLabel value={2} label="evil" control={<Radio />} ></FormControlLabel>
          </RadioGroup>
        </div>
      </div>
    </div>
  )
}
