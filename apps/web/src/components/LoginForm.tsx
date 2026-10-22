import { useState, type FormEvent } from 'react';

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
    <form onSubmit={submit} className="surface-card login-card">
      <div>
        <h1 className="text-2xl font-bold">Entrar no AlertaSC</h1>
        <p className="mt-1 text-sm text-slate-600">Acesso destinado à equipe municipal autorizada.</p>
      </div>
      <label className="field">
        <span>CPF</span>
        <input aria-label="CPF" autoComplete="username" inputMode="numeric" required value={cpf}
          onChange={(event) => setCpf(event.target.value)}
          className="login-input" />
      </label>
      <label className="field">
        <span>Senha</span>
        <input aria-label="Senha" autoComplete="current-password" required type="password" value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="login-input" />
      </label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button disabled={submitting} className="button button-primary login-submit">
        {submitting ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  );
}
