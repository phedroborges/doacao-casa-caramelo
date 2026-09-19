# Desafio Casa Caramelo — LAF Goiás

Aplicação mobile-first para arrecadar ração por PIX e acompanhar, em tempo real,
o desempenho das oito atléticas da LAF.

## Fluxo atual

- A doação no site é sempre por PIX.
- R$ 5 equivalem a 1 kg de ração.
- R$ 125 equivalem a um saco de 25 kg, o principal marco de doação.
- Cada atlética tem meta de 100 kg e pode ultrapassá-la.
- Qualquer doação concorre à Air Fryer; a partir de R$ 50 também concorre à
  caixa de som.
- Ao final, o celular abre a bandeja nativa de compartilhamento com uma imagem
  vertical pronta para o Instagram Stories.
- O Instagram oficial usado no card e no fluxo é `@casacaramelo.myn`.

> O navegador não permite escolher o Instagram ou publicar o Story sem ação do
> usuário. Em HTTPS, o botão abre a bandeja nativa com a imagem anexada; a pessoa
> escolhe o Instagram e confirma a publicação.

## Desenvolvimento local

Requer Node.js 22 ou mais recente.

```bash
npm ci
npm run dev
```

O servidor escuta em `0.0.0.0:3000`. Na mesma rede Wi-Fi, outros dispositivos
podem acessar `http://IP-DO-COMPUTADOR:3000`.

Rotas principais:

- `/` — fluxo de doação
- `/ranking` — placar para a TV do evento
- `/api/health` — saúde do servidor e acesso ao diretório persistente

Validações do projeto:

```bash
npm run typecheck
npm run build
npm audit --omit=dev
node scripts/testar-pix.mjs
```

## Dados e confirmação do PIX

As doações são persistidas em `data/doacoes.json`, ou no diretório definido por
`DATA_DIR`. A gravação é atômica e serializada dentro de um único processo.

Não há integração com o banco: o PIX é confirmado pela própria pessoa depois da
espera mínima. Portanto, o placar representa as doações declaradas. Antes de
fechar o evento, compare o extrato da conta com o CSV exportado:

```bash
npm run export-csv
```

O endpoint público não expõe a lista nominal de doadores. O ranking recebe
somente os totais agregados.

## Produção no Easypanel

O repositório inclui uma imagem Docker multiestágio, executada por usuário sem
privilégios, health check e volume de dados separado. Siga o passo a passo em
[DEPLOY-EASYPANEL.md](DEPLOY-EASYPANEL.md).

Resumo obrigatório:

- build pelo `Dockerfile` da raiz;
- porta interna `3000`;
- volume persistente montado em `/app/data`;
- exatamente uma réplica;
- domínio com HTTPS para habilitar o compartilhamento da imagem;
- backup recorrente do volume.

Para testar a mesma imagem localmente, quando Docker estiver instalado:

```bash
docker compose up --build
```

## Configuração da campanha

Os valores editáveis ficam em `lib/config.ts`:

- chave e dados do PIX;
- meta e conversão reais/quilos;
- Instagram da loja;
- valores sugeridos e valor do saco;
- regras dos sorteios;
- atléticas, chaves e escudos.

O código PIX inclui automaticamente o valor escolhido. Se algum banco não o
aceitar no evento, altere `PIX.valorEmbutidoNoQr` para `false`; o app passa a
usar o código estático configurado.

## Estrutura

```text
app/                    páginas e rotas HTTP
components/             telas do fluxo e componentes visuais
lib/config.ts           regras e dados da campanha
lib/db.ts               persistência e agregação do ranking
lib/pix.ts              geração do BR Code PIX
lib/cardImagem.ts       imagem 1080×1920 do Story
public/                 marcas, fontes, escudos e prêmios
scripts/                exportação CSV e teste do PIX
Dockerfile              imagem de produção para o Easypanel
```

## Operação segura

- Não publique `data/doacoes.json`; ele contém dados pessoais e está ignorado
  pelo Git.
- Comece o evento com um volume vazio ou com `[]` no arquivo de doações.
- Não use múltiplas réplicas: a fila de escrita é local ao processo.
- Faça backup do volume `/app/data` antes, durante e depois do evento.
- O app deve ser usado em HTTPS na internet. HTTP local serve para testes, mas
  pode bloquear o compartilhamento nativo de arquivos no celular.
