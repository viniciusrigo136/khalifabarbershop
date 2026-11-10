import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="page" style={{ display: 'grid', placeItems: 'center', textAlign: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>
        <img src="/img/logo.png" alt="Khalifa Barber Shop" width={160} height={117} />
        <h1 className="h2">Página não encontrada</h1>
        <p className="lead">O endereço que você abriu não existe.</p>
        <Link to="/" className="btn btn--gold">
          Voltar ao site
        </Link>
      </div>
    </main>
  );
}
