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

Requer Node.js 22 ou mais recente.

```bash
npm ci
npm run dev
```

Sem variáveis locais, o painel de desenvolvimento usa:

```text
usuário: admin
senha: admin-local
```

Para testar a build de produção por HTTP local, configure também
`AUTH_COOKIE_SECURE=false`. Em produção com HTTPS, mantenha o valor `true`.

Comandos de validação:

```bash
npm run check
npm audit --omit=dev
node scripts/testar-pix.mjs
```

O servidor escuta em `0.0.0.0:3000`, permitindo acesso por outros dispositivos
na mesma rede em `http://IP-DO-COMPUTADOR:3000`.

## Persistência

Eventos, configurações e doações ficam em SQLite dentro de
`data/casa-caramelo.sqlite`. As imagens enviadas pelo painel ficam em
`data/uploads`. Em produção, ambos residem no volume `/app/data`.

Se uma instalação antiga possuir `data/doacoes.json`, o conteúdo é importado
uma única vez para o evento da 16ª LAF. O arquivo original não é apagado.

Para exportar pelo terminal:

```bash
npm run export-csv -- 16-laf
```

O painel também possui o botão **Exportar doações CSV** em cada evento.

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

- volume persistente em `/app/data`;
- uma única réplica;
- domínio HTTPS;
- `ADMIN_PASSWORD` forte;
- `AUTH_SECRET` aleatório com pelo menos 32 caracteres.

## Estrutura

```text
app/admin/              painel e ações administrativas
app/evento/             páginas públicas por evento
app/api/                doações, ranking, exportação e health check
components/             fluxo público, ranking e componentes visuais
lib/db.ts               schema SQLite, seed, migração e consultas
lib/modelos.ts          contratos de eventos, participantes e doações
lib/auth.ts             sessão administrativa assinada
lib/uploads.ts          armazenamento seguro das imagens
lib/pix.ts              geração e validação do BR Code PIX
lib/cardImagem.ts       geração do Story no navegador
```

## Segurança e operação

- Nunca publique o conteúdo de `data/`; banco e uploads são ignorados pelo Git.
- O painel limita tentativas de login e usa cookie HttpOnly, SameSite e Secure.
- Server Actions aceitam somente requisições da mesma origem.
- Imagens são limitadas a 5 MB e aos formatos JPG, PNG, WebP e GIF.
- Use apenas uma réplica, pois o banco e os uploads estão em um volume local.
- Faça backup recorrente de todo o volume `/app/data`.
- O PIX ainda é confirmado pela própria pessoa; confira o total com o extrato.
