import React, { useContext, useEffect, useRef, useState } from 'react'
import * as immer from 'immer'
import singleDriver from '@/drivers/single'
import { useSignal } from '@polymita/connect/dist/react'

let myName = 'my'

let t1 = 0

let prevName = ''

export default function Main () {

  const ref = useRef(null)
  if (!ref.current) {
    ref.current = {
      name: () => myName,
      time: new Date(),
    }
  }

  const [s, setS] = useState(ref.current)
  const single = useSignal(singleDriver)

  console.log('single.name(): ', single.name());
  console.log('single.name(): ', s.name, s.time);

  useEffect(() => {
    function fn (evt: any) {
      setS({ ...ref.current })
    }
    document.addEventListener('setName', fn)
    return () => {
      document.removeEventListener('setName', fn)
    }
  }, [])

  console.log('cost::', Date.now() - t1)

  console.log('prevName', prevName, single.name(), prevName === single.name())

  return (
    <div>
      <input
        key={single.name()}
        className="border-x border-y p-2 m-2"
        value={s.name()} onChange={e => {
          t1 = Date.now()

          const { value } = e.target
          const [newValue, p] = immer.produceWithPatches(myName, d => {
            return value
          })
          console.log(newValue === value, p)
          myName = value

          const pp = Promise.resolve()
          pp.then(() => {
          })
          const evt = new Event('setName');
          document.dispatchEvent(evt)
        }} />
        
      <hr className="m-2" />
      <div>
        <input
          className="border-x border-y p-2 m-2"
          value={single.name()} onChange={e => {
            t1 = Date.now()
            prevName = single.name()

            const v = e.currentTarget.value
            single.name(() => v)
            // myName = v
            // const evt = new Event('setName');
            // document.dispatchEvent(evt)  
          }} />
      </div>
    </div>
  )
}