import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AlertView } from '../api.js';
import { buildAlertPosterSvg, canExportAlertPoster, createAlertPosterBlob } from './alert-poster.js';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const alert: AlertView = {
  id: 'synthetic-alert',
  title: 'ATENÇÃO PARA CHEIAS',
  summary: 'O Rio Índios pode atingir o nível de atenção às 18h desta sexta-feira.',
  source: 'Fixture local — estação fictícia PG-01',
  area: 'Presidente Getúlio/SC',
  status: 'APPROVED',
  generatedAt: '2026-10-21T12:00:00.000Z',
  expiresAt: '2099-10-22T12:00:00.000Z',
  synthetic: true,
  relatedReadings: [{
    source: 'Fixture local — estação fictícia PG-01',
    metric: 'Precipitação acumulada em 1 hora',
    rawValue: 5.2,
    rawUnit: 'cm',
    normalizedValue: 52,
    normalizedUnit: 'mm',
    observedAt: '2026-10-21T12:00:00.000Z',
    area: 'Presidente Getúlio/SC',
    synthetic: true,
  }],
};

describe('approved synthetic alert poster', () => {
  it('exports only approved synthetic alerts that have not expired', () => {
    expect(canExportAlertPoster(alert, Date.parse('2026-10-21T12:01:00Z'))).toBe(true);
    expect(canExportAlertPoster({ ...alert, status: 'IN_ANALYSIS' }, Date.parse('2026-10-21T12:01:00Z'))).toBe(false);
    expect(canExportAlertPoster({ ...alert, status: 'REJECTED' }, Date.parse('2026-10-21T12:01:00Z'))).toBe(false);
    expect(canExportAlertPoster({ ...alert, status: 'EXPIRED' }, Date.parse('2026-10-21T12:01:00Z'))).toBe(false);
    expect(canExportAlertPoster(alert, Date.parse('2099-10-22T12:00:00Z'))).toBe(false);
    expect(canExportAlertPoster({ ...alert, synthetic: false } as unknown as AlertView, Date.parse('2026-10-21T12:01:00Z'))).toBe(false);
  });

  it('renders approved copy, synthetic readings, municipality, dates, and a prominent demo disclaimer', () => {
    const svg = buildAlertPosterSvg(alert);
    const document = new DOMParser().parseFromString(svg, 'image/svg+xml');
    const text = [...document.querySelectorAll('text')].map((node) => node.textContent).join(' ');
    expect(text).toContain('ATENÇÃO PARA CHEIAS');
    expect(text).toContain('O Rio Índios pode atingir o nível de atenção às 18h desta sexta-feira.');
    expect(text).toContain('Precipitação acumulada em 1 hora: 5.2 cm → 52 mm');
    expect(text).toContain('Presidente Getúlio/SC');
    expect(text).toContain('MATERIAL DE DEMONSTRAÇÃO');
    expect(text).toContain('não representam condição atual');
    expect(svg).toContain('width="1080"');
  });

  it('escapes untrusted alert text before embedding it in SVG markup', () => {
    const svg = buildAlertPosterSvg({ ...alert, title: '<script>alert("x")</script>' });
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
  });

  it.each([
    { format: 'png' as const, mime: 'image/png' },
    { format: 'jpeg' as const, mime: 'image/jpeg' },
  ])('rasterizes the vector poster at 2x resolution as $format', async ({ format, mime }) => {
    class LoadedSvgImage {
      naturalWidth = 1080;
      naturalHeight = 1460;
      onload: ((event: Event) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      set src(_value: string) { queueMicrotask(() => this.onload?.(new Event('load'))); }
    }
    vi.stubGlobal('Image', LoadedSvgImage as unknown as typeof Image);
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn().mockReturnValue('blob:poster'),
      revokeObjectURL: vi.fn(),
    } as unknown as typeof URL);
    const context = { scale: vi.fn(), drawImage: vi.fn() };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback, type) => {
      callback(new Blob(['encoded'], { type: type ?? 'image/png' }));
    });
    const canvas = document.createElement('canvas');
    vi.spyOn(document, 'createElement').mockReturnValueOnce(canvas);

    const blob = await createAlertPosterBlob(alert, format);

    expect(blob.type).toBe(mime);
    expect(canvas.width).toBe(2160);
    expect(canvas.height).toBe(2920);
    expect(context.scale).toHaveBeenCalledWith(2, 2);
    expect(context.drawImage).toHaveBeenCalled();
  });
});
