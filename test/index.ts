/* tslint:disable:no-console */
import * as mage from 'mage'
import { ValidatedTopic } from '../src'
import { IsNumberString, IsUrl } from 'class-validator'

const vaultValue = require('mage/lib/archivist/vaultValue')

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
    mageInstance.logger = mage.core.logger
    vaultValue.setup(mage.core.logger)
  })

  after(function () {
    const mageInstance: any = mage
    mageInstance.logger = oldLogger
    vaultValue.setup(undefined)
  })

  require('./topic')
  require('./tomeTopic')
  require('./usercommand')
  require('./loaders')
})

