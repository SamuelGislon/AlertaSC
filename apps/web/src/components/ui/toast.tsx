import { Toast } from '@base-ui/react/toast';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './button.js';

const toastManager = Toast.createToastManager();

export function notifySuccess(title: string, description?: string) {
  toastManager.add({ title, description, type: 'success' });
}

function ToastList() {
  const toastManager = Toast.useToastManager();
  const { toasts } = toastManager;

  return toasts.map((toast) => <Toast.Root key={toast.id} toast={toast} className="app-toast">
    <Toast.Content className="app-toast-content">
      <div className="app-toast-copy">
        <Toast.Title className="app-toast-title" />
        <Toast.Description className="app-toast-description" />
      </div>
      <Button type="button" variant="ghost" aria-label="Fechar aviso" className="app-toast-close"
        onClick={() => toastManager.close(toast.id)}><X size={16} aria-hidden="true" /></Button>
    </Toast.Content>
  </Toast.Root>);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  return <Toast.Provider toastManager={toastManager} timeout={4500} limit={3}>
    {children}
    <Toast.Portal>
      <Toast.Viewport className="app-toast-viewport" aria-label="Notificações">
        <ToastList />
      </Toast.Viewport>
    </Toast.Portal>
  </Toast.Provider>;
}
