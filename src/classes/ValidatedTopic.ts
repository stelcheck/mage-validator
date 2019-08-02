import * as classTransformer from 'class-transformer'
import * as classValidator from 'class-validator'
import isObject = require('isobject')

import { archivist } from 'mage'
import * as mage from 'mage'

import { ValidationError } from '../errors'

// tslint:disable:completed-docs
type Key = string | number | symbol

export type Diff<T extends Key, U extends Key> = ({[P in T]: P } & {[P in U]: never } & { [x: string]: never })[T]

// tslint:disable:completed-docs
export type Omit<T, K extends keyof T> = Pick<Partial<T>, Diff<keyof T, K>>

/**
 * Anonymous object representation of a validated topic
 *
 * Generally passed to Topic.create()
 */
export type TopicData<T extends ValidatedTopic> = Omit<T, keyof ValidatedTopic>
/**
 * Partial index type
 */
export type PartialIndex<I> = {
  [K in keyof I]?: string
}

/**
 * The IStaticThis interface is required
 * for us to be able to create static factory functions
 * that return a properly typed output.
 */
export interface IStaticThis<I, T> {
  version: number,
  // Todo: any should be I!
  indexType: { new(): any },

  new (): T,

  getClassName(): string,

  execute<I, T, R>(
    this: IStaticThis<I, T>,
    state: any,
    method: any,
    args: any[],
    run: (data: any) => any): Promise<R>,

  create<T extends ValidatedTopic>(
    this: IStaticThis<I, T>,
    state: mage.core.IState,
    index: I,
    data?: any): Promise<T>,

  get<T extends ValidatedTopic>(
    this: IStaticThis<I, T>,
    state: mage.core.IState,
    index: I,
    options?: archivist.IArchivistGetOptions): Promise<T>

  mget<T extends ValidatedTopic>(
    this: IStaticThis<I, T>,
    state: mage.core.IState,
    indexes: I[],
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
export default class ValidatedTopic {
  public static readonly mediaType: string = 'application/json'
  public static readonly index: string[]
  public static readonly indexType: any
  public static readonly vaults = {}

  public static version = 0
  public static migrations = new Map<number, string>()

  private static _className: string

  public _version: number = 0

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
  public static async create<I extends archivist.IArchivistIndex, T extends ValidatedTopic>(
    this: IStaticThis<I, T>,
    state: mage.core.IState,
    index: I,
    data?: TopicData<T>): Promise<T> {

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

    /* istanbul ignore next */
    if (!instance._version) {
      instance._version = this.version
    }

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
  public static async execute<I, T, R>(
    this: IStaticThis<I, T>,
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
  public static async get<I extends archivist.IArchivistIndex, T extends ValidatedTopic>(
    this: IStaticThis<I, T>,
    state: mage.core.IState,
    index: I,
    options?: archivist.IArchivistGetOptions): Promise<T> {

    const topicName = this.getClassName()

    return this.execute<I, T, T>(state, 'get', [
      topicName,
      index,
      options
    ], async (data: any) => {
      // If optional: true, and no data was found
      if (options && options.optional && !data) {
        return undefined
      }

      const instance = await this.create(state, index, data)
      await instance.migrate()

      return instance
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
  public static async tryGet<I extends archivist.IArchivistIndex, T extends ValidatedTopic>(
    this: IStaticThis<I, T>,
    state: mage.core.IState,
    index: I,
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
  public static async mget<I extends archivist.IArchivistIndex, T extends ValidatedTopic>(
    this: IStaticThis<I, T>,
    state: mage.core.IState,
    indexes: I[],
    options?: archivist.IArchivistGetOptions): Promise<T[]> {

    const topic = this.getClassName()
    const queries: archivist.IArchivistQuery[] = indexes.map((index) => ({ topic, index }))

    return this.execute<I, T, T[]>(state, 'mget', [
      queries,
      options
    ], async (list: any) => {
      const instances: ValidatedTopic[] = []

      for (const [i, data] of list.entries()) {
        if (!data) {
          continue
        }

        const index = queries[i].index
        const instance = await this.create(state, index as I, data)

        await instance.migrate()

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
  public static async list<I extends archivist.IArchivistIndex, T extends ValidatedTopic>(
    this: IStaticThis<I, T>,
    state: mage.core.IState,
    partialIndex: PartialIndex<I>,
    options?: archivist.IArchivistListOptions): Promise<archivist.IArchivistIndex[]> {

    const topicName = this.getClassName()

    return this.execute<I, T, I[]>(state, 'list', [
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
  public static async query<I extends archivist.IArchivistIndex, T extends ValidatedTopic>(
    this: IStaticThis<I, T>,
    state: mage.core.IState,
    partialIndex: PartialIndex<I>,
    options?: archivist.IArchivistGetOptions | archivist.IArchivistListOptions): Promise<T[]> {

    const topicName = this.getClassName()

    return this.execute<I, T, T[]>(state, 'list', [
      topicName,
      partialIndex,
      options
    ], async (indexes: I[]) => {
      return this.mget<T>(state, indexes, options as archivist.IArchivistGetOptions)
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

    const errors = await classValidator.validate(index)

    if (errors.length > 0) {
      throw new ValidationError('Index validation failed', 'server', {
        topic: this.getTopic(),
        index: this.getIndex()
      }, errors)
    }

    Object.defineProperty(this, '_index', {
      value: index,
      configurable: true
    })
  }

  /**
   * Retrieve the state object attached to the instance
   */
  public getState() {
    return <mage.core.IState> (<any> this)._state
  }

  /**
   * Set the state this topic instance will be using.
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
   */
  public getData() {
    return this
  }

  /**
   * Record an add operation on the instance's state
   *
   * Essentially a wrapper for state.archivist.add
   */
  public async add(mediaType?: archivist.ArchivistMediaType, encoding?: archivist.ArchivistEncoding, expirationTime?: number) {
    await this.validate('Validation failed on add')
    return this.getState().archivist.add(this.getTopic(), this.getIndex(), this.getData(), mediaType, encoding, expirationTime)
  }

  /**
   * Record a set operation on the instance's state
   *
   * Essentially a wrapper for state.archivist.set.
   */
  public async set(mediaType?: archivist.ArchivistMediaType, encoding?: archivist.ArchivistEncoding, expirationTime?: number) {
    await this.validate('Validation failed on set')
    return this.getState().archivist.set(this.getTopic(), this.getIndex(), this.getData(), mediaType, encoding, expirationTime)
  }

  /**
   * Record a touch operation on the instance's state
   *
   * Essentially a wrapper for state.archivist.touch.
   */
  public async touch(expirationTime?: number) {
    await this.validate('Validation failed on touch')
    return this.getState().archivist.touch(this.getTopic(), this.getIndex(), expirationTime)
  }

  /**
   * Record a delete operation on the instance's state
   */
  public del() {
    return this.getState().archivist.del(this.getTopic(), this.getIndex())
  }

  /**
   * Validate the current instance
   */
  public async validate(errorMessage?: string, code?: string): Promise<void> {
    const errors = await classValidator.validate(this)
    if (errors.length > 0) {
      this.raiseValidationError(errors, errorMessage, code)
    }
  }

  /**
   * Migrate data using predefined migration methods
   */
  public async migrate() {
    const type = this.constructor as typeof ValidatedTopic
    const { migrations } = type

    let migrated = false

    // tslint:disable-next-line:strict-type-predicates
    if (this._version === undefined) {
      this._version = 0
    }

    if (this._version === type.version) {
      return
    }

    for (const [version, methodName] of migrations.entries()) {
      if (version > this._version) {
        const method = (this as any)[methodName]
        await method.call(this)
        this._version = version
        migrated = true
      }
    }

    if (migrated) {
      await this.set()
    }
  }

  /**
   * Throw a ValidateError including relevant details
   */
  public raiseValidationError(errors: any[], errorMessage?: string, code?: string) {
    const state = <any> this.getState()

    throw new ValidationError(errorMessage || 'Validation failed', code || 'server', {
      actorId: state.actorId,
      userCommand: state.description,
      topic: this.getTopic(),
      index: this.getIndex()
    }, errors)
  }
}
