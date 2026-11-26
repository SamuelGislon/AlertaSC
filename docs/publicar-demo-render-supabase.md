# Publicar o AlertaSC no Render com Supabase

Este guia conecta a aplicação web já publicada à API NestJS e ao PostgreSQL do projeto Supabase. O modo fica explicitamente em `synthetic`; não use dados de cidadãos reais nem habilite `PERSONAL_DATA_MODE=approved` para este ambiente.

## Criar o serviço da API

No projeto **Clima em Alerta** do Render, crie um **Web Service** ligado ao repositório `SamuelGislon/AlertaSC` e à branch `feat/video-demo-alert`.

- Runtime: Node.
- Versão do Node: `24.22.3`.
- Root Directory: vazio (raiz do monorepo).
- Instance Type: Free.
- Build Command:

  ```sh
  corepack enable && corepack prepare pnpm@10.9.0 --activate && pnpm install --frozen-lockfile && pnpm build
  ```

- Start Command:

  ```sh
  pnpm db:migrate && pnpm --filter @alertasc/api seed:synthetic && PORT_API=$PORT pnpm --filter @alertasc/api start
  ```

- Health Check Path: `/ready`.

O comando de inicialização aplica as migrações, cria a conta administradora sintética na primeira inicialização e inicia a API. Em reinicializações seguintes o seed detecta a conta ativa e não altera sua senha.

## Variáveis do serviço da API

Cadastre as variáveis em **Environment** no Render, nunca em arquivos versionados:

| Variável | Valor ou regra |
|---|---|
| `NODE_ENV` | `production` |
| `PERSONAL_DATA_MODE` | `synthetic` |
| `WEB_ORIGIN` | Origem exata do site, por exemplo `https://clima-em-alerta-web.onrender.com` |
| `DATABASE_URL` | URI **Session pooler** do projeto Supabase, copiada no painel **Connect**. Não use a chave da Data API. |
| `DATABASE_SSL` | `true` |
| `JWT_ACCESS_SECRET` | Segredo aleatório exclusivo, com pelo menos 32 bytes. |
| `JWT_REFRESH_SECRET` | Outro segredo aleatório exclusivo, com pelo menos 32 bytes. |
| `FIELD_ENCRYPTION_KEY` | 32 bytes UTF-8 exatamente. |
| `LOOKUP_HMAC_KEY` | Segredo aleatório exclusivo, com pelo menos 32 bytes. |
| `SYNTHETIC_ADMIN_LOGIN` | Identificador da conta inicial. Use, por exemplo, `operador-demo`; assim não é necessário cadastrar CPF pessoal. |
| `SYNTHETIC_ADMIN_PASSWORD` | Senha escolhida para o acesso do operador; mínimo de 12 e máximo de 128 caracteres. |

Gere os quatro segredos em um gerenciador de senhas ou com uma ferramenta criptográfica local. Não reutilize a senha do banco, a chave da API pública ou os segredos JWT entre variáveis. O identificador e a senha serão as credenciais usadas na tela **Operador**. O modo sintético aceita um identificador como `operador-demo`; guarde a senha no gerenciador de senhas. A aplicação não mostra a senha novamente e os logs não a imprimem.

Use o Session pooler do Supabase com SSL, pois o Render Free pode não usar IPv6 para a conexão direta. O serviço usa o banco PostgreSQL diretamente; a Data API do Supabase pode continuar desligada. Antes do primeiro deploy, confira se o projeto Supabase está saudável e não pausado.

## Conectar o site à API

Depois de criar o serviço, copie sua URL pública no Render. Nas variáveis do Static Site `clima-em-alerta-web`, defina:

```text
VITE_API_BASE_URL=https://<url-do-servico-api>/api/v1
```

Faça um novo deploy do Static Site. A URL exata do site também deve estar em `WEB_ORIGIN` no serviço da API, sem barra final. O navegador usa essa variável para chamar a API; não coloque segredos `JWT_*`, chave do banco ou credenciais do operador no Static Site.

## Verificar e entrar

1. Abra `https://<url-do-servico-api>/health` e confirme a resposta de saúde.
2. Abra `https://<url-do-servico-api>/ready` e confirme que o banco está `ready`.
3. Abra o site público, escolha **Operador** e entre com o identificador sintético e a senha definidos nas variáveis de bootstrap.
4. Confirme que a fila de alertas carrega. Ao entrar pelo serviço gratuito, aguarde o Render acordar se a primeira requisição demorar.

Se o primeiro deploy falhar, confira os nomes das variáveis e os logs do Render. O seed omite detalhes de conexão e nunca escreve o CPF ou a senha nos logs. Corrija a configuração e faça novo deploy; não cole segredos em issues, commits ou conversas.

## Limites do plano gratuito

O Web Service Free do Render pode suspender a API após inatividade, causando alguns segundos de espera na primeira chamada. O projeto Supabase Free também pode pausar após período prolongado sem uso. Isso não apaga os dados do serviço, mas a apresentação deve prever o tempo de retomada. Nenhum worker contínuo ou integração externa é necessário para habilitar este login sintético.
