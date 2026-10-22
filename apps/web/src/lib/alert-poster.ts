import type { AlertView } from '../api.js';

export type AlertPosterFormat = 'png' | 'jpeg';

const width = 1080;
const padding = 64;
const contentWidth = width - padding * 2;

export function canExportAlertPoster(alert: AlertView, now = Date.now()): boolean {
  return alert.synthetic === true
    && alert.status === 'APPROVED'
    && Number.isFinite(new Date(alert.expiresAt).getTime())
    && new Date(alert.expiresAt).getTime() > now;
}

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  })[character] ?? character);
}

function wrapText(value: string, maxCharacters: number): string[] {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && next.length > maxCharacters) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

function textLines(value: string, x: number, y: number, maxCharacters: number, lineHeight: number, className: string): string {
  return wrapText(value, maxCharacters).map((line, index) =>
    `<text class="${className}" x="${x}" y="${y + index * lineHeight}">${escapeXml(line)}</text>`,
  ).join('');
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(date)
    : 'Data indisponível';
}

export function buildAlertPosterSvg(alert: AlertView): string {
  const titleLines = wrapText(alert.title, 20);
  const summaryLines = wrapText(alert.summary, 31);
  const readingLines = alert.relatedReadings.flatMap((reading) => wrapText(
    `${reading.metric}: ${reading.rawValue} ${reading.rawUnit} → ${reading.normalizedValue} ${reading.normalizedUnit}`,
    30,
  ));
  const headerHeight = 300 + Math.max(0, titleLines.length - 1) * 74;
  const summaryTop = headerHeight + 42;
  const summaryHeight = 170 + summaryLines.length * 50;
  const hasReadings = alert.relatedReadings.length > 0;
  const readingTop = summaryTop + summaryHeight + 28;
  const readingHeight = hasReadings ? 164 + readingLines.length * 40 : 0;
  const noticeTop = readingTop + readingHeight + 28;
  const noticeHeight = 184;
  const footerTop = noticeTop + noticeHeight + 28;
  const height = Math.max(1440, footerTop + 194);
  const summaryIconX = padding + 56;
  const summaryTextX = padding + 306;
  const readingTextX = padding + 306;
  const svgReadings = hasReadings ? `
    <rect x="${padding}" y="${readingTop}" width="${contentWidth}" height="${readingHeight}" rx="32" fill="#dceefb"/>
    <text class="section" x="${padding + 306}" y="${readingTop + 54}">LEITURAS RELACIONADAS</text>
    <text class="synthetic-label" x="${padding + 306}" y="${readingTop + 88}">DADOS SINTÉTICOS</text>
    <g aria-hidden="true">
      <circle cx="${summaryIconX + 78}" cy="${readingTop + 112}" r="46" fill="#9ec2e5"/>
      <circle cx="${summaryIconX + 126}" cy="${readingTop + 98}" r="56" fill="#7ea9d4"/>
      <circle cx="${summaryIconX + 174}" cy="${readingTop + 116}" r="40" fill="#9ec2e5"/>
      <path d="M${summaryIconX + 78} ${readingTop + 158}l-14 28m64-28l-14 28m64-28l-14 28" stroke="#2177b8" stroke-width="13" stroke-linecap="round"/>
      <path d="M${summaryIconX + 4} ${readingTop + 196}c48-25 96 25 144 0s96 25 144 0" fill="none" stroke="#65bce3" stroke-width="11" stroke-linecap="round"/>
    </g>
    ${readingLines.map((line, index) => `<text class="reading" x="${readingTextX}" y="${readingTop + 126 + index * 40}">${escapeXml(line)}</text>`).join('')}
  ` : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Comunicado sintético aprovado para demonstração">
  <defs>
    <style>
      text { font-family: Arial, Helvetica, sans-serif; }
      .kicker { font-size: 28px; font-weight: 700; letter-spacing: 3px; fill: #fff4e8; }
      .title { font-size: 64px; font-weight: 800; fill: #fff; }
      .area { font-size: 34px; font-weight: 600; fill: #fff; }
      .section { font-size: 26px; font-weight: 800; letter-spacing: 2px; fill: #253246; }
      .synthetic-label { font-size: 20px; font-weight: 700; letter-spacing: 2px; fill: #23608a; }
      .body { font-size: 38px; fill: #111827; }
      .reading { font-size: 27px; fill: #162d46; }
      .warning { font-size: 22px; font-weight: 700; fill: #633c00; }
      .footer { font-size: 27px; font-weight: 700; fill: #fff; }
      .footer-small { font-size: 22px; fill: #e1e8f5; }
    </style>
  </defs>
  <rect width="${width}" height="${height}" fill="#f4f5f7"/>
  <rect width="${width}" height="${headerHeight}" fill="#ed6500"/>
  <text class="kicker" x="${padding}" y="72">ALERTA MUNICIPAL</text>
  ${titleLines.map((line, index) => `<text class="title" x="${padding}" y="${160 + index * 74}">${escapeXml(line)}</text>`).join('')}
  <text class="area" x="${padding}" y="${headerHeight - 38}">${escapeXml(alert.area)}</text>

  <rect x="${padding}" y="${summaryTop}" width="${contentWidth}" height="${summaryHeight}" rx="32" fill="#fff"/>
  <text class="section" x="${padding + 42}" y="${summaryTop + 58}">COMUNICADO APROVADO</text>
  <g aria-hidden="true">
    <path d="M${summaryIconX} ${summaryTop + 150}c42-50 94-52 136-21s71 28 112-2c-30 52-64 73-109 68s-77-34-139-45z" fill="#70aa66"/>
    <path d="M${summaryIconX + 88} ${summaryTop + 112}c-23 32 48 41 4 75s-29 52 21 73c-12-34 52-40 20-71s-25-44 4-70z" fill="#45a9df" stroke="#fff" stroke-width="7"/>
    <path d="M${summaryIconX + 13} ${summaryTop + 191}c25 7 48 7 72-2m99-2c22-4 42-14 61-31" fill="none" stroke="#9bc987" stroke-width="10" stroke-linecap="round"/>
  </g>
  ${textLines(alert.summary, summaryTextX, summaryTop + 120, 31, 50, 'body')}
  ${svgReadings}

  <rect x="${padding}" y="${noticeTop}" width="${contentWidth}" height="${noticeHeight}" rx="28" fill="#fff0c2" stroke="#e78300" stroke-width="5"/>
  <g aria-hidden="true">
    <path d="M${padding + 64} ${noticeTop + 134}v-56l56-46 58 46v56h-38v-42h-39v42z" fill="#fff" stroke="#1f2937" stroke-width="8" stroke-linejoin="round"/>
    <path d="M${padding + 238} ${noticeTop + 37}l44 78h-88z" fill="#ffc83d" stroke="#1f2937" stroke-width="7" stroke-linejoin="round"/>
    <path d="M${padding + 238} ${noticeTop + 62}v24m0 13v2" stroke="#1f2937" stroke-width="8" stroke-linecap="round"/>
  </g>
  <text class="warning" x="${padding + 330}" y="${noticeTop + 61}">MATERIAL DE DEMONSTRAÇÃO</text>
  <text class="warning" x="${padding + 330}" y="${noticeTop + 105}">Dados sintéticos; não representam condição atual.</text>
  <text class="warning" x="${padding + 330}" y="${noticeTop + 145}">Não usar como alerta operacional.</text>

  <rect y="${footerTop}" width="${width}" height="${height - footerTop}" fill="#14284e"/>
  <text class="footer" x="${padding}" y="${footerTop + 52}">Defesa Civil: 199</text>
  <text class="footer" x="${padding + 500}" y="${footerTop + 52}">Bombeiros: 193</text>
  <text class="footer-small" x="${padding}" y="${footerTop + 99}">Pres. Getúlio - SC · ${escapeXml(formatDate(alert.generatedAt))} · AlertaSC</text>
  <text class="footer-small" x="${padding}" y="${footerTop + 145}">Gerado para demonstração · expira ${escapeXml(formatDate(alert.expiresAt))}</text>
</svg>`;
}

export async function createAlertPosterBlob(alert: AlertView, format: AlertPosterFormat): Promise<Blob> {
  const svgBlob = new Blob([buildAlertPosterSvg(alert)], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Não foi possível compor a imagem do comunicado.'));
      image.src = svgUrl;
    });
    const scale = 2;
    const renderedWidth = image.naturalWidth;
    const renderedHeight = image.naturalHeight;
    if (renderedWidth <= 0 || renderedHeight <= 0) throw new Error('A arte do comunicado ficou vazia.');
    const canvas = document.createElement('canvas');
    canvas.width = renderedWidth * scale;
    canvas.height = renderedHeight * scale;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Exportação de imagem não está disponível neste navegador.');
    context.scale(scale, scale);
    context.drawImage(image, 0, 0);
    const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mimeType, 0.94));
    if (!blob) throw new Error('Não foi possível gerar o arquivo do comunicado.');
    return blob;
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

export async function downloadAlertPoster(alert: AlertView, format: AlertPosterFormat): Promise<void> {
  if (!canExportAlertPoster(alert)) throw new Error('Somente alertas aprovados e dentro da validade podem ser exportados.');
  const blob = await createAlertPosterBlob(alert, format);
  downloadBlob(blob, posterFilename(alert, format));
}

export type ManualShareResult = 'shared' | 'downloaded' | 'cancelled';

function posterFilename(alert: AlertView, format: AlertPosterFormat): string {
  const generatedTime = new Date(alert.generatedAt).getTime();
  const stamp = Number.isFinite(generatedTime) ? new Date(generatedTime).toISOString().slice(0, 10) : 'sem-data';
  return `alertasc-comunicado-sintetico-${stamp}.${format === 'jpeg' ? 'jpg' : 'png'}`;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function shareAlertPoster(alert: AlertView): Promise<ManualShareResult> {
  if (!canExportAlertPoster(alert)) throw new Error('Somente alertas aprovados e dentro da validade podem ser compartilhados.');
  const blob = await createAlertPosterBlob(alert, 'png');
  const filename = posterFilename(alert, 'png');
  const file = new File([blob], filename, { type: 'image/png' });
  const shareData: ShareData = { files: [file], title: 'Comunicado AlertaSC' };
  const shareAvailable = typeof navigator.share === 'function'
    && typeof navigator.canShare === 'function'
    && navigator.canShare({ files: [file] });

  if (shareAvailable) {
    try {
      await navigator.share(shareData);
      return 'shared';
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return 'cancelled';
    }
  }

  downloadBlob(blob, filename);
  return 'downloaded';
}
