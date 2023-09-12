import { readMockProjectConfig } from "../mockUtil"


describe('layout types', () => {
  const config = readMockProjectConfig('hasModules')

  it('should has layout', () => {

    console.log('config:', config)
  })
})