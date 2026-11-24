# Páginas prontas

Cinco páginas escritas uma vez, em português, para todas as lojas. O que muda
por cliente são os marcadores em `[MAIÚSCULAS_COM_COLCHETES]`.

| arquivo | vira a página | estado na loja-mãe |
| --- | --- | --- |
| `politica-de-privacidade.html` | Política de privacidade | **já existe** (era "Privacy Policy") |
| `politica-de-reembolso.html` | Política de reembolso | **já existe** (era "Refund and Returns Policy") |
| `termos-de-uso.html` | Termos de uso | criar |
| `contato.html` | Contato | criar |
| `sobre.html` | Sobre | criar |

As duas primeiras não se cria do zero: elas já vêm como rascunho no WordPress e
no WooCommerce, e o `[privacy_policy]` do checkout aponta para a de privacidade.
Veja a **Parte 2.12** da especificação.

## Como colar

Os arquivos são **markup de blocos do WordPress**, não HTML comum. Colar direto
no editor visual quebra a formatação. O caminho certo:

1. Abra a página no editor
2. Menu **⋮** (canto superior direito) → **Editor de código**
   — ou `Ctrl` + `Shift` + `Alt` + `M`
3. Apague o que estiver lá e cole o arquivo inteiro
4. Volte para o **Editor visual** pelo mesmo menu
5. Publique

Os blocos aparecem montados, com títulos, listas e tabela no lugar.

## Os slugs importam

As páginas linkam umas nas outras por endereço fixo. Ao criar as três novas,
use exatamente estes:

| página | slug |
| --- | --- |
| Termos de uso | `termos-de-uso` |
| Contato | `contato` |
| Sobre | `sobre` |

As duas que já existem ficam em `politica-de-privacidade` e
`politica-de-reembolso`, e a conta em `minha-conta` — tudo já ajustado na
**Parte 2.12**. Slug diferente = link quebrado dentro do texto jurídico.

Os links para os arquivos apontam para `/minha-conta/` e não para
`/minha-conta/downloads/` de propósito: o endereço das abas internas depende dos
*endpoints* do WooCommerce, que mudam de tradução para tradução. A página da
conta é estável; o texto diz "Minha conta → Downloads" e a compradora acha.

## Marcadores

| marcador | exemplo | onde aparece |
| --- | --- | --- |
| `[NOME_DA_LOJA]` | Loja do Kiwi | todas |
| `[CPF_CNPJ]` | 000.000.000-00 | privacidade, termos, contato |
| `[EMAIL_DA_LOJA]` | contato@lojadokiwi.com.br | privacidade, reembolso, termos, contato |
| `[WHATSAPP_NUMERO]` | 5516999999999 (só números, com 55 e DDD) | contato |
| `[WHATSAPP_VISIVEL]` | (16) 99999-9999 | reembolso, contato |
| `[CIDADE_UF]` | Franca, SP | contato |
| `[DATA_ATUALIZACAO]` | 09/09/2026 | privacidade, termos |
| `[NOME_RESPONSAVEL]` | Aline | contato |
| `[DIAS_ATENDIMENTO]` | segunda a sexta | contato |
| `[HORARIO_ATENDIMENTO]` | 9h às 18h | contato |

Depois de colar as cinco, procure por `[` no site inteiro. Se sobrou algum
colchete, ele está no ar.

## A página "Sobre" é diferente

As outras quatro são preenchidas com dez minutos de localizar-e-substituir. A
**Sobre** não: os blocos dela são instruções entre colchetes, não texto pronto,
e o conteúdo vem do formulário de briefing na voz da cliente.

Não existe versão genérica dessa página que preste. "Somos apaixonados por
educação" não vende nada. O que vende é a professora dizendo há quanto tempo dá
aula e por que montou aquele material — e isso só ela sabe escrever.

**Se o briefing voltar vazio nesses campos, a Sobre não vai ao ar.** Loja sem
página Sobre é normal; loja com página Sobre escrita por robô destrói a
confiança que faz a compradora pagar.

## Sobre o texto jurídico

Os textos seguem o Código de Defesa do Consumidor, a LGPD e a Lei de Direito
Autoral, e cobrem o que uma loja de produto digital precisa ter no ar. **Não são
parecer jurídico**, e nenhum de nós é advogado.

Duas decisões que valem explicar, porque a tentação de mudar vai aparecer:

- **Os 7 dias de arrependimento valem mesmo para arquivo já baixado.** É o art.
  49 do CDC, e não se afasta com cláusula em contrário. Escrever "produto
  digital não tem devolução" é cláusula abusiva: não protege a cliente e a
  expõe no Procon. O texto assume os 7 dias de frente.
- **Arquivo com defeito não vira reembolso automático.** Primeiro reenvia. É o
  que resolve em quase todo caso, e é melhor para as duas partes.

Se a cliente tiver contador ou advogado, mande as páginas antes de publicar.
