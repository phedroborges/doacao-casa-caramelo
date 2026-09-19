# Deploy no Easypanel

Este projeto está pronto para ser publicado como um serviço **App** a partir do
GitHub. O Easypanel deve construir o `Dockerfile` da raiz.

## 1. Criar o serviço

1. No Easypanel, crie um projeto e adicione um serviço do tipo **App**.
2. Em **Source**, conecte o GitHub e selecione
   `phedroborges/doacao-casa-caramelo`, branch `main`.
3. Use a raiz do repositório como diretório de build.
4. Selecione o builder **Dockerfile** e informe `Dockerfile` se o campo de
   caminho for exibido.
5. A porta interna do serviço é `3000`.

O container já define estas variáveis:

```text
NODE_ENV=production
HOSTNAME=0.0.0.0
PORT=3000
DATA_DIR=/app/data
```

Não é necessário duplicá-las no painel, mas valores definidos no Easypanel têm
precedência.

## 2. Criar o volume persistente

Antes do primeiro uso, adicione um volume ao serviço com o caminho de montagem:

```text
/app/data
```

Monte somente esse diretório, nunca `/app`. Sem o volume, os dados somem quando
o container for recriado.

O processo roda com UID/GID `1001`. Em volumes gerenciados pelo Docker a pasta
normalmente preserva a propriedade criada pela imagem. Se `/api/health` retornar
503, confirme no servidor que o volume permite leitura e escrita para o usuário
1001.

## 3. Réplicas e estratégia de atualização

Use **exatamente uma réplica**. A base é um arquivo JSON e a trava de escrita
existe dentro do processo; duas instâncias podem sobrescrever dados.

Se houver opção de rolling update ou zero-downtime com containers simultâneos,
deixe-a desativada para este serviço. Faça deploy fora do horário de pico e
espere o container anterior encerrar antes de o novo começar a receber doações.

## 4. Domínio e HTTPS

1. Adicione o domínio público em **Domains**.
2. Aponte-o para a porta `3000`.
3. Ative o certificado HTTPS automático.
4. Configure o DNS indicado pelo Easypanel.

HTTPS é necessário para a Web Share API enviar a imagem pronta à bandeja de
compartilhamento do celular. Mesmo em HTTPS, o sistema operacional exige que a
pessoa escolha o Instagram e confirme a publicação.

## 5. Saúde, deploy e verificação

O Dockerfile contém um health check para:

```text
GET /api/health
```

Depois do deploy, verifique:

1. `/api/health` responde `{"status":"ok"}`.
2. `/` abre o fluxo de doação no celular.
3. `/ranking` mostra as oito atléticas.
4. Uma doação de teste aparece no ranking depois da confirmação.
5. O botão de Story abre a bandeja de compartilhamento no Safari ou Chrome do
   celular.
6. Depois de reiniciar o serviço, a doação de teste continua no ranking.

Apague a doação de teste do volume antes do evento, ou inicialize o arquivo com
`[]`.

## 6. Backup

Configure backup recorrente do volume e faça uma cópia manual de
`/app/data/doacoes.json` antes e depois do evento. O arquivo pode ser exportado
como CSV em uma cópia local do projeto com:

```bash
DATA_DIR=/caminho/da/copia npm run export-csv
```

Não exponha esse arquivo publicamente: ele contém nomes de doadores.

## Atualizações futuras

Com auto-deploy habilitado, novos commits na `main` podem reconstruir o serviço.
Antes de atualizar durante a campanha, faça backup do volume e confirme que a
configuração continua com uma única réplica.
