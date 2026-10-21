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

- A Defesa Civil municipal indicará uma pessoa responsável e o sistema terá uma conta individual para essa pessoa.
- O cidadão opta voluntariamente por se cadastrar e pode remover seu cadastro quando quiser.
- O alerta expira 24 horas depois de gerado. A expiração encerra sua validade de comunicação e **não apaga** o histórico/auditoria do alerta.
- Logs não devem conter dados sensíveis ou pessoais desnecessários.

### Política mínima recomendada e limites da decisão

- A etapa inicial usa somente dados fictícios/sintéticos, sem dados pessoais e sem licença de fornecedor externo. Conectores reais só entram após credencial, autorização e condições de uso/redistribuição documentadas.
- Dados de cadastro do cidadão ficam ativos somente enquanto a inscrição estiver ativa e para enviar alertas conforme os dados e a finalidade informados. Ao pedir remoção, o cidadão deve ser excluído imediatamente dos próximos envios e seus dados identificáveis devem ser removidos da base ativa; preferências vinculadas são removidas junto. Não manter cadastro de supressão identificável sem necessidade e aprovação institucional.
- O histórico de alertas e decisões é preservado conforme os requisitos, mas sem telefone, endereço, geolocalização ou outra identificação do cidadão. A expiração após 24 horas altera o estado/validade do alerta, não apaga esse histórico.
- Armazenar somente as cinco últimas observações válidas necessárias à análise de outliers, além dos dados mínimos já associados a alertas que precisam ter histórico preservado. Dados fictícios de desenvolvimento podem ser versionados como fixtures, desde que não reproduzam pessoas reais.
- Logs contêm somente metadados técnicos mínimos (evento, horário, resultado/código de erro e identificadores operacionais sem dados pessoais); nunca registrar telefone, credenciais, tokens, endereço ou coordenadas identificáveis. Trilha de auditoria do alerta permanece separada desses logs.
- Não há prazo geral fixado pela LGPD para todos os dados pessoais: a retenção depende da finalidade e das hipóteses aplicáveis; encerrado o tratamento, a lei prevê eliminação, ressalvadas hipóteses de conservação. Como regra operacional proposta, remover os dados ativos do cidadão no descadastro e não atribuir prazo numérico a históricos/logs até a instituição aprovar a tabela de temporalidade e o ciclo de backups.

### Aprovações institucionais ainda necessárias

- Obter confirmação de acesso, termos, atribuição, limites e permissão de uso/redistribuição de cada fonte antes de ativar a respectiva integração.
- A instituição deve designar formalmente o controlador e o responsável/canal de proteção de dados e validar finalidade, base legal (incluindo se consentimento é adequado ao serviço público), aviso de privacidade e atendimento a direitos dos titulares.
- A instituição precisa aprovar a tabela de temporalidade para logs técnicos e cópias de segurança, inclusive suas limitações, antes de tratar dados reais. Nenhum prazo numérico foi criado.
- Confirmar as condições de exclusão em cópias de segurança e documentar a evidência do comportamento de remoção antes do cadastro real de cidadãos.
- A confirmação de estação CEMADEN ativa e termos dos provedores só se torna bloqueadora quando for proposta uma integração real; não bloqueia o protótipo com dados fictícios.

O prazo de 24 horas refere-se à validade do alerta, não à retenção de dados pessoais. A LGPD prevê término do tratamento quando a finalidade se esgota ou há revogação do consentimento, e admite conservação nas hipóteses legais; a ANPD informa que não há prazo geral único e destaca que consentimento no Poder Público pode não ser a base apropriada em todos os contextos. Por isso, as regras acima são uma proposta operacional mínima, não parecer jurídico nem substituto da validação do controlador. [LGPD — arts. 15, 16 e 18](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm) · [FAQ da ANPD — duração do tratamento](https://www.gov.br/anpd/pt-br/acesso-a-informacao/perguntas-frequentes) · [Guia da ANPD para o Poder Público](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_orientativo_tratamento_de_dados_pessoais_pelo_poder_publico).

## ALE-29 — tratamento de outliers

O requisito afirma uso dos **cinco registros válidos anteriores** e da sua variação para suavizar leituras anômalas. A leitura original deve ser preservada, tratamento deve ficar sinalizado e, se a leitura tratada alcançar um gatilho, deve haver indicação de verificação prioritária. O documento não define equação nem limiar que determina se um valor é outlier.

| Opção técnica a avaliar | Exemplo ilustrativo, sem limiar aprovado | Vantagens | Limitações |
| --- | --- | --- | --- |
| Média dos cinco anteriores | `[10, 12, 11, 13, 12]` tem média `11,6`; se uma leitura já classificada como outlier fosse `40`, a substituição candidata seria `11,6`. | Simples e fácil de explicar. | A média é sensível a valores extremos; não representa tendência explicitamente e pode atrasar uma mudança real. |
| Mediana dos cinco anteriores | A mediana de `[10, 12, 11, 13, 12]` é `12`; para uma leitura já classificada como outlier `40`, a substituição candidata seria `12`. | Robusta a valores extremos e simples de calcular. | Descarta tendência; pode achatar uma subida ou queda real. |
| Projeção pela mediana das variações consecutivas | No mesmo histórico, as variações são `+2, -1, +2, -1`; a mediana é `+0,5`; a projeção candidata é `12,5`. Se `40` já tiver sido classificada como outlier, ela seria substituída por `12,5`. | Usa explicitamente a variação recente, compatível com a redação “variação dos últimos cinco registros”. | Cinco valores produzem quatro variações; se o requisito pretendia cinco variações, seria necessário um sexto registro. Pode extrapolar uma tendência que mudou e precisa de validação por variável/unidade. |

**Decisão do solicitante em 21/10/2026:** seguir a recomendação de suavização pela projeção da mediana das variações consecutivas. Para os cinco registros válidos anteriores `x₁ … x₅`, calcular `Δᵢ = xᵢ − xᵢ₋₁` (`i=2…5`) e projetar a leitura tratada como `x̂₆ = x₅ + mediana(Δ₂ … Δ₅)`. A leitura original permanece preservada e identificada; a projeção só substitui a leitura no fluxo tratado quando o detector a marcar como outlier. O exemplo numérico acima é ilustrativo.

Antes de implementar em produção, a Defesa Civil deve validar a regra com leituras representativas. Continua sem definição documental o detector/limiar que decide se a leitura atual é outlier e como lacunas/flags de qualidade afetam a janela. Com histórico insuficiente, sinalizar e não aplicar tratamento, como já determina a issue. A leitura original e a prioridade de verificação continuam obrigatórias.

## ALE-24 — divulgação externa

Há divergência entre os documentos validados: o PDF prevê download do comunicado para publicação manual em outras redes; RF15/RN13/UC17 do Markdown descreve publicação no Instagram por API após aprovação, com confirmação do operador e alternativa manual se a API falhar.

**Decisão do solicitante em 21/10/2026:** o comunicado aprovado terá download de arquivo PNG/JPEG e uma opção voluntária para o operador compartilhar manualmente no Instagram. O operador escolhe iniciar o compartilhamento e confirma/publica na própria plataforma; não haverá postagem automática pelo backend ou API nesta decisão. O download continua disponível como alternativa quando o compartilhamento pelo dispositivo/plataforma não estiver disponível. Isso preserva a revisão humana e não autoriza integração de publicação automática.

## Divergências do README

O README atual menciona Open-Meteo, WhatsApp e expansão territorial. O piloto e os documentos validados delimitam Presidente Getúlio e as fontes nomeadas nesta análise, e os requisitos de comunicação citam Telegram. A divergência fica registrada para saneamento posterior; este trabalho não reabre ALE-13 (Open-Meteo) nem ALE-23 (WhatsApp), não altera o README e não amplia nem substitui o escopo aprovado.

## Estado das issues e o que falta para fechar a Etapa 1

- **ALE-5 — Done:** conferida, sem mudanças; o solicitante confirmou validação municipal dos critérios. Os documentos aprovados são a fonte de verdade.
- **ALE-6 — In Progress:** proposta mínima de privacidade e ciclo de vida registrada. Continua aberta até validação do controlador/responsável institucional e aprovação da tabela de temporalidade de logs/backups; fontes reais permanecem desativadas enquanto termos/permissões não forem obtidos.
- **ALE-24 — Done:** decisão do solicitante registrada: download e compartilhamento manual opcional no Instagram, sem publicação automática.
- **ALE-29 — In Progress:** fórmula pela mediana das variações consecutivas aprovada pelo solicitante; falta validar com a Defesa Civil e definir o detector/limiar antes de implementação em produção.

**Saída necessária para considerar a Etapa 1 fechada:** validar a proposta de privacidade/temporalidade com o responsável institucional e a regra de outlier com a Defesa Civil. Para o protótipo, usar somente dados fictícios/sintéticos. Nenhuma das quatro fontes externas será integrada até existir API/acesso aplicável e condições de uso confirmadas.
