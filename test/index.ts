/* tslint:disable:no-console */
import * as mage from 'mage'
import { ValidatedTopic } from '../src'
import { IsNumberString, IsUrl } from 'class-validator'

/**
 * Index used during unit tests
 *
 * @export
 * @class Index
 */
export class Index {
  @IsNumberString()
  public id: string
}

/**
 * Topic class used for testing
 *
 * @export
 * @class TestTopic
 * @extends {ValidatedTopic}
 */
export class TestTopic extends ValidatedTopic {
  public static readonly index = ['id']
  public static readonly indexType = Index

  public name: string

  @IsUrl()
  public url: string
}

describe('mage-validator', function () {
  const oldLogger = mage.logger

  before(function () {
    const mageInstance: any = mage
    mageInstance.logger = {
      emergency: {
        data(data: any) {
          return {
            log(...args: any[]) {
              console.log('mage.emergency', ...args, data)
            }
          }
        }
      }
    }
  })

  after(function () {
    const mageInstance: any = mage
    mageInstance.logger = oldLogger
  })

  require('./topic')
  require('./usercommand')
  require('./loaders')
})

