import * as classTransformer from 'class-transformer'
import * as classValidator from 'class-validator'
import * as fs from 'fs'
import { archivist } from 'mage'
import * as mage from 'mage'
import * as path from 'path'

const functionArguments = require('function-arguments')
const isObject = require('isobject')
const deepIterator = require('deep-iterator').default

import 'reflect-metadata'

import * as classValidatorError from 'class-validator/validation/ValidationError'

/**
 * Validation error classes
 *
 * Will contain all the validation errors that were found upon validation.
 *
 * @export
 * @class ValidationError
 * @extends {Error}
 */
export class ValidationError extends Error {
  public details: any[]

  constructor(message: string, details: any) {
    super(message)
    this.details = details
    this.name = 'ValidationError'
  }
}

/**
 * Log emergency and crash
 *
 * @param {string} message
 * @param {*} data
 */
function crash(message: string, data: any) {
  mage.logger.emergency.data(data).log(message)
  return new Error(message)
}

/**
 * Throw only if the error is not "file/folder not found"
 *
 * @param {NodeJS.ErrnoException} error
 */
function throwIfNotFileNotFoundError(error: NodeJS.ErrnoException) {
  if (error.code !== 'ENOENT') {
    throw error
  }
}

/**
 * Throw on validation if at least one error is found
 *
 * @param {Error[]} errors
 * @param {*} obj
 * @returns
 */
function throwOnError(message: string, errors: classValidatorError.ValidationError[], obj?: any) {
  if (errors.length > 0) {
    throw new ValidationError(message, errors)
  }

  return obj
}

/**
 * usercommand.execute function signature
 *
 * @export
 * @interface IExecuteFunction
 */
type IExecuteFunction = <T>(state: mage.core.IState, ...args: any[]) => Promise<T>

/**
 * Load topics from each module's 'topics' folder
 *
 * This function is a helper you will use in your project's
 * `lib/archivist/index.js` file, as follow:
 *
 * ```typescript
 * import { loadTopicsFromModules } from 'mage-validator'
 *
 * loadTopicsFromModules(exports)
 * ```
 *
 * This will:
 *
 *   - Find all your projetc's modules
 *   - For each module folders, check if there is a `topics` folder
 *   - When a `topics` folder is found, require each file in it
 *   - Add the content of the require to exports[fileNameWithoutJSExtension]
 *
 * @export
 * @param {*} exports
 */
export function loadTopicsFromModules(exports: any) {
  const modules = mage.listModules()
  for (const moduleName of modules) {
    loadTopicsFromModule(exports, moduleName)
  }
}

/**
 * Load topics defined in a single module
 *
 * @param {*} exports
 * @param {string} moduleName
 */
export function loadTopicsFromModule(archivistExports: any, moduleName: string) {
  const modulePath = mage.getModulePath(moduleName)
  const moduleTopicsPath = path.join(modulePath, 'topics')

  try {
    fs.readdirSync(moduleTopicsPath).forEach(function (topicFileName) {
      const topicPath = path.join(moduleTopicsPath, topicFileName)
      const topicPathInfo = path.parse(topicPath)
      const topicName = topicPathInfo.name

      // Skip all files but TypeScript source files
      if (topicPathInfo.ext !== '.ts') {
        return
      }

      if (archivistExports[topicName]) {
        throw crash('Topic is already defined!', {
          alreadySetByModule: archivistExports[topicName]._module,
          module: moduleName,
          topic: topicName,
        })
      }

      // Add topic to the export of lib/archivist/index.ts
      const topic = archivistExports[topicName] = require(topicPath).default
      topic._module = moduleName

      // No explicit class name defined; we assign the name of the file as
      // the class name used internally within the topic's methods
      if (topic.getClassName().substring(0, 8) === 'default_') {
        topic.setClassName(topicName)
      }
    })
  } catch (error) {
    throwIfNotFileNotFoundError(error)
  }
}

/**
 * The IStaticThis interface is required
 * for us to be able to create static factory functions
 * that return a properly typed output.
 */
export interface IStaticThis<T> {
  new (): T,

  getClassName(): string,

  execute<T, R>(
    this: IStaticThis<T>,
    state: any,
    method: any,
    args: any[],
    run: (data: any) => any): Promise<R>,

  create<T extends ValidatedTopic>(
    this: IStaticThis<T>,
    state: mage.core.IState,
    index: archivist.IArchivistIndex,
    data?: any): Promise<T>,

  get<T extends ValidatedTopic>(
    this: IStaticThis<T>,
    state: mage.core.IState,
    indexes: archivist.IArchivistIndex,
    options?: archivist.IArchivistGetOptions): Promise<T>

  mget<T extends ValidatedTopic>(
    this: IStaticThis<T>,
    state: mage.core.IState,
    indexes: archivist.IArchivistIndex[],
    options?: archivist.IArchivistGetOptions): Promise<T[]>
}

/**
 * Validated topic
 *
 * Please note that you should import the default
 * of this module, not this class directly.
 *
 * Good:
 *
 * ```typescript
 * import ValidatedTopic from 'mage-validator'
 * ```
 *
 * Bad:
 *
 * ```typescript
 * import { ValidatedTopic } from 'mage-validator'
 * ```
 *
 * While the second line will work, it will provide you with
 * less type safety than the first import example.
 *
 * @export
 * @abstract
 * @class ValidatedTopic
 */
export class ValidatedTopic {
  public static readonly mediaType = 'application/json'
  public static readonly index: string[]
  public static readonly indexType: any
  public static readonly vaults = {}

  private static _className: string

  /**
   * Return the current class name
   *
   * @static
   * @returns
   *
   * @memberof ValidatedTopic
   */
  public static getClassName(): string {
    /* istanbul ignore next */
    if (!this._className) {
      return this.toString().split ('(' || /s+/)[0].split (' ' || /s+/)[1]
    }

    return this._className
  }

  /**
   * Explicitly set the name of this class
   *
   * @static
   * @param {string} name
   *
   * @memberof ValidatedTopic
   */
  public static setClassName(name: string): void {
    this._className = name
  }

  /**
   * Create an instance from a generic object
   *
   * @static
   * @param {mage.core.IState} state
   * @param {*} data
   * @returns
   *
   * @memberof ValidatedTopic
   */
  public static async create<T extends ValidatedTopic>(
    this: IStaticThis<T>,
    state: mage.core.IState,
    index: archivist.IArchivistIndex,
    data?: any): Promise<T> {

    let instance

    if (data) {
      if (!isObject(data)) {
        throw new Error(`Received data is not an object (received ${JSON.stringify(data)})`)
      }

      instance = classTransformer.plainToClass<T, object>(this, data)
    } else {
      instance = new this()
    }

    instance.setTopic(this.getClassName())
    instance.setState(state)
    await instance.setIndex(index)

    return instance
  }

  /**
   * Utility method used to promisify archivist calls
   *
   * @static
   * @param {*} state
   * @param {*} method
   * @param {any[]} args
   * @param {Function} run
   * @returns
   *
   * @memberof ValidatedTopic
   */
  public static async execute<T, R>(
    this: IStaticThis<T>,
    state: any,
    method: any,
    args: any[],
    run: (data: any) => any): Promise<R> {

    return new Promise<R>((resolve, reject) => {
      state.archivist[method](...args, (error: Error, data: T) => {
        if (error) {
          return reject(error)
        }

        resolve(run(data))
      })
    })
  }

  /**
   * Get a topic instance from backend vault(s)
   *
   * Mostly a wrapper around state.archivist.get. Note that
   * instead of using the `optional` option directly with this call,
   * you should consider using `tryGet` instead, which will trigger a
   * compile error if you do not check for an undefined return value.
   *
   * @static
   * @param {mage.core.IState} state
   * @param {archivist.IArchivistIndex} index
   * @param {archivist.IArchivistGetOptions} [options]
   * @returns
   *
   * @memberof ValidatedTopic
   */
  public static async get<T extends ValidatedTopic>(
    this: IStaticThis<T>,
    state: mage.core.IState,
    index: archivist.IArchivistIndex,
    options?: archivist.IArchivistGetOptions): Promise<T> {

    const topicName = this.getClassName()

    return this.execute<T, T>(state, 'get', [
      topicName,
      index,
      options
    ], async (data: any) => {
      // If optional: true, and no data was found
      if (options && options.optional && !data) {
        return undefined
      }

      return this.create(state, index, data)
    })
  }

  /**
   * Try to get a topic instance from backend vault(s)
   *
   * Same as `get`, but is also states that `undefined' might be returned instead.
   * You should consider using this method instead of calling `get` directly
   * with the `optional: true` option.
   *
   * @static
   * @param {mage.core.IState} state
   * @param {archivist.IArchivistIndex} index
   * @param {archivist.IArchivistGetOptions} [options]
   * @returns
   *
   * @memberof ValidatedTopic
   */
  public static async tryGet<T extends ValidatedTopic>(
    this: IStaticThis<T>,
    state: mage.core.IState,
    index: archivist.IArchivistIndex,
    options?: archivist.IArchivistGetOptions): Promise<T | undefined> {

    if (!options) {
      options = {}
    }

    options.optional = true

    return this.get(state, index, options)
  }

  /**
   * Get instances from backend vault(s)
   *
   * Mostly a wrapper around state.archivist.mget.
   *
   * @static
   * @param {mage.core.IState} state
   * @param {archivist.IArchivistQuery[]} queries
   * @param {archivist.IArchivistGetOptions} [options]
   * @returns
   *
   * @memberof ValidatedTopic
   */
  public static async mget<T extends ValidatedTopic>(
    this: IStaticThis<T>,
    state: mage.core.IState,
    indexes: archivist.IArchivistIndex[],
    options?: archivist.IArchivistGetOptions): Promise<T[]> {

    const topic = this.getClassName()
    const queries: archivist.IArchivistQuery[] = indexes.map((index) => ({ topic, index }))

    return this.execute<T, T[]>(state, 'mget', [
      queries,
      options
    ], async (list: any) => {
      const instances: ValidatedTopic[] = []

      for (let d = 0; d < list.length; d += 1) {
        const data = list[d]
        const index = queries[d].index
        const instance = await this.create(state, index, data)

        instances.push(instance)
      }

      return instances
    })
  }

  //
  // Todo:
  //
  // public static async mget(state: mage.core.IState, queries: archivist.INamedArchivistQuery, options?: archivist.IArchivistGetOptions) {
  //   return new Promise((resolve, reject) => {
  //     state.archivist.mget(queries, options, async (error, list) => {
  //       if (error) {
  //         return reject(error)
  //       }

  //       const instances = Object.keys(list).reduce((instances, name) => {
  //         if (list[name]) {
  //           instances[name] = this.create(state, queries[name], list[name])
  //         }

  //         return instances
  //       }, {})

  //       resolve(instances)
  //     })
  //   })
  // }

  /**
   * List all keys
   *
   * @static
   * @param {mage.core.IState} state
   * @param {archivist.IArchivistIndex} partialIndex
   * @param {archivist.IArchivistGetOptions} [options]
   * @returns
   *
   * @memberof ValidatedTopic
   */
  public static async list<T extends ValidatedTopic>(
    this: IStaticThis<T>,
    state: mage.core.IState, partialIndex:
    archivist.IArchivistIndex,
    options?: archivist.IArchivistListOptions): Promise<archivist.IArchivistIndex[]> {

    const topicName = this.getClassName()

    return this.execute<T, archivist.IArchivistIndex[]>(state, 'list', [
      topicName,
      partialIndex,
      options,
    ], (indexes: archivist.IArchivistIndex[]) => indexes)
  }

  /**
   * Query data by partial index
   *
   * Essentially wraps state.archivist.list, then fetches the data
   * for each keys using state.archivist.mget.
   *
   * @static
   * @param {mage.core.IState} state
   * @param {archivist.IArchivistIndex} partialIndex
   * @param {archivist.IArchivistGetOptions} [options]
   * @returns
   *
   * @memberof ValidatedTopic
   */
  public static async query<T extends ValidatedTopic>(
    this: IStaticThis<T>,
    state: mage.core.IState,
    partialIndex: archivist.IArchivistIndex,
    options?: archivist.IArchivistGetOptions): Promise<T[]> {

    const topicName = this.getClassName()

    return this.execute<T, T[]>(state, 'list', [
      topicName,
      partialIndex
    ], async (indexes: archivist.IArchivistIndex[]) => {
      return this.mget<T>(state, indexes, options)
    })
  }

  /**
   * Creates an instance of ValidatedTopic.
   *
   * @param {mage.core.IState} state
   *
   * @memberof ValidatedTopic
   */
  constructor(state?: mage.core.IState) {
    this.setTopic(this.constructor.name)

    if (state) {
      this.setState(state)
    }
  }

  /**
   * Get the topic for this instance
   *
   * @memberof ValidatedTopic
   */
  public getTopic() {
    return <string> (<any> this)._topic
  }

  /**
   * Set the topic name for this instance
   *
   * @param {string} topicName
   *
   * @memberof ValidatedTopic
   */
  public setTopic(topicName: string) {
    Object.defineProperty(this, '_topic', {
      value: topicName,
      configurable: true
    })
  }

  /**
   * Get the topic of that instance
   *
   * Should always return the class name of the instance.
   *
   * @returns
   *
   * @memberof ValidatedTopic
   */
  public getIndex() {
    return <archivist.IArchivistIndex> (<any> this)._index
  }

  /**
   * Set the index of this topic instance
   *
   * @param {archivist.IArchivistIndex} index
   *
   * @memberof ValidatedTopic
   */
  public async setIndex(indexData: archivist.IArchivistIndex) {
    const Class: any = this.constructor
    const Index = Class.indexType
    const index = new Index()

    for (const field of Class.index) {
      index[field] = indexData[field]
    }

    await classValidator.validate(index).then((errors) => throwOnError('Invalid index', errors))

    Object.defineProperty(this, '_index', {
      value: index,
      configurable: true
    })
  }

  /**
   * Retrieve the state object attached to the instance
   *
   * @returns
   *
   * @memberof ValidatedTopic
   */
  public getState() {
    return <mage.core.IState> (<any> this)._state
  }

  /**
   * Set the state this topic instance will be using.
   *
   * @param {mage.core.IState} state
   *
   * @memberof ValidatedTopic
   */
  public setState(state: mage.core.IState) {
    Object.defineProperty(this, '_state', {
      value: state,
      configurable: true
    })
  }

  /**
   * Retrieve the actual data for this instance
   *
   * This should essentially be the same as simply accessing data on the
   * instance itself.
   *
   * @returns
   *
   * @memberof ValidatedTopic
   */
  public getData() {
    return this
  }

  /**
   * Record an add operation on the instance's state
   *
   * Essentially a wrapper for state.archivist.add
   *
   * @param {archivist.ArchivistMediaType} mediaType
   * @param {archivist.ArchivistEncoding} encoding
   * @param {number} [expirationTime]
   * @returns
   *
   * @memberof ValidatedTopic
   */
  public async add(mediaType?: archivist.ArchivistMediaType, encoding?: archivist.ArchivistEncoding, expirationTime?: number) {
    await this.validate()
    return this.getState().archivist.add(this.getTopic(), this.getIndex(), this.getData(), mediaType, encoding, expirationTime)
  }

  /**
   * Record a set operation on the instance's state
   *
   * Essentially a wrapper for state.archivist.set.
   *
   * @param {archivist.ArchivistMediaType} mediaType
   * @param {archivist.ArchivistEncoding} encoding
   * @param {number} [expirationTime]
   * @returns
   *
   * @memberof ValidatedTopic
   */
  public async set(mediaType?: archivist.ArchivistMediaType, encoding?: archivist.ArchivistEncoding, expirationTime?: number) {
    await this.validate()
    return this.getState().archivist.set(this.getTopic(), this.getIndex(), this.getData(), mediaType, encoding, expirationTime)
  }

  /**
   * Record a touch operation on the instance's state
   *
   * Essentially a wrapper for state.archivist.touch.
   *
   * @param {number} [expirationTime]
   * @returns
   *
   * @memberof ValidatedTopic
   */
  public async touch(expirationTime?: number) {
    await this.validate()
    return this.getState().archivist.touch(this.getTopic(), this.getIndex(), expirationTime)
  }

  /**
   * Record a delete operation on the instance's state
   *
   * @returns
   *
   * @memberof ValidatedTopic
   */
  public del() {
    return this.getState().archivist.del(this.getTopic(), this.getIndex())
  }

  /**
   * Validate the current instance
   *
   * @returns {Promise<void>}
   *
   * @memberof ValidatedTopic
   */
  public async validate(): Promise<void> {
    return classValidator.validate(this).then((errors) => throwOnError('Invalid type', errors))
  }
}

/**
 * @Acl decorator
 *
 * Protect the user command with the given ACL and defined type validation
 *
 * @export
 * @param {...string[]} acl
 * @returns
 */
export function Acl(...acl: string[]) {
  return function (UserCommand: any, key: string) {
    if (key !== 'execute') {
      throw crash('@validate only works for usercommand.execute functions', {
        method: key,
        userCommand: UserCommand
      })
    }

    const execute = <IExecuteFunction> UserCommand.execute
    const parameterNames = functionArguments(execute)
    const types = Reflect.getMetadata('design:paramtypes', UserCommand, key)

    // We extract the state information, since we won't need it
    parameterNames.shift()
    types.shift()

    // We attach additional information to the UserCommand class
    UserCommand.acl = acl
    UserCommand.params = parameterNames

    async function validateObject(message: string, obj: any) {
      return classValidator.validate(obj).then((errors) => throwOnError(message, errors, obj))
    }

    return {
      value: async (state: mage.core.IState, ...args: any[]) => {
        // Map user command's parameters
        const userCommandData: { [key: string]: any } = {}
        args.forEach((arg, pos) => {
          const parameterName = parameterNames[pos]
          userCommandData[parameterName] = arg
        })

        // Cast data into a user command instance
        const userCommand = classTransformer.plainToClass(UserCommand, userCommandData)
        for (const { value } of deepIterator(userCommand)) {
          if (value instanceof ValidatedTopic) {
            value.setState(state)

            const index = (<any> value).index || {}

            await value.setIndex(index)
            delete (<any> value).index
          }
        }

        // Validate all parameters at once
        await validateObject('Invalid user command input', userCommand)

        // Map casted parameters into an array of arguments
        const castedArgs = args.map((_arg, pos) => {
          const parameterName = parameterNames[pos]
          return (<any> userCommand)[parameterName]
        })

        // Execute the actual user command
        const output = await execute(state, ...castedArgs)

        // Validate the returned value
        const type = typeof output
        if (type !== 'object') {
          return output
        }

        if (!Array.isArray(output)) {
          return validateObject('Invalid user command return value', output)
        }

        // In the case of arrays, validate each entries
        for (const [pos, val] of output.entries()) {
          await validateObject(`Invalid user command return value in array (index: ${pos})`, val)
        }

        return output
      }
    }
  }
}
