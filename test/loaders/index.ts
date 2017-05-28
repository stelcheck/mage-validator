import * as mage from 'mage'
import * as path from 'path'

describe('Module topic loaders', function () {
  let oldListModules = mage.listModules
  let oldGetModulePath = mage.getModulePath

  beforeEach(function() {
    const mageInstance: any = mage

    mageInstance.listModules = function () {
      return [
        'moduleOne',
        'moduleTwo',
        'moduleThree'
      ]
    }

    mageInstance.getModulePath = function (moduleName: string) {
      return path.join(process.cwd(), 'test/fixtures/lib/modules', moduleName)
    }
  })

  afterEach(function () {
    const mageInstance: any = mage

    mageInstance.listModules = oldListModules
    mageInstance.getModulePath = oldGetModulePath
  })

  require('./loadTopicsFromModule')
  require('./loadTopicsFromModules')
})
