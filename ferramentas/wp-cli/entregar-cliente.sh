#!/usr/bin/env bash
# Automatiza os itens mecânicos do CHECKLIST-ENTREGA.md, depois que o clone
# da loja-mãe já foi restaurado no domínio do cliente. Veja o README.md
# desta pasta antes da primeira execução.
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "uso: $0 cliente.conf [--path=/caminho/do/wordpress]" >&2
  exit 1
fi

CONF="$1"; shift
[[ -f "$CONF" ]] || { echo "arquivo não encontrado: $CONF" >&2; exit 1; }

WP_ARGS=()
for arg in "$@"; do
  case "$arg" in
    --path=*) WP_ARGS+=("$arg") ;;
    *) echo "Argumento desconhecido: $arg" >&2; exit 1 ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
wp() { command wp "${WP_ARGS[@]}" "$@"; }

# shellcheck source=/dev/null
source "$CONF"

: "${TEMA_SLUG:?defina TEMA_SLUG no .conf}"
: "${NOME_DA_LOJA:?defina NOME_DA_LOJA no .conf}"

passo() { echo; echo "── $1"; }
confira() { echo "   ✋ confira no painel: $1"; }

echo "Entregando: $NOME_DA_LOJA"

# ── Identidade visual ───────────────────────────────────────────────────
passo "Cores e config-cliente.php"
TEMA_PATH="$(wp theme path "$TEMA_SLUG")"
[[ -d "$TEMA_PATH" ]] || { echo "não achei a pasta do tema em $TEMA_PATH" >&2; exit 1; }

php "$SCRIPT_DIR/aplicar-tema.php" \
  "$TEMA_PATH" \
  "${COR_MARCA:?defina COR_MARCA}" \
  "${COR_MARCA_ESCURA:?defina COR_MARCA_ESCURA}" \
  "${COR_DESTAQUE:?defina COR_DESTAQUE}" \
  "${COR_SUAVE:?defina COR_SUAVE}" \
  "${WHATSAPP_NUMERO:-}" \
  "${WHATSAPP_TEXTO:-Oi! Vi sua loja e queria tirar uma dúvida.}" \
  "${ANALYTICS_GA4:-}" \
  "${CREDITOS:-true}"

confira "contraste do texto branco sobre a cor de destaque (botões) — o defeito mais caro de uma loja"

# ── Logo / favicon ───────────────────────────────────────────────────────
passo "Logo"
confira "subir o logo da cliente no cabeçalho e no favicon — é arquivo de imagem, sem CLI que ajude aqui"

# ── Páginas jurídicas: trocar marcadores e publicar ──────────────────────
passo "Páginas jurídicas"
export NOME_DA_LOJA CPF_CNPJ EMAIL_DA_LOJA WHATSAPP_NUMERO WHATSAPP_VISIVEL \
       CIDADE_UF DATA_ATUALIZACAO NOME_RESPONSAVEL DIAS_ATENDIMENTO HORARIO_ATENDIMENTO
wp eval-file "$SCRIPT_DIR/substituir-marcadores.php"

confira "página 'Sobre': publicar só se o briefing trouxe a voz da cliente, senão deixar despublicada"

# ── Mercado Pago ──────────────────────────────────────────────────────
passo "Mercado Pago"
wp plugin install woocommerce-mercadopago --activate 2>/dev/null \
  || echo "   (plugin já instalado, ou sem internet no servidor para buscar — confira)"
confira "colar as credenciais do Mercado Pago da CLIENTE (não as suas!) e tirar do modo sandbox"
confira "Pix, cartão e boleto habilitados"

# ── E-mail ────────────────────────────────────────────────────────────
passo "E-mail"
wp option update woocommerce_email_from_address "${EMAIL_DA_LOJA:?defina EMAIL_DA_LOJA}"
confira "FluentSMTP: configurar remetente no domínio novo e mandar e-mail de teste"
confira "logotipo da cliente no Modelo do e-mail (WooCommerce → E-mails → Modelo do e-mail)"

# ── Produtos ──────────────────────────────────────────────────────────
if [[ -n "${CSV_PRODUTOS:-}" ]]; then
  passo "Produtos — importando $CSV_PRODUTOS"
  wp eval-file "$SCRIPT_DIR/importar-produtos.php" "$CSV_PRODUTOS" \
    || echo "   ✋ a importação por script falhou — use Produtos → Importar no painel (já validado, ver README principal)"
  confira "Limite de downloads por produto, e publicar os produtos (entram como rascunho de propósito)"
else
  passo "Produtos"
  confira "CSV_PRODUTOS vazio no .conf — importe pelo painel (Produtos → Importar)"
fi

# ── Abrir a loja para o mundo ─────────────────────────────────────────
passo "Encontrabilidade e visibilidade"
wp option update blog_public 1
wp option update woocommerce_coming_soon 'no'
echo "   site liberado para indexação e 'Em breve' desligado"
confira "conferir DESLOGADO ou em aba anônima — logado como admin você não percebe se continuou fechado"
confira "Google Analytics instalado com a conta da CLIENTE (o GA4 do config-cliente.php é só o snippet do tema)"

echo
echo "════════════════════════════════════════════════════════════════"
echo "Itens do checklist que continuam só manuais (credencial sensível,"
echo "arquivo físico, ou exigem o celular/e-mail de verdade):"
echo "  • Restaurar o .wpress na hospedagem nova, trocar senha e e-mail do admin"
echo "  • Apontar domínio, SSL, www e sem www no mesmo lugar"
echo "  • Subir o logo e os PDFs dos produtos"
echo "  • Credencial do Mercado Pago da cliente"
echo "  • SMTP e o e-mail de teste chegando fora do spam"
echo "  • Compra de teste de ponta a ponta, pelo celular, com estorno"
echo "  • Vídeos, manual, credenciais entregues e data do fim do suporte"
echo "════════════════════════════════════════════════════════════════"
