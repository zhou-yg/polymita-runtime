import React, { useState } from 'react'
import { Link } from 'react-router-dom'

export default () => {
  return (
    <div>
      root <br/>

      <Link to="/main">main</Link>
    </div>
  )
}