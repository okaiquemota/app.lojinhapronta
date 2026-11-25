export type Env = {
  DB: D1Database
  ARQUIVOS: R2Bucket
  ASSETS: Fetcher

  DOMINIO_RAIZ: string
  APP_URL: string
  SITE_URL: string
  EMAIL_REMETENTE: string
  DIAS_TESTE: string
  SUBDOMINIOS_ATIVOS: string

  // segredos (wrangler secret put)
  SEGREDO_APP: string
  /** E-mails que veem /admin, separados por vírgula. */
  ADMIN_EMAILS: string
  /** Mensalidade da plataforma. sk_live_… (ou sk_test_… para testar). */
  STRIPE_SECRET_KEY?: string
  /** whsec_… do webhook cadastrado no Stripe. */
  STRIPE_WEBHOOK_SECRET?: string
  MP_CLIENT_ID?: string
  MP_CLIENT_SECRET?: string
  RESEND_API_KEY?: string
  /** Só desenvolvimento: Mercado Pago e Stripe de mentira em http://127.0.0.1:porta */
  MP_API_TESTE?: string
  STRIPE_API_TESTE?: string
}

export type Usuario = {
  id: string
  email: string
  nome: string
  criado_em: string
}

export type Plano = {
  id: string
  nome: string
  descricao: string
  preco_centavos: number
  limite_produtos: number | null
  taxa_venda: number
  recursos: string
  ordem: number
  ativo: number
}

export type Loja = {
  id: string
  dono_id: string
  slug: string
  dominio: string | null
  nome: string
  descricao: string
  cor_marca: string
  cor_destaque: string
  logo_key: string | null
  banner_key: string | null
  banner_celular_key: string | null
  banner_link: string
  chamada_titulo: string
  chamada_texto: string
  aviso: string
  aviso_link: string
  sobre: string
  whatsapp: string
  instagram: string
  email_contato: string
  responsavel: string
  documento: string
  cidade_uf: string
  ga4: string
  aberta: number
  plano_id: string | null
  teste_ate: string
  stripe_cliente_id: string | null
  assinatura_id: string | null
  assinatura_status: string | null
  assinatura_valida_ate: string | null
  assinatura_cancelada: number
  assinatura_atrasada_desde: string | null
  ultimo_pedido: number
  criada_em: string
  atualizada_em: string
}

export type Categoria = {
  id: string
  loja_id: string
  nome: string
  slug: string
  ordem: number
}

export type Produto = {
  id: string
  loja_id: string
  categoria_id: string | null
  nome: string
  slug: string
  resumo: string
  descricao: string
  preco_centavos: number
  preco_de_centavos: number | null
  imagens: string
  arquivo_key: string | null
  arquivo_nome: string | null
  arquivo_tamanho: number | null
  limite_downloads: number | null
  ativo: number
  destaque: number
  arquivado: number
  criado_em: string
  atualizado_em: string
}

export type Pedido = {
  id: string
  loja_id: string
  numero: number
  token: string
  cliente_nome: string
  cliente_email: string
  total_centavos: number
  taxa_centavos: number
  status: 'pendente' | 'pago' | 'cancelado' | 'reembolsado'
  metodo: string | null
  mp_preferencia_id: string | null
  mp_pagamento_id: string | null
  mp_status: string | null
  criado_em: string
  pago_em: string | null
  verificado_em: string | null
  email_enviado_em: string | null
}

export type PedidoItem = {
  id: string
  pedido_id: string
  produto_id: string | null
  nome: string
  preco_centavos: number
  arquivo_key: string | null
  arquivo_nome: string | null
  limite_downloads: number | null
  downloads: number
}

/** Onde a requisição caiu: no painel da plataforma ou na vitrine de uma loja. */
export type AlvoLoja = {
  slug?: string
  dominio?: string
  /** Prefixo dos links internos da vitrine: '' no subdomínio, '/loja/<slug>' no modo caminho. */
  base: string
}

export type VarsPlataforma = {
  usuario: Usuario
  loja: Loja
}

export type VarsLoja = {
  loja: Loja
  base: string
}
