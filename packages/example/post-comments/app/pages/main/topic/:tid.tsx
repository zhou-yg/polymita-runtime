import React, { useContext, useState } from 'react'
import s from '../../main.module.less'
import { useLocation, useParams } from 'react-router-dom'
import CommentList from '../../../../views/commentList'
import { RoleContext } from '../../main'

export default function Comments () {

  const role = useContext(RoleContext)
  const param = useParams()

  const tid = parseInt(param.tid)

  return (
    <div className={s.comments}>
      <CommentList topicId={tid} name={role?.name} authorId={role?.id} />
    </div>
  )
}
