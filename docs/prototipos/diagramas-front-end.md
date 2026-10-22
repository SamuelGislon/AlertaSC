# Protótipo de fluxos e diagramas do front-end

Este material acompanha o [protótipo navegável](etapa-front-end.html) para revisão prevista na ALE-37. O protótipo usa apenas conteúdo sintético, mantém a marca textual AlertaSC e não conecta APIs, fontes oficiais, cadastros reais ou canais externos. Os diagramas representam o escopo aprovado e as telas previstas; não substituem os contratos técnicos das APIs.

## Atividade — cidadão

```mermaid
flowchart TD
    A[Painel público sintético] --> B{Escolhe ação}
    B -->|Consultar| C[Ver observações e previsões sintéticas]
    B -->|Preferências| D[Portal do cidadão]
    D --> E{Cadastro sintético ativo?}
    E -->|Não| F[Consentimento de demonstração]
    F --> G[Criar perfil sintético]
    E -->|Sim| H[Editar município e tipos de aviso]
    G --> H
    H --> I[Salvar preferências]
    H --> J[Remover cadastro]
    J --> K[Confirmar opt-out sintético]
    K --> L[Remover dados ativos e bloquear elegibilidade]
    B -->|Avaliar aviso| M[Selecionar retorno sobre utilidade]
    M --> N[Registrar retorno sintético sem pedir contato]
```

## Atividade — operador

```mermaid
flowchart TD
    A[Entrar com conta autorizada] --> B{API autentica?}
    B -->|Não| C[Exibir erro genérico]
    B -->|Sim| D[Obter autorização da aba de alertas]
    D --> E{Aba liberada?}
    E -->|Não| F[Informar que está ocupada ou negada]
    E -->|Sim| G[Monitoramento e fila sintética]
    G --> H{Selecionar candidato}
    H --> I[Assumir para análise]
    I --> J[Revisar dados e texto]
    J --> K{Decisão permitida pela API?}
    K -->|Não| L[Exibir falha sem alterar estado]
    K -->|Sim| M[Aprovar ou reprovar com justificativa]
    M --> N[Persistir auditoria e estado]
    N --> O{Aprovado e ainda válido?}
    O -->|Não| P[Manter histórico; ocultar envio/exportação incompatível]
    O -->|Sim| Q[Prévia e download PNG/JPEG]
    Q --> R[Compartilhamento manual opcional]
    R --> S[Operador confirma no dispositivo]
    S --> T[Sem publicação automática]
    G --> U[Consultar auditoria]
    U --> V[Preservar histórico mesmo após 24h]
```

## Sequência — autenticação e fila

```mermaid
sequenceDiagram
    actor O as Operador
    participant W as Front-end AlertaSC
    participant A as API AlertaSC
    participant D as PostgreSQL
    O->>W: Informa credenciais provisionadas
    W->>A: POST /auth/login
    A->>D: Validar hash e estado da conta
    D-->>A: Conta sintética ativa e papéis
    A-->>W: Sessão autenticada
    W->>A: Adquirir aba exclusiva
    A->>D: Aquisição atômica do bloqueio
    D-->>A: Concedido ou ocupado
    A-->>W: Resultado de autorização
    W->>A: Consultar fila
    A-->>W: Candidatos disponíveis ao perfil
    O->>W: Assume candidato e decide
    W->>A: Solicitar transição + justificativa
    A->>A: Revalidar papel, bloqueio e transição
    A->>D: Atualizar estado e anexar auditoria na transação
    D-->>A: Commit
    A-->>W: Estado e histórico atualizados
```

## Modelo mínimo de apresentação

```mermaid
classDiagram
    class OperatorAccount {
      +id: UUID
      +roles: Role[]
      +active: boolean
    }
    class Alert {
      +id: UUID
      +title: string
      +summary: string
      +status: AlertStatus
      +generatedAt: datetime
      +expiresAt: datetime
    }
    class AlertClaim {
      +alertId: UUID
      +operatorId: UUID
      +claimedAt: datetime
      +releasedAt: datetime?
    }
    class AuditEvent {
      +id: UUID
      +alertId: UUID
      +actorId: UUID?
      +action: string
      +occurredAt: datetime
      +previousState: string?
      +newState: string?
    }
    class CitizenPreferences {
      +id: UUID
      +syntheticProfileId: string
      +eventTypes: string[]
      +municipalities: string[]
      +consentAt: datetime?
      +removedAt: datetime?
    }
    OperatorAccount "1" --> "0..*" AlertClaim : assumes
    Alert "1" --> "0..*" AlertClaim : review history
    Alert "1" --> "0..*" AuditEvent : preserves
```

Os campos acima ilustram o contrato que as telas precisam apresentar. O protótipo não propõe migrações ou novas regras de persistência. O front-end deve tratar permissões, estado e validade retornados pela API como autoridade; esconder controles não substitui autorização no servidor.

## Componentes de interface

```mermaid
flowchart LR
    Tokens[Tokens de cor, tipo, espaço e borda] --> Components[Botões, cartões, selos, campos, avisos]
    Components --> PublicShell[Shell público/cidadão]
    Components --> OperatorShell[Shell do operador]
    PublicShell --> Dashboard[Painel público]
    PublicShell --> Citizen[Preferências e retorno]
    OperatorShell --> Monitoring[Monitoramento]
    OperatorShell --> Queue[Fila e revisão]
    OperatorShell --> Editor[Comunicado]
    OperatorShell --> Audit[Auditoria]
    OperatorShell --> Admin[Operadores e cadastros sintéticos]
```

## Pontos para revisão institucional

- Confirmar se a hierarquia do painel público deve priorizar observações, previsões e avisos aprovados nesta ordem.
- Revisar rótulos e densidade visual da fila e do detalhe de alerta.
- Confirmar se as preferências e o retorno do cidadão estão representados sem solicitar dados pessoais no protótipo.
- Revisar a navegação superior em computadores e a navegação inferior em celulares.
- Validar que a marca permanece apenas textual enquanto as logos oficiais não forem disponibilizadas/aprovadas.
- Após revisão, registrar comentários e pendências na ALE-37 antes de usar estes artefatos para guiar a implementação integrada.
