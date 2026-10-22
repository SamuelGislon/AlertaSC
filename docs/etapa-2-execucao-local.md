# Etapa 2 — base executável local

Esta etapa fornece a estrutura inicial do monorepo, o painel, a API NestJS, o worker de expiração e o PostgreSQL/PostGIS. O ambiente é de desenvolvimento e usa somente dados sintéticos. Não informe dados reais de cidadãos nem conecte fontes externas.

## Requisitos

- WSL 2 com Node.js 24 LTS e Corepack/pnpm 10.
- Docker com suporte a Docker Compose e acesso à imagem `postgis/postgis:16-3.4`.
- OpenSSL para gerar os segredos locais.

Se `node` e `pnpm` já estiverem instalados pelo `mise` no WSL, mas os comandos não forem encontrados, inclua `~/.local/bin` no `PATH` da sessão e execute os comandos Node com `mise exec node@24 --`. Por exemplo:

```bash
export PATH="$HOME/.local/bin:$PATH"
mise exec node@24 -- pnpm --version
```

No WSL, o Docker Desktop pode ser usado com integração WSL ativada. Se o CLI `docker` não estiver integrado à distribuição, use o executável `docker.exe` disponibilizado pelo Docker Desktop.

## Preparar configuração local

Na raiz do repositório:

```bash
cp .env.example .env
chmod 600 .env
```

Preencha `POSTGRES_PASSWORD`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `FIELD_ENCRYPTION_KEY` e `LOOKUP_HMAC_KEY` com valores aleatórios locais. A chave `FIELD_ENCRYPTION_KEY` deve ter exatamente 32 bytes UTF-8; os demais segredos devem ter pelo menos 32 bytes. Uma maneira de editar o arquivo sem mostrar os valores no terminal é:

```bash
for secret_name in POSTGRES_PASSWORD JWT_ACCESS_SECRET JWT_REFRESH_SECRET FIELD_ENCRYPTION_KEY LOOKUP_HMAC_KEY; do
  if [ "$secret_name" = FIELD_ENCRYPTION_KEY ]; then
    secret_value="$(openssl rand -hex 16)"
  else
    secret_value="$(openssl rand -hex 32)"
  fi
  sed -i "s/^${secret_name}=.*/${secret_name}=${secret_value}/" .env
done
unset secret_name secret_value
```

Não troque a senha do PostgreSQL depois de criar o volume local, a menos que também atualize a senha do usuário dentro do banco. `.env` está ignorado pelo Git; nunca coloque esses valores em commits.

## Iniciar serviços

```bash
mise exec node@24 -- pnpm install
docker compose up -d db
mise exec node@24 -- pnpm db:migrate
mise exec node@24 -- pnpm db:seed:synthetic
mise exec node@24 -- pnpm dev
```

Se estiver usando o CLI do Docker Desktop pelo WSL sem integração, substitua o segundo comando por `docker.exe compose up -d db`.

O seed cria um operador administrador sintético somente quando ainda não há um administrador ativo. Ele imprime o CPF e a senha sintéticos uma vez no terminal; guarde-os apenas localmente. O seed não grava essas credenciais em logs da aplicação.

Se ainda não existir alerta sintético aguardando triagem, o seed cria um exemplo fictício na fila para validar a tela e a expiração. O exemplo inclui uma leitura sintética relacionada (5,2 cm convertidos para 52 mm), com origem e horário identificados; esses valores não representam observação real.

Endereços locais padrão:

- Web: [http://localhost:5173](http://localhost:5173)
- API: [http://localhost:3001](http://localhost:3001)
- Saúde da API: [http://localhost:3001/health](http://localhost:3001/health)
- Prontidão com banco: [http://localhost:3001/ready](http://localhost:3001/ready)
- PostgreSQL/PostGIS: `127.0.0.1:54329`, banco `alertasc_dev`

O frontend encaminha as chamadas `/api` para a API. O worker agenda a expiração dos alertas vencidos e a limpeza de marcadores de reconciliação já expirados.

O login usa CPF e senha; a API aplica Argon2id, emite JWT de acesso com duração de 15 minutos e mantém refresh token rotativo em cookie `HttpOnly` por até 7 dias. Logout revoga a sessão. A redefinição administrativa de senha invalida sessões ativas; não há recuperação por e-mail ou SMS.

Em modo de teste, a conexão seleciona `alertasc_test` (ou `DATABASE_TEST_URL`). Em produção, `DATABASE_URL` explícita é obrigatória; a aplicação não usa o endereço padrão do banco local.

## Dados de demonstração

Entre com o operador sintético criado pelo seed. A aba de alertas exige que o servidor conceda o bloqueio global à sessão; duas sessões não podem operar a fila ao mesmo tempo. Na tela de acesso, também é possível abrir o portal cidadão sintético. O portal não aceita telefone, endereço, CPF ou localização informados pelo usuário; ele usa apenas fixtures sintéticas e permite editar preferências e remover o cadastro de demonstração.

### Revisão, auditoria e operadores sintéticos

- Na fila de alertas, a pessoa operadora pode assumir o alerta e, em seguida, aprovar ou reprovar com justificativa. A API valida as permissões, a posse do alerta e as transições; a interface não envia nem publica o conteúdo.
- Cada alerta mostra origem sintética, área, horários, resumo, leituras relacionadas e a incerteza de não haver observação real ou validação por fonte nesta etapa. A trilha diferencia entrada bruta, normalização, revisão e entrega simulada.
- Para alertas aprovados, **Simular entrega local** conta cadastros sintéticos ativos, consentidos e elegíveis. Cada tentativa reconsulta as preferências; a remoção bloqueia tentativas posteriores. A tela e a API deixam claro que nenhuma mensagem é enviada e nenhum serviço externo é chamado.
- Se um bloqueio órfão impedir o acesso, somente um administrador pode fazer a recuperação manual, informando justificativa. O sistema registra o evento de recuperação.
- A aba **Operadores sintéticos** permite que um administrador provisione uma conta fictícia e desative contas sintéticas. As credenciais de provisionamento aparecem uma vez na interface e não são registradas nos logs. Nunca use essa função para criar uma conta real nesta fase.
- A aba **Cadastros sintéticos** é uma ferramenta administrativa de demonstração; o portal do cidadão representa o cadastro voluntário, edição de preferências, consentimento e remoção, apenas com dados fictícios.

### Arte visual do comunicado aprovado

- Depois de aprovar um alerta sintético ainda válido, a fila mostra **Baixar comunicado em PNG** e **Baixar comunicado em JPEG**. Alertas aguardando triagem, em análise, reprovados ou expirados não podem ser exportados.
- A arte vetorial usa o título, resumo aprovado, área, leituras sintéticas e horários do próprio alerta. O layout segue a referência visual aprovada: cabeçalho laranja, cartões informativos, ilustrações de rio/chuva/aviso e rodapé municipal com contatos 199 e 193. A marca é textual (AlertaSC); o repositório não contém o arquivo oficial de identidade visual da Defesa Civil.
- O arquivo é rasterizado localmente no navegador em alta resolução. O SVG é construído com escaping de texto e não carrega fontes, imagens ou scripts externos.
- A imagem recebe identificação destacada de demonstração e avisa que os dados são sintéticos e não representam condição atual. O download não chama Instagram, Telegram ou qualquer serviço externo e não publica automaticamente.
- **Compartilhar manualmente** tenta abrir o seletor nativo de compartilhamento do dispositivo com o PNG. A pessoa operadora escolhe o aplicativo/destino e confirma; se o navegador não aceitar compartilhamento de arquivos, a imagem é baixada como alternativa. Cancelar o seletor não publica nada.
- A arte reflete apenas os campos aprovados armazenados no alerta. Para a composição específica do exemplo — incluindo texto editável, previsão de chuva/vento e orientações estruturadas — essas informações precisam existir na versão aprovada do comunicado; a edição e versionamento desse conteúdo pertencem à ALE-20. Não se deve acrescentar à arte um valor que não esteja no alerta aprovado.

As rotas de fixture, listagem e manutenção de contas sintéticas são bloqueadas em produção. O provisionamento real de operadores, a coleta de dados reais de cidadãos e a ativação institucional permanecem pendentes de validação conforme `docs/etapa-1-condicoes-produto.md`.

A API desativa os endpoints de fixtures se `NODE_ENV=production` ou `PERSONAL_DATA_MODE` não for `synthetic`. O uso de dados pessoais reais requer a validação institucional definida em `docs/etapa-1-condicoes-produto.md`; este protótipo não habilita esse fluxo.

## Infraestrutura fora desta etapa

O banco local atende os fluxos atuais. Armazenamento S3 fica para a etapa que produzir arquivos; nesta fase não há serviço externo de arquivos. A aplicação escreve somente eventos técnicos estruturados e permitidos em `stdout`, sem coletor de logs ou serviço de métricas externo. A retenção operacional móvel de 30 dias e a rotação de logs precisam ser configuradas no ambiente de implantação antes de produção. Os serviços externos e suas credenciais não fazem parte do ambiente local.

## Verificações

```bash
mise exec node@24 -- pnpm typecheck
mise exec node@24 -- pnpm build
mise exec node@24 -- pnpm test:unit
mise exec node@24 -- pnpm test:integration
```

Os testes de integração usam o banco `alertasc_test` e recusam truncar outro banco. Não execute-os contra `alertasc_dev`.
