# Guia da Árvore de Talentos - OverGrown

A árvore é um artefato autoral. Não existe gerador de topologia: conteúdo, posição, conexões e progressão são editados visualmente no builder.

## Fonte da verdade

| Arquivo                                               | Papel                                                          |
| ----------------------------------------------------- | -------------------------------------------------------------- |
| `src/data/defaultTalentTree.json`                     | Árvore oficial carregada pelo site e salva pelo builder local. |
| `src/types/talentTree.ts`                             | Tipos, tiers, pré-requisitos, condições e efeitos.             |
| `src/features/talentTree/store/talentTreeStore.ts`    | Estado e serialização determinística.                          |
| `src/features/talentTree/useLocalTreeFileAutosave.ts` | Debounce, fila de gravação e estado visual do autosave.        |
| `vite.config.ts`                                      | Endpoint local que valida e grava o JSON no projeto.           |
| `src/features/talentTree/defaultTree.ts`              | Carregamento da árvore embarcada e migração de saves.          |

## Edição e salvamento

1. Inicie o projeto com `npm run dev`.
2. Abra `/tree-builder`.
3. Edite, mova, conecte, importe ou remova nós normalmente.
4. Qualquer alteração agenda um salvamento automático após 500 ms sem novas mudanças.
5. Nenhum atalho é necessário: após 600 ms sem novas mudanças, o arquivo é salvo automaticamente.
6. O indicador do cabeçalho informa se existem alterações pendentes, gravação em andamento, sucesso ou erro.

O servidor local usa `GET /__overgrown/talent-tree` para abrir sempre o arquivo atual e `POST /__overgrown/talent-tree` para salvá-lo. Ele valida a estrutura, IDs únicos e referências das conexões e grava exclusivamente em `src/data/defaultTalentTree.json`. O cliente não escolhe caminhos do sistema de arquivos. Quando o conteúdo realmente muda, o servidor incrementa `version`; salvar novamente sem alterações preserva a versão existente.

No build, o Vite copia a árvore para `dist/defaultTalentTree.json`, equivalente a um asset público. O site hospedado busca esse arquivo em `/arvore` e `/tree-builder`; o builder não consegue sobrescrever o servidor, mas permite exportar o JSON editado. A URL antiga `/talent-tree-builder` redireciona para `/tree-builder`.

## Arquitetura visual

As cinco fantasias permanecem em um único mapa:

```text
        Guerreiro       Rogue

   Tank                       Arqueiro

               Wisdom
```

Atributos principais:

- Guerreiro: Might.
- Rogue: Grace.
- Arqueiro: Sense.
- Wisdom: Wisdom.
- Tank: Fortitude.

A topologia deve ser desenhada de forma autoral. Evite repetir a mesma disposição entre classes, aglomerados sem leitura, estrelas radiais e sequências longas sem decisões. Cada região precisa ter silhueta, ritmo, loops, terminais e ramificações próprios da fantasia representada.

## Clusters e progressão

Um cluster deve expressar uma escolha reconhecível:

```text
caminho básico -> especialização -> notável -> keystone ou reconexão
```

- Nós iniciais introduzem a fantasia.
- Nós intermediários especializam equipamento, atributo ou condição.
- Nós profundos entregam efeitos mais fortes ou alteram o estilo de jogo.
- Habilidades independentes não devem ser conectadas diretamente.
- Dependências declaradas entre habilidades usam `prerequisiteNodeIds`.
- Requisitos de atributo do livro são diretrizes de posicionamento, não travas de aquisição.
- Evite terminais que concedam apenas `+1` de atributo.

## Tipos de nó

| Tipo            | Uso                                                   |
| --------------- | ----------------------------------------------------- |
| `player`        | Origem de uma classe.                                 |
| `attribute`     | Might, Grace, Wisdom, Fortitude ou Sense.             |
| `combatAbility` | Habilidade do livro e suas dependências.              |
| `magic`         | Magia completa e níveis.                              |
| `stat`          | Vida, IEP, PC, Resistência ou Esquiva.                |
| `extraDamage`   | Dado ou valor adicional de dano.                      |
| `weaponBonus`   | Bônus condicionado por tags de armas.                 |
| `defenseBonus`  | Redução de dano.                                      |
| `healing`       | Bônus de cura.                                        |
| `spellModifier` | Custo, dano, duração ou projéteis mágicos.            |
| `conditional`   | Efeitos funcionais condicionados a armas e armaduras. |

Condições suportam `weaponTagsAnyOf`, `weaponTagsAllOf`, `armorTagsAnyOf` e `requiresNoArmor`. O processamento funcional ocorre em `useCharacterStats`.

## Identidade visual dos atributos

Todos utilizam o mesmo símbolo de adição mítica:

- Might: vermelho.
- Grace: verde.
- Wisdom: azul.
- Fortitude: amarelo.
- Sense: branco.

## Verificação antes de publicar

Execute:

```bash
npm test
npm run type-check
npm run lint
npm run build
```

Depois inspecione `/arvore` e `/tree-builder`, verificando busca, zoom, aquisição, dependências, movimentação, conexões e o indicador de salvamento local. Confirme também que `src/data/defaultTalentTree.json` muda depois de editar a árvore no servidor Vite local e que o build contém `dist/defaultTalentTree.json`.
