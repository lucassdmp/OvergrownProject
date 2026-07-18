# Guia de Criação da Árvore de Talento — OverGrown

Documento de referência para humanos e modelos de IA que forem criar ou expandir
a Árvore de Talento oficial do OverGrown. Siga estas regras à risca; a validação
do gerador rejeita árvores que as violem.

## Arquivos relevantes

| Arquivo                                             | Papel                                                                           |
| --------------------------------------------------- | ------------------------------------------------------------------------------- |
| `scripts/generateTalentTree.ts`                     | Fonte da verdade do DESIGN. Edite aqui e regenere.                              |
| `src/data/defaultTalentTree.json`                   | Arquivo oficial gerado. Carregado automaticamente por versão. NÃO edite à mão.  |
| `src/types/talentTree.ts`                           | Tipos de nó, factories (`defaultNodeData`), custo (`talentNodeCost`), tooltips. |
| `src/features/talentTree/defaultTree.ts`            | Auto-load da árvore oficial (por `version`).                                    |
| `src/features/character/hooks/useCharacterStats.ts` | Como cada tipo de nó vira stats na ficha.                                       |
| `src/data/combatSkills.ts` / `src/data/spells.ts`   | Habilidades e magias do livro (use os `id`s daqui).                             |

Fluxo: editar specs no gerador → `npm run generate:tree` → validação roda →
JSON atualizado → commit/deploy → páginas `/arvore` e `/talent-tree-builder`
carregam a versão oficial quando ela é mais nova que a árvore local. Incremente
`TREE_VERSION` a cada publicação.

## Conceitos fundamentais

1. **As classes são árvores independentes.** Guerreiro, Rogue, Tank, Arqueiro,
   Curandeiro e Mago ocupam componentes separados e distantes. Não existe mais
   região ou jogador central.
2. **NÃO existem nós de ligação entre ramificações.** O tipo `link` está
   proibido na árvore oficial (a validação falha se houver um). Ligações entre
   classes só serão reintroduzidas em uma revisão futura explícita.
3. **Nós de jogador** (`player`):
   - São os pontos de partida. Existem 6, um por classe (`<secao>-start`).
   - Podem ser adquiridos **a qualquer momento** (sempre acessíveis, sem
     exigência de adjacência).
   - Custo escalonado: o 1º é **gratuito**, o 2º custa **1**, o 3º custa **2**,
     e assim por diante. Essa mecânica está na página `/arvore`
     (`TalentTreePlayerPage`), não no JSON — no JSON o nó de jogador não tem
     custo próprio.
4. **Pontos de talento** do personagem = `5 × (Divindade + 1)`. Assim, DIV 0
   começa com 5 pontos, DIV 1 possui 10 e DIV 100 possui 505, conforme o livro.

## Progressão espacial (fraco → forte)

- O jogador ocupa o núcleo da árvore de sua classe.
- Uma pequena órbita oferece saídas em direções diferentes ao redor do jogador.
- Troncos curvos crescem em 360°, bifurcam em raízes e galhos laterais.
- Algumas raízes são terminais; outras reencontram troncos vizinhos ou formam
  circuitos opcionais. Evite anéis concêntricos e caminhos paralelos uniformes.
- Arestas podem reconectar fluxos, mas nunca devem cruzar outra aresta. O
  validador rejeita qualquer cruzamento geométrico dentro do Guerreiro.
- Caminhos temáticos atravessam a rede de atributos e podem reconectar fluxos.
- Capstones custam 2 e Nós Supremos custam 3.
- Cada classe final deverá ter pelo menos 100 nós de atributo. Todas precisam de
  pelo menos 10 nós de Sense; Rogue e Arqueiro precisam de pelo menos 30.

## Regiões de transição

As ligações entre classes estão desativadas. O gerador exige seis componentes
isolados, cada um contendo exatamente um nó de jogador. Futuras transições não
devem ser antecipadas enquanto a fantasia interna de cada classe estiver sendo
reescrita.

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
- **Não use nós de perícia.** O tipo continua no editor por compatibilidade, mas
  a validação rejeita `skillBonus` na árvore oficial.
- Sense é representado somente por nós de atributo: mínimo 10 por classe e 30
  para Rogue e Arqueiro.
- **Nunca conecte duas habilidades diretamente.** Habilidades independentes são
  destinos espalhados por regiões diferentes e precisam de atributos/efeitos no
  caminho para justificar a viagem do jogador.
- Quando o livro exigir uma habilidade anterior, crie uma subárvore exclusiva:
  habilidade-base → portões de atributo → habilidade dependente. Remover a
  habilidade-base deve cortar todo caminho entre a dependente e o jogador.
- Requisitos de atributo, equipamento e perícia escritos no livro são somente
  diretrizes de força e posicionamento. O campo `skillRequirement` da árvore
  contém apenas nomes de habilidades dependentes; sem dependência, ele é omitido.

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

| Tipo            | Uso                                                                | Observações                                        |
| --------------- | ------------------------------------------------------------------ | -------------------------------------------------- |
| `player`        | Início de seção                                                    | Custo dinâmico (escalonado na página)              |
| `attribute`     | Caminhos                                                           | Fixo, +1; `value` maior só em casos especiais      |
| `magic`         | Concede magia completa (tabela de níveis)                          | Requer `attributeBonuses`                          |
| `combatAbility` | Concede habilidade do livro                                        | Requer `attributeBonuses`                          |
| `stat`          | +vida/iep/pc/resistência/esquiva                                   | Vantagens simples                                  |
| `extraDamage`   | Dano extra por alvo (`melee`, `projeteis`, `magias`, tags…)        |                                                    |
| `healing`       | Bônus de cura (geral ou por elemento)                              |                                                    |
| `weaponBonus`   | Bônus se arma equipada tem tag (dano, ameaça, crítico, acerto)     |                                                    |
| `spellModifier` | Modifica magias por tipo/elemento (custo, dano, duração, projétil) |                                                    |
| `defenseBonus`  | Redução de dano (físico/elemental/todos)                           |                                                    |
| `skillBonus`    | +X numa perícia                                                    | **PROIBIDO na árvore oficial**                     |
| `conditional`   | "Nó com script": condições de equipamento → lista de efeitos       | Sem condições = sempre ativo (use p/ Nós Supremos) |
| `link`          | **PROIBIDO na árvore oficial**                                     | Existe no builder para outros usos                 |

### Identidade visual dos atributos

Todos os atributos usam o mesmo símbolo SVG de adição mítica. A forma nunca
muda; somente a cor identifica o atributo:

- Might: vermelho
- Grace: verde
- Wisdom: azul
- Fortitude: amarelo
- Sense: branco

Efeitos de `conditional`: `attributeBonus`, `statBonus`, `extraDamage`,
`defense`, `blockBonus`, `healingBonus`, `spellModifier`, `custom` (texto livre
para mecânicas ainda não automatizadas).

## Geometria

- Seções antigas usam coordenadas `{ r, t }` acrescidas de um afastamento radial
  global. Novas seções devem seguir a rede orgânica de `buildWarrior()`.
- Ângulos das seções (SVG, y para baixo): Guerreiro −120°, Rogue −60°,
  Arqueiro 0°, Mago 60°, Curandeiro 120°, Tank 180°.
- O Guerreiro está isolado a 8000 unidades do centro global; as demais classes
  provisórias permanecem a aproximadamente 5000. Espaçe nós ≥100 unidades; a
  validação rejeita distâncias inferiores a 80.

## Como adicionar/expandir uma seção (passo a passo)

1. Abra `scripts/generateTalentTree.ts`.
2. Para novas seções grandes, siga `buildWarrior()`: órbita inicial, troncos
   curvos, bifurcações, raízes terminais, atalhos e reconexões temáticas.
3. Garanta ≥100 atributos e o mínimo de Sense da classe, sem `skillBonus`.
4. Não conecte a seção a outra classe.
5. Incremente `TREE_VERSION`.
6. Rode `npm run generate:tree`. Corrija qualquer erro de validação:
   - ids duplicados, arestas para nós inexistentes, nós inalcançáveis
   - habilidade/magia sem `attributeBonuses`
   - atributo sem valor fixo
   - nó `link` presente
   - nó de perícia presente
   - quantidade mínima de atributos/Sense da classe em revisão
7. Confira o resumo impresso (nós e custo total por seção) para balancear:
   compare custos somente depois que as classes envolvidas forem reescritas.
8. Commit do `.ts` + `.json` juntos.

## Estado atual (v8)

- Guerreiro refeito: 152 nós, sendo 113 de atributo e exatamente 10 de Sense.
  A fantasia enfatiza Might, Fortitude, vida, dano sustentado, fúria, armas e
  sobrevivência prolongada. Esquiva e VB existem de modo deliberadamente raro.
- O Guerreiro possui oito troncos curvos, uma órbita inicial, oito raízes,
  terminais, reconexões e cinco grupos temáticos distribuídos pela malha.
- Habilidades independentes estão distribuídas pela rede. Fúria concentra apenas
  Fúria Descontrolada, Instinto Sanguinário e Pisada de Impacto atrás de portões;
  Vício em Sangue é o único acesso a Sede de Sangue.
- A geometria do Guerreiro não possui cruzamentos entre caminhos.
- A malha do Guerreiro foi compactada em 25%, preservando sua topologia e
  aproximando os nós sem sobreposição.
- Não existe região central; as seis classes são componentes independentes.
- Todos os nós de perícia foram removidos da árvore oficial.
- Builder e tela do jogador possuem busca sem acentos. Nós que não correspondem
  a todas as palavras pesquisadas permanecem visíveis, porém acinzentados.
- Rogue, Tank, Arqueiro, Curandeiro e Mago permanecem provisórios e serão
  ampliados em rodadas próprias. Não use seus tamanhos atuais como referência de
  balanceamento final.
- O gerador continua exigindo que todas as habilidades do capítulo melee
  apareçam exatamente uma vez. O catálogo editorial mantém os requisitos do
  livro sincronizados, enquanto a árvore deriva deles somente as dependências
  entre habilidades.
