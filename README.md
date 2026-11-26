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

**Dinheiro.** São dois caminhos que não se misturam:

- **Venda das lojas → Mercado Pago da lojista.** Cada uma conecta a própria
  conta, e a venda (Pix, cartão, boleto) cai direto nela.
- **Mensalidade da plataforma → Stripe da Lojinha Pronta.** Assinatura no
  cartão, com nova tentativa automática quando o cartão é recusado e um portal
  onde a lojista troca o cartão e baixa as faturas.

**Entrega.** O arquivo só é liberado depois de o Worker *consultar* o pagamento
na API do Mercado Pago com o token da loja. O aviso (webhook) e a volta do
checkout só dizem "vá olhar". Pagamento a menos, aviso forjado e aviso repetido
não liberam nada nem mandam e-mail duas vezes. Reembolso corta o download.
Se o aviso se perder, a própria página do pedido pergunta ao Mercado Pago
enquanto espera, e o cron diário confere os pendentes.

**Plano.** A loja nasce com 7 dias de teste grátis (sem cartão). Assinando
durante o teste, a 1ª cobrança só acontece quando ele acaba. Cartão recusado:
o painel avisa e a loja segue no ar enquanto o Stripe tenta de novo — até 14
dias. Cancelou: fica no ar até o fim do mês pago. Venceu: a vitrine mostra
"voltamos logo", mas quem já comprou continua baixando.

## Pastas

| caminho | o quê |
|---|---|
| `src/index.tsx` | entrada: decide painel × vitrine pelo endereço; cron diário |
| `src/plataforma/` | apresentação com planos, cadastro, entrar, painel, `/admin` |
| `src/loja/` | vitrine: início, categorias, produto, carrinho, pedido, páginas legais |
| `src/lib/pedidos.ts` | pedido → Mercado Pago → confirmação → liberação |
| `src/lib/assinaturas.ts` | mensalidade da plataforma (regras) |
| `src/lib/stripe.ts` | cliente da API do Stripe e conferência dos avisos |
| `src/lib/conta-mp.ts` | conta MP de cada lojista (token cifrado, renovação) |
| `src/webhooks.ts` | avisos do Mercado Pago |
| `migrations/` | esquema do banco (D1) e os planos iniciais |
| `public/_lp/` | CSS, JS e ícones do painel e da vitrine (entram no Worker como texto: `src/estaticos.ts`) |
| `ferramentas/mp-falso.py` | Mercado Pago de mentira, para testar venda sem dinheiro |
| `ferramentas/stripe-falso.py` | Stripe de mentira, para testar a mensalidade sem cartão |

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

**Já feito (25/11/2026):** banco D1 e bucket R2 criados, esquema aplicado,
`SEGREDO_APP` e `STRIPE_SECRET_KEY` cadastrados, domínio no Cloudflare e o
Worker publicado em <https://app.lojinhapronta.com.br>, com as lojas em
`<nome>.lojinhapronta.com.br`. Os passos abaixo ficam como
referência para refazer do zero.

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

### 2. Stripe (mensalidade)

1. Crie a conta em [stripe.com](https://dashboard.stripe.com/register) e
   ative-a com os dados da empresa e a conta bancária que recebe as
   mensalidades.
2. **Desenvolvedores → Chaves de API** → copie a chave secreta (`sk_live_…`):
   ```bash
   npx wrangler secret put STRIPE_SECRET_KEY
   ```
3. **Desenvolvedores → Webhooks → Adicionar destino**, URL
   `<APP_URL>/webhooks/stripe`, com estes eventos:
   `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted`,
   `invoice.paid`, `invoice.payment_failed`. Copie o segredo de assinatura
   (`whsec_…`):
   ```bash
   npx wrangler secret put STRIPE_WEBHOOK_SECRET
   ```
4. **Configurações → Faturamento → Portal do cliente**: ative e salve, com
   *atualizar forma de pagamento* e *histórico de faturas* ligados. **Deixe
   desligado "trocar de plano"**: a troca é feita no painel da Lojinha Pronta,
   que sabe o limite de produtos de cada plano.
5. **Configurações → Faturamento → Assinaturas e e-mails → Gerenciar pagamentos
   com falha**: ligue as novas tentativas inteligentes e escolha **cancelar a
   assinatura** quando todas falharem. (Independente disso, a plataforma tira a
   loja do ar com 14 dias de atraso.)

Não precisa criar produto nem preço no Stripe: o preço de cada plano é criado
sozinho na primeira assinatura. Cupons de desconto criados no Stripe já
aparecem no checkout.

Para testar antes de valer, use a chave `sk_test_…` e o cartão
`4242 4242 4242 4242`; depois troque pela `sk_live_…`.

### 3. Mercado Pago (vendas das lojistas)

A plataforma não precisa de conta própria no Mercado Pago: cada lojista
conecta a dela, e o aviso de pagamento vai em cada cobrança.

O botão **"Conectar Mercado Pago"** (OAuth) é opcional, mas é bem mais fácil
para a lojista do que copiar a chave de acesso. Para ligar:

1. Em [Suas integrações](https://www.mercadopago.com.br/developers/panel/app),
   crie uma aplicação **Pagamentos online → Checkout Pro**.
2. Cadastre a URL de redirecionamento `<APP_URL>/painel/pagamentos/retorno`.
3. ```bash
   npx wrangler secret put MP_CLIENT_ID
   ```
   ```bash
   npx wrangler secret put MP_CLIENT_SECRET
   ```

Sem isso, a lojista conecta colando o Access Token dela, com o passo a passo
na própria tela.

### 4. E-mail (Resend)

Sem e-mail a loja vende e entrega do mesmo jeito: a página do pedido mostra os
arquivos, e a lojista copia o link no painel. Com e-mail, a compradora recebe o
link, a lojista recebe "você vendeu" e "esqueci a senha" funciona.

1. Crie conta no [Resend](https://resend.com), adicione o domínio
   `lojinhapronta.com.br` e crie no DNS os registros que ele pedir.
2. ```bash
   npx wrangler secret put RESEND_API_KEY
   ```

### 5. Subdomínio de cada loja

O `*.lojinhapronta.com.br` precisa do DNS no Cloudflare, e hoje o domínio usa
o DNS do Registro.br.

1. No painel do Cloudflare: **Adicionar um domínio** → `lojinhapronta.com.br`
   → plano **Free**. Ele importa os registros que já existem.
2. Na lista de DNS, confira que `lojinhapronta.com.br` (A `216.198.79.1`) e
   `www` (CNAME) estão com a **nuvem cinza** (somente DNS): é a landing, que
   continua na Vercel.
3. Adicione um registro: tipo **AAAA**, nome **`*`**, IPv6 **`100::`**, com a
   **nuvem laranja**. É por ele que os subdomínios chegam ao Worker.
4. No Registro.br: **Alterar servidores DNS** para os dois que o Cloudflare
   mostrar. A troca leva de minutos a algumas horas.
5. Com o domínio **Ativo** no Cloudflare: no `wrangler.jsonc`, descomente
   `routes`, troque `APP_URL` para `https://app.lojinhapronta.com.br` e
   `SUBDOMINIOS_ATIVOS` para `"sim"`, e rode `npm run deploy`. Os endereços
   antigos `/loja/<nome>` passam a redirecionar para o subdomínio.
6. Atualize para o novo `APP_URL` a URL do webhook no Stripe e a de
   redirecionamento no Mercado Pago.

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

## Testar pagamento sem dinheiro

Dois simuladores, um para cada lado do dinheiro:

```bash
python3 ferramentas/mp-falso.py
```

```bash
python3 ferramentas/stripe-falso.py
```

Com `MP_API_TESTE`, `STRIPE_API_TESTE` e os segredos de teste no `.dev.vars`
(veja `.dev.vars.exemplo`), o Worker conversa com eles.

Venda de uma loja — a compradora paga e o Mercado Pago avisa:

```bash
curl -X POST http://127.0.0.1:9999/_pagar -d '{"id": 1}'
```

```bash
curl -X POST "http://localhost:8787/webhooks/mercadopago?loja=<id-da-loja>" -d '{"type":"payment","data":{"id":"1"}}'
```

Mensalidade — a lojista conclui o checkout do Stripe (o `cs_…` está no
endereço para onde o painel mandou):

```bash
curl -X POST http://127.0.0.1:9998/_completar -H 'Content-Type: application/json' -d '{"id": "cs_test_..."}'
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
