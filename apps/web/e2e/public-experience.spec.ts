import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/auth/refresh', (route) => route.fulfill({
    status: 401,
    contentType: 'application/json',
    body: JSON.stringify({ message: 'Sem sessão de teste.' }),
  }));
});

test('keeps the public panel within the five supported viewport widths', async ({ page }) => {
  for (const viewport of [
    { width: 320, height: 740 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page).toHaveTitle('Clima em Alerta — Presidente Getúlio');
    await expect(page.getByRole('heading', { name: /Acompanhe as condições em Presidente Getúlio/ })).toBeVisible();

    const layout = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      visibleWidth: document.documentElement.clientWidth,
      mobileNavigation: getComputedStyle(document.querySelector('.bottom-nav')!).display,
      desktopNavigation: getComputedStyle(document.querySelector('.main-nav')!).display,
    }));
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.visibleWidth);
    if (viewport.width <= 700) {
      expect(layout.mobileNavigation).toBe('flex');
      expect(layout.desktopNavigation).toBe('none');
    } else {
      expect(layout.mobileNavigation).toBe('none');
      expect(layout.desktopNavigation).toBe('flex');
    }
  }
});

test('moves between public, synthetic citizen, feedback and operator sign-in views', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await page.getByRole('button', { name: 'Preferências de avisos' }).click();
  await expect(page.getByRole('heading', { name: 'Portal do cidadão' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /Concordo em criar um cadastro somente para esta demonstração sintética/ })).toBeVisible();
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await page.getByRole('button', { name: 'Voltar ao painel público' }).click();

  await page.getByRole('button', { name: 'Retorno', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Este aviso foi útil?' })).toBeVisible();
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await page.getByLabel('Sua avaliação').selectOption('useful');
  await page.getByRole('button', { name: 'Enviar retorno' }).click();
  await expect(page.getByRole('status')).toContainText('Nenhum dado foi enviado ou persistido');

  await page.getByRole('button', { name: 'Início', exact: true }).click();
  await page.getByRole('button', { name: 'Acesso do operador' }).click();
  await expect(page.getByRole('heading', { name: 'Entrar no Clima em Alerta' })).toBeVisible();
  await expect(page.getByText(/Não há cadastro público de operadores/)).toBeVisible();
});

test('keeps the authenticated operator shell and its synthetic screens responsive', async ({ page }) => {
  await page.route('**/api/v1/auth/login', (route) => route.fulfill({
    status: 201,
    contentType: 'application/json',
    body: JSON.stringify({
      accessToken: 'e2e-synthetic-access-token',
      operator: { id: 'operator-e2e-synthetic', roles: ['ADMIN', 'OPERATOR'] },
    }),
  }));
  await page.route('**/api/v1/alert-tab/acquire', (route) => route.fulfill({
    status: 201, contentType: 'application/json', body: JSON.stringify({ acquired: true }),
  }));
  await page.route('**/api/v1/alert-tab/release', (route) => route.fulfill({
    status: 201, contentType: 'application/json', body: JSON.stringify({ released: true }),
  }));
  await page.route('**/api/v1/alerts', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify([]),
  }));
  await page.route('**/api/v1/admin/operators', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify([]),
  }));
  await page.route('**/api/v1/admin/citizens', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify([]),
  }));
  await page.route('http://localhost:3001/**', (route) => route.abort());

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Operador', exact: true }).click();
  await page.getByLabel('CPF').fill('00000000000');
  await page.getByLabel('Senha').fill('e2e-synthetic-password');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('navigation', { name: 'Navegação móvel' })).toBeVisible();
  await expect(page.locator('.bottom-nav').getByRole('button', { name: 'Resumo', exact: true })).toBeVisible();

  await page.locator('.bottom-nav').getByRole('button', { name: 'Resumo', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Visão geral operacional' })).toBeVisible();
  await page.locator('.bottom-nav').getByRole('button', { name: 'Monitoramento', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Monitoramento por região' })).toBeVisible();
  await page.locator('.bottom-nav').getByRole('button', { name: 'Auditoria', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Histórico e auditoria' })).toBeVisible();
  await page.locator('.bottom-nav').getByRole('button', { name: 'Administração', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Operadores API' })).toBeVisible();
  await page.getByRole('tab', { name: 'Cadastros API' }).click();
  await expect(page.getByRole('heading', { name: 'Cadastros API' })).toBeVisible();

  for (const viewport of [
    { width: 320, height: 740 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    const navigation = page.locator(viewport.width <= 700 ? '.bottom-nav' : '.main-nav');
    if (viewport.width <= 700) {
      await expect(page.locator('.bottom-nav')).toBeVisible();
      await expect(page.locator('.main-nav')).toBeHidden();
    } else {
      await expect(page.locator('.bottom-nav')).toBeHidden();
      await expect(page.locator('.main-nav')).toBeVisible();
    }

    for (const destination of [
      { label: 'Resumo', content: /Visão geral operacional/ },
      { label: 'Monitoramento', content: /Monitoramento por região/ },
      { label: 'Alertas', content: /Fila de alertas|A aba de alertas/ },
      { label: 'Auditoria', content: /Histórico e auditoria/ },
      { label: 'Administração', content: /Operadores API|Cadastros API/ },
    ]) {
      await navigation.getByRole('button', { name: destination.label, exact: true }).click();
      await expect(page.locator('#main-content')).toContainText(destination.content);
      const width = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        visibleWidth: document.documentElement.clientWidth,
        overflowingElements: Array.from(document.querySelectorAll<HTMLElement>('*'))
          .map((element) => ({
            tag: element.tagName,
            className: typeof element.className === 'string' ? element.className : '',
            text: element.innerText?.slice(0, 60),
            right: Math.round(element.getBoundingClientRect().right),
          }))
          .filter((element) => element.right > document.documentElement.clientWidth + 1)
          .slice(0, 5),
      }));
      expect(width.documentWidth, JSON.stringify(width.overflowingElements)).toBeLessThanOrEqual(width.visibleWidth);
    }
  }
});

test('demonstrates one Rio Índios alert from operator approval to public preview and poster download', async ({ page }) => {
  let alertStatus = 'AWAITING_TRIAGE';
  const demoAlert = () => ({
    id: 'rio-indios-video-demo',
    title: 'Atenção para cheias — Rio Índios',
    summary: 'Acompanhe as condições do Rio Índios e siga as orientações da Defesa Civil.',
    source: 'Fixture local — estação  PG-01',
    area: 'Rio Índios — Presidente Getúlio/SC',
    status: alertStatus,
    generatedAt: '2026-11-16T12:00:00.000Z',
    expiresAt: '2099-11-17T12:00:00.000Z',
    synthetic: true,
    relatedReadings: [
      {
        source: 'Fixture local — estação  PG-01',
        metric: 'Precipitação acumulada em 1 hora',
        rawValue: 5.2,
        rawUnit: 'cm',
        normalizedValue: 52,
        normalizedUnit: 'mm',
        observedAt: '2026-11-16T11:50:00.000Z',
        area: 'Rio Índios — Presidente Getúlio/SC',
        synthetic: true,
      },
      {
        source: 'Fixture local — régua  RI-01',
        metric: 'Nível do Rio Índios',
        rawValue: 4.5,
        rawUnit: 'm',
        normalizedValue: 4.5,
        normalizedUnit: 'm',
        observedAt: '2026-11-16T11:55:00.000Z',
        area: 'Rio Índios — Presidente Getúlio/SC',
        synthetic: true,
      },
    ],
  });

  await page.route('**/api/v1/auth/login', (route) => route.fulfill({
    status: 201,
    contentType: 'application/json',
    body: JSON.stringify({
      // This mocked API flow has no Socket.IO server; an empty token leaves the granted demo lock stable.
      accessToken: '',
      operator: { id: 'operator-video-demo', roles: ['OPERATOR'] },
    }),
  }));
  await page.route('**/api/v1/auth/logout', (route) => route.fulfill({ status: 204 }));
  await page.route('**/api/v1/alert-tab/acquire', (route) => route.fulfill({
    status: 201, contentType: 'application/json', body: JSON.stringify({ acquired: true }),
  }));
  await page.route('**/api/v1/alert-tab/release', (route) => route.fulfill({
    status: 201, contentType: 'application/json', body: JSON.stringify({ released: true }),
  }));
  await page.route('**/api/v1/alerts', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify([demoAlert()]),
  }));
  await page.route('**/api/v1/alerts/*/claim', (route) => route.fulfill({
    status: 201, contentType: 'application/json', body: JSON.stringify({ claimed: true }),
  }));
  await page.route('**/api/v1/alerts/*/transition', (route) => {
    alertStatus = route.request().postDataJSON().status;
    return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ status: alertStatus }) });
  });
  await page.route('**/api/v1/alerts/*/audit', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([{
      id: 'audit-video-demo-approved',
      actorId: 'operator-video-demo',
      action: 'ALERT_STATUS_CHANGED',
      occurredAt: '2026-11-16T13:00:00.000Z',
      previousState: 'IN_ANALYSIS',
      newState: 'APPROVED',
      reason: 'Revisão sintética concluída para demonstração.',
      metadata: { synthetic: true },
    }]),
  }));
  await page.route('http://localhost:3001/**', (route) => route.abort());

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ]) {
    alertStatus = 'AWAITING_TRIAGE';
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page).toHaveTitle('Clima em Alerta — Presidente Getúlio');
    await expect(page.getByRole('button', { name: 'Ver no painel público' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Acesso do operador' }).click();
    await expect(page.getByRole('heading', { name: 'Entrar no Clima em Alerta' })).toBeVisible();
    await page.getByLabel('CPF').fill('00000000000');
    await page.getByLabel('Senha').fill('e2e-synthetic-password');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByRole('heading', { name: 'Fila de alertas' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Atenção para cheias — Rio Índios' })).toBeVisible();

    await page.getByRole('button', { name: 'Assumir alerta' }).click();
    await expect(page.getByLabel('Motivo da decisão')).toBeVisible();
    await page.getByLabel('Motivo da decisão').fill('Revisão sintética concluída para demonstração.');
    await page.getByRole('button', { name: 'Aprovar' }).click();
    await expect(page.getByText('Aprovado', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Histórico da auditoria' }).click();
    await expect(page.getByText('Estado do alerta alterado', { exact: true })).toBeVisible();
    await expect(page.getByText(/Motivo: Revisão sintética concluída para demonstração\./)).toBeVisible();
    await page.getByRole('button', { name: 'Ver no painel público' }).click();
    await expect(page.getByRole('heading', { name: 'Atenção para cheias — Rio Índios' })).toBeVisible();
    await expect(page.getByText('Rio Índios — Presidente Getúlio/SC')).toBeVisible();
    await expect(page.getByText('4,5 m')).toBeVisible();
    await expect(page.getByText('Dados API')).toHaveCount(1);
    await expect(page.getByText(/não representa observações meteorológicas reais|demonstração sintética|valores API usados/i)).toHaveCount(0);
    await expect(page.getByText('Fixture local — régua  RI-01')).toHaveCount(0);
    await expect(page.getByText('Estado do alerta alterado', { exact: true })).toHaveCount(0);
    await expect(page.getByText('operator-video-demo', { exact: true })).toHaveCount(0);

    const previewWidth = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
    }));
    expect(previewWidth.document).toBeLessThanOrEqual(previewWidth.viewport);
    await page.getByRole('button', { name: 'Voltar à fila' }).click();
    await expect(page.getByRole('heading', { name: 'Fila de alertas' })).toBeVisible();
    await page.getByRole('button', { name: 'Pré-visualizar arte do comunicado' }).click();
    await expect(page.getByRole('dialog', { name: /Pré-visualização do comunicado/ })).toBeVisible();
    await expect(page.getByRole('img', { name: 'Prévia do comunicado gerado por IA aprovado' })).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Mais ações do comunicado' }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: 'Baixar comunicado em PNG' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/alertasc-comunicado-sintetico-.*\.png/);

    await page.getByRole('button', { name: 'Sair' }).click();
    await expect(page.getByRole('heading', { name: /Acompanhe as condições em Presidente Getúlio/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Atenção para cheias — Rio Índios' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Ver no painel público' })).toHaveCount(0);
  }
});
