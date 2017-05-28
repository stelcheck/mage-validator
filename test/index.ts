import * as mage from 'mage'
import { ValidatedTopic } from '../src'
import { IsNumberString, IsUrl } from 'class-validator'

export class Index {
  @IsNumberString()
  id: string
}

export class TestTopic extends ValidatedTopic {
  public static readonly index = ['id']
  public static readonly indexType = Index

  name: string

  @IsUrl()
  url: string
}

describe('mage-validator', function () {
  const oldLogger = mage.logger

  before(function () {
    const mageInstance: any = mage
    mageInstance.logger = {
      emergency: {
        data: function (data: any) {
          return {
            log: function (...args: any[]) {
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

