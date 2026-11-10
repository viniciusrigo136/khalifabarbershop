import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SHOP, waLink } from '../config';

export default function PrivacyPage() {
  useEffect(() => {
    document.title = 'Política de privacidade — Khalifa Barber Shop';
    window.scrollTo(0, 0);
  }, []);
  return (
    <main className="page">
      <article className="prose">
        <Link to="/">← Voltar ao site</Link>
        <h1>Política de privacidade</h1>
        <p>
          Esta política explica como a {SHOP.name} ({SHOP.city}) trata os dados pessoais informados no agendamento online, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
        </p>
        <h2>Quais dados coletamos</h2>
        <ul>
          <li>Nome e número de WhatsApp, informados por você ao agendar;</li>
          <li>Serviço, dia e horário escolhidos.</li>
        </ul>
        <p>Não usamos cookies de rastreamento nem ferramentas de publicidade.</p>
        <h2>Para que usamos</h2>
        <p>
          Somente para organizar a agenda, confirmar ou remarcar o seu horário pelo WhatsApp e manter o registro dos atendimentos realizados. Não vendemos nem compartilhamos seus dados com terceiros para marketing.
        </p>
        <h2>Onde ficam armazenados</h2>
        <p>
          Os dados ficam num banco de dados protegido (Supabase), acessível apenas pela equipe da barbearia mediante login. Visitantes do site não conseguem ver nomes ou telefones de outros clientes.
        </p>
        <h2>Por quanto tempo</h2>
        <p>Mantemos os dados enquanto forem necessários para o atendimento e para obrigações legais e financeiras.</p>
        <h2>Seus direitos</h2>
        <p>
          Você pode pedir a qualquer momento acesso, correção ou exclusão dos seus dados. Basta chamar no{' '}
          <a href={waLink('Olá! Gostaria de falar sobre os meus dados pessoais.')} target="_blank" rel="noopener noreferrer">
            WhatsApp {SHOP.whatsappLabel}
          </a>
          .
        </p>
        <p style={{ fontSize: 14, color: 'var(--faint)' }}>Última atualização: novembro de 2026.</p>
      </article>
    </main>
  );
}
