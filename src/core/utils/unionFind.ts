export class UnionFind {
  private parent = new Map<string, string>()
  private rank = new Map<string, number>()

  constructor(ids: string[]) {
    for (const id of ids) {
      this.parent.set(id, id)
      this.rank.set(id, 0)
    }
  }

  find(id: string): string {
    const padre = this.parent.get(id)
    if (padre === undefined) {
      throw new Error(`Nodo desconocido: ${id}`)
    }
    if (padre !== id) {
      const raiz = this.find(padre)
      this.parent.set(id, raiz)
      return raiz
    }
    return id
  }

  union(a: string, b: string): boolean {
    const raizA = this.find(a)
    const raizB = this.find(b)
    if (raizA === raizB) return false

    const rangoA = this.rank.get(raizA)!
    const rangoB = this.rank.get(raizB)!

    if (rangoA < rangoB) {
      this.parent.set(raizA, raizB)
    } else if (rangoA > rangoB) {
      this.parent.set(raizB, raizA)
    } else {
      this.parent.set(raizB, raizA)
      this.rank.set(raizA, rangoA + 1)
    }
    return true
  }

  connected(a: string, b: string): boolean {
    return this.find(a) === this.find(b)
  }
}