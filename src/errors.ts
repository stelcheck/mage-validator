import * as mage from 'mage'
import * as classValidatorError from 'class-validator/validation/ValidationError'

/**
 * Validation error classes
 *
 * Will contain all the validation errors that were found upon validation.
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
 */
export function crash(message: string, data: any) {
  mage.logger.emergency.data(data).log(message)
  return new Error(message)
}

/**
 * Throw on validation if at least one error is found
 */
export function throwOnError(message: string, errors: classValidatorError.ValidationError[], obj?: any) {
  if (errors.length > 0) {
    throw new ValidationError(message, errors)
  }

  return obj
}
