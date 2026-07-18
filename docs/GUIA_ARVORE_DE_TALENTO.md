# Guia de Criação da Árvore de Talento — OverGrown

Documento de referência para humanos e modelos de IA que forem criar ou expandir
a Árvore de Talento oficial do OverGrown. Siga estas regras à risca; a validação
do gerador rejeita árvores que as violem.

## Arquivos relevantes

| Arquivo | Papel |
|---|---|
| `scripts/generateTalentTree.ts` | Fonte da verdade do DESIGN. Edite aqui e regenere. |
| `src/data/defaultTalentTree.json` | Arquivo oficial gerado. Carregado automaticamente pelo site. NÃO edite à mão. |
| `src/types/talentTree.ts` | Tipos de nó, factories (`defaultNodeData`), custo (`talentNodeCost`), tooltips. |
| `src/features/talentTree/defaultTree.ts` | Auto-load da árvore oficial (por `version`). |
| `src/features/character/hooks/useCharacterStats.ts` | Como cada tipo de nó vira stats na ficha. |
| `src/data/combatSkills.ts` / `src/data/spells.ts` | Habilidades e magias do livro (use os `id`s daqui). |

Fluxo: editar specs no gerador → `npm run generate:tree` → validação roda →
JSON atualizado → commit/deploy → páginas `/arvore` e `/talent-tree-builder`
carregam a nova versão automaticamente (o campo `version` da árvore é comparado
com o local; incremente `TREE_VERSION` a cada publicação).

## Conceitos fundamentais

1. **A árvore é UMA SÓ.** As "seções" (Guerreiro, Rogue, Tank, Arqueiro,
   Curandeiro, Mago, Centro) existem apenas para organização e controle de nós.
   Para toda finalidade de jogo é uma única árvore conectada.
2. **NÃO existem nós de ligação entre ramificações.** O tipo `link` está
   proibido na árvore oficial (a validação falha se houver um). Transições entre
   temas acontecem por arestas normais e pela região central.
3. **Nós de jogador** (`player`):
   - São os pontos de partida. Existem 7: o central (`centro-start`) e um por
     seção de classe (`<secao>-start`).
   - Podem ser adquiridos **a qualquer momento** (sempre acessíveis, sem
     exigência de adjacência).
   - Custo escalonado: o 1º é **gratuito**, o 2º custa **1**, o 3º custa **2**,
     e assim por diante. Essa mecânica está na página `/arvore`
     (`TalentTreePlayerPage`), não no JSON — no JSON o nó de jogador não tem
     custo próprio.
4. **Pontos de talento** do personagem = Divindade × 5.

## Progressão espacial (fraco → forte)

- **Centro (r 0–650):** o nó de jogador central leva a uma progressão:
  - Anel A (r≈250): vantagens mínimas — `+2 esquiva`, `+2 Valor de Bloqueio`,
    `+5 vida`, `+5 IEP`, `+1 PC`, `+2 resistência`. Os nós do anel A são
    conectados em círculo (permite pivotar cedo).
  - Anel B (r≈470): habilidades/magias **fracas** (custo baixo em PC/IEP, efeito
    pequeno) apontando na direção da seção correspondente.
  - Anel C (r≈640): 1 nó de atributo de entrada → conecta ao `path3` da seção.
  - O centro **nunca** conecta diretamente a uma seção sem passar pela
    progressão A → B → C.
- **Seções (r 750–1500):** trilha de atributos (`path3` interno → `start` da
  classe em r=1500) e clusters internos fracos/utilitários.
- **Borda externa (r 1500–2300):** quanto mais externo, mais forte.
  - Habilidades tier 1 (+1 atributo) perto do início da seção.
  - Tier 2 (+2 atributos, custo 1–2) mais fora.
  - Capstones (custo 2) a r≈1950–2100.
  - Nós Supremos (custo 3, pacotes de efeitos) no extremo, r≈2250.

## Clusters

Um cluster é um grupo de 6–10 nós com uma temática (ex.: "Fúria", "Assassinato",
"Armas Pesadas"). Regras:

- **Cluster aberto:** 2+ entradas. Chegar por um caminho pode custar X e por
  outro X−2, dependendo de quantos nós o jogador já pegou no caminho. Ex.: no
  Guerreiro, o cluster Armas Pesadas tem entrada pelo `start` e entradas
  laterais pelos clusters Fúria (`f4→w4`) e Sangue (`s4→w5`).
- **Cluster fechado:** 1 entrada única (ex.: clusters internos de Sense,
  Bruiser, Mobilidade).
- Anatomia típica: 1–2 atributos de entrada (portões) → habilidade tier 1 →
  atributos intermediários → stat/bônus → tier 2 → capstone no fundo.
- **Cluster de Sense é OBRIGATÓRIO em toda seção** (validação exige ≥2 nós de
  atributo `sense` + ≥1 nó de perícia na seção): 2 atributos Sense + 1–2
  perícias de Sense (Percepção, Investigação, Discernimento…). Motivo: perícias
  de Sense terão limitação futura ligada à árvore (ainda não implementada).

## Regras de balanceamento

- **Nós de atributo:** sempre FIXOS (`attribute` definido, nunca `null`),
  valor +1. São os "nós de viagem" que formam os caminhos.
- **Toda habilidade (`combatAbility`) e magia (`magic`) DÁ atributos** via
  `attributeBonuses`, escalando com o investimento necessário para alcançá-la:
  - ~3 pontos de caminho → +1 atributo
  - ~5–7 pontos → +2 atributos
  - capstone (~8+ pontos, custo 2) → +3 atributos
- **Custo por nó:** padrão 1 (implícito, não escreva no JSON). `cost: 2` para
  capstones, `cost: 3` para Nós Supremos. Jogador = 0 (escalonamento na página).
- Use os `id`s reais de `src/data/combatSkills.ts` e `src/data/spells.ts` —
  helpers `ability(id, bonuses)` e `magic(id, bonuses)` falham se o id não
  existir. Evite repetir a mesma habilidade em duas seções.

## Tipos de nó disponíveis

| Tipo | Uso | Observações |
|---|---|---|
| `player` | Início de seção | Custo dinâmico (escalonado na página) |
| `attribute` | Caminhos | Fixo, +1; `value` maior só em casos especiais |
| `magic` | Concede magia completa (tabela de níveis) | Requer `attributeBonuses` |
| `combatAbility` | Concede habilidade do livro | Requer `attributeBonuses` |
| `stat` | +vida/iep/pc/resistência/esquiva | Vantagens simples |
| `extraDamage` | Dano extra por alvo (`melee`, `projeteis`, `magias`, tags…) | |
| `healing` | Bônus de cura (geral ou por elemento) | |
| `weaponBonus` | Bônus se arma equipada tem tag (dano, ameaça, crítico, acerto) | |
| `spellModifier` | Modifica magias por tipo/elemento (custo, dano, duração, projétil) | |
| `defenseBonus` | Redução de dano (físico/elemental/todos) | |
| `skillBonus` | +X numa perícia | Use nos clusters de Sense |
| `conditional` | "Nó com script": condições de equipamento → lista de efeitos | Sem condições = sempre ativo (use p/ Nós Supremos) |
| `link` | **PROIBIDO na árvore oficial** | Existe no builder para outros usos |

Efeitos de `conditional`: `attributeBonus`, `statBonus`, `extraDamage`,
`defense`, `blockBonus`, `healingBonus`, `spellModifier`, `custom` (texto livre
para mecânicas ainda não automatizadas).

## Geometria

- Coordenadas por seção: locais `{ r, t }` → `pos(angle, r, t)` converte para
  x/y globais. `r` = distância do centro; `t` = deslocamento tangencial
  (negativo = um lado, positivo = outro).
- Ângulos das seções (SVG, y para baixo): Guerreiro −120°, Rogue −60°,
  Arqueiro 0°, Mago 60°, Curandeiro 120°, Tank 180°.
- `start` de cada seção em r=1500. Espaçe nós ≥120 unidades para não sobrepor
  (raio visual do nó ≈ 34; atributos ≈ 17).

## Como adicionar/expandir uma seção (passo a passo)

1. Abra `scripts/generateTalentTree.ts`.
2. Para seções grandes, siga o modelo de `GUERREIRO`/`ROGUE`: um `SectionSpec`
   com `nodes` (chave → `{ r, t, data, cost? }`) e `edges` (pares de chaves).
3. Monte clusters com os padrões acima; garanta o cluster de Sense.
4. Conecte a seção à central apenas via `path3` (o gerador já faz isso pelos
   `CENTER_SPOKES`).
5. Incremente `TREE_VERSION`.
6. Rode `npm run generate:tree`. Corrija qualquer erro de validação:
   - ids duplicados, arestas para nós inexistentes, nós inalcançáveis
   - habilidade/magia sem `attributeBonuses`
   - atributo sem valor fixo
   - nó `link` presente
   - seção sem cluster de Sense
7. Confira o resumo impresso (nós e custo total por seção) para balancear:
   seções equivalentes devem ter custo total semelhante.
8. Commit do `.ts` + `.json` juntos.

## Estado atual (v2)

- Guerreiro e Rogue: seções completas (37 nós cada, 5 clusters cada).
- Tank, Arqueiro, Curandeiro, Mago: esqueleto (21 nós) + cluster de Sense —
  expandir seguindo o modelo de Guerreiro/Rogue.
- Centro: 19 nós (1 jogador + 6 raios de progressão A/B/C).
