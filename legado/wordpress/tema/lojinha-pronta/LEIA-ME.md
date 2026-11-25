# Tema Lojinha Pronta

Tema filho do **Twenty Twenty-Five**. Herda todos os modelos de página do pai e
continua recebendo atualização de segurança pelo próprio WordPress — você não
vira responsável por manter um tema inteiro em cinquenta lojas.

Carrega só o que é da entrega e o tema-pai não faz:

- a paleta da cliente
- botão flutuante de WhatsApp
- Google Analytics
- o crédito **"Loja criada por Lojinha Pronta"** no rodapé

## Instalar

1. Copie a pasta `lojinha-pronta` para `wp-content/themes/`
2. Painel → **Aparência → Temas** → ativar **Lojinha Pronta**

O Twenty Twenty-Five precisa continuar instalado. É o pai: apagar quebra a loja.

## O que muda por cliente

**Só dois arquivos.**

### `config-cliente.php`

```php
'whatsapp'      => '5516999999999',   // com 55 e DDD, só números
'analytics_ga4' => 'G-XXXXXXXXXX',    // vazio não carrega nada
'creditos'      => true,              // o crédito de rodapé
```

### `theme.json` → as quatro cores

| slug | onde aparece |
|---|---|
| `lp-marca` | links e hover de botão |
| `lp-marca-escura` | variação escura |
| `lp-destaque` | fundo dos botões — é a cor que mais aparece |
| `lp-suave` | fundo da faixa do crédito |

Tire as cores do logo da cliente. Confira o contraste do texto branco sobre
`lp-destaque` antes de entregar: botão ilegível no sol do celular é o defeito
mais caro de uma loja.

## Por que o crédito fica no código

`'creditos' => true` mora no tema, não numa configuração do painel, porque é o
motor de aquisição do negócio: quem navega numa loja do nicho é o próximo
cliente. Configuração no painel é coisa que se esquece de marcar; código viaja
no clone.

## Trocar a cara da loja por cliente

Toda a aparência sai de **quatro cores no `theme.json`**. Não existe cor
escrita à mão em nenhum outro lugar do tema.

| slug | onde aparece |
| --- | --- |
| `lp-marca` | faixa da chamada, títulos, preço, número dos passos |
| `lp-marca-escura` | rodapé e faixa do crédito |
| `lp-destaque` | botões |
| `lp-suave` | faixas claras, texto sobre o rodapé escuro |

**A única regra:** `lp-marca` e `lp-marca-escura` precisam ser escuras o
bastante para carregar texto branco por cima — contraste 4,5:1 ou mais. Se a
cliente quer rosa, laranja ou amarelo, a cor vai no `lp-destaque`, que é fundo
de botão e nunca fundo de faixa inteira.

Errar isso não deixa o site feio: deixa ilegível, e só aparece depois de
entregue.

## As fontes

Nunito nos títulos, Nunito Sans no texto, carregadas do Google Fonts no
`functions.php`. Arredondadas e quentes, que é como material de professora se
apresenta — o tema-pai vem com a fonte do sistema, que não erra e também não
diz nada.

Para trocar: muda a URL no `lojinha_pronta_estilos()` e os dois nomes em
`settings.typography.fontFamilies` do `theme.json`.


## O que muda por cliente sem tocar em bloco

Tudo no `config-cliente.php`:

| campo | o que faz |
| --- | --- |
| `aviso` · `aviso_link` | tarja escura no topo. Vazio, não existe |
| `banner_imagem` · `banner_imagem_celular` · `banner_link` · `banner_alt` | banner da home. Sem imagem, a home abre direto nas categorias |
| `whatsapp` · `whatsapp_texto` | botão flutuante **e** o link "Compre pelo WhatsApp" no menu |
| `analytics_ga4` | GA4. Vazio não carrega script nenhum |
| `creditos` | o crédito no rodapé |

Nenhum deles vai ao ar preenchido na loja-mãe: banner com arte de banco de
imagem e tarja com promoção inventada são piores que a ausência dos dois.

## Ver o tema sem WordPress

```
node ferramentas/previa/gerar.mjs
```

Monta uma página com a mesma marcação que o WordPress gera — inclusive o CSS
que ele deriva do `theme.json` e os seletores de especificidade alta que já
morderam este tema — carrega o `style.css` de verdade, preenche a vitrine com
oito produtos de mentira e tira print em 1440px e 390px, mais recortes de cada
faixa.

Existe porque o jeito anterior era pedir print para o Kaique a cada linha de
CSS. Vinte rodadas de baixar ZIP, copiar pasta e recarregar para descobrir
coisas que um print local resolveria em segundos.

O que ele **não** cobre: qualquer coisa que dependa do WordPress de verdade —
o que o WooCommerce injeta, o que os plugins mudam, e as fontes do Google, que
não carregam no ambiente onde o print é gerado. Continua valendo abrir a loja.

### As seis páginas da prévia

`home`, `loja`, `produto`, `conta`, `entrar`, `texto` — em 1440px e 390px, com
as classes que o WordPress põe no `<body>`, porque várias regras dependem
delas. O script falha se alguma página estourar na horizontal.

**Carrinho e finalização não estão aí.** O WooCommerce desenha essas duas com
blocos próprios, complexos demais para eu imitar com fidelidade — e imitar mal
é pior que não imitar, porque dá confiança falsa. O CSS delas é conservador de
propósito: encosta em botão, painel e campo, que têm nome estável, e deixa o
resto de fábrica. Essas duas precisam de olho humano na loja real.

### Publicar as telas num link

```
node ferramentas/previa/gerar.mjs && node ferramentas/previa/artefato.mjs
```

Gera `ferramentas/previa/telas.html`: as seis telas num arquivo só, cada uma
num iframe com o `style.css` de verdade, com troca de largura entre 1440, 768
e 390. É o que se publica como artefato para avaliar o visual sem baixar ZIP,
trocar pasta e recarregar.

O `telas.html` é gerado — não edite. O que se edita é o `artefato-modelo.html`.
