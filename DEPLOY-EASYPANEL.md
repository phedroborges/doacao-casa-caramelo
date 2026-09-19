# Deploy no Easypanel

## 1. Criar o serviço

1. Crie um projeto no Easypanel e adicione um serviço **App**.
2. Conecte o repositório `phedroborges/doacao-casa-caramelo`.
3. Selecione a branch `main` e a raiz do repositório.
4. Use o builder **Dockerfile**, apontando para `Dockerfile`.
5. Configure a porta interna `3000`.

O container já possui:

```text
NODE_ENV=production
HOSTNAME=0.0.0.0
PORT=3000
TZ=America/Sao_Paulo
DATA_DIR=/app/data
```

## 2. Configurar o painel administrativo

Adicione estas variáveis ao serviço:

```text
ADMIN_USERNAME=admin
ADMIN_PASSWORD=uma-senha-longa-e-exclusiva
AUTH_SECRET=uma-chave-aleatoria-com-pelo-menos-32-caracteres
AUTH_COOKIE_SECURE=true
```

Uma chave adequada pode ser gerada no computador com:

```bash
openssl rand -hex 32
```

Não coloque esses valores no Git. Se `ADMIN_PASSWORD` ou `AUTH_SECRET` estiverem
ausentes ou fracos, o site público continua funcionando, mas o painel recusa o
login.

## 3. Criar o volume persistente

Antes do primeiro deploy, adicione um volume com o caminho de montagem:

```text
/app/data
```

Monte somente `/app/data`, nunca `/app`. Esse volume guarda:

- `casa-caramelo.sqlite` e arquivos auxiliares do SQLite;
- imagens enviadas pelo painel em `uploads/`;
- o `doacoes.json` antigo, caso exista para migração.

Sem o volume, eventos, doações e uploads somem quando o container for recriado.
O processo roda com UID/GID `1001`. Se `/api/health` retornar 503, confirme que
esse usuário possui leitura e escrita no volume.

## 4. Usar uma única réplica

Configure **exatamente uma réplica**. O SQLite está em um volume local e não
deve ser aberto por containers diferentes simultaneamente.

Se houver opção de rolling update ou zero-downtime com dois containers ativos,
deixe-a desativada para este serviço. Faça atualizações fora do pico e aguarde o
container anterior encerrar antes de o novo começar.

## 5. Domínio e HTTPS

1. Adicione o domínio em **Domains**.
2. Direcione-o para a porta `3000`.
3. Ative o certificado HTTPS automático.
4. Configure o DNS solicitado pelo Easypanel.

HTTPS protege a sessão administrativa e é obrigatório para o navegador enviar
a imagem do Story a outros aplicativos. Mantenha `AUTH_COOKIE_SECURE=true`.

## 6. Primeiro acesso

Depois do deploy:

1. Abra `/api/health` e confirme `{"status":"ok"}`.
2. Abra `/admin` e entre com `ADMIN_USERNAME` e `ADMIN_PASSWORD`.
3. Revise o evento **16ª LAF**.
4. Confirme participantes, prazo, PIX, prêmios, textos, logos e cores.
5. Faça uma doação pequena de teste.
6. Confira o placar e o CSV.
7. Reinicie o serviço e confirme que os dados e as imagens permanecem.

Na primeira execução, a 16ª LAF é criada automaticamente. Se o volume já tiver
o arquivo `doacoes.json` da versão anterior, suas doações serão importadas uma
única vez para esse evento.

## 7. Backup

Configure snapshots ou backups recorrentes do volume inteiro `/app/data`.
Faça uma cópia antes de cada deploy importante e antes/depois de cada evento.

O SQLite usa WAL; por isso, prefira o backup de volume do Easypanel. Para uma
cópia manual consistente, pare o serviço antes de copiar todos os arquivos
`casa-caramelo.sqlite*` e a pasta `uploads/`.

O CSV de cada evento pode ser baixado pelo painel sem parar o serviço.

## 8. Atualizações

O auto-deploy da branch `main` pode ser habilitado. Antes de atualizar durante
uma campanha em andamento:

1. faça backup do volume;
2. confirme que existe apenas uma réplica;
3. publique o commit;
4. confira `/api/health`, o formulário, o ranking e o login do painel.
