import ValidatedTopic, { IStaticThis } from './ValidatedTopic'
import { defaultMetadataStorage } from 'class-transformer/storage'

import { archivist } from 'mage'
import * as mage from 'mage'

import { inspect } from 'util'

const { Tome, ObjectTome, ArrayTome } = mage.require('tomes')

function createToString(tome: any) {
  return () => JSON.stringify(Tome.unTome(tome))
}

function createInspect(tome: any, className: string) {
  return (depth: number = 1, options: any = {}) => {
    options.depth = depth
    return className + ' -> ' + inspect(Tome.unTome(tome), options)
  }
}

/**
 * Wrap tome and sub-tome instances intp proxies, allowing
 * for direct access to attributes
 */
function createTomeProxy(tome: any, ctor: any): any {
  return new Proxy(tome, {
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

        return ctor
      },
      get(target: any, key: any) {
        const val = target[key]

        if (key === 'toString' || key === Symbol.toStringTag) {
          return createToString(target)
        }

        // the type definition for util.inspect.custom seems to be missing
        if (key === 'inspect' || key === (<any> inspect).custom) {
          let name: string
          if (ctor.name) {
            name = ctor.name
          } else if (ArrayTome.isArrayTome(target)) {
            name = 'Array'
          } else {
            name = 'Object'
          }

          return createInspect(target, name)
        }

        // Return the data structure's standard iterator
        if (key === Symbol.iterator) {
          /* istanbul ignore else */
          if (ArrayTome.isArrayTome(target)) {
            return target.valueOf().map((t: any) => {
              if (ObjectTome.isObjectTome(t)) {
                return createTomeProxy(t, ctor)
              }

              return t.valueOf()
            })[Symbol.iterator]
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

        // Return the value if it is not defined
        if (val === undefined) {
          return val
        }

        // Create a ObjectTome or ArrayTome proxy
        if (ObjectTome.isObjectTome(val) || ArrayTome.isArrayTome(val)) {
          if (ArrayTome.isArrayTome(target)) {
            return createTomeProxy(val, ctor)
          }

          const typeInfo = defaultMetadataStorage.findTypeMetadata(ctor, <string> key)
          const childCtor = typeInfo ? typeInfo.typeFunction() : {}

          return createTomeProxy(target[key], childCtor)
        }

        // Mangle functions so that they keep the proper
        // context and proxy siblings when needed
        if (typeof val === 'function') {
          // If the current target is an ArrayTome, we need to
          // change the normal behavior of the methods listed below
          // to make it so that they return proxied tome instances
          // instead of the normal values

          /* istanbul ignore else */
          if (ArrayTome.isArrayTome(target)) {
            if (key === 'entries') {
              return target.map((t: any) => {
                if (ObjectTome.isObjectTome(t)) {
                  return createTomeProxy(t, ctor)
                }

                return t.valueOf()
              }).entries
            }

            if ([
              'sort',
              'includes',
              'forEach',
              'filter',
              'map',
              'every',
              'some',
              'reduce',
              'reduceRight',
              'find',
              'findIndex' // !!!!
            ].includes(key)) {
              return function (...args: any[]) {
                const iterator = args[0]

                args[0] = function (...iteratorArgs: any[]) {
                  iteratorArgs = iteratorArgs.map((t: any) => {
                    if (ObjectTome.isObjectTome(t)) {
                      return createTomeProxy(t, ctor)
                    }

                    return t.valueOf()
                  })

                  return iterator(...iteratorArgs)
                }

                return target[key](...args)
              }
            }
          }

          // In all other cases, bind the returned method
          // to the current target
          return val.bind(target)
        }

        // In all other cases, return the underlying value of the attribute
        return val.valueOf()
      },
      set(target: any, key: string, value) {
        target.set(key, value)

        return true
      },
      deleteProperty(_target, key: string) {
        tome.del(key)

        return true
      }
    })
}

/**
 * Dealing with tome topics
 */
export default class ValidatedTomeTopic extends ValidatedTopic {
  public static readonly mediaType = 'application/x-tome'

  public tome: any

  public static async create<T extends ValidatedTopic>(
    this: IStaticThis<T>,
    state: mage.core.IState,
    index: archivist.IArchivistIndex,
    data?: any): Promise<T> {

    const tome: any = Tome.isTome(data) ? data : Tome.conjure(data || {})
    const className = this.getClassName()
    const instance = new this()

    // Create default values
    if (!data) {
      Object.keys(instance).forEach((key) => {
        tome.set(key, (<any> instance)[key])
        delete (<any> instance)[key]
      })
    }

    instance.setTopic(className)
    instance.setState(state)

    await instance.setIndex(index)

    return new Proxy(instance, {
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

        if (key === 'tome') {
          return tome
        }

        if (!tome[key]) {
          return target[key]
        }

        if (ObjectTome.isObjectTome(tome[key]) || ArrayTome.isArrayTome(tome[key])) {
          const typeInfo = defaultMetadataStorage.findTypeMetadata(target.constructor, <string> key)
          const ctor = typeInfo ? typeInfo.typeFunction() : {}

          return createTomeProxy(tome[key], ctor)
        }

        return tome[key].valueOf()
      },
      set(_target: any, key, value) {
        tome.set(key, value)
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
  }
  public getData() {
    return this.tome
  }
}
