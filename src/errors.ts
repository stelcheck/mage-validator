import * as mage from 'mage'

/**
 * Validation error classes
 *
 * Will contain all the validation errors that were found upon validation.
 */
export class ValidationError extends Error {
  // Error code to be returned to the client
  public code: string

  // Details about the topic instance
  public details: any[]

  // List of validation errors
  public validationErrors: any[]

  constructor(message: string, code: string, details: any, errors: any) {
    super(message)
    this.code = code
    this.details = details
    this.validationErrors = errors
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
