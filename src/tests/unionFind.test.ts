import { describe, it, expect } from 'vitest'
import { UnionFind } from '../core/utils/unionFind'

describe('UnionFind', () => {
  it('al inicio cada nodo está solo', () => {
    const uf = new UnionFind(['A', 'B', 'C'])
    expect(uf.connected('A', 'B')).toBe(false)
  })

  it('unir conecta dos nodos', () => {
    const uf = new UnionFind(['A', 'B'])
    expect(uf.union('A', 'B')).toBe(true)
    expect(uf.connected('A', 'B')).toBe(true)
  })

  it('unir nodos ya conectados devuelve false (ciclo)', () => {
    const uf = new UnionFind(['A', 'B', 'C'])
    uf.union('A', 'B')
    uf.union('B', 'C')
    expect(uf.union('A', 'C')).toBe(false)
  })

  it('la conexión es transitiva', () => {
    const uf = new UnionFind(['A', 'B', 'C', 'D'])
    uf.union('A', 'B')
    uf.union('C', 'D')
    uf.union('B', 'C')
    expect(uf.connected('A', 'D')).toBe(true)
  })

  it('lanza error con un nodo desconocido', () => {
    const uf = new UnionFind(['A'])
    expect(() => uf.find('Z')).toThrow()
  })
})