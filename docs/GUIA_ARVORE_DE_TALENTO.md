# Guia da Árvore de Talentos - OverGrown

A árvore é um artefato autoral. Não existe gerador de topologia: conteúdo, posição, conexões e progressão são editados visualmente no builder.

## Fonte da verdade

| Arquivo                                               | Papel                                                          |
| ----------------------------------------------------- | -------------------------------------------------------------- |
| `src/data/defaultTalentTree.json`                     | Árvore oficial carregada pelo site e salva pelo builder local. |
| `src/types/talentTree.ts`                             | Tipos, tiers, pré-requisitos, condições e efeitos.             |
| `src/features/talentTree/store/talentTreeStore.ts`    | Estado e serialização determinística.                          |
| `src/features/talentTree/useLocalTreeFileAutosave.ts` | Debounce, fila de gravação, estado visual e `Ctrl+S`.          |
| `vite.config.ts`                                      | Endpoint local que valida e grava o JSON no projeto.           |
| `src/features/talentTree/defaultTree.ts`              | Carregamento da árvore embarcada e migração de saves.          |

## Edição e salvamento

1. Inicie o projeto com `npm run dev`.
2. Abra `/talent-tree-builder`.
3. Edite, mova, conecte, importe ou remova nós normalmente.
4. Qualquer alteração agenda um salvamento automático após 500 ms sem novas mudanças.
5. `Ctrl+S` ou `Cmd+S` cancela o debounce e salva imediatamente.
6. O indicador do cabeçalho informa se existem alterações pendentes, gravação em andamento, sucesso ou erro.

O servidor local aceita somente `POST /__overgrown/talent-tree`, valida a estrutura, IDs únicos e referências das conexões e grava exclusivamente em `src/data/defaultTalentTree.json`. O cliente não escolhe caminhos do sistema de arquivos. Quando o conteúdo realmente muda, o servidor incrementa `version`; salvar novamente sem alterações preserva a versão existente.

Este recurso é intencionalmente local. Em builds de produção o endpoint não existe e a árvore embarcada é somente leitura. O botão de exportar ficha + árvore continua disponível como backup portável, mas não é o mecanismo de publicação da árvore oficial.

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

Depois inspecione `/arvore` e `/talent-tree-builder`, verificando busca, zoom, aquisição, dependências, movimentação, conexões e o indicador de autosave. Confirme no Git que somente as alterações pretendidas em `src/data/defaultTalentTree.json` foram registradas.
