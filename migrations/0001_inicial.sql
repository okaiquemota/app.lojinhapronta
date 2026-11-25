-- Lojinha Pronta — esquema inicial (Cloudflare D1 / SQLite)
--
-- Dinheiro é sempre inteiro em centavos: SQLite não tem decimal, e real em
-- ponto flutuante arredonda R$ 19,90 para 19.899999.
-- Datas são texto ISO em UTC ('2026-11-24T18:00:00.000Z'), comparáveis como
-- string e legíveis numa consulta.

-- ─────────────────────────────────────────────────────────── contas

CREATE TABLE usuarios (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE COLLATE NOCASE,
  nome        TEXT NOT NULL,
  senha_hash  TEXT NOT NULL,
  criado_em   TEXT NOT NULL
);

-- O cookie leva o token; aqui fica só o hash dele. Vazou o banco, não vazou
-- sessão.
CREATE TABLE sessoes (
  id          TEXT PRIMARY KEY,
  usuario_id  TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  expira_em   TEXT NOT NULL,
  criado_em   TEXT NOT NULL
);
CREATE INDEX sessoes_usuario ON sessoes(usuario_id);

CREATE TABLE redefinicoes_senha (
  id          TEXT PRIMARY KEY,            -- hash do token
  usuario_id  TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  expira_em   TEXT NOT NULL,
  usado_em    TEXT
);

-- Freio para tentativa de senha em sequência.
CREATE TABLE tentativas_login (
  chave       TEXT NOT NULL,               -- e-mail em minúsculas
  criado_em   TEXT NOT NULL
);
CREATE INDEX tentativas_login_chave ON tentativas_login(chave, criado_em);

-- ─────────────────────────────────────────────────────────── planos

CREATE TABLE planos (
  id                TEXT PRIMARY KEY,
  nome              TEXT NOT NULL,
  descricao         TEXT NOT NULL DEFAULT '',
  preco_centavos    INTEGER NOT NULL CHECK (preco_centavos > 0),
  limite_produtos   INTEGER,                -- NULL = sem limite
  taxa_venda        REAL NOT NULL DEFAULT 0, -- % de cada venda da lojista (só com Mercado Pago conectado pelo botão)
  recursos          TEXT NOT NULL DEFAULT '[]', -- JSON: lista de frases para a tela de planos
  ordem             INTEGER NOT NULL DEFAULT 0,
  ativo             INTEGER NOT NULL DEFAULT 1
);

-- Preços iniciais. Trocar é um UPDATE, não um deploy: o preço no Stripe é
-- criado sozinho na próxima assinatura (src/lib/stripe.ts, precoDoPlano).
INSERT INTO planos (id, nome, descricao, preco_centavos, limite_produtos, taxa_venda, recursos, ordem) VALUES
  ('essencial', 'Essencial', 'Para começar a vender', 2990, 30, 0,
   '["Até 30 produtos","Pix, cartão e boleto pelo Mercado Pago","Entrega automática do arquivo","Endereço sualoja.lojinhapronta.com.br","Sem taxa por venda"]', 1),
  ('profissional', 'Profissional', 'Para quem já vende todo mês', 5990, NULL, 0,
   '["Produtos ilimitados","Tudo do Essencial","Domínio próprio (em breve)","Suporte prioritário pelo WhatsApp","Sem taxa por venda"]', 2);

-- ─────────────────────────────────────────────────────────── lojas

CREATE TABLE lojas (
  id                TEXT PRIMARY KEY,
  dono_id           TEXT NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
  slug              TEXT NOT NULL UNIQUE,
  dominio           TEXT UNIQUE,            -- domínio próprio, quando houver
  nome              TEXT NOT NULL,
  descricao         TEXT NOT NULL DEFAULT '',

  -- aparência
  cor_marca         TEXT NOT NULL DEFAULT '#124559',
  cor_destaque      TEXT NOT NULL DEFAULT '#cf3f2b',
  logo_key          TEXT,
  banner_key        TEXT,
  banner_celular_key TEXT,
  banner_link       TEXT NOT NULL DEFAULT '',
  chamada_titulo    TEXT NOT NULL DEFAULT '',
  chamada_texto     TEXT NOT NULL DEFAULT '',
  aviso             TEXT NOT NULL DEFAULT '',
  aviso_link        TEXT NOT NULL DEFAULT '',

  -- contato e dados das páginas legais
  sobre             TEXT NOT NULL DEFAULT '',
  whatsapp          TEXT NOT NULL DEFAULT '',  -- só números, com 55 e DDD
  instagram         TEXT NOT NULL DEFAULT '',
  email_contato     TEXT NOT NULL DEFAULT '',
  responsavel       TEXT NOT NULL DEFAULT '',
  documento         TEXT NOT NULL DEFAULT '',  -- CPF ou CNPJ
  cidade_uf         TEXT NOT NULL DEFAULT '',
  ga4               TEXT NOT NULL DEFAULT '',

  -- estado
  aberta            INTEGER NOT NULL DEFAULT 1,
  plano_id          TEXT REFERENCES planos(id),
  teste_ate         TEXT NOT NULL,
  -- mensalidade da plataforma, no Stripe
  stripe_cliente_id TEXT,
  assinatura_id     TEXT,                  -- sub_… no Stripe
  assinatura_status TEXT,                  -- status do Stripe: trialing | active | past_due | canceled | unpaid | incomplete…
  assinatura_valida_ate TEXT,              -- fim do período já pago (current_period_end)
  assinatura_cancelada INTEGER NOT NULL DEFAULT 0, -- cancelou: vale até assinatura_valida_ate e não renova
  assinatura_atrasada_desde TEXT,          -- 1ª vez que o Stripe disse past_due; 14 dias assim, a loja sai do ar
  ultimo_pedido     INTEGER NOT NULL DEFAULT 0,
  criada_em         TEXT NOT NULL,
  atualizada_em     TEXT NOT NULL
);
CREATE INDEX lojas_assinatura ON lojas(assinatura_id);
CREATE INDEX lojas_cliente_stripe ON lojas(stripe_cliente_id);

-- Credenciais do Mercado Pago da lojista. Tabela à parte para nenhuma
-- consulta de vitrine carregar o token sem querer. Os tokens ficam cifrados
-- (AES-GCM) com o SEGREDO_APP.
CREATE TABLE lojas_mp (
  loja_id        TEXT PRIMARY KEY REFERENCES lojas(id) ON DELETE CASCADE,
  mp_user_id     TEXT NOT NULL,
  conta          TEXT NOT NULL DEFAULT '',  -- apelido ou e-mail, só para mostrar no painel
  access_token   TEXT NOT NULL,
  refresh_token  TEXT,
  public_key     TEXT,
  expira_em      TEXT,
  via_oauth      INTEGER NOT NULL DEFAULT 0,
  conectado_em   TEXT NOT NULL
);

-- ─────────────────────────────────────────────────────────── catálogo

CREATE TABLE categorias (
  id        TEXT PRIMARY KEY,
  loja_id   TEXT NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
  nome      TEXT NOT NULL,
  slug      TEXT NOT NULL,
  ordem     INTEGER NOT NULL DEFAULT 0,
  UNIQUE (loja_id, slug)
);

CREATE TABLE produtos (
  id               TEXT PRIMARY KEY,
  loja_id          TEXT NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
  categoria_id     TEXT REFERENCES categorias(id) ON DELETE SET NULL,
  nome             TEXT NOT NULL,
  slug             TEXT NOT NULL,
  resumo           TEXT NOT NULL DEFAULT '',
  descricao        TEXT NOT NULL DEFAULT '',
  preco_centavos   INTEGER NOT NULL CHECK (preco_centavos >= 0),
  preco_de_centavos INTEGER,                 -- preço riscado ("de R$ 29,90")
  imagens          TEXT NOT NULL DEFAULT '[]', -- JSON: chaves no R2
  arquivo_key      TEXT,
  arquivo_nome     TEXT,
  arquivo_tamanho  INTEGER,
  limite_downloads INTEGER,                  -- NULL = sem limite
  ativo            INTEGER NOT NULL DEFAULT 0,
  destaque         INTEGER NOT NULL DEFAULT 0,
  arquivado        INTEGER NOT NULL DEFAULT 0,
  criado_em        TEXT NOT NULL,
  atualizado_em    TEXT NOT NULL,
  UNIQUE (loja_id, slug),
  -- Produto sem arquivo não vai para a vitrine: venderia e não entregaria.
  CHECK (ativo = 0 OR arquivo_key IS NOT NULL)
);
CREATE INDEX produtos_vitrine ON produtos(loja_id, ativo, arquivado, criado_em);

-- ─────────────────────────────────────────────────────────── vendas

CREATE TABLE pedidos (
  id                 TEXT PRIMARY KEY,
  loja_id            TEXT NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
  numero             INTEGER NOT NULL,
  token              TEXT NOT NULL UNIQUE,  -- dá acesso à página do pedido e aos downloads
  cliente_nome       TEXT NOT NULL,
  cliente_email      TEXT NOT NULL COLLATE NOCASE,
  total_centavos     INTEGER NOT NULL,
  taxa_centavos      INTEGER NOT NULL DEFAULT 0,
  status             TEXT NOT NULL DEFAULT 'pendente', -- pendente | pago | cancelado | reembolsado
  metodo             TEXT,                  -- pix | cartao | boleto | gratis
  mp_preferencia_id  TEXT,
  mp_pagamento_id    TEXT,
  mp_status          TEXT,
  criado_em          TEXT NOT NULL,
  pago_em            TEXT,
  verificado_em      TEXT,                  -- última consulta ao Mercado Pago
  email_enviado_em   TEXT,
  UNIQUE (loja_id, numero)
);
CREATE INDEX pedidos_loja ON pedidos(loja_id, criado_em);
CREATE INDEX pedidos_cliente ON pedidos(loja_id, cliente_email);

CREATE TABLE pedido_itens (
  id                TEXT PRIMARY KEY,
  pedido_id         TEXT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  produto_id        TEXT REFERENCES produtos(id) ON DELETE SET NULL,
  nome              TEXT NOT NULL,
  preco_centavos    INTEGER NOT NULL,
  arquivo_key       TEXT,                   -- cópia do arquivo da hora da compra
  arquivo_nome      TEXT,
  limite_downloads  INTEGER,
  downloads         INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX pedido_itens_pedido ON pedido_itens(pedido_id);
CREATE INDEX pedido_itens_produto ON pedido_itens(produto_id);

-- Tudo o que o Mercado Pago avisou, cru. É o que salva a investigação de um
-- "paguei e não chegou".
CREATE TABLE avisos_mp (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  origem     TEXT NOT NULL,                 -- loja:<id> | plataforma
  tipo       TEXT,
  recurso_id TEXT,
  corpo      TEXT,
  resultado  TEXT,
  criado_em  TEXT NOT NULL
);
