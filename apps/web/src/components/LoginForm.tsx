import { useState, type FormEvent } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert.js';
import { Button } from '@/components/ui/button.js';
import { Card } from '@/components/ui/card.js';
import { Field, FieldLabel } from '@/components/ui/field.js';
import { Input } from '@/components/ui/input.js';

interface LoginFormProps {
  onSubmit: (credentials: { cpf: string; password: string }) => Promise<void>;
  error?: string | null;
}

export function LoginForm({ onSubmit, error }: LoginFormProps) {
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try { await onSubmit({ cpf, password }); }
    finally { setSubmitting(false); }
  }

  return (
    <form onSubmit={submit} className="login-form">
      <Card className="surface-card login-card">
      <div>
        <h1 className="text-2xl font-bold">Entrar no Clima em Alerta</h1>
        <p className="mt-1 text-sm text-slate-600">Acesso destinado à equipe municipal autorizada.</p>
      </div>
      <Field className="field">
        <FieldLabel htmlFor="operator-cpf">CPF</FieldLabel>
        <Input id="operator-cpf" autoComplete="username" inputMode="numeric" required value={cpf}
          onChange={(event) => setCpf(event.target.value)}
          className="login-input" />
      </Field>
      <Field className="field">
        <FieldLabel htmlFor="operator-password">Senha</FieldLabel>
        <Input id="operator-password" autoComplete="current-password" required type="password" value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="login-input" />
      </Field>
      {error && <Alert variant="destructive" className="text-sm text-red-700"><AlertDescription>{error}</AlertDescription></Alert>}
      <Button type="submit" disabled={submitting} className="button button-primary login-submit">
        {submitting ? 'Entrando…' : 'Entrar'}
      </Button>
      </Card>
    </form>
  );
}
