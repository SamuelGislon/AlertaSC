# Design — demonstração em vídeo de um alerta

## Intenção

Preparar uma demonstração curta e confiável para o trabalho da faculdade, mostrando um único alerta do fluxo do operador até a apresentação pública e a arte do comunicado. O projeto já possui uma fila sintética com revisão, aprovação, auditoria e exportação de arte. O painel público, porém, ainda usa métricas e um aviso estáticos, independentes da fila.

## Abordagens consideradas

1. **Fluxo guiado de um alerta (escolhido pelo usuário):** reutilizar a fila e as ações existentes; após a aprovação, abrir uma prévia pública que apresenta o mesmo alerta e permite voltar à operação. Mantém uma demonstração funcional e controlável.
2. **Polir todas as telas:** ampliar a mudança para cadastro, retorno, administração e monitoramento. Fica fora do foco do vídeo de um alerta.
3. **Tela cenográfica estática:** apresentar apenas uma arte final. Não demonstra a revisão e aprovação já disponíveis no sistema.

## Objetivos e escopo

- Exibir a marca **Clima em Alerta** nas telas usadas no vídeo.
- Usar um único caso gerado por IA de chuva/cheia do Rio Índios, inspirado no comunicado aprovado compartilhado pelo usuário.
- Demonstrar login do operador, revisão, aprovação, auditoria, prévia pública do alerta aprovado e prévia/download da arte.
- Fazer a prévia pública refletir o mesmo alerta selecionado e aprovado na fila.
- Mostrar aviso inequívoco de que se trata de demonstração sintética, sem observações meteorológicas reais nem publicação externa.
- Manter a gravação previsível, com textos e dados de demonstração estáveis.

## Fora do escopo

- Integração ou consulta à API municipal neste refinamento do vídeo.
- Outras fontes meteorológicas, cidadãos reais, envio de mensagens ou publicação em redes sociais.
- Reformulação de todas as telas, mudanças nas regras de risco ou mudanças no backend de autenticação, auditoria e estados.
- Apresentar a prévia autenticada como endpoint público de produção. O acesso público real continua exigindo contrato de API pública e filtragem no servidor.

## Comportamento proposto

1. O operador entra com a conta sintética local.
2. A fila mostra um só caso de demonstração de chuva/cheia, com fonte, horário, área, estado e leituras claramente identificadas como sintéticas.
3. O operador assume o alerta, registra a justificativa e aprova. As regras existentes do servidor permanecem responsáveis por autorização, transição e auditoria.
4. A tela oferece uma ação de prévia do painel público. A prévia usa somente o alerta aprovado e ainda válido da lista já carregada no contexto autenticado, convertendo-o para os campos públicos mínimos; não expõe auditoria nem detalhes internos.
5. A prévia permite voltar à fila. A arte continua usando a versão aprovada e oferece visualização/download manual.
6. O roteiro termina com a tela pública e a arte, sem acionar compartilhamento ou envio.

Se o alerta não estiver aprovado, estiver expirado ou não puder ser carregado, a prévia não o apresenta como aviso público; mostra estado vazio/explicativo.

## Direção visual

Aplicar o design system existente com hierarquia mais forte para o aviso: identificação de demonstração, título e nível, área, instante/validade, resumo e orientação, seguidos pelos valores relacionados quando presentes. A tela pública do vídeo prioriza esse único aviso e evita métricas estáticas que pareçam derivar dele quando não derivam. Não adicionar logos municipais. Atualizar textos visíveis da marca para Clima em Alerta; nomes técnicos internos podem continuar AlertaSC.

## Segurança e limites

- A API continua sendo autoridade para aprovar e registrar auditoria.
- A prévia é uma composição de interface dentro da sessão autenticada de demonstração; não é uma nova rota pública nem substitui uma API pública segura.
- Dados de cidadão, chaves, tokens, senhas e outros segredos não aparecem na gravação ou nos logs.
- Nenhum canal externo é chamado.

## Critério de sucesso

Uma gravação contínua consegue mostrar, sem trocar dados manualmente nem depender de leitura externa variável, o mesmo alerta gerado por IA sendo revisado, aprovado, visto na prévia pública e renderizado como comunicado, com marca Clima em Alerta e aviso de demonstração visível.

## Decisões deixadas para o plano de implementação

- Localizar a ação de prévia pública no resumo do alerta aprovado e escolher o retorno visual mais curto para a fila.
- Reduzir o conteúdo do alerta à projeção pública mínima já disponível na interface; não criar endpoint público nesta tarefa.
- Preservar a validade e usar o relógio atual para não exibir alertas expirados.
- Cobrir o fluxo com testes de componentes e um teste de navegador se a infraestrutura existente permitir.
