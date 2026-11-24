# Lojinha Pronta

Plataforma de lojas de material digital, no modelo da Nuvemshop: a pessoa cria
a conta, monta a loja no painel e começa a vender. O site da loja nasce sozinho
em `nomedaloja.lojinhapronta.com.br`, a compradora paga por Pix, cartão ou
boleto pelo Mercado Pago, e o arquivo é liberado no instante do pagamento.

Substitui o modelo anterior (uma instalação WordPress por cliente, montada à
mão), que continua guardado em [`legado/wordpress/`](legado/wordpress/README.md).
As páginas legais e o visual da vitrine vieram de lá.

## Como funciona

```
                     ┌──────────── Cloudflare Worker "lojinha-pronta" ────────────┐
app.lojinhapronta… ──┤  painel da lojista · cadastro · plano · avisos do MP        │
kiwi.lojinhapronta… ─┤  vitrine da loja "kiwi"                                     │──► D1 (banco)
dominiodela.com.br ──┤  vitrine com domínio próprio (próximo passo)                │──► R2 (fotos e PDFs)
                     └─────────────────────────────────────────────────────────────┘
```

Um Worker só serve tudo. Quem é a loja sai do endereço (`src/lib/dominio.ts`).
Enquanto o domínio não estiver no Cloudflare, as lojas abrem pelo caminho:
`…/loja/kiwi`.

**Dinheiro.** Cada lojista conecta a própria conta do Mercado Pago, e a venda
cai direto nela. A plataforma só cobra a mensalidade, por assinatura recorrente
na conta da Lojinha Pronta (`MP_ACCESS_TOKEN`).

**Entrega.** O arquivo só é liberado depois de o Worker *consultar* o pagamento
na API do Mercado Pago com o token da loja. O aviso (webhook) e a volta do
checkout só dizem "vá olhar". Pagamento a menos, aviso forjado e aviso repetido
não liberam nada nem mandam e-mail duas vezes. Reembolso corta o download.
Se o aviso se perder, a própria página do pedido pergunta ao Mercado Pago
enquanto espera, e o cron diário confere os pendentes.

**Plano.** A loja nasce com 7 dias de teste grátis (sem cartão). Assinando
durante o teste, a 1ª cobrança só acontece quando ele acaba. Cancelou: fica no
ar até o fim do mês pago. Venceu: a vitrine mostra "voltamos logo", mas quem já
comprou continua baixando.

## Pastas

| caminho | o quê |
|---|---|
| `src/index.tsx` | entrada: decide painel × vitrine pelo endereço; cron diário |
| `src/plataforma/` | apresentação com planos, cadastro, entrar, painel, `/admin` |
| `src/loja/` | vitrine: início, categorias, produto, carrinho, pedido, páginas legais |
| `src/lib/pedidos.ts` | pedido → Mercado Pago → confirmação → liberação |
| `src/lib/assinaturas.ts` | mensalidade da plataforma |
| `src/lib/conta-mp.ts` | conta MP de cada lojista (token cifrado, renovação) |
| `src/webhooks.ts` | avisos do Mercado Pago |
| `migrations/` | esquema do banco (D1) e os planos iniciais |
| `public/_lp/` | CSS e JS do painel e da vitrine |
| `ferramentas/mp-falso.py` | Mercado Pago de mentira, para testar pagamento sem dinheiro |

## Rodar no computador

```bash
npm install
```

```bash
cp .dev.vars.exemplo .dev.vars
```

```bash
npm run banco:local
```

```bash
npm run dev
```

Abra <http://localhost:8787>, crie uma loja e veja a vitrine em
`http://localhost:8787/loja/<endereço>` (ou `http://<endereço>.localhost:8787`).

## Colocar no ar

### 1. Banco, arquivos e segredos (uma vez)

```bash
npx wrangler d1 create lojinha-pronta
```

Cole o `database_id` que aparecer no `wrangler.jsonc`.

```bash
npx wrangler r2 bucket create lojinha-pronta-arquivos
```

```bash
npm run banco:remoto
```

```bash
openssl rand -base64 48 | npx wrangler secret put SEGREDO_APP
```

```bash
npx wrangler secret put ADMIN_EMAILS
```

O `SEGREDO_APP` cifra os tokens do Mercado Pago das lojistas. **Não troque
depois:** trocar obriga todas a reconectar o Mercado Pago.

```bash
npm run deploy
```

A plataforma fica em `https://lojinha-pronta.okaiquemota.workers.dev`.

### 2. Mercado Pago

1. Em [Suas integrações](https://www.mercadopago.com.br/developers/panel/app),
   crie uma aplicação **Pagamentos online → Checkout Pro**, na conta que recebe
   as mensalidades.
2. **Credenciais de produção** → copie o Access Token:
   ```bash
   npx wrangler secret put MP_ACCESS_TOKEN
   ```
3. **Webhooks**: URL `<APP_URL>/webhooks/mercadopago`, evento **Planos e
   assinaturas**. É o que avisa quando uma mensalidade é paga ou cancelada.
4. Para o botão "Conectar Mercado Pago" das lojistas (OAuth): na mesma
   aplicação, cadastre a URL de redirecionamento
   `<APP_URL>/painel/pagamentos/retorno` e guarde:
   ```bash
   npx wrangler secret put MP_CLIENT_ID
   ```
   ```bash
   npx wrangler secret put MP_CLIENT_SECRET
   ```
   Sem isso, a lojista conecta colando o Access Token dela, com o passo a passo
   na própria tela.

### 3. E-mail (Resend)

Sem e-mail a loja vende e entrega do mesmo jeito: a página do pedido mostra os
arquivos, e a lojista copia o link no painel. Com e-mail, a compradora recebe o
link, a lojista recebe "você vendeu" e "esqueci a senha" funciona.

1. Crie conta no [Resend](https://resend.com), adicione o domínio
   `lojinhapronta.com.br` e crie no DNS os registros que ele pedir.
2. ```bash
   npx wrangler secret put RESEND_API_KEY
   ```

### 4. Subdomínio de cada loja

O `*.lojinhapronta.com.br` precisa do DNS no Cloudflare, e hoje o domínio usa
o DNS do Registro.br.

1. No Cloudflare: **Add a domain** → `lojinhapronta.com.br` (plano Free).
2. No Registro.br: troque os servidores DNS para os dois que o Cloudflare
   mostrar.
3. No Cloudflare, recrie o que já existe hoje (a landing está na Vercel), com
   **proxy desligado** (nuvem cinza): `A @ 216.198.79.1` e
   `CNAME www lojinhapronta.com.br`.
4. No `wrangler.jsonc`, descomente `routes`, troque `APP_URL` para
   `https://app.lojinhapronta.com.br` e `SUBDOMINIOS_ATIVOS` para `"sim"`.
5. Crie no Cloudflare o registro `AAAA * 100::` com proxy **ligado**: o Worker
   responde por ele.
6. `npm run deploy`. Os endereços antigos `/loja/<nome>` passam a redirecionar
   para o subdomínio.
7. Atualize no Mercado Pago as URLs do webhook e do redirecionamento para o
   novo `APP_URL`.

### Plano do Cloudflare

O plano grátis de Workers limita cada requisição a 10 ms de processamento, e
conferir senha (PBKDF2) gasta mais que isso. Login e cadastro podem falhar de
vez em quando no plano grátis. O **Workers Paid** (US$ 5/mês) tira esse limite
e é o recomendado para vender.

## Preços dos planos

Os planos estão no banco, não no código. Trocar preço não exige deploy:

```bash
npx wrangler d1 execute DB --remote --command "UPDATE planos SET preco_centavos = 3990 WHERE id = 'essencial'"
```

Assinaturas já ativas continuam com o valor antigo até a lojista mudar de plano.

## Testar o pagamento sem dinheiro

```bash
python3 ferramentas/mp-falso.py
```

Com `MP_API_TESTE=http://127.0.0.1:9999` no `.dev.vars`, o Worker conversa
com esse Mercado Pago de mentira. Para simular a compradora pagando:

```bash
curl -X POST http://127.0.0.1:9999/_pagar -d '{"id": 1}'
```

```bash
curl -X POST "http://localhost:8787/webhooks/mercadopago?loja=<id-da-loja>" -d '{"type":"payment","data":{"id":"1"}}'
```

## Próximos passos

- **Domínio próprio por loja** (`lojadaana.com.br`): Cloudflare for SaaS,
  grátis até 100 domínios. O banco e o roteamento já esperam por isso
  (`lojas.dominio`), falta a tela.
- **Atualizar a landing** (lojinhapronta.com.br), que ainda vende o serviço
  feito à mão por R$ 597, para levar ao cadastro.
- **Trazer a Loja do Kiwi** para cá: os produtos dela já estão no catálogo do
  legado.
- Cupom de desconto, produto físico com frete, relatórios.
