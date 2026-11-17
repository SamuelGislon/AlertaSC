import { useState, type FormEvent } from 'react';
import { ArrowLeft, CircleCheck } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert.js';
import { Badge } from '@/components/ui/badge.js';
import { Button } from '@/components/ui/button.js';
import { Card } from '@/components/ui/card.js';
import { Field, FieldLabel } from '@/components/ui/field.js';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select.js';
import { notifySuccess } from '@/components/ui/toast.js';

interface CitizenFeedbackProps {
  onNavigate: (destination: 'public') => void;
}

export function CitizenFeedback({ onNavigate }: CitizenFeedbackProps) {
  const [rating, setRating] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (rating) {
      setSubmitted(true);
      notifySuccess('Retorno registrado', 'Esta resposta existe somente nesta demonstração.');
    }
  }

  return <div className="screen-stack">
    <div className="page-heading"><div><p className="eyebrow">Retorno do cidadão</p><h1>Este aviso foi útil?</h1><p className="lead">O retorno é voluntário e não solicita um cadastro de contato.</p></div><Badge variant="secondary" className="status-chip status-warn">Demonstração</Badge></div>
    <div className="content-grid content-grid-2">
      <form className="feedback-form" onSubmit={submit}>
        <Card className="surface-card card-padding">
        <div className="section-heading"><div><h2>Exemplo de aviso de chuva intensa</h2><p>Presidente Getúlio · demonstração</p></div></div>
        <p className="feedback-copy">Aviso de demonstração sobre chuva intensa. Este conteúdo não corresponde a uma condição observada nem a uma orientação oficial.</p>
        <Field className="field">
          <FieldLabel htmlFor="feedback-rating">Sua avaliação</FieldLabel>
          <NativeSelect id="feedback-rating" className="w-full" value={rating} onChange={(event) => { setRating(event.target.value); setSubmitted(false); }}>
            <NativeSelectOption value="">Selecione uma opção</NativeSelectOption><NativeSelectOption value="useful">Foi útil</NativeSelectOption><NativeSelectOption value="not-useful">Não foi útil</NativeSelectOption><NativeSelectOption value="unknown">Não consigo avaliar</NativeSelectOption>
          </NativeSelect>
        </Field>
        <div className="hero-actions feedback-actions">
          <Button type="submit" className="button button-primary" disabled={!rating}>Enviar retorno</Button>
          <Button type="button" variant="outline" className="button button-outline" onClick={() => onNavigate('public')}><ArrowLeft size={16} aria-hidden="true" />Voltar ao painel</Button>
        </div>
        {submitted && <Alert role="status" className="notice notice-success"><CircleCheck className="notice-icon" aria-hidden="true" /><AlertDescription>Retorno sintético registrado apenas nesta demonstração. Nenhum dado foi enviado ou persistido.</AlertDescription></Alert>}
        <p className="caption">A avaliação existe apenas no estado desta tela e é descartada ao sair.</p>
        </Card>
      </form>
      <Card className="surface-card card-padding">
        <h2>Privacidade</h2>
        <p className="feedback-copy">Este formulário não pede nome, telefone, endereço ou localização. O protótipo não envia nem persiste a resposta.</p>
        <Badge variant="secondary" className="status-chip status-good">Sem dados reais</Badge>
      </Card>
    </div>
  </div>;
}
