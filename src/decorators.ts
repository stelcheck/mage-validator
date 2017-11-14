import * as mage from 'mage'
import * as classTransformer from 'class-transformer'
import * as classValidator from 'class-validator'

import { ValidatedTopic } from './classes'
import { crash, throwOnError } from './errors'

const deepIterator = require('deep-iterator').default
const functionArguments = require('function-arguments')

/**
 * usercommand.execute function signature
 */
type IExecuteFunction = <T>(state: mage.core.IState, ...args: any[]) => Promise<T>


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
