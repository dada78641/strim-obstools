import {nodeConfig} from '@dada78641/eslint-config'

export default [
  ...nodeConfig,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
    }
  }
]
