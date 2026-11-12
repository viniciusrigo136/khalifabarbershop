# The Chiodi Barber — landing page

Landing page da barbearia do Hernani em Coronel Freitas, SC: aberta 24 horas e com atendimento a domicílio.
Feita para o celular primeiro. React 19, Vite e [Motion](https://motion.dev).

## Rodar

```bash
cd chiodi
npm install
npm run dev      # http://localhost:5173
npm run build    # gera dist/
```

## Editar os dados

Tudo fica em [`src/config.ts`](src/config.ts):

- `whatsapp`: número com DDI + DDD, só números (hoje: `5549988902258`).
- `instagram`: usuário sem `@` (confira se é `chiodibarber`).
- `SERVICES`: nome, descrição, duração e, se quiser, `price: 'R$ 40'`. Sem preço, o site mostra a duração e avisa que o valor é passado no WhatsApp.

## Publicar na Vercel

Importe o repositório e defina **Root Directory = `chiodi`**. O framework (Vite) é detectado sozinho.
