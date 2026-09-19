# Deploy no Easypanel

O estado da aplicação (eventos, doações, imagens, contas de admin) fica todo no
Supabase. O container é descartável: não precisa de volume e pode escalar.

## 1. Preparar o Supabase

Antes do primeiro deploy, o projeto precisa estar pronto:

1. **Schema aplicado.** Com o repositório em mãos:

   ```bash
   npx supabase login
   npx supabase link --project-ref SEU-PROJECT-REF
   npx supabase db push
   ```

2. **Bucket de imagens.** A migration já cria o bucket `event-media` com as
   políticas de upload restritas a administradores.

3. **Primeiro administrador.** Siga `supabase/bootstrap-admin.sql`: crie a conta
   em *Authentication > Users* com **Auto Confirm User** ligado e rode o
   `insert` daquele arquivo. Sem esse passo o painel `/admin` fica inacessível,
   porque estar no Auth não basta — é preciso estar em `public.admin_users`.

## 2. Criar o serviço

1. Crie um projeto no Easypanel e adicione um serviço **App**.
2. Conecte o repositório `phedroborges/doacao-casa-caramelo`.
3. Selecione a branch `main` e a raiz do repositório.
4. Use o builder **Dockerfile**, apontando para `Dockerfile`.
5. Configure a porta interna `3000`.

O container já define:

```text
NODE_ENV=production
HOSTNAME=0.0.0.0
PORT=3000
TZ=America/Sao_Paulo
```

## 3. Variáveis de ambiente

Apenas duas, as mesmas do `.env.example`:

```text
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

As duas são públicas por natureza — a chave `publishable` vai para o navegador
de qualquer forma. Quem protege os dados é o RLS do banco, não o sigilo dela.

A senha do Postgres **não** entra aqui: a aplicação fala com o Supabase pela
API REST, nunca por conexão direta.

> Estas variáveis são lidas no momento do **build** (são `NEXT_PUBLIC_`).
> Ao trocar qualquer uma delas, refaça o deploy — reiniciar não basta.

## 4. Domínio HTTPS

Configure um domínio com HTTPS. É obrigatório, não opcional: o botão de
compartilhar usa a bandeja nativa do celular (`navigator.share`), que os
navegadores só liberam em origem segura. Em HTTP, o compartilhamento cai no
modo de baixar a imagem.

## 5. Primeiro deploy

1. Rode o deploy e acompanhe o log do build.
2. Confirme o health check em `https://SEU-DOMINIO/api/health` — a resposta
   esperada é `{"status":"ok"}`, que já testa a conexão com o banco.
3. Abra `/admin`, entre com a conta criada no passo 1.3 e confira se o evento
   aparece.

## 6. Escala

Diferente da versão antiga com SQLite, **não há limite de réplicas** e nenhum
volume para montar. Todas as instâncias leem e escrevem no mesmo Supabase.

## 7. Backup

Use os backups automáticos do próprio Supabase (*Settings > Database >
Backups*). Não há nada no container para salvar.

Para uma cópia pontual das doações de um evento, use o botão **Exportar doações
CSV** dentro do evento, no painel.

## 8. Atualizações

1. Faça o deploy da nova versão.
2. Se a atualização trouxer migrations novas, rode `npx supabase db push`
   **antes** de promover o novo container.
3. Confira `/api/health` e uma doação de teste ponta a ponta.
4. Apague a doação de teste pelo painel.

## Problemas comuns

**`/admin` devolve ao login mesmo com a senha certa.** A conta existe no Auth
mas não está em `public.admin_users`, ou foi criada sem *Auto Confirm User*.
Rode a conferência no fim de `supabase/bootstrap-admin.sql`.

**Health check falha.** Verifique as duas variáveis de ambiente e se o projeto
Supabase não está pausado (projetos gratuitos pausam por inatividade).

**Compartilhar só baixa a imagem.** O domínio está em HTTP, ou o navegador do
aparelho não suporta compartilhar arquivos. O card baixado continua válido.

**Doação não aparece no ranking.** Só doações confirmadas entram. Confirmar
exige o token devolvido na criação; se a pessoa fechou a tela antes de
confirmar, a doação fica pendente de propósito.
