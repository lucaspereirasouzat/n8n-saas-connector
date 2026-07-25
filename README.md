# Flowly — SaaS para integrações n8n

Monorepo com frontend e backend independentes. O frontend nunca recebe chaves do n8n ou da Stripe; checkout, alteração de plano e credenciais ficam no servidor.

## Estrutura

- `apps/web`: React + Vite (`http://localhost:5173`)
- `apps/api`: Express + Stripe + API n8n (`http://localhost:3001`)

O backend segue responsabilidades separadas em `controllers`, `routes`, `config`,
`middleware`, `services`, `store`, `types` e `utils`. O arquivo `app.ts` monta os
middlewares e as rotas, enquanto `index.ts` apenas valida o ambiente e inicia o servidor.

## Instalação e desenvolvimento

### Bun (recomendado)

O projeto é compatível com o **package manager e executor de scripts do Bun**, mas não usa `Bun.serve`, `Bun.password` nem outras APIs proprietárias. O backend continua usando APIs Node/Express, portanto também roda com npm.

```bash
cp .env.example .env
bun install
bun run dev:bun       # ambos
bun run dev:web       # somente frontend
bun run dev:api       # somente backend
```

### npm

```bash
npm install
npm run dev           # ambos
npm run dev:web       # somente frontend
npm run dev:api       # somente backend
```

Para formatar ou apenas conferir a formatação de todo o monorepo:

```bash
npm run format
npm run format:check
```

## Segurança e produção

- Sessão em cookie `HttpOnly`, `SameSite=Lax` e `Secure` em produção.
- Senhas são derivadas com `scrypt` e salt individual; respostas de recuperação não revelam a existência da conta.
- O backend aplica Helmet, limite de JSON, validação de origem e escopo de recursos pelo usuário autenticado.
- O cliente envia apenas o identificador lógico do plano. O backend usa uma allowlist de Price IDs das variáveis de ambiente e cria o teste de 14 dias na Stripe.
- Webhooks Stripe são verificados antes de atualizar dados. Tokens do n8n nunca são enviados ao navegador.

O armazenamento em memória serve apenas para desenvolvimento. Antes de produção, use PostgreSQL, Redis para sessões, serviço de e-mail para recuperação, rate limiting distribuído e HTTPS.

Conta demonstrativa: `marina@empresa.com` / `Demo123!`.

## Solução de problemas do registry npm

Um erro `E403` não é causado pelos workspaces nem pelas versões dos pacotes. Primeiro,
confirme qual configuração está sendo aplicada:

```bash
npm config get registry
npm config get proxy
npm config get https-proxy
npm ping
```

O registry público esperado é `https://registry.npmjs.org/`. Para restaurá-lo e
remover configurações persistidas de proxy:

```bash
npm config set registry https://registry.npmjs.org/
npm config delete proxy
npm config delete https-proxy
npm cache verify
```

Configurações de ambiente têm precedência e também precisam ser verificadas:

```bash
env | grep -iE '(^|_)(http|https|npm).*proxy|npm.*registry'
```

- Em uma rede sem proxy, remova `HTTP_PROXY`, `HTTPS_PROXY`, `http_proxy`,
  `https_proxy`, `npm_config_http_proxy` e `npm_config_https_proxy` da configuração
  do shell, container ou CI e abra um novo terminal.
- Em uma rede corporativa, **não contorne o proxy**: solicite a liberação de
  `registry.npmjs.org:443` ou configure o registry espelho fornecido pela empresa
  (Artifactory, Nexus ou Verdaccio).
- Se a empresa usa uma autoridade certificadora própria, configure o arquivo CA
  aprovado com `npm config set cafile /caminho/ca-corporativa.pem`; não desative
  `strict-ssl`.
- Se somente pacotes privados falharem, confira o escopo e o token no `~/.npmrc`,
  sem salvar credenciais no `.npmrc` do repositório.

Neste ambiente de avaliação, a requisição via `proxy:8080` recebe `403` do Envoy e,
sem o proxy, não há resolução DNS para `registry.npmjs.org`. Portanto, a correção
precisa ser feita na política do proxy/rede do ambiente; trocar npm por Bun não
resolve, pois ambos baixam os mesmos pacotes do registry configurado.
