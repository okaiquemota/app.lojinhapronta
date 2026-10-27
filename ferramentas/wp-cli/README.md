# Automação via WP-CLI

Transforma a `ESPECIFICACAO-LOJA-MAE.md` e a `CHECKLIST-ENTREGA.md` em scripts,
pra trocar clique no painel por um comando. Dois scripts:

| script | quando roda | o que faz |
|---|---|---|
| `montar-loja-mae.sh` | uma vez, montando a loja-mãe | Partes 1 a 4 da especificação: plugins, configurações, páginas, limpeza |
| `entregar-cliente.sh` | uma vez por cliente, depois de restaurar o clone | troca os marcadores das páginas jurídicas, pinta o tema, liga Mercado Pago, abre a loja pro Google |

## ⚠️ Antes de confiar nisso numa loja de cliente

Estes scripts foram escritos lendo a documentação oficial do WordPress e do
WooCommerce — **não foram rodados contra uma instalação de verdade**. O
ambiente onde foram gerados não permite baixar e executar binário externo
(wp-cli, neste caso), então não tive como testar ponta a ponta antes de te
entregar.

A maioria dos comandos é configuração estável e básica (idioma, fuso,
moeda, permalink) — risco baixo. Um punhado de opções do WooCommerce muda de
nome entre versões e está marcado no código com `# ⚠ confira no painel` —
depois de rodar, abra a tela correspondente e confirme que o valor realmente
mudou. Se algo não bater, me diga o que a tela mostra e eu corrijo o script
(o mesmo aviso que já existe no topo da especificação original).

**Rode a primeira vez numa loja de teste, não na loja-mãe de produção.** Depois
de confirmar que bateu tudo, pode rodar com confiança nas próximas.

## Pré-requisitos

- [WP-CLI](https://wp-cli.org/#installing) instalado no servidor (a maioria das
  hospedagens de WordPress já tem; senão, `wp cli info` confirma)
- PHP com acesso de linha de comando
- Rodar os scripts **dentro da pasta raiz do WordPress** (onde fica o
  `wp-config.php`), ou passar `--path=/caminho/do/wordpress`

## `montar-loja-mae.sh`

```bash
./montar-loja-mae.sh [--path=/caminho/do/wordpress]
```

Pressupõe que o WordPress e o WooCommerce **já estão instalados** (o passo de
`wp core install` fica de fora de propósito — normalmente já existe uma
instalação rodando antes de você decidir automatizar o resto). Ele:

1. Instala e ativa FluentSMTP, All-in-One WP Migration e The SEO Framework
2. Aplica as Partes 2.1 a 2.12 da especificação (idioma, fuso, permalink,
   WooCommerce geral, downloads forçados, contas, e-mails, páginas)
3. Publica as 5 páginas jurídicas de `paginas/` com os marcadores intactos
   (quem troca os marcadores é o `entregar-cliente.sh`, na entrega)
4. Lista no final o que **não** dá para automatizar (checagem visual, teste de
   e-mail, exportar o `.wpress`) — copiado da Parte 4 da especificação

Roda do jeito que está — do diretório do tema (`tema/lojinha-pronta/`) ainda
precisa copiar pra `wp-content/themes/` e ativar manualmente (é passo de
arquivo, não de `wp-cli`, então fica fora do script).

## `entregar-cliente.sh`

```bash
cp cliente.conf.exemplo cliente-nome-da-loja.conf
# edite o arquivo com os dados do briefing
./entregar-cliente.sh cliente-nome-da-loja.conf [--path=/caminho/do/wordpress]
```

Guarde o `.conf` de cada cliente — é registro de entrega, e economiza
reconferir o briefing se precisar reentregar algo. Ele:

1. Troca as 4 cores do `theme.json` do tema instalado
2. Escreve o `config-cliente.php` do tema instalado (WhatsApp, Analytics, crédito)
3. Substitui os marcadores (`[NOME_DA_LOJA]`, `[CPF_CNPJ]`...) nas 5 páginas
   jurídicas já publicadas — e avisa se sobrou algum colchete
4. Ativa o Mercado Pago, abre a loja para o Google e desliga o "Em breve"
5. Importa o catálogo do CSV (via `importar-produtos.php`)

**O que fica de fora, porque é manual mesmo ou depende de credencial sensível:**
restaurar o `.wpress` (All-in-One WP Migration), colar a chave do Mercado Pago
do cliente, SMTP, compra de teste, vídeos e manual.

## `importar-produtos.php`

Importa o CSV do `catalogo-para-woo.mjs` sem abrir o painel. Usa a classe
`WC_Product_CSV_Importer` do próprio WooCommerce — a mesma que a tela de
importação usa por baixo.

```bash
wp eval-file ferramentas/wp-cli/importar-produtos.php /caminho/produtos-woo.csv
```

O `entregar-cliente.sh` já chama isso sozinho se o `.conf` tiver `CSV_PRODUTOS`
preenchido.
