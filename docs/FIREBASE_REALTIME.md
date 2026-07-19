# Firebase em tempo real

Esta branch usa Cloud Firestore para manter a árvore de talentos sincronizada entre todos os navegadores. Cada nó e cada aresta são documentos independentes, portanto pessoas editando partes diferentes da árvore não sobrescrevem o arquivo inteiro.

## 1. Registrar o aplicativo Web

No [Firebase Console](https://console.firebase.google.com/), abra o projeto existente e acesse **Configurações do projeto > Seus aplicativos**.

1. Registre um aplicativo Web (`</>`), caso ainda não exista.
2. Em **Configuração do SDK**, selecione `Config`.
3. Copie `.env.example` para `.env.local`.
4. Preencha as variáveis `VITE_FIREBASE_*` usando os valores do objeto `firebaseConfig`.

O objeto de configuração Web não é uma senha. A proteção dos dados é feita pelas regras do Firestore e pela autenticação.

## 2. Habilitar os produtos necessários

No Firebase Console:

1. Acesse **Build > Firestore Database** e crie um banco em modo de produção. Escolha uma região próxima dos usuários; essa região não pode ser alterada depois.
2. Acesse **Build > Authentication > Sign-in method** e habilite **Google**.
3. Em **Authentication > Settings > Authorized domains**, confirme `localhost` e adicione o domínio publicado.

A página `/arvore` é pública e carrega a versão publicada da árvore sem exigir login. A página `/talent-tree-builder` só monta e carrega o editor depois de o Firebase confirmar o login e a autorização do usuário. Se a conta Google estiver autenticada, mas não tiver papel de edição, o aplicativo volta imediatamente para a página inicial (`/`).

## 3. Autorizar usuários

Depois que uma pessoa tentar entrar com Google pela primeira vez, copie o UID em **Authentication > Users**. No Firestore, crie manualmente o documento `users/{UID}`:

```json
{
  "active": true,
  "role": "editor",
  "canSaveCharacters": true,
  "email": "pessoa@exemplo.com",
  "displayName": "Nome opcional"
}
```

Papéis disponíveis:

- `viewer`: não pode editar a árvore; também não pode salvar fichas por padrão;
- `editor`: também pode abrir `/talent-tree-builder` e alterar nós, arestas e metadados;
- `admin`: atualmente possui o mesmo acesso à árvore que `editor` e está reservado para futuras telas administrativas.

O campo `canSaveCharacters` é uma permissão independente. Somente o valor booleano `true` permite carregar e salvar fichas no Firebase. Campo ausente, `false` ou texto `"true"` não concede acesso. Uma pessoa nunca pode ler a coleção de fichas de outro usuário.

Combinações comuns:

- somente visualizar a árvore: `role: "viewer"` e `canSaveCharacters: false`;
- jogador que salva fichas, sem editar a árvore: `role: "viewer"` e `canSaveCharacters: true`;
- somente editar a árvore: `role: "editor"` e `canSaveCharacters: false`;
- editar a árvore e salvar fichas: `role: "editor"` e `canSaveCharacters: true`.

### Dar as duas permissões a partir de um e-mail

1. Peça para a pessoa entrar uma vez no site para que a conta seja criada no Firebase Authentication.
2. No Firebase Console, abra **Build > Authentication > Users**.
3. Localize o e-mail e copie o valor da coluna **User UID**. O e-mail não deve ser usado como ID do documento.
4. Abra **Build > Firestore Database > Data**.
5. Entre na coleção `users`. Se ela não existir, clique em **Start collection** e informe `users`.
6. Crie ou edite o documento cujo **Document ID** seja exatamente o UID copiado.
7. Adicione os campos abaixo, respeitando os tipos:
   - `active`: boolean, `true`;
   - `role`: string, `editor`;
   - `canSaveCharacters`: boolean, `true`;
   - `email`: string, o e-mail da pessoa;
   - `displayName`: string, opcional.
8. Salve o documento. A permissão é atualizada em tempo real; se a navbar não mudar, saia e entre novamente.

Para revogar o acesso imediatamente, altere `active` para `false` ou exclua o documento. Os documentos de permissão só podem ser administrados pelo Firebase Console ou por um backend usando Admin SDK; o cliente não pode conceder permissão a si mesmo.

## 4. Publicar as regras

As regras em `firestore.rules` permitem leitura pública da árvore, mas exigem login Google e consultam `users/{uid}` em toda gravação da árvore e em todo acesso às fichas privadas. Mesmo que alguém modifique o JavaScript no navegador, o Firestore continuará bloqueando editores inativos ou sem o papel necessário. Para as fichas, as regras também validam o UID proprietário, o timestamp gerado pelo servidor e um intervalo mínimo de 30 segundos entre atualizações do mesmo documento.

```powershell
npx firebase-tools login
npx firebase-tools use SEU_PROJECT_ID
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

Se preferir, copie o conteúdo de `firestore.rules` para **Firestore Database > Rules** no Console e clique em **Publish**.

## 5. Executar e criar a árvore remota

```powershell
npm run dev
```

Entre com uma conta que possua papel `editor` e abra `/talent-tree-builder`. No primeiro acesso, use **Importar** para carregar `src/data/defaultTalentTree.json` ou outro JSON exportado pelo projeto. A importação será enviada ao Firestore e, a partir daí, ele passa a ser a única fonte compartilhada entregue pelas páginas protegidas.

A árvore padrão não é incluída nos chunks das páginas de produção; o Firestore é a fonte publicada. Se o documento remoto estiver vazio, leitores verão uma árvore vazia até um editor fazer a importação inicial.

O identificador `VITE_FIREBASE_TREE_ID` funciona como uma sala. Todos os deployments com `official` acessam a mesma árvore. Use outro valor para criar um ambiente de teste independente, por exemplo `staging`.

## 6. Configurar o deploy

Cadastre as mesmas variáveis `VITE_FIREBASE_*` no provedor que publica o site (por exemplo, **Vercel > Project Settings > Environment Variables**) e faça um novo deploy. Variáveis Vite são incorporadas durante o build, então alterar apenas o Console do provedor sem reconstruir não atualiza o aplicativo.

Também adicione os domínios publicados em **Authentication > Settings > Authorized domains**, caso o Firebase não os tenha incluído automaticamente.

## 7. Salvar e recuperar fichas

A página inicial continua disponível sem login e mantém o salvamento local existente. A barra superior da própria ficha permite:

1. clicar em **Salvar ficha** para criar ou atualizar a ficha ativa no Firestore;
2. abrir o seletor para receber somente o nome e o nível de divindade das fichas salvas;
3. selecionar uma ficha para buscar exclusivamente o documento completo dela;
4. escolher **+ Criar Novo Personagem** no mesmo seletor;
5. excluir a ficha ativa depois do mesmo intervalo mínimo de 30 segundos;
6. atualizar a lista manualmente, evitando manter um listener de fichas completas aberto.

O botão apresenta uma contagem regressiva de 30 segundos depois de cada salvamento. Esse bloqueio visual é apenas uma conveniência; a regra do Firestore usa `request.time`, o relógio do servidor, como autoridade. O intervalo é individual por ficha, então salvar uma ficha não impede o salvamento de outra.

Somente contas simultaneamente autenticadas, ativas e com `canSaveCharacters: true` recebem os controles de nuvem. A ficha é gravada em `users/{uid}/characters/{characterId}` junto de `updatedAt` e `updatedBy`.

O salvamento é diferencial: campos inalterados não são enviados novamente, arrays são reenviados somente quando mudam e clicar em salvar sem alterações não produz nenhuma escrita nem inicia cooldown. O avatar otimizado fica isolado em `characterAssets/avatar` e só é escrito quando seu hash muda. A troca do avatar e o patch da ficha usam um batch atômico.

A coleção `characterSummaries` contém apenas nome, divindade e metadados mínimos. Ela só recebe escrita na criação da ficha ou quando nome ou divindade mudam. A consulta inicial nunca baixa inventário, notas, atributos nem avatar.

Para reduzir leituras repetidas, os resumos ficam em `sessionStorage` por 60 segundos e as cinco últimas fichas completas ficam em um cache LRU no IndexedDB por até cinco minutos. O cache é separado por UID, não cria escritas adicionais no Firestore e é invalidado ao salvar ou excluir. Logout, troca de conta e revogação de `canSaveCharacters` removem o cache privado do usuário. Dentro da mesma sessão, uma ficha já aberta também é reutilizada diretamente da memória.

O projeto não depende do Cloud Storage para as imagens. Desde fevereiro de 2026 esse produto exige o plano Blaze; manter o avatar em um documento separado do Firestore preserva a compatibilidade com o plano Spark e evita reenviar o Base64 nas alterações comuns da ficha.

## 8. Validar a colaboração

1. Autorize duas contas Google como `editor` e abra `/talent-tree-builder` em dois navegadores.
2. Aguarde o indicador **Sincronizado em tempo real** nos dois.
3. Edite o nome de um nó em uma janela e confirme a atualização na outra.
4. Arraste um nó e solte. A interface move o SVG localmente durante o arraste e grava a nova posição no Firestore somente no drop.
5. Crie e remova uma ligação e confirme o resultado na outra janela.

## Estrutura no Firestore

```text
users/{uid}                                autorização, estado e papel do usuário
  characterSummaries/{characterId}        nome e divindade usados na lista leve de fichas
  characters/{characterId}                ficha privada, autor e horário do salvamento
    characterAssets/avatar                imagem otimizada, hash e tipo do avatar
talentTrees/{VITE_FIREBASE_TREE_ID}       metadados da árvore
  nodes/{nodeId}                          conteúdo, posição e imagem do nó
  edges/{edgeId}                          ligação entre dois nós
```

As imagens já são reduzidas antes do salvamento. Os índices automáticos das fichas e dos assets são desativados em `firestore.indexes.json`, pois o aplicativo não consulta seus campos; isso reduz armazenamento e fanout de escrita. Documentos do Firestore possuem limite de 1 MiB.

## Operação e retorno seguro

- A visualização `/arvore` é pública; apenas o builder é protegido.
- Usuários autenticados sem papel `editor` ou `admin` são redirecionados de `/talent-tree-builder` para `/`, onde podem trocar de conta pela navbar.
- O salvamento local da ficha continua funcionando sem Firebase; somente o salvamento e carregamento na nuvem exigem autorização.
- Depois da autorização, o estado em memória do Zustand mantém a interface responsiva durante falhas temporárias de rede; ele é limpo no logout ou na revogação, e as regras do Firestore continuam sendo a autoridade.
- `Ctrl+S` força uma republicação da árvore atual.
- A branch funcional anterior continua em `feat/skill-tree-creation`.
- Para abandonar a integração, volte para ela com `git switch feat/skill-tree-creation`.

## Referências oficiais

- [Adicionar Firebase a um projeto Web](https://firebase.google.com/docs/web/setup)
- [Atualizações em tempo real com Cloud Firestore](https://firebase.google.com/docs/firestore/query-data/listen)
- [Autenticação Google na Web](https://firebase.google.com/docs/auth/web/google-signin)
- [Observar o estado do usuário autenticado](https://firebase.google.com/docs/auth/web/manage-users)
- [Regras de segurança do Firestore](https://firebase.google.com/docs/firestore/security/rules-conditions)
- [Horário do servidor em regras do Firestore](https://firebase.google.com/docs/reference/rules/rules.firestore.Request)
- [Limites do Cloud Firestore](https://firebase.google.com/docs/firestore/quotas)
- [Isenções de índices do Cloud Firestore](https://firebase.google.com/docs/firestore/query-data/index-overview)
- [Requisitos de plano do Cloud Storage](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024)
