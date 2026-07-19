# Firebase para autenticação e fichas

O Firebase não armazena nem sincroniza a árvore de talentos. A árvore oficial é o arquivo
`src/data/defaultTalentTree.json`; o Firestore é usado somente para autenticação, permissões,
administração e persistência opcional das fichas.

## Configuração

1. Registre o aplicativo Web no Firebase Console.
2. Copie `.env.example` para `.env.local` e preencha as variáveis `VITE_FIREBASE_*`.
3. Em **Authentication > Sign-in method**, habilite Google.
4. Crie o Firestore em modo de produção.
5. Adicione `localhost` e os domínios publicados em **Authentication > Settings > Authorized domains**.
6. Publique `firestore.rules` e `firestore.indexes.json`:

```powershell
npx firebase-tools login
npx firebase-tools use SEU_PROJECT_ID
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

## Permissões

Após o primeiro login, cada conta cria `users/{UID}` inativo e sem permissão de salvar fichas.
O primeiro administrador precisa ser configurado manualmente no Console:

```json
{
  "active": true,
  "role": "admin",
  "canSaveCharacters": true,
  "email": "pessoa@exemplo.com",
  "displayName": "Nome opcional"
}
```

Use o UID do Firebase Authentication como ID do documento, não o e-mail. Depois disso, a página
`/admin` permite gerenciar os demais usuários.

- `viewer`: não abre o builder; pode salvar fichas apenas com `canSaveCharacters: true`.
- `editor`: pode abrir `/talent-tree-builder` e editar o arquivo local quando o projeto roda via Vite.
- `admin`: possui o acesso de editor e pode abrir `/admin`.
- `canSaveCharacters`: permissão independente para carregar, salvar e excluir fichas no Firestore.

O builder continua protegido por login e papel `editor` ou `admin`. A visualização `/arvore` é
pública e lê somente o JSON incluído no build.

## Árvore local

Execute:

```powershell
npm run dev
```

Ao abrir o builder ou `/arvore`, `src/data/defaultTalentTree.json` é lido diretamente pelo servidor
Vite local, sem estado persistido da árvore no navegador. Criar, editar, arrastar, conectar ou
remover um nó agenda um salvamento depois de 600 ms sem novas alterações.
O servidor Vite valida a estrutura, limita o payload a 8 MiB, incrementa `version` quando o
conteúdo muda e substitui exclusivamente esse arquivo. Não é necessário usar `Ctrl+S`.

Uma aplicação publicada não pode escrever de volta no repositório do qual seu bundle foi criado.
Em produção, a árvore é somente leitura até que uma nova versão de
`src/data/defaultTalentTree.json` seja enviada e publicada.

Não existem listeners, documentos, publicações ou chunks da árvore no Firestore. Dados antigos em
`talentTrees` podem permanecer como backup, mas as regras atuais não concedem acesso a eles e o
aplicativo não os consulta.

## Fichas locais e na nuvem

A ficha é persistida automaticamente no navegador pelo Zustand usando a chave
`overgrown-character-v2`. Esse salvamento local funciona sem login e sem Firebase.

Para uma conta autenticada, ativa e com `canSaveCharacters: true`, a barra da ficha também oferece
salvamento opcional no Firestore:

1. o seletor busca somente os resumos (nome e divindade);
2. a ficha completa é buscada apenas quando selecionada;
3. o botão **Salvar ficha** conclui a escrita imediatamente e então entra em cooldown por 30 segundos;
4. as regras usam o relógio do servidor para impor o mesmo intervalo;
5. alterações são enviadas diferencialmente e o avatar otimizado fica em documento separado;
6. resumos usam cache de sessão e as cinco fichas recentes usam cache LRU no IndexedDB.

Cada usuário acessa somente as próprias fichas:

```text
users/{uid}                                autorização, estado e papel
  characterSummaries/{characterId}        nome e divindade para a lista leve
  characters/{characterId}                ficha privada e metadados
    characterAssets/avatar                imagem otimizada da ficha
```

## Validação rápida

1. Rode `npm run dev` e entre com uma conta `editor` ou `admin`.
2. Edite ou arraste um nó e confirme o indicador `defaultTalentTree.json salvo`.
3. Confirme no Git que somente `src/data/defaultTalentTree.json` mudou devido à edição.
4. Recarregue `/arvore` e confira a árvore salva.
5. Na ficha, altere um campo, recarregue a página e confirme a persistência local.
6. Com `canSaveCharacters: true`, salve a ficha na nuvem e confirme o cooldown após a conclusão.

## Referências oficiais

- [Adicionar Firebase a um projeto Web](https://firebase.google.com/docs/web/setup)
- [Autenticação Google na Web](https://firebase.google.com/docs/auth/web/google-signin)
- [Regras de segurança do Firestore](https://firebase.google.com/docs/firestore/security/rules-conditions)
- [Limites do Cloud Firestore](https://firebase.google.com/docs/firestore/quotas)
