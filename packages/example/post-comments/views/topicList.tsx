import React, { ReactElement, useState } from 'react'

import s from './topicList.module.less'
import { useSignal } from '@polymita/connect'
import topicHook, { ITopic } from '../drivers/topic'
import { Button, Input, List, ListItem, ListItemButton } from '@mui/material'

const TopicList: React.FC<{
  renderItem?: (e: ITopic, i: number) => ReactElement
}> = (props) => {
  const { renderItem = (v, i) => `${i}.${v.title}` } = props

  const topic = useSignal(topicHook)
  
  function creatTopic () {
    topic.add()
  }
  return (
    <div className={`${s.topicList}`}>
      <header className={s.title}>
        top topics
      </header>
      <div className={s.newTopic}>
        <Input className={s.topicInput} placeholder="new topic name" value={topic.inputName()} onChange={e => {
          console.log('e.target.value: ', e.target.value);
          topic.inputName(() => e.target.value)
        }} />
        <Button variant="contained" onClick={creatTopic} >create topic</Button>
      </div>

      <List>
        {topic.topics().map((item, i) => {
          return (
            <ListItemButton key={item.id} >
              <ListItem>
                {renderItem(item, i)}
              </ListItem>
            </ListItemButton>
          )
        })}
      </List>
    </div>
  )
}

export default TopicList