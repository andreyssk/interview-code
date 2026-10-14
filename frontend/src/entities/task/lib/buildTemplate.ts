import type { Signature } from '../model/types'

/** Empty Go function matching the signature, as shown in the editor at the start. */
export function buildTemplate({ name, params, returns, mutates }: Signature): string {
  if (!name) return 'package main\n\nfunc main() {\n\n}\n' // a task without a function to write
  const args = params.map((p) => `${p.name} ${p.type}`).join(', ')
  const ret = returns && !mutates ? ` ${returns}` : ''
  return `package main\n\nfunc ${name}(${args})${ret} {\n\n}\n`
}

const JAVA_PRIMITIVES: Record<string, [string, string]> = {
  int: ['int', 'Integer'],
  int8: ['byte', 'Byte'],
  int16: ['short', 'Short'],
  int32: ['int', 'Integer'],
  int64: ['long', 'Long'],
  uint: ['int', 'Integer'],
  uint8: ['byte', 'Byte'],
  uint16: ['int', 'Integer'],
  uint32: ['long', 'Long'],
  uint64: ['long', 'Long'],
  float32: ['float', 'Float'],
  float64: ['double', 'Double'],
  string: ['String', 'String'],
  bool: ['boolean', 'Boolean'],
  byte: ['byte', 'Byte'],
  rune: ['char', 'Character'],
}

/**
 * Go type -> Java type: []T becomes T[], map[K]V becomes Map<K, V> (boxed). A type that is already written the Java way
 * (int[], List<Integer>, TreeNode, …) is kept as it is.
 */
function javaType(type: string, boxed = false): string {
  const t = type.trim()
  if (t.startsWith('[]')) return `${javaType(t.slice(2))}[]`
  if (t.startsWith('map[')) {
    let depth = 0
    for (let i = 3; i < t.length; i++) {
      if (t[i] === '[') depth++
      else if (t[i] === ']' && --depth === 0) return `Map<${javaType(t.slice(4, i), true)}, ${javaType(t.slice(i + 1), true)}>`
    }
  }
  const prim = JAVA_PRIMITIVES[t]
  return prim ? prim[boxed ? 1 : 0] : t || 'Object'
}

/** Empty Java method matching the signature, in a Solution class (the Java counterpart of buildTemplate). */
export function buildJavaTemplate({ name, params, returns, mutates }: Signature): string {
  if (!name) return 'class Solution {\n\n}\n'
  const args = params.map((p) => `${javaType(p.type)} ${p.name}`).join(', ')
  const ret = returns && !mutates ? javaType(returns) : 'void'
  return `import java.util.*;\n\nclass Solution {\n    public ${ret} ${name}(${args}) {\n\n    }\n}\n`
}
