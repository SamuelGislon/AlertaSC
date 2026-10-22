import { useState, type FormEvent } from 'react';

interface CitizenFeedbackProps {
  onNavigate: (destination: 'public') => void;
}

export function CitizenFeedback({ onNavigate }: CitizenFeedbackProps) {
  const [rating, setRating] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (rating) setSubmitted(true);
  }

  return <div className="screen-stack">
    <div className="page-heading"><div><p className="eyebrow">Retorno do cidadão</p><h1>Este aviso foi útil?</h1><p className="lead">O retorno é voluntário e não solicita um cadastro de contato.</p></div><span className="status-chip status-warn">Demonstração</span></div>
    <div className="content-grid content-grid-2">
      <form className="surface-card card-padding" onSubmit={submit}>
        <div className="section-heading"><div><h2>Exemplo de aviso de chuva intensa</h2><p>Presidente Getúlio · demonstração</p></div></div>
        <p className="feedback-copy">Aviso de demonstração sobre chuva intensa. Este conteúdo não corresponde a uma condição observada nem a uma orientação oficial.</p>
        <label className="field" htmlFor="feedback-rating"><span>Sua avaliação</span>
          <select id="feedback-rating" value={rating} onChange={(event) => { setRating(event.target.value); setSubmitted(false); }}>
            <option value="">Selecione uma opção</option><option value="useful">Foi útil</option><option value="not-useful">Não foi útil</option><option value="unknown">Não consigo avaliar</option>
          </select>
        </label>
        <div className="hero-actions feedback-actions">
          <button type="submit" className="button button-primary" disabled={!rating}>Enviar retorno</button>
          <button type="button" className="button button-outline" onClick={() => onNavigate('public')}>Voltar ao painel</button>
        </div>
        {submitted && <p role="status" className="notice notice-success">Retorno sintético registrado apenas nesta demonstração. Nenhum dado foi enviado ou persistido.</p>}
        <p className="caption">A avaliação existe apenas no estado desta tela e é descartada ao sair.</p>
      </form>
      <aside className="surface-card card-padding">
        <h2>Privacidade</h2>
        <p className="feedback-copy">Este formulário não pede nome, telefone, endereço ou localização. O protótipo não envia nem persiste a resposta.</p>
        <span className="status-chip status-good">Sem dados reais</span>
      </aside>
    </div>
  </div>;
}
