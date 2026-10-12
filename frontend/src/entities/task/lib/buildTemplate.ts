import type { Signature } from '../model/types'

/** Empty Go function matching the signature, as shown in the editor at the start. */
export function buildTemplate({ name, params, returns, mutates }: Signature): string {
  const args = params.map((p) => `${p.name} ${p.type}`).join(', ')
  const ret = returns && !mutates ? ` ${returns}` : ''
  return `package main\n\nfunc ${name}(${args})${ret} {\n\n}\n`
}
