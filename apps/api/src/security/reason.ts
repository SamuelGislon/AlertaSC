import { BadRequestException } from '@nestjs/common';

const SENSITIVE_REASON_PATTERNS = [
  /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/,
  /(?:\+?55\s*)?\(?\d{2}\)?\s*9?\d{4,5}[-\s]?\d{4}\b/,
  /\b\d{5}-?\d{3}\b/,
  /-?\d{1,3}\.\d{3,}\s*[,;/ ]\s*-?\d{1,3}\.\d{3,}/,
  /\b(password|senha|token|authorization|bearer)\b/i,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
];

export function safeReviewReason(value: unknown): string {
  if (typeof value !== 'string') throw new BadRequestException('reason_invalid');
  const normalized = value.trim();
  if (normalized.length < 3 || normalized.length > 300) throw new BadRequestException('reason_invalid');
  if (SENSITIVE_REASON_PATTERNS.some((pattern) => pattern.test(normalized))) {
    throw new BadRequestException('reason_contains_sensitive_data');
  }
  return normalized;
}
