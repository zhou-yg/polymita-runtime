import React, { useState } from 'react'
import * as TimelineModule from '../modules/MyModule';
import { RenderToReact } from '../shared/render';

const MyModuleComponent = RenderToReact(TimelineModule);

const MyView = (props: any) => {

  return (
    <MyModuleComponent {...props} />
  )
}

export default MyView;
