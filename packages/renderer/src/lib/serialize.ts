export const noop = () => {}

export const UNDEFINED = /*#__NOINLINE__*/ noop() as undefined

export const OBJECT = Object

export const isUndefined = (v: any): v is undefined => v === UNDEFINED
export const isFunction = <
  T extends (...args: any[]) => any = (...args: any[]) => any
>(
  v: unknown
): v is T => typeof v == 'function'

const table = new WeakMap<object, number | string>()

// counter of the key
let counter = 0

export const stableHash = (arg: any): string => {
  const type = typeof arg
  const constructor = arg && arg.constructor
  const isDate = constructor == Date

  let result: any
  let index: any

  if (OBJECT(arg) === arg && !isDate && constructor != RegExp) {
    // Object/function, not null/date/regexp. Use WeakMap to store the id first.
    // If it's already hashed, directly return the result.
    result = table.get(arg)
    if (result) return result

    // Store the hash first for circular reference detection before entering the
    // recursive `stableHash` calls.
    // For other objects like set and map, we use this id directly as the hash.
    result = ++counter + '~'
    table.set(arg, result)

    if (constructor == Array) {
      // Array.
      result = '@'
      for (index = 0; index < arg.length; index++) {
        result += stableHash(arg[index]) + ','
      }
      table.set(arg, result)
    }
    if (constructor == OBJECT) {
      // Object, sort keys.
      result = '#'
      const keys = OBJECT.keys(arg).sort()
      while (!isUndefined((index = keys.pop() as string))) {
        if (!isUndefined(arg[index])) {
          result += index + ':' + stableHash(arg[index]) + ','
        }
      }
      table.set(arg, result)
    }
  } else {
    result = isDate
      ? arg.toJSON()
      : type == 'symbol'
      ? arg.toString()
      : type == 'string'
      ? JSON.stringify(arg)
      : '' + arg
  }

  return result
}

export const serialize = (key: any): [string, any] => {
  if (isFunction(key)) {
    try {
      key = key()
    } catch (err) {
      // dependencies not ready
      key = ''
    }
  }

  // Use the original key as the argument of fetcher. This can be a string or an
  // array of values.
  const args = key

  // If key is not falsy, or not an empty array, hash it.
  key =
    typeof key == 'string'
      ? key
      : (Array.isArray(key) ? key.length : key)
      ? stableHash(key)
      : ''

  return [key, args]
}

export const unstable_serialize = (key: Object) => serialize(key)[0]

