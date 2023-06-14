import React, { ReactElement, useEffect, useState } from 'react'

import s from './commentList.module.less'
import { useTarat } from 'tarat/connect'

import { Button, Input, List, ListItem } from '@mui/material'

import commentHook, { ICommentTree } from '../drivers/comment'
import topicOneHook from '../drivers/topicOne'

import { CommentOutlined, UndoOutlined, LikeOutlined } from '@ant-design/icons'

import * as dateFns from 'date-fns'

const CommentChildren: React.FC<{
  comment: ReturnType<typeof commentHook>
  tree: ICommentTree[]
}> = props => {
  const { comment, tree } = props
  console.log('tree: ', tree);
  return (
    <List>
      {tree.map((item) => {
        return (
          <ListItem key={item.id}>
            <div className={s.commentOne} >
              <p className={s.author}>
                <span>{item.name}</span>
                <span className={s.sub}>（{item.authorId}）</span>
                <span className={s.fromNow}>
                  {dateFns.formatDistanceToNow(new Date(item.createdAt!))}
                </span>
              </p>
              <p>
                <span className={s.content}>{item.content}</span>
              </p>
              <p>
                <span key="like" className={s.like}>
                  <LikeOutlined />
                </span>
                <span key="comment-basic-reply-to" className={s.reply} onClick={() => {
                  comment.replyCommentId(() => item.id)
                }}><CommentOutlined /></span>
              </p>
              {item.children.length > 0 ? <CommentChildren comment={comment} tree={item.children} /> : ''}
            </div>
          </ListItem>
        )
      })}
    </List>
  )
}

const CommentList: React.FC<{
  topicId: number
  name: string
  authorId: number
}> = (props) => {

  const topicOne = useTarat(topicOneHook, { id: props.topicId })

  const comment = useTarat(commentHook, {
    topicId: props.topicId,
    name: props.name,
    authorId: props.authorId
  })

  useEffect(() => {
    comment.author(o => {
      o.name = props.name,
      o.id = props.authorId
    })
  }, [props.authorId])


  useEffect(() => {
    comment.topicId(() => props.topicId)
    topicOne.topicId(() => props.topicId)
  }, [props.topicId])

  return (
    <div className={s.commentList}>
      <header>
        {topicOne.currentTopic()?.title}

        <span className={s.sub} style={{ marginLeft: '10px' }}>
          <UndoOutlined onClick={() => comment.refresh()} />
        </span>
      </header>
      <div className={s.commentInnerList}>
        <CommentChildren comment={comment} tree={comment.commentTree()} />
      </div>

      <div className={s.inputCommentBox}>
        {comment.replyTarget() ? <div className={s.replyTarget}>reply to: {comment.replyTarget()?.content}</div> : ''}
        <div className={s.inputCommentBox}>
          <Input
            className={s.commentInput}
            value={comment.inputComment()}
            onChange={e => comment.inputComment(() => e.target.value) }
            onKeyDown={e => {
              e.key === 'Enter' && comment.createComment() 
            }}/>
        </div>
        <div className={s.commentAction}>
          <Button variant="contained" disabled={comment.inputComment()?.length === 0} onClick={() => {
            comment.createComment()
          }}>add comment</Button>
        </div>
      </div>
    </div>
  )
}


export default CommentList
