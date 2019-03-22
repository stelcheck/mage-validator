import ValidatedTopic, { IStaticThis, TopicData } from './ValidatedTopic'
import { defaultMetadataStorage } from 'class-transformer/storage'
import * as classTransformer from 'class-transformer'

import { archivist } from 'mage'
import * as mage from 'mage'

import { inspect } from 'util'

const { Tome, ObjectTome, ArrayTome } = mage.require('tomes')

const ARRAY_GET_METHODS = [
  'pop',
  'shift'
]

const ARRAY_SLICE_METHODS = [
  'slice',
  'splice'
]

const ARRAY_PARSE_METHODS = [
  'sort',
  'forEach',
  'filter',
  'map',
  'every',
  'some',
  'reduce',
  'reduceRight',
  'find',
  'findIndex'
]

const ARRAY_SEARCH_METHODS = [
  'includes'
]

function createToString(tome: any) {
  return () => JSON.stringify(Tome.unTome(tome))
}

function createInspect(tome: any, className: string) {
  return (depth: number = 1, options: any = {}) => {
    options.depth = depth
    return className + ' -> ' + inspect(Tome.unTome(tome), options)
  }
}

function proxifyOrUntome(t: any, ctor: any) {
  if (ObjectTome.isObjectTome(t) || ArrayTome.isArrayTome(t) ) {
    return createTomeProxy(t, ctor)
  }

  return t.valueOf()
}

function processArrayTomeMethodRequest(target: any, key: string, ctor: any) {
  // Entries iterator
  if (key === 'entries') {
    return target
      .map((t: any) => proxifyOrUntome(t, ctor))
      .entries
  }

  // For pop, shift, etc
  if (ARRAY_GET_METHODS.includes(key)) {
    return (...args: any[]) => proxifyOrUntome(target[key](...args), ctor)
  }

  // For slice, splice, etc
  if (ARRAY_SLICE_METHODS.includes(key)) {
    return (...args: any[]) => target[key](...args)
      .map((val: any) => proxifyOrUntome(val, ctor))
  }

  if (ARRAY_SEARCH_METHODS.includes(key)) {
    return function (...args: any[]) {
      const vals = target.map((t: any) => proxifyOrUntome(t, ctor))

      return vals[key](...args)
    }
  }

  // For methods receiving a function as a first parameter (map, reduce, forEach, etc)
  if (ARRAY_PARSE_METHODS.includes(key)) {
    return function (...args: any[]) {
      const iterator = args[0]
      args[0] = function (...iteratorArgs: any[]) {
        iteratorArgs = iteratorArgs.map((t: any) => proxifyOrUntome(t, ctor))

        return iterator(...iteratorArgs)
      }

      const ret = target[key](...args)

      if (key === 'find') {
        return ret ? proxifyOrUntome(ret, ctor) : ret
      }

      if (key === 'filter') {
        return ret.map((t: any) => proxifyOrUntome(t, ctor))
      }

      return ret
    }
  }

  // All other methods must be bound to the target
  return target[key].bind(target)
}

function extractType(typeInfo: any, typeMap: any, key: any) {
  if (typeInfo) {
    return typeInfo.typeFunction()
  }

  if (typeMap[key]) {
    return typeMap[key]
  }

  return Object
}

/**
 * Wrap tome and sub-tome instances intp proxies, allowing
 * for direct access to attributes
 */
function createTomeProxy(tome: any, ctor: any): any {
  const typeMap: any = {}
  const proxy: any = new Proxy(tome, {
      ownKeys(target) {
        return Object.keys(target).concat([
          '__dirty__',
          '__root__',
          '__diff__',
          '__diffEnabled__',
          '__version__',
          '__parent__',
          '__key__'
        ])
      },
      getPrototypeOf(target) {
        if (ArrayTome.isArrayTome(target)) {
          return Array.prototype
        }

        /* istanbul ignore next  */
        return ctor.prototype || Object.prototype
      },
      get(target: any, key: any) {
        // Return a stringified object/array/etc
        if (key === 'toString' || key === Symbol.toStringTag) {
          return createToString(target)
        }

        // the type definition for util.inspect.custom seems to be missing
        if (key === 'inspect' || key === (<any> inspect).custom) {
          let name: string
          if (ArrayTome.isArrayTome(target)) {
            name = 'Array'
          } else {
            name = ctor.name
          }

          return createInspect(target, name)
        }

        // Return the data structure's standard iterator
        if (key === Symbol.iterator) {
          /* istanbul ignore else */
          if (ArrayTome.isArrayTome(target)) {
            return target
              .valueOf()
              .map((t: any) => proxifyOrUntome(t, ctor))[Symbol.iterator]
          }

          /* istanbul ignore next*/
          return target[Symbol.iterator]
        }

        // Return the correct constructor - we want
        // ArrayTomes to appear as being Arrays,
        // and everything else as the known type
        if (key === 'constructor') {
          if (ArrayTome.isArrayTome(target)) {
            return Array
          }

          return ctor
        }

        // Extract the value
        const val = target[key]

        // Undefined means either the value is undefined,
        // or we are trying to access a prototype method
        if (val === undefined) {
          if (ctor.prototype[key]) {
            return ctor.prototype[key].bind(proxy)
          }

          return val
        }

        // Create a ObjectTome or ArrayTome proxy
        if (ObjectTome.isObjectTome(val) || ArrayTome.isArrayTome(val)) {
          if (ArrayTome.isArrayTome(target)) {
            return createTomeProxy(val, ctor)
          }

          const typeInfo = defaultMetadataStorage.findTypeMetadata(ctor, <string> key)
          const childCtor = extractType(typeInfo, typeMap, key)

          return createTomeProxy(target[key], childCtor)
        }

        // Mangle array functions so that they keep the proper
        // context and proxy siblings when needed
        if (typeof val === 'function' && ArrayTome.isArrayTome(target)) {
          return processArrayTomeMethodRequest(target, key, ctor)
        }

        // TODO: map object method calls to their "real" prototype

        // In all other cases, return the underlying value of the attribute
        return val.valueOf()
      },
      set(target: any, key: string, value) {
        target.set(key, value)

        typeMap[key] = undefined

        if (value !== undefined && value !== null) {
          typeMap[key] = value.constructor
        }

        return true
      },
      deleteProperty(_target, key: string) {
        tome.del(key)

        return true
      }
    })

  return proxy
}

/**
 * Dealing with tome topics
 */
export default class ValidatedTomeTopic extends ValidatedTopic {
  public static readonly mediaType = 'application/x-tome'

  public static async create<I extends archivist.IArchivistIndex, T extends ValidatedTopic>(
    this: IStaticThis<I, T>,
    state: mage.core.IState,
    index: I,
    data?: TopicData<T>
  ): Promise<T> {

    const className = this.getClassName()
    const typeMap: any = {}

    const isTome = Tome.isTome(data)
    const rawData: any = isTome ? Tome.unTome(data) : data
    const instance = classTransformer.plainToClass<T, object>(this, rawData) || new this()
    const tome: any = isTome ? data : Tome.conjure(instance)

    instance.setTopic(className)
    instance.setState(state)

    await instance.setIndex(index)

    const proxy: any = new Proxy(instance, {
      ownKeys() {
        return Object.keys(tome)
      },
      getOwnPropertyDescriptor(target: any, key) {
       return { configurable: true, enumerable: true, value: this.get(target, key) }
      },
      get(target: any, key) {
        if (key === 'toString' || key === Symbol.toStringTag) {
          return createToString(tome)
        }

        // the type definition for util.inspect.custom seems to be missing
        if (key === 'inspect' || key === (<any> inspect).custom) {
          return createInspect(tome, className)
        }

        /* istanbul ignore next */
        if (key === 'set' || key === 'del') {
          return target[key]
        }

        if (key === 'constructor') {
          return target.constructor
        }

        if (key === 'getData') {
          return () => tome
        }

        if (!tome[key]) {
          if (typeof target[key] === 'function') {
            return target[key].bind(proxy)
          }

          if (key === '_state' || key === '_topic' || key === '_index' ) {
            return target[key]
          }

          return undefined
        }

        if (ObjectTome.isObjectTome(tome[key]) || ArrayTome.isArrayTome(tome[key])) {
          const typeInfo = defaultMetadataStorage.findTypeMetadata(target.constructor, <string> key)
          const ctor = extractType(typeInfo, typeMap, key)

          return createTomeProxy(tome[key], ctor)
        }

        return tome[key].valueOf()
      },
      set(_target: any, key, value) {
        tome.set(key, value)

        typeMap[key] = undefined

        if (value !== undefined && value !== null) {
          typeMap[key] = value.constructor
        }

        return true
      },
      deleteProperty(target, key) {
        const val = tome[key]

        if (Tome.isTome(val)) {
          tome.del(key)
        }

        delete target[key]

        return true
      }
    })

    return proxy
  }
}
