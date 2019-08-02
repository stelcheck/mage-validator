import * as mage from 'mage'
import * as classTransformer from 'class-transformer'
import * as classValidator from 'class-validator'

import { ValidatedTopic } from './classes'
import { crash, ValidationError } from './errors'

const deepIterator = require('deep-iterator').default
const functionArguments = require('function-arguments')

/**
 * usercommand.execute function signature
 */
type IExecuteFunction = <T>(state: mage.core.IState, ...args: any[]) => Promise<T>

/**
 * Validate function type (currently used for MapOf)
 */
export type ValidateFunction = (key: string, value: any) => void

// Expose everything from class-validator and class-transformer
export * from 'class-transformer'
export * from 'class-validator'

/**
 * wrap the class' static create method
 *
 * @param target
 * @param key
 * @param childrenType
 * @param type
 */
function wrapCreate(target: any, key: string, childrenType: any, validateFunction?: ValidateFunction, mapType?: any) {
  const { create } = target

  target.create = async (
    state: mage.core.IState,
    index: mage.archivist.IArchivistIndex,
    data?: any
  ) => {
    const instance = await create.call(target, state, index, data)
    const map = mapType ? new mapType() : {}

    if (!instance[key]) {
      return instance
    }

    for (const [subkey, value] of Object.entries(instance[key])) {
      map[subkey] = Object.assign(new childrenType(), value)
    }

    instance[key] = map

    return instance
  }

  const { validate } = target.prototype

  target.prototype.validate = async function (errorMessage?: string, code?: string) {
    await validate.call(this, errorMessage, code)
    let errors: any[] = []

    if (!this[key]) {
      return
    }

    for (const [subkey, value] of Object.entries(this[key])) {
      errors = errors.concat(await classValidator.validate(value as any))

      if (!validateFunction) {
        continue
      }

      try {
        validateFunction(subkey, value)
      } catch (error) {
        error.message = `Validation error on ${key}.${subkey}: ${error.message}`

        const validationError = new classValidator.ValidationError()
        validationError.target = target
        validationError.property = key
        validationError.value = value
        validationError.constraints = {
          mapOf: error.message
        }

        errors.push(Object.assign(validationError, error))
      }
    }

    if (errors.length > 0) {
      this.raiseValidationError(errors, errorMessage, code)
    }
  }
}

/**
 *
 * @param type
 */
export function MapOf(type: any, validateFunction?: ValidateFunction) {
  return (target: any, key?: string) => {
    if (!key) {
      target.isMapOf = { type, validateFunction }
    } else {
      wrapCreate(target.constructor, key, type, validateFunction)
    }
  }
}

/**
 * Wrap @Type from class-transformer
 *
 * @param type The type to configure
 */
export function Type(type: any) {
  if (type.isMapOf) {
    const { type: childrenType, validateFunction } = type.isMapOf
    return (target: any, key: string) => wrapCreate(target.constructor, key, childrenType, validateFunction, type)
  }

  if (type.prototype) {
    return classTransformer.Type(/* istanbul ignore next */ () => type)
  }

  return classTransformer.Type(type)
}

/**
 * Validate ValidatedObjects and throw an error if the data is invalid.
 *
 * @param message
 * @param code
 * @param state
 * @param parsedData
 * @param receivedData
 */
async function validateObject(message: string, code: string, state: any, parsedData: any, receivedData?: any) {
  const errors = await classValidator.validate(parsedData)
  if (errors.length > 0) {
    throw new ValidationError(message, code, {
      actorId: state.actorId,
      userCommand: state.description,
      receivedData,
      parsedData
    }, errors)
  }

  return parsedData
}

/**
 * Validate the output of an `execute` call of an user command.
 *
 * @param value
 */
async function validateOutput(state: mage.core.IState, value: any) {
  const type = typeof value

  if (type !== 'object') {
    return
  }

  if (!Array.isArray(value)) {
    return validateObject('Invalid user command return value', 'server', state, value)
  }

  for (const val of value) {
    await validateOutput(state, val)
  }
}

/**
 * @Acl decorator
 *
 * Protect the user command with the given ACL and defined type validation
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

    if (!types) {
        throw crash('Reflect.getMetadata returned null.\
        Did you set experimentalDecorators and emitDecoratorMetadata to true in your tsconfig.json ?', {
            method: key,
            userCommand: UserCommand
        })
    }

    // We extract the state information, since we won't need it
    parameterNames.shift()
    types.shift()

    // We attach additional information to the UserCommand class
    UserCommand.acl = acl
    UserCommand.params = parameterNames

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
        await validateObject('Invalid user command input', 'invalidInput', state, userCommand, userCommandData)

        // Map casted parameters into an array of arguments
        const castedArgs = args.map((_arg, pos) => {
          const parameterName = parameterNames[pos]
          return (<any> userCommand)[parameterName]
        })

        // Execute the actual user command
        const output = await execute(state, ...castedArgs)

        await validateOutput(state, output)

        return output as any
      }
    }
  }
}

export function Migrate(version: number) {
  return function (topic: ValidatedTopic, method: string) {
    const type = topic.constructor as typeof ValidatedTopic
    const { migrations } = type
    migrations.set(version, method)

    const migrationsArray = [...migrations.entries()]
    const sortedMigrationArrays = migrationsArray.sort(([a], [b]) => a - b)
    const sortedMigrations = new Map<number, any>(sortedMigrationArrays)

    type.migrations = sortedMigrations
    type.version = Array.from(sortedMigrations.keys()).pop() as number
  }
}
