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
  await expect(page.getByLabel(/Concordo em criar um cadastro somente para esta demonstração sintética/)).toBeVisible();
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
  await expect(page.getByRole('heading', { name: 'Entrar no AlertaSC' })).toBeVisible();
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
  await expect(page.getByRole('heading', { name: 'Operadores sintéticos' })).toBeVisible();
  await page.getByRole('tab', { name: 'Cadastros sintéticos' }).click();
  await expect(page.getByRole('heading', { name: 'Cadastros sintéticos' })).toBeVisible();

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
      { label: 'Administração', content: /Operadores sintéticos|Cadastros sintéticos/ },
    ]) {
      await navigation.getByRole('button', { name: destination.label, exact: true }).click();
      await expect(page.locator('#main-content')).toContainText(destination.content);
      const width = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        visibleWidth: document.documentElement.clientWidth,
      }));
      expect(width.documentWidth).toBeLessThanOrEqual(width.visibleWidth);
    }
  }
});
