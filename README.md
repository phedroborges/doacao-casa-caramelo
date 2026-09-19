# Doações Casa Caramelo

Plataforma multi-evento para campanhas de doação por PIX. Cada evento possui
período, participantes, metas, formulário, identidade visual, prêmios e card de
Instagram próprios, administrados pelo próprio site.

## Evento inicial

Na primeira execução, o banco recebe a **16ª LAF** já configurada:

- doações abertas até 24 de outubro de 2026, às 21h;
- oito atléticas divididas em Chave A e Chave B;
- meta padrão de 100 kg por atlética;
- R$ 5 equivalem a 1 kg e R$ 125 equivalem a um saco de 25 kg;
- Air Fryer Multi MF1300 de 4,4 litros e caixa de som como prêmios;
- Instagram `@casacaramelo.myn`;
- card vertical enviado pela bandeja nativa de compartilhamento do celular.

## O que o painel administra

Em `/admin`, o responsável pode:

- criar quantos eventos forem necessários;
- definir início, encerramento, publicação e evento principal;
- trocar textos, beneficiário, identidade, logos e cores;
- configurar a conta PIX, conversão em quilos e valores sugeridos;
- cadastrar participantes como atléticas, empresas, equipes ou outra categoria;
- enviar foto ou logo e definir meta específica por participante;
- adicionar campos extras de texto, seleção ou confirmação ao formulário;
- cadastrar, editar, ordenar, desativar ou remover prêmios;
- desativar completamente a premiação e/ou o compartilhamento;
- configurar a frase do Story e a recompensa por compartilhar;
- abrir o evento e o ranking;
- exportar as doações daquele evento em CSV.

O prazo é aplicado no servidor: após o encerramento, a API deixa de aceitar
doações mesmo que alguém permaneça com uma página antiga aberta.

## Rotas

- `/` — evento definido como principal;
- `/eventos` — catálogo de campanhas publicadas;
- `/evento/[slug]` — formulário de um evento;
- `/evento/[slug]/ranking` — placar daquele evento;
- `/ranking` — placar do evento principal;
- `/admin` — painel protegido;
- `/api/health` — saúde do banco e do volume persistente.

## Desenvolvimento local

Requer Node.js 22 ou mais recente e um projeto Supabase.

```bash
npm ci
cp .env.example .env.local   # preencha com os dados do seu projeto
npm run dev
```

`.env.local` precisa de duas variáveis, ambas públicas (a chave `publishable`
pode aparecer no navegador; quem protege os dados é o RLS do banco):

```text
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

### Banco

O schema está em `supabase/migrations/`. Para aplicar num projeto novo:

```bash
npx supabase login
npx supabase link --project-ref SEU-PROJECT-REF
npx supabase db push
```

### Primeiro acesso ao painel

O login usa **Supabase Auth**: a pessoa autentica com e-mail e senha e o app
confere se ela está em `public.admin_users`. Um usuário autenticado que não
esteja nessa tabela é deslogado — estar no Auth não basta.

Para liberar o primeiro acesso, siga `supabase/bootstrap-admin.sql`: criar a
conta em *Authentication > Users* (com **Auto Confirm User** ligado) e rodar o
`insert` daquele arquivo com o e-mail.

Comandos de validação:

```bash
npm run check
npm audit --omit=dev
node scripts/testar-pix.mjs
```

O servidor escuta em `0.0.0.0:3000`, permitindo acesso por outros dispositivos
na mesma rede em `http://IP-DO-COMPUTADOR:3000`.

## Persistência

Tudo vive no Supabase:

- **Postgres** — eventos, participantes, prêmios, campos e doações;
- **Storage** (bucket `event-media`) — imagens enviadas pelo painel.

Toda tabela tem RLS ligado. O público só lê eventos publicados e só consegue
inserir doações; leitura e edição de doações exigem estar em `admin_users`.

Confirmar uma doação e registrar o compartilhamento passam por funções
`SECURITY DEFINER` que exigem um **token de 64 caracteres** devolvido só a quem
criou a doação. O banco guarda apenas o hash SHA-256 desse token, então nem o
conteúdo do banco permite confirmar doação alheia. O linter do Supabase aponta
essas funções como executáveis por `anon` — é intencional: o doador não faz
login, e quem protege é o token.

Para exportar as doações de um evento, use o botão **Exportar doações CSV** no
painel, dentro do evento.

## Compartilhamento

O card é gerado no navegador em 1080×1920, usando os logos e textos do evento e
a imagem do participante. Em HTTPS, o botão envia a imagem pronta para a
bandeja nativa do celular. Android e iOS ainda exigem que a pessoa escolha o
Instagram e confirme a publicação; sites não podem publicar um Story sem essa
confirmação do usuário.

## Produção

O repositório inclui Dockerfile multiestágio, runtime standalone do Next.js,
health check e usuário sem privilégios. O procedimento completo está em
[DEPLOY-EASYPANEL.md](DEPLOY-EASYPANEL.md).

Configurações obrigatórias no Easypanel:

- domínio HTTPS (a bandeja de compartilhamento do celular só funciona em HTTPS);
- `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

Não há mais volume persistente nem limite de uma réplica: o estado todo está no
Supabase, então a aplicação pode escalar horizontalmente.

## Estrutura

```text
app/admin/              painel e ações administrativas
app/evento/             páginas públicas por evento
app/api/                doações, ranking, exportação e health check
components/             fluxo público, ranking e componentes visuais
lib/db.ts               consultas ao Supabase
lib/modelos.ts          contratos de eventos, participantes e doações
lib/auth.ts             login admin via Supabase Auth + admin_users
lib/uploads.ts          envio de imagens ao Storage
lib/supabase/           clientes de servidor e middleware
supabase/migrations/    schema, RLS e funções
supabase/bootstrap-admin.sql   libera o primeiro acesso ao painel
lib/pix.ts              geração e validação do BR Code PIX
lib/cardImagem.ts       geração do Story no navegador
```

## Segurança e operação

- Nunca commite `.env.local`; o `.gitignore` já cobre `.env*`.
- A senha do banco (`postgres://`) só é necessária para acesso direto; a
  aplicação não a usa. Se ela vazar, troque em *Settings > Database*.
- Acesso ao painel é concedido em `public.admin_users`, não por senha no código.
- Server Actions aceitam somente requisições da mesma origem.
- Imagens são limitadas a 5 MB e aos formatos JPG, PNG, WebP e GIF.
- O PIX ainda é confirmado pela própria pessoa; confira o total com o extrato.
- Backup: use os backups automáticos do próprio Supabase.
