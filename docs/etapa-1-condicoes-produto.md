# AlertaSC — Etapa 1: condições do produto

**Piloto:** Presidente Getúlio/SC

**Pesquisa oficial verificada em:** 21/10/2026

**Escopo deste registro:** fontes de dados, limites aprovados, governança, outliers e divulgação externa. Não autoriza integrações nem altera os requisitos validados.

## Resultado para avançar

No momento, **nenhuma das quatro fontes pesquisadas está liberada como conector para a primeira implementação** segundo o critério de possuir API utilizável pelo projeto e condições de uso verificadas. Por decisão do solicitante em 21/10/2026, a implementação inicial usará **dados fictícios/sintéticos**, sem consumir INMET, CEMADEN, Epagri/Ciram ou Defesa Civil SC. INMET e CEMADEN têm APIs oficiais, mas dependem de acesso/credenciais e confirmação das condições ainda não obtidos. A Epagri/Ciram disponibiliza dados por download manual, sem API oficial documentada para ingestão recorrente. Para a Defesa Civil SC, não foi confirmado um conjunto operacional apropriado nem uma API de integração específica.

Essa conclusão é sobre prontidão de integração do AlertaSC. Não significa que os órgãos não tenham dados úteis ou que nunca possam ser integrados.

## Fontes oficiais e APIs

| Fonte | API e acesso verificados | Dados, cobertura e frequência | Uso, licença e pendências | Classificação e recomendação |
| --- | --- | --- | --- | --- |
| **INMET** | O INMET confirma o fornecimento automatizado por API com liberação de chave e recebe pedidos em [api@inmet.gov.br](https://portal.inmet.gov.br/fale-conosco). Os dados meteorológicos são públicos e gratuitos no portal; isso, por si só, não confirma as condições da API para automatização e redistribuição. | Observações de estações automáticas incluem variáveis meteorológicas e são publicadas em frequência horária. Dados automáticos são brutos e podem conter falhas ou não passar por consistência. A fonte oficial consultada cita a estação INMET Rio do Campo; não confirmou uma estação INMET em Presidente Getúlio. Distância e representatividade para as áreas monitoradas precisam de validação. | Não foram localizados termos públicos suficientes para confirmar limite de chamadas, SLA, forma de atribuição ou permissão de armazenamento/exibição/redistribuição via API. Solicitar chave e resposta formal do INMET sobre essas condições. | **(b) Depende de credencial/condições ainda não obtidas.** Candidata para depois de recebida a chave, confirmados os termos e validada a representatividade da estação. **Não iniciar o conector agora.** |
| **CEMADEN** | Existe API oficial documentada na Plataforma de Entrega de Dados (PED), com endpoints para estações, dados recentes e acumulados. Os endpoints documentam JWT obrigatório. O processo institucional para obter credencial e a elegibilidade deste projeto ainda não estão confirmados. | O município de Presidente Getúlio consta na lista oficial de municípios monitorados. A rede de pluviômetros envia acumulados a cada 10 minutos durante a chuva e, em período sem chuva, zero horário. A PED documenta consulta dos dados ambientais das últimas 3 horas. A evidência confirma município monitorado, mas não identifica uma estação específica atualmente ativa e adequada às áreas do piloto. | A página pública orienta citar o CEMADEN como fonte. Não foram encontrados termos explícitos que confirmem licença para redistribuição, limites de chamadas ou garantia de serviço da PED. Confirmar credencial, estação ativa, atribuição e condições de uso com o CEMADEN. A fonte citada é pluviométrica; a existência de API não comprova que haverá medição de nível de rio adequada ao piloto. | **(b) Depende de credencial/condições ainda não obtidas.** Candidata para depois de confirmar acesso, termos e estação operacional. **Não iniciar o conector agora.** |
| **Epagri/Ciram** | A oferta oficial localizada é um portal de download, com cadastro e aceite dos termos. O manual documenta seleção de estação e download de CSV/planilha, não uma API oficial para ingestão recorrente. Não automatizar scraping do Agroconnect ou do portal. | Download gratuito de dados horários brutos dos últimos 24 meses para temperatura, umidade, vento, pressão e precipitação, entre outras variáveis. O boletim oficial confirma a estação 2386 — Presidente Getúlio – Serra dos Índios. | O acesso gratuito requer cadastro e aceite do termo de autorização de uso. As normas oficiais para séries fornecidas pela Epagri restringem o repasse a terceiros e especificam citação; não está confirmado se os termos do download imediato permitem alimentar um serviço público de alertas. Confirmar por escrito o uso automatizado, armazenamento e exibição pública pretendidos. | **(c) API oficial não encontrada/disponibilidade não confirmada.** A estação local e o download manual são úteis para estudo/validação, mas não habilitam integração recorrente. Não recomendar como conector da primeira implementação. |
| **Defesa Civil de Santa Catarina** | O portal estadual Dados Abertos informa uma API genérica CKAN. A pesquisa não confirmou conjunto de dados da Defesa Civil com observações/alertas operacionais adequados ao piloto nem uma API institucional específica para essa integração. O site oficial publica alertas e boletins, mas páginas públicas não são API e não devem ser raspadas. | Alertas e boletins publicados são úteis como referência humana. Não foi confirmada frequência programática, cobertura por área/estação ou esquema de dados de API para Presidente Getúlio. | A API genérica CKAN não define a licença ou as condições de cada conjunto de dados. É necessário localizar um conjunto adequado e conferir seus metadados/licença; também consultar a Defesa Civil estadual sobre integração oficial. | **(c) API/conjunto operacional apropriado não confirmado.** Não recomendar automação nem scraping. |

### Referências oficiais consultadas

- INMET: [solicitação de acesso à API](https://portal.inmet.gov.br/fale-conosco), [orientações sobre os dados meteorológicos](https://portal.inmet.gov.br/noticias/saiba-como-acessar-os-dados-meteorol%C3%B3gicos-dispon%C3%ADveis-no-site-do-inmet), [frequência horária das estações automáticas](https://portal.inmet.gov.br/sobre-meteorologia), [planejamento institucional sobre API com chaves](https://portal.inmet.gov.br/uploads/notastecnicas/V.5_Planejamento_Estrategico_INMET.pdf).
- CEMADEN: [documentação Swagger da PED](https://sws.cemaden.gov.br/PED/api/ui/swagger.json), [municípios monitorados](https://www2.cemaden.gov.br/municipios-monitorados-2/), [frequência e disponibilização dos dados pluviométricos](https://www2.cemaden.gov.br/pluviometros-automatico/), [mapa e downloads](https://www2.cemaden.gov.br/mapainterativo/).
- Epagri/Ciram: [download de dados ambientais](https://ciram.epagri.sc.gov.br/dadosambientaispublicos/), [manual do download](https://ciram.epagri.sc.gov.br/ciram_arquivos/site/manual_download_dados_ambientais.pdf), [normas de fornecimento de dados](https://ciram.epagri.sc.gov.br/ciram_arquivos/site/RN_ProcedimentosFornecimentoDadosLaudos.pdf), [boletim que identifica a estação de Presidente Getúlio](https://ciram.epagri.sc.gov.br/index.php/2023/10/04/quarta-feira-com-chuva-em-todo-o-estado-acima-de-100mm-em-algumas-areas/).
- Defesa Civil SC / dados estaduais: [arquivo oficial de alertas](https://www.defesacivil.sc.gov.br/categoria/alerta/), [Portal Dados Abertos SC e documentação da API CKAN](https://www.dados.sc.gov.br/).

**Fatos confirmados:** APIs/endpoints oficiais, requisitos de chave/JWT, disponibilidade/frequência declarada, município monitorado, estação Epagri local, processo de download e restrições expressamente descritas.

**Inferências de prontidão:** classificar INMET/CEMADEN como “aguardar” decorre da ausência das credenciais e da confirmação de termos para o AlertaSC; classificar Epagri e Defesa Civil como categoria (c) decorre de não localizar API/fonte operacional apropriada documentada para este piloto. A pesquisa não prova inexistência absoluta de interfaces privadas ou não publicadas.

## ALE-5 — limites aprovados e validação operacional

ALE-5 permanece **Done** e foi apenas conferida; nenhum limite foi alterado. Os valores registrados nela e nos requisitos são:

| Critério | Observação | Atenção | Alerta |
| --- | --- | --- | --- |
| Rio Índios | 4 m | 4,5 m | 5,5 m |
| Ribeirão Revólver | 2,5 m | 3 m | 3,5 m |
| Vento | 40–50 km/h | 51–70 km/h | acima de 70 km/h |
| Frente fria | queda de 3–5 °C | queda de 5 °C em relação à média por 2–3 dias | queda de 5 °C em relação à média por mais de 5 dias |
| Calor extremo | +3 °C por 2 dias | +5 °C por 2–3 dias | +5 °C por 5 dias ou mais |

Para vento, o estado normal continua abaixo de 40 km/h. O solicitante confirmou em 21/10/2026 que a Defesa Civil já validou os critérios; portanto, os documentos aprovados são a fonte de verdade para a etapa seguinte e não resta validação operacional pendente nesta etapa. Os valores permanecem exatamente como registrados acima.

## ALE-6 — governança, retenção, fontes e privacidade

### Decisões confirmadas

- A Defesa Civil municipal indicará uma pessoa responsável, com conta individual.
- O cadastro de cidadãos é voluntário e pode ser removido a qualquer momento.
- O alerta expira 24 horas após sua geração; expirar não apaga seu histórico/auditoria.
- Logs não devem conter dados sensíveis ou pessoais desnecessários.
- O protótipo inicial usa apenas dados fictícios/sintéticos; não recebe cadastros reais nem consome fontes externas.

### Política operacional escolhida para o protótipo

Por delegação do solicitante, esta política fica definida como padrão de produto. Os ciclos de 30 dias são decisões operacionais revisáveis, não prazos fixados pela LGPD.

- **Finalidade e base legal proposta:** cadastro por manifestação afirmativa, com aviso de privacidade antes da inscrição; usar os dados apenas para os alertas e a área/canal escolhidos. Recusar ou remover o cadastro não afeta outros serviços municipais. A base proposta para o produto é consentimento, que o controlador municipal precisa confirmar como apropriado ao contexto concreto antes de receber dados reais.
- **Cadastro e descadastro:** guardar somente campos exigidos pelos requisitos validados. O pedido de remoção bloqueia imediatamente novos envios e apaga contato e preferências da base ativa; não manter lista de supressão identificável. Disponibilizar forma acessível de remoção e encaminhar outros pedidos de titulares ao canal oficial municipal, ainda a designar.
- **Backups:** cópias criptografadas, acesso restrito e rotação de no máximo 30 dias. O descadastro vale imediatamente na base ativa; cópia residual expira em até 30 dias e não pode ser usada em envios rotineiros. Manter, separado dos logs, um registro de reconciliação de descadastros com referência pseudônima e acesso exclusivo à restauração; apagá-lo quando a última cópia que poderia reintroduzir o cadastro expirar (até 30 dias). Após restauração, reaplicar exclusões antes de habilitar envios.
- **Leituras ambientais:** até autorização de fonte, usar fixtures sintéticas. Depois, manter na área de trabalho somente as cinco observações válidas mais recentes de cada série (mesma estação, variável e unidade) e o retrato mínimo que fundamentou cada alerta. Leituras antigas saem da janela quando substituídas; retratos usados em alerta seguem a regra de auditoria.
- **Alertas e auditoria:** preservar histórico/auditoria durante a operação, sem identificadores de cidadãos. Expirar em 24 horas muda o estado, não apaga o histórico. No encerramento do piloto, exportar ou eliminar conforme a tabela de temporalidade e as regras de arquivo público aprovadas pelo município; não inventar prazo em anos.
- **Logs técnicos:** retenção móvel de 30 dias, limitada a evento, horário, resultado/código de erro, identificadores técnicos e correlação. Não incluir telefone, endereço, coordenadas identificáveis, identificadores de cidadãos, credenciais, tokens ou conteúdo desnecessário. Separar logs da auditoria e restringir acesso.
- **Operador:** conta individual enquanto formalmente designado; desativá-la quando cessar a designação. A auditoria guarda somente o identificador operacional necessário para atribuir decisões, sem credenciais ou dados de contato.

### Aprovação institucional antes de dados reais

A política permite avançar com dados sintéticos, mas não substitui validação formal do controlador municipal. Antes do primeiro cadastro real, o município deve designar controlador e canal de privacidade, confirmar a base legal, aprovar aviso e processo de direitos, e aceitar os ciclos de 30 dias para logs/backups e o tratamento de cópias residuais. Confirmar também os termos de cada fonte antes de habilitar seu conector.

A LGPD trata do término, eliminação e direitos do titular, mas não fixa prazo geral único de retenção; conservação depende da finalidade e das hipóteses legais. A ANPD alerta que consentimento nem sempre é adequado no Poder Público, embora possa ser considerado quando a escolha é livre e sem prejuízo ao cidadão. Assim, consentimento é a base proposta para o cadastro voluntário, sujeita à confirmação do controlador, e não parecer jurídico. [LGPD — arts. 15, 16 e 18](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm) · [FAQ da ANPD — duração do tratamento](https://www.gov.br/anpd/pt-br/acesso-a-informacao/perguntas-frequentes) · [Guia da ANPD para o Poder Público](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_orientativo_tratamento_de_dados_pessoais_pelo_poder_publico).


## ALE-29 — tratamento de outliers

O requisito validado determina usar os cinco registros válidos anteriores e sua variação, preservar o valor original e sinalizar leituras tratadas. A equação e o limiar não estavam especificados. Em 21/10/2026, o solicitante autorizou definir a regra para o protótipo e revisá-la depois, se necessário.

### Regra determinística definida para o protótipo

1. Ordenar por horário e usar os cinco registros válidos imediatamente anteriores da mesma estação/série, variável e unidade. Válido significa passar a indicação de qualidade da fonte e conter valor numérico finito, horário e unidade coerentes. Não criar limites físicos adicionais.
2. Se faltarem cinco registros, houver mistura de estação/variável/unidade ou a cadência for incompatível, sinalizar janela insuficiente/incompatível e não suavizar. Comparar os intervalos de x₁ até x₆ com a cadência nominal declarada pela fonte, considerando a resolução dos timestamps. Se a fonte não declarar cadência, exigir que todos esses intervalos sejam iguais após truncamento à menor unidade de tempo presente nos timestamps. Não juntar séries diferentes.
3. Para os cinco valores x₁ … x₅, calcular quatro variações consecutivas Δᵢ = xᵢ − xᵢ₋₁ (i=2…5) e projetar x̂₆ = x₅ + mediana(Δ₂ … Δ₅).
4. Calcular mΔ = mediana(Δ₂ … Δ₅) e MADΔ = mediana(|Δᵢ − mΔ|). Se MADΔ > 0, usar s = 1,4826 × MADΔ e marcar x₆ como candidata a outlier quando |x₆ − x̂₆| > 3 × s. Igualdade ao limite não é outlier.
5. Se MADΔ = 0, o limite é zero; qualquer diferença não nula entre a leitura atual e a projeção é candidata a outlier. Como isso pode marcar mudança real de patamar, preservar o original e exigir revisão humana.
6. Para outlier, a série tratada usa x̂₆ e guarda também x₆, método, janela, horário e indicador de tratamento. Caso contrário, usa o original.
7. Aplicar sem alteração os limites ALE-5 ao valor bruto e ao tratado. Se qualquer um alcançar gatilho, registrar pré-alerta e priorizar verificação do operador, sem publicação automática.
8. O operador revisa o caso; o algoritmo não declara erro de sensor nem publica alerta ao cidadão por conta própria.

### Exemplos

- Janela [10, 12, 11, 13, 12]: variações +2, −1, +2, −1; mediana 0,5; projeção 12,5. MADΔ = 1,5; s = 2,2239; limite ≈ 6,6717. Valor atual 40 tem resíduo 27,5, torna-se candidato a outlier e recebe valor tratado 12,5. O original 40 permanece e também é verificado contra ALE-5.
- Janela [10, 10, 10, 10, 10]: projeção 10, MADΔ = 0 e limite 0. Valor atual 11 é candidato; série tratada usa 10, mas 11 permanece e também é verificado quanto a risco. A revisão humana decide se foi falha ou mudança real.

### Justificativa e limites

A mediana das variações representa tendência recente; MAD é uma medida robusta menos sensível a extremos do que desvio-padrão. A escala 1,4826 e o limite de três escalas seguem o detector robusto de Hampel. Com apenas quatro variações, o resultado é triagem, não prova de erro. Mudanças reais podem parecer anomalias, sobretudo com MADΔ = 0; preservar o bruto, testar ambos os valores contra ALE-5 e exigir revisão reduz o risco de ocultar evento. Referências: [NIST — medidas robustas de dispersão](https://www.itl.nist.gov/div898/handbook/eda/section3/eda356.htm), [NIST — detecção de outliers](https://www.itl.nist.gov/div898/handbook/eda/section3/eda35h.htm), [documentação do filtro de Hampel e fator MAD](https://www.mathworks.com/help/signal/ref/hampel.html).

A fórmula e o detector ficam definidos como padrão provisório do protótipo por autorização do solicitante, revisáveis após exemplos da Defesa Civil. Isso não altera ALE-5 nem dispensa revisão humana. Esta etapa registra a regra, mas não implementa o algoritmo; ALE-29 permanece aberta para desenvolvimento e verificação.


## ALE-24 — divulgação externa

Há divergência entre os documentos validados: o PDF prevê download do comunicado para publicação manual em outras redes; RF15/RN13/UC17 do Markdown descreve publicação no Instagram por API após aprovação, com confirmação do operador e alternativa manual se a API falhar.

**Decisão do solicitante em 21/10/2026:** o comunicado aprovado terá download de arquivo PNG/JPEG e uma opção voluntária para o operador compartilhar manualmente no Instagram. O operador escolhe iniciar o compartilhamento e confirma/publica na própria plataforma; não haverá postagem automática pelo backend ou API nesta decisão. O download continua disponível como alternativa quando o compartilhamento pelo dispositivo/plataforma não estiver disponível. Isso preserva a revisão humana e não autoriza integração de publicação automática.

## Divergências do README

O README atual menciona Open-Meteo, WhatsApp e expansão territorial. O piloto e os documentos validados delimitam Presidente Getúlio e as fontes nomeadas nesta análise, e os requisitos de comunicação citam Telegram. A divergência fica registrada para saneamento posterior; este trabalho não reabre ALE-13 (Open-Meteo) nem ALE-23 (WhatsApp), não altera o README e não amplia nem substitui o escopo aprovado.

## Estado das issues e o que falta para fechar a Etapa 1

- **ALE-5 — Done:** conferida, sem mudanças; o solicitante confirmou validação municipal dos critérios. Os documentos aprovados são a fonte de verdade.
- **ALE-6 — In Progress:** política operacional definida para o protótipo: remoção imediata da base ativa, backups até 30 dias, logs técnicos por 30 dias e histórico/auditoria preservados durante a operação. Continua aberta até validação institucional da base legal, aviso/canal de direitos e aceitação da retenção antes de dados reais.
- **ALE-24 — Done:** decisão do solicitante registrada: download e compartilhamento manual opcional no Instagram, sem publicação automática.
- **ALE-29 — In Progress:** fórmula e detector definidos por delegação do solicitante como padrão provisório; implementação/verificação ainda não realizadas. Os limites ALE-5 permanecem intactos.

**Saída desta etapa:** políticas de privacidade e outliers estão definidas para o protótipo. Dados reais e conectores só entram após as confirmações institucionais indicadas acima. Usar somente dados fictícios/sintéticos. Nenhuma das quatro fontes externas será integrada até existir API/acesso aplicável e condições de uso confirmadas.
