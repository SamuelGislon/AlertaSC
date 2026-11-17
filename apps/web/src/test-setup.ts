import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

if (!('PointerEvent' in window)) {
  class PointerEventShim extends MouseEvent {
    readonly pointerId = 1;
    readonly pointerType = 'mouse';
    readonly isPrimary = true;
  }

  Object.defineProperty(window, 'PointerEvent', { value: PointerEventShim });
}

afterEach(() => cleanup());
