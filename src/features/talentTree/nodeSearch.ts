import { nodeTooltip, type TalentTreeNode } from '../../types/talentTree'

export function normalizeNodeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim()
}

/** Busca sem acentos; todas as palavras digitadas precisam existir no nó. */
export function nodeMatchesSearch(node: TalentTreeNode, query: string): boolean {
  const terms = normalizeNodeSearch(query).split(/\s+/).filter(Boolean)
  if (terms.length === 0) return true

  const searchableText = normalizeNodeSearch(
    `${node.id}\n${nodeTooltip(node.data)}\n${JSON.stringify(node.data)}`,
  )
  return terms.every((term) => searchableText.includes(term))
}
