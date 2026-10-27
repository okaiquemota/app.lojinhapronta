#!/usr/bin/env bash
# Executa as Partes 1-4 da ESPECIFICACAO-LOJA-MAE.md via WP-CLI.
# Rode dentro da raiz do WordPress (onde está o wp-config.php), ou passe
# --path=/caminho/do/wordpress. Veja o README.md desta pasta antes da
# primeira execução.
set -euo pipefail

WP_ARGS=()
for arg in "$@"; do
  case "$arg" in
    --path=*) WP_ARGS+=("$arg") ;;
    *) echo "Argumento desconhecido: $arg" >&2; exit 1 ;;
  esac
done

REPO_RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PAGINAS_DIR="$REPO_RAIZ/paginas"

wp() { command wp "${WP_ARGS[@]}" "$@"; }

passo() { echo; echo "── $1"; }
confira() { echo "   ✋ confira no painel: $1"; }

echo "Montando a loja-mãe (Partes 1-4 da especificação)."

# ── Parte 1 — Plugins ────────────────────────────────────────────────────
passo "Parte 1 — plugins (Mercado Pago fica para a entrega, de propósito)"

wp plugin install fluent-smtp --activate
wp plugin install all-in-one-wp-migration --activate
wp plugin install autodescription --activate   # The SEO Framework — não busca pelo nome, ver spec

confira "FluentSMTP abriu o assistente de provedor — feche sem configurar, não existe e-mail real aqui"

# ── Parte 2.1 — Geral ────────────────────────────────────────────────────
passo "2.1 — WordPress → Configurações → Geral"

wp language core install pt_BR
wp site switch-language pt_BR
wp option update timezone_string 'America/Sao_Paulo'
wp option update date_format 'd/m/Y'
wp option update time_format 'H:i'
wp option update start_of_week 0

confira "Painel → Atualizações → Atualizar traduções, se o WordPress oferecer"

# ── Parte 2.2 — Links permanentes ───────────────────────────────────────
passo "2.2 — Links permanentes"
wp rewrite structure '/%postname%/' --hard

# ── Parte 2.3 — Leitura ──────────────────────────────────────────────────
passo "2.3 — Leitura (loja-mãe fica fechada para busca — isso é correto aqui)"
wp option update blog_public 0

# ── Parte 2.4 — Discussão ────────────────────────────────────────────────
passo "2.4 — Discussão"
wp option update default_comment_status closed
wp option update default_ping_status closed

# ── Parte 2.5 — WooCommerce geral ───────────────────────────────────────
passo "2.5 — WooCommerce → Geral"
wp option update woocommerce_default_country 'BR'
wp option update woocommerce_currency 'BRL'
wp option update woocommerce_currency_pos 'left_space'
wp option update woocommerce_price_decimal_sep ','
wp option update woocommerce_price_thousand_sep '.'
wp option update woocommerce_price_num_decimals 2
wp option update woocommerce_calc_taxes 'no'

# ── Parte 2.6 — Produtos baixáveis (o coração da entrega automática) ────
passo "2.6 — WooCommerce → Produtos → Produtos baixáveis"
wp option update woocommerce_file_download_method 'force'
wp option update woocommerce_downloads_redirect_fallback_allowed 'no'
wp option update woocommerce_downloads_grant_access_after_payment 'yes'
wp option update woocommerce_downloads_require_login 'no'
wp option update woocommerce_downloads_add_hash_to_filename 'yes'

# ── Parte 2.7 — Contas e privacidade ────────────────────────────────────
passo "2.7 — WooCommerce → Contas e privacidade"
wp option update woocommerce_enable_guest_checkout 'yes'
wp option update woocommerce_enable_checkout_login_reminder 'no'
wp option update woocommerce_enable_signup_and_login_from_checkout 'no'
wp option update woocommerce_enable_delayed_account_creation 'yes'
wp option update woocommerce_enable_myaccount_registration 'no'
wp option update woocommerce_registration_privacy_policy_text \
  'Seus dados pessoais serão usados para dar suporte à sua experiência neste site, para gerenciar o acesso à sua conta e para outros fins descritos em nossa [privacy_policy].'
wp option update woocommerce_checkout_privacy_policy_text \
  'Seus dados pessoais serão usados para processar seu pedido, dar suporte à sua experiência neste site e para outros fins descritos em nossa [privacy_policy].'
wp option update woocommerce_erasure_request_removes_order_data 'no'
wp option update woocommerce_trash_pending_orders ''
wp option update woocommerce_trash_failed_orders ''
wp option update woocommerce_trash_cancelled_orders ''
wp option update woocommerce_anonymize_completed_orders ''

confira "Contas e privacidade: 'Após a finalização' marcado e 'Durante o checkout' desmarcado — os nomes das opções mudam de versão pra versão"

# ── Parte 2.7b — Avançado: página de termos ─────────────────────────────
passo "2.7b — WooCommerce → Avançado (página de termos fica para depois da Parte 3, quando a página existir)"

# ── Parte 2.8 — Pagamentos: gateways offline desligados ─────────────────
passo "2.8 — Pagamentos: confirmando que os gateways offline estão desligados"
for gw in bacs cheque cod; do
  wp option patch update "woocommerce_${gw}_settings" enabled 'no' 2>/dev/null \
    || echo "   (woocommerce_${gw}_settings ainda não existe — já está desligado de fábrica)"
done
confira "Mercado Pago: fica para a entrega, com a credencial da cliente (Parte 5 do checklist)"

# ── Parte 2.9 — E-mails ──────────────────────────────────────────────────
passo "2.9 — WooCommerce → E-mails"
wp option update woocommerce_email_from_name 'Loja'
wp option update woocommerce_email_reply_to_address ''
wp option update woocommerce_email_header_image_width 120
wp option update woocommerce_email_header_alignment 'left'
wp option update woocommerce_email_footer_text \
  '{site_title}<br />{store_address}<br /><a href="https://lojinhapronta.com.br">Loja criada por Lojinha Pronta</a>'
wp option update woocommerce_email_base_color '#124559'
wp option update woocommerce_email_text_color '#1e1e1e'
wp option update woocommerce_email_footer_text_color '#787c82'
wp option update woocommerce_email_background_color '#ffffff'
wp option update woocommerce_email_body_background_color '#ffffff'

confira "'Sincronização automática com alterações de tema' — desligue manualmente, não achei o nome estável dessa opção pra travar por aqui"
confira "'Endereço De' do e-mail — fica em branco na mãe, a cliente troca na entrega"
confira "Prévia de e-mail → 'Processando pedido': cabeçalho em português e cor da marca, ignore o '\$' da prévia"

# ── Parte 2.10 — FluentSMTP ───────────────────────────────────────────────
passo "2.10 — FluentSMTP"
confira "Configurar remetente e mandar e-mail de teste — não dá para automatizar sem credencial SMTP real"

# ── Parte 2.11 — Cabeçalho e rodapé ─────────────────────────────────────
passo "2.11 — Cabeçalho e rodapé (vêm do tema filho — nada a fazer por wp-cli)"
confira "Confirmar que 'tema/lojinha-pronta' foi copiado para wp-content/themes/ e ativado"
confira "Clicar nos dez links do cabeçalho/rodapé e conferir que nenhum dá 404"

# ── Parte 2.12 — Páginas: traduzir e limpar ─────────────────────────────
passo "2.12 — Páginas: renomear e limpar"

renomear_pagina() {
  local termo_busca="$1" novo_titulo="$2" novo_slug="$3"
  local id
  id=$(wp post list --post_type=page --title="$termo_busca" --field=ID --posts_per_page=1 || true)
  if [[ -n "$id" ]]; then
    wp post update "$id" --post_title="$novo_titulo" --post_name="$novo_slug"
    echo "   $termo_busca → $novo_titulo (/$novo_slug/)"
  else
    echo "   ✋ não achei a página '$termo_busca' — renomeie na mão"
  fi
}

renomear_pagina "Cart" "Carrinho" "carrinho"
renomear_pagina "Checkout" "Finalizar compra" "finalizar-compra"
renomear_pagina "My account" "Minha conta" "minha-conta"
renomear_pagina "Shop" "Loja" "loja"
renomear_pagina "Privacy Policy" "Política de privacidade" "politica-de-privacidade"
renomear_pagina "Refund and Returns Policy" "Política de reembolso" "politica-de-reembolso"

confira "Configurações → Privacidade: confirmar que a página marcada ainda é a de Política de privacidade"

passo "Limpeza de conteúdo de fábrica"
wp post delete $(wp post list --post_type=page --title="Sample Page" --field=ID) --force 2>/dev/null \
  || echo "   (Sample Page não encontrada — já foi removida)"
wp post delete $(wp post list --post_type=post --title="Hello world!" --field=ID) --force 2>/dev/null \
  || echo "   (Hello world! não encontrado — já foi removido)"
wp comment delete $(wp comment list --field=ID) --force 2>/dev/null \
  || echo "   (sem comentários para apagar)"

# ── Parte 3 — Publicar as páginas jurídicas (com os marcadores intactos) ─
passo "Parte 3 — publicando as páginas de paginas/*.html"
echo "   (marcadores como [NOME_DA_LOJA] ficam como estão — o entregar-cliente.sh troca por cliente)"

publicar_pagina() {
  local arquivo="$1" titulo="$2" slug="$3"
  local caminho="$PAGINAS_DIR/$arquivo"
  if [[ ! -f "$caminho" ]]; then
    echo "   ✋ não achei $caminho"
    return
  fi
  local id
  id=$(wp post list --post_type=page --name="$slug" --field=ID --posts_per_page=1 || true)
  if [[ -n "$id" ]]; then
    wp post update "$id" --post_title="$titulo" --post_status=draft --post_content=- < "$caminho"
    echo "   atualizada: $titulo (/$slug/) — fica em rascunho até os marcadores serem trocados"
  else
    wp post create --post_type=page --post_title="$titulo" --post_name="$slug" --post_status=draft \
      --post_content=- < "$caminho"
    echo "   criada: $titulo (/$slug/) — rascunho"
  fi
}

publicar_pagina "politica-de-privacidade.html" "Política de privacidade" "politica-de-privacidade"
publicar_pagina "politica-de-reembolso.html"   "Política de reembolso"   "politica-de-reembolso"
publicar_pagina "termos-de-uso.html"           "Termos de uso"           "termos-de-uso"
publicar_pagina "contato.html"                 "Contato"                 "contato"
publicar_pagina "sobre.html"                   "Sobre"                   "sobre"

TERMOS_ID=$(wp post list --post_type=page --name="termos-de-uso" --field=ID --posts_per_page=1 || true)
if [[ -n "$TERMOS_ID" ]]; then
  wp option update woocommerce_terms_page_id "$TERMOS_ID"
  echo "   WooCommerce → Avançado → Página de termos e condições: apontada para /termos-de-uso/"
fi

confira "'Sobre' não vai ao ar com texto genérico — só publique depois do briefing preenchido"
confira "Procure por '[' no site inteiro depois de trocar os marcadores (isso o entregar-cliente.sh já avisa)"

# ── Parte 4 — Limpar e exportar ──────────────────────────────────────────
passo "Parte 4 — limpeza final (antes de exportar)"

wp post delete $(wp post list --post_type=product --field=ID) --force 2>/dev/null \
  || echo "   (sem produtos de teste para apagar)"
wp post delete $(wp post list --post_status=trash --field=ID) --force 2>/dev/null \
  || echo "   (lixeira já vazia)"

passo "Conferir que a loja-mãe continua fechada"
wp option update blog_public 0
wp option update woocommerce_coming_soon 'yes'
wp option update woocommerce_store_pages_only 'no'
echo "   blog_public=0 e coming_soon=yes (site inteiro em 'Em breve', não só a loja)"

echo
echo "════════════════════════════════════════════════════════════════"
echo "O que fica de fora deste script — faça na mão antes de exportar:"
echo "  • Apagar mídia de teste (Mídia → selecionar → excluir)"
echo "  • Confirmar que só existe o usuário administrador"
echo "  • WooCommerce → Pedidos: confirmar que está vazio"
echo "  • Esconder os blocos 'Welcome to…' e 'Things to do next' do painel"
echo "  • Dispensar os avisos da Caixa de entrada e o anúncio do Jetpack"
echo "  • All-in-One WP Migration → Exportar para arquivo → loja-mae-vN.wpress"
echo "  • Anotar a versão em versoes.md"
echo "════════════════════════════════════════════════════════════════"
