# Especificação da loja-mãe

A instalação-mestre, configurada uma vez e **nunca entregue**. Cada cliente
recebe um clone dela.

Este documento existe para que montar a loja-mãe seja **executar uma lista**, não
tomar decisões. Siga na ordem; cada item traz o valor exato e o porquê.

> Os nomes de menu mudam entre versões do WordPress e do WooCommerce, e não tenho
> uma instalação aqui para conferir. Se algum caminho estiver diferente do que
> está escrito, me diga o que aparece na sua tela e eu corrijo esta página.

---

## Parte 1 — Plugins

**Cinco.** Cada plugin instalado aqui vai existir em toda loja que você entregar,
para sempre: é atualização que quebra, é conflito, é suporte. A lista curta não é
economia, é o produto.

| plugin | por quê |
|---|---|
| **WooCommerce** | a loja em si |
| **Mercado Pago payments for WooCommerce** | o oficial deles. Pix, cartão e boleto |
| **FluentSMTP** | entrega de e-mail. Sem ele, confirmação de compra cai no spam |
| **All-in-One WP Migration** | é o mecanismo de clonagem — exporta a loja-mãe inteira num arquivo |
| **The SEO Framework** | SEO que funciona sem configuração. Sem anúncio dentro do painel |

**Ordem de instalação:** FluentSMTP, All-in-One WP Migration e The SEO Framework
na loja-mãe. O **Mercado Pago fica para a entrega** — é o único que depende de
credencial da cliente e enche o painel de aviso enquanto está sem chave.

> **O The SEO Framework não aparece na busca por nome.** Procurar
> "The SEO Framework" devolve 574 resultados com Rank Math e Yoast na frente.
> Busque pelo slug **`autodescription`** — o plugin se chamava AutoDescription
> e o endereço nunca mudou. Ou vá direto em
> `/wp-admin/plugin-install.php?s=autodescription&tab=search&type=term`.
> Confirme o autor **Sybre Waaijer**.
>
> O **FluentSMTP** abre um assistente pedindo provedor de e-mail assim que
> ativa. Feche: no ambiente local não existe e-mail real para configurar, e ele
> é preenchido na entrega com o endereço do domínio da cliente. O que importa
> agora é ele estar instalado para viajar dentro do `.wpress`.

Versões conferidas na loja-mãe: WooCommerce 11.1.0, All-in-One WP Migration
7.110, FluentSMTP 2.4.0, The SEO Framework 5.1.4.

### O que NÃO instalar, e o que usa no lugar

| tentação | por que não | o que usar |
|---|---|---|
| Plugin de entrega automática | o WooCommerce faz nativo | produto **virtual + para download** |
| Elementor ou outro page builder | pesado, e a cliente teria que aprender ferramenta proprietária | tema de blocos, editor nativo |
| Plugin de botão de WhatsApp | 20 linhas não valem um plugin | código no tema filho |
| Plugin de Google Analytics | idem | snippet no tema filho |
| Plugin de backup | a hospedagem já faz | painel da hospedagem |
| Yoast / Rank Math | pedem configuração e enchem o painel de aviso | The SEO Framework |

---

## Parte 2 — Configurações

### 2.1 WordPress · Configurações → Geral

- [ ] Idioma do site: **Português do Brasil**
- [ ] Fuso horário: **São Paulo**
- [ ] Formato de data: **d/m/Y**
- [ ] Formato de hora: **H:i**
- [ ] A semana começa em: **domingo**

### 2.1b WordPress · Painel → Atualizações

- [ ] **Atualizar traduções**, se oferecido

> Trocar o idioma do site traduz o WordPress, mas **não** os plugins. Sem este
> passo o WooCommerce continua em inglês e a cliente recebe um painel pela
> metade — "Orders", "Customers", "Settings" — que ela não vai saber navegar.

### 2.1c WooCommerce · limpar o painel

- [ ] Esconder o bloco **"Welcome to… / 0 out of 6 complete"** pelos três
      pontinhos (⋮)
- [ ] Esconder também o bloco **"Things to do next"**
- [ ] **"Não, obrigado"** no anúncio do Jetpack, em "Visão geral das estatísticas"
- [ ] **Dispensar** os avisos da "Caixa de entrada"

> Esses blocos viajam no clone. A cliente abre o painel dela e encontra uma lista
> mandando "Set up payments" e "Select your shipping options", sem saber se
> precisa fazer — e liga para você perguntar. Some uma vez aqui, some em todas.

### 2.2 WordPress · Configurações → Links permanentes

- [ ] Estrutura: **Nome do post** (`/%postname%/`)

> O padrão do WordPress é `?p=123`. Endereço feio prejudica busca e passa
> amadorismo quando a cliente manda o link do produto no WhatsApp.

### 2.3 WordPress · Configurações → Leitura

- [ ] **Na loja-mãe: deixe "Sugerir aos mecanismos de busca..." MARCADO**

> Marcado = pede para não indexar. É o correto aqui, porque a loja-mãe nunca deve
> aparecer no Google. **Desmarcar faz parte do checklist de entrega** — é o passo
> que mais se esquece, e a loja da cliente fica invisível por meses.

### 2.3b Página inicial

Nada a configurar: a home vem de `templates/front-page.html`, no tema filho, e
tem precedência sobre o que estiver em Configurações → Leitura.

- [ ] Abrir a raiz do site e conferir as três faixas: chamada, "Últimos
      materiais" com produtos, e "Como funciona"
- [ ] **Conferir com produto cadastrado.** Sem nenhum produto a faixa do meio
      fica vazia e parece quebrada, mas não está.

> De fábrica o WordPress mostra os últimos posts na home — a loja abria com
> "Hello world!" no topo. Sair disso pela tela de Leitura exigiria criar uma
> página por cliente e apontar; pelo tema, funciona sozinho em toda loja.
>
> Os produtos entram por `[products]`, que lê o catálogo direto: a cliente
> cadastra um material e ele aparece na home sem ela editar nada. Nenhum texto
> da home precisa de troca por cliente — as três faixas são verdadeiras para
> qualquer loja do nicho.

### 2.4 WordPress · Configurações → Discussão

- [ ] Desmarcar **"Permitir comentários em novos posts"**

> Loja não precisa de comentário, e comentário aberto é entrada de spam — que
> vira e-mail para a cliente e suporte para você.

### 2.5 WooCommerce → Configurações → Geral

- [ ] País/Região: **Brasil**
- [ ] Moeda: **Real brasileiro (R$)**
- [ ] Posição da moeda: **Esquerda com espaço** (`R$ 19,90`)
- [ ] Separador decimal: **,** · Separador de milhar: **.** · Casas decimais: **2**
- [ ] **Habilitar impostos: desmarcado**

> Imposto desmarcado é decisão consciente: a cliente vende com CPF ou MEI e não
> destaca tributo na nota. Ligar isso criaria um campo que ela não sabe preencher.

### 2.6 WooCommerce → Configurações → Produtos → **Produtos baixáveis**

Sub-aba dentro de "Produtos", na linha
`Geral | Estoque | Produtos baixáveis | …`

Esta seção é o coração da entrega automática. Erre aqui e a loja entrega de
graça, ou entrega sem ter recebido.

- [ ] Método de download de arquivo: **Forçar downloads**
      *(vem de fábrica em "Redirecionar apenas (inseguro)")*
- [ ] Permitir redirecionamento como último recurso: **desmarcado**
- [ ] **Conceder acesso aos produtos baixáveis após o pagamento** — marcado
      *(costuma já vir marcado — confira mesmo assim)*
- [ ] O download requer autenticação: **desmarcado**
- [ ] Anexar string exclusiva ao nome do arquivo: **marcado**

> **O método vem errado de fábrica.** Em "Redirecionar apenas", o WooCommerce
> manda a compradora para o endereço real do arquivo — que ela copia da barra do
> navegador e repassa no grupo da escola. O produto da sua cliente *é* o PDF:
> essa opção é a diferença entre vender e distribuir de graça.
>
> "Após o pagamento" é o outro crítico. Sem ele, um pedido de boleto ainda não
> pago já libera o download.
>
> O "último recurso" fica desmarcado de propósito: marcado, ele volta em silêncio
> ao modo inseguro se o download forçado falhar, e ninguém fica sabendo. PDF é
> arquivo pequeno, não vai falhar.

### 2.7 WooCommerce → Configurações → Contas e privacidade

- [ ] **Habilitar check-out de convidado** — marcado
- [ ] Habilitar login durante a finalização — desmarcado
- [ ] **Após a finalização da compra** — **marcar** *(vem desmarcado de fábrica)*
- [ ] **Durante o checkout** — **desmarcar** *(vem marcado de fábrica)*
- [ ] Na página "Minha conta" — desmarcado
- [ ] **Enviar link de configuração de senha** — marcado
- [ ] Traduzir os dois textos de **Política de privacidade** (vêm em inglês)
- [ ] Retenção de dados pessoais: **tudo em branco**

Textos para colar:

> **Cadastro:** Seus dados pessoais serão usados para dar suporte à sua
> experiência neste site, para gerenciar o acesso à sua conta e para outros fins
> descritos em nossa [privacy_policy].
>
> **Finalização de compra:** Seus dados pessoais serão usados para processar seu
> pedido, dar suporte à sua experiência neste site e para outros fins descritos
> em nossa [privacy_policy].

Mantenha o `[privacy_policy]` — vira o link da página de privacidade.

> **Os dois padrões vêm errados para este produto.** De fábrica, a conta só é
> criada se a compradora marcar uma caixinha no checkout — e a maioria não
> marca. Sem conta não existe a área do cliente para rebaixar o arquivo, que é
> uma das 25 promessas: ela paga, perde o PDF e liga para a sua cliente.
>
> Com "Após a finalização" marcado a conta nasce sozinha, e desmarcar "Durante o
> checkout" tira um campo do formulário. Menos fricção, mesmo resultado.
>
> Os textos de privacidade em inglês aparecem para a **compradora**, no cadastro
> e no checkout. Passam despercebidos porque ficam no fim de uma aba de
> configuração.
>
> Retenção em branco = guardar por tempo indeterminado. É o certo para loja
> pequena: apagar pedido automaticamente é perder histórico de venda.

### 2.7b WooCommerce → Configurações → Avançado

- [ ] **Página de termos e condições**: **Termos de uso**
      *(vem em branco — só dá para escolher depois da Parte 3)*

> Com a página escolhida, o checkout passa a exibir "Li e concordo com os termos"
> com link. Em branco, a página existe e ninguém chega nela na hora de pagar.

### 2.8 WooCommerce → Configurações → Pagamentos

- [ ] Abrir **"Aceite pagamentos offline"** e conferir que **Transferência
      bancária**, **Cheque** e **Pagamento na entrega** mostram o botão
      **"Ativar"** — botão "Ativar" significa que o meio está **desligado**,
      que é como deve ficar *(já vêm assim de fábrica)*
- [ ] Ativar **Mercado Pago** (as credenciais são preenchidas por cliente)

> A leitura do botão engana: quem lê rápido vê "Ativar" e acha que está ligado.
> O que você quer é exatamente essa tela — três "Ativar" e nenhum "Gerenciar".
>
> Deixar meio de pagamento manual ligado é pedir para a cliente receber pedido que
> nunca será pago — e o produto digital some do estoque mental dela.

### 2.9 WooCommerce → Configurações → E-mails

**Lista de notificações** (topo da aba)

- [ ] Conferir o ✓ azul em **Novo pedido**, **Processando pedido** e
      **Pedido concluído**
      *(os três já vêm ativos de fábrica — é só conferir, não mexa nos outros)*

> Esses três são os únicos que importam nesta loja. "Novo pedido" avisa a sua
> cliente que vendeu, "Processando pedido" confirma o pagamento para a
> compradora e "Pedido concluído" é o e-mail que leva o link do PDF.
>
> **"Pedido cancelado (Cliente)" vem desativado e fica assim.** E o
> **"Confirm email address" continua em inglês** mesmo com o site em português:
> é uma string sem tradução no pacote pt_BR. Só aparece quando alguém troca o
> próprio e-mail dentro de "Minha conta", o que praticamente não acontece numa
> loja de PDF. Vale tentar **Painel → Atualizações → Atualizar traduções** antes
> de exportar; se continuar em inglês, deixe.

**Opções do e-mail do remetente**

- [ ] Nome "De": **`Loja`** na mãe *(vem o nome do site — no dev vem `loja-mae`)*
- [ ] Endereço "De": trocado por cliente
      *(no LocalWP vem `dev-email@wpengine.local`, que não existe fora do dev)*
- [ ] Endereço "Responder para": em branco

**Modelo do e-mail**

- [ ] Logotipo: vazio na mãe — ✍️ a cliente envia o dela na entrega
- [ ] Largura do logotipo: **120** · Alinhamento: **Esquerda** · Fonte: **Helvetica**
- [ ] Texto do rodapé: acrescentar o crédito na segunda linha

```
{site_title}<br />{store_address}<br /><a href="https://lojinhapronta.com.br">Loja criada por Lojinha Pronta</a>
```

**Paleta de cores** — o único ponto que vem errado nesta aba

- [ ] Desligar **"Sincronização automática com alterações de tema"**
- [ ] Acento: **`#124559`** *(vem `#8526ff`, roxo do WooCommerce)*
- [ ] Título e texto `#1e1e1e` · Texto secundário `#787c82` · fundos `#ffffff`

> A sincronização com o tema está ligada, mas o `theme.json` do tema filho é
> **aditivo**: acrescenta `lp-marca` e companhia sem sobrescrever a paleta base
> do Twenty Twenty-Five. Resultado: o WooCommerce não acha cor de marca nenhuma
> e mantém o roxo dele. Deixar ligado só faz o roxo voltar depois — desligue e
> escreva o hex na mão.

**Antes de sair da aba**

- [ ] Na **Prévia de e-mail**, escolher "Processando pedido" e conferir que o
      cabeçalho está em português e que a cor do topo é a da marca, não roxa

> **Ignore o `$ 50,00` da prévia.** Ela usa um pedido fictício com formatação
> própria e continua mostrando `$` mesmo com a loja em Real. Verificado: moeda
> `BRL` em **2.5** e a prévia ainda exibia `$`. Não vá consertar moeda por causa
> dela — o lugar de conferir moeda é a própria **2.5**.

### 2.10 FluentSMTP

- [ ] Configurar um remetente e **enviar e-mail de teste**
- [ ] Confirmar que chegou **na caixa de entrada, não no spam**

> Este é o passo invisível que decide se a promessa "e-mail automático de
> confirmação" existe de verdade. Hospedagem compartilhada enviando por PHP puro
> cai em spam com frequência alta.

---

## Parte 2.11 — Cabeçalho e rodapé

Os dois **vêm do tema filho**, em `parts/header.html` e `parts/footer.html`.
Não se montam clicando.

- [ ] Confirmar que a pasta `parts/` está dentro de `wp-content/themes/lojinha-pronta/`
- [ ] No topo, **duas fileiras**: marca, campo de busca e "Minha conta" na de
      cima; Início, Produtos, Sobre, Dúvidas e o link de WhatsApp na de baixo
- [ ] A home abre com **banner** (se houver), **categorias** e **produtos** —
      nunca com texto de venda
- [ ] No rodapé: título do site, as duas colunas de links, e a faixa de crédito
      com o ano corrente por baixo
- [ ] Clicar nos dez links e conferir que nenhum dá 404

> **O menu do topo é a mesma armadilha do rodapé, ao contrário.** Sem menu
> configurado, o Twenty Twenty-Five lista *todas* as páginas em ordem
> alfabética: a loja entregue abre com "Carrinho, Contato, Finalizar compra,
> Loja, Minha conta, Política de privacidade, Política de reembolso, Sobre,
> Termos de uso" no topo. Ninguém põe "Finalizar compra" num menu, e página
> jurídica é rodapé.
>
> Cinco links cabem na tela do celular sem hambúrguer, que é um componente a
> menos para quebrar. A busca ganha a linha inteira lá.
>
> **A home é loja, não página de vendas.** Quem entra quer ver o que a loja
> vende; discurso sobre como funciona a compra vai numa faixa curta perto do
> fim, e só. O layout segue a linguagem das lojas brasileiras: fundo cinza,
> assuntos em cartões brancos arredondados.

> **O rodapé do Twenty Twenty-Five é uma armadilha.** Ele traz oito links do
> site de demonstração do tema — Blog, Sobre, Perguntas frequentes, Autores,
> Eventos, Loja, Padrões, Temas — e sete apontam para páginas que não existem.
> Entregar assim é entregar sete links quebrados.
>
> Consertar isso no editor salvaria a correção **no banco**, e o banco viaja
> dentro do `.wpress`. Funcionaria uma vez. Toda correção futura viraria "abrir
> cada loja entregue e consertar de novo" — o mesmo motivo que tirou o botão de
> WhatsApp e o Analytics de dentro de plugin.
>
> Os endereços em `parts/footer.html` são **relativos** (`/loja/`,
> `/termos-de-uso/`): funcionam em qualquer domínio, sem editar nada por
> cliente. Por isso os slugs da Parte 2.12 e da Parte 3 não são negociáveis.
>
> **Se o rodapé antigo continuar aparecendo**, alguém salvou uma versão no
> editor e o banco está ganhando do arquivo. Vá em **Aparência → Editor →
> Padrões → Partes de modelo → Rodapé**, menu **⋮**, e clique em
> **"Limpar personalizações"**.
>
> O crédito "Loja criada por Lojinha Pronta" e o `© ano nome-da-loja` **não
> estão nesse arquivo**: saem do `functions.php`, no `wp_footer`, fora do
> rodapé editável. O ano é calculado em PHP de propósito — escrito à mão, toda
> loja entregue amanhece em 1º de janeiro exibindo o ano passado.

---

## Parte 2.12 — Páginas: traduzir e limpar

O assistente do WooCommerce cria as páginas dele em inglês, e o WordPress deixa
duas páginas de exemplo para trás. Tudo isso viaja para a loja da cliente.

**Páginas → renomear título e slug**

| Vem como | Fica |
| --- | --- |
| Cart | **Carrinho** · `/carrinho` |
| Checkout | **Finalizar compra** · `/finalizar-compra` |
| My account | **Minha conta** · `/minha-conta` |
| Shop | **Loja** · `/loja` |

> **Trocar o título não troca o endereço.** O WordPress só gera o slug quando a
> página nasce; renomear depois deixa `/cart` no ar com o nome "Carrinho". Abra
> cada uma e edite o **Link permanente** no painel lateral.
>
> Pode renomear sem medo: o WooCommerce guarda essas páginas por **ID**, não por
> nome nem por endereço.
>
> Endereço em português também é o que a compradora espera ver quando desconfia
> do link antes de pagar.

**Duas páginas em rascunho que NÃO se exclui**

O WordPress e o WooCommerce deixam duas páginas prontas em inglês. Renomeie
agora e escreva o conteúdo na **Parte 3** — elas *são* as páginas de lá.

| Vem como | Fica |
| --- | --- |
| Privacy Policy | **Política de privacidade** · `/politica-de-privacidade` |
| Refund and Returns Policy | **Política de reembolso** · `/politica-de-reembolso` |

- [ ] Manter as duas em **rascunho** até o texto estar em português
- [ ] Conferir em **Configurações → Privacidade** que a de privacidade
      continua sendo a página escolhida

> Apagar e criar outra quebra o checkout em silêncio: o `[privacy_policy]` que
> você colou em **2.7** resolve para a página marcada em Configurações →
> Privacidade. Sem ela, a compradora vê um link para lugar nenhum na hora de
> pagar.

**Limpeza**

- [ ] Excluir **"Sample Page"** e esvaziar a lixeira
- [ ] Excluir o post **"Hello world!"** *(está em **Posts**, não em Páginas)*
- [ ] Conferir em **WooCommerce → Configurações → Avançado** que as quatro
      páginas do WooCommerce continuam apontadas nos campos certos

---

## Parte 3 — Páginas que já vêm prontas

Escritas uma vez, com marcadores para trocar por cliente. Estão em
**`paginas/`**, em markup de blocos: cola no **Editor de código** da página
(`Ctrl`+`Shift`+`Alt`+`M`), não no editor visual. Slugs, marcadores e o motivo
de cada decisão jurídica estão no `paginas/LEIA-ME.md`.

- [ ] Política de privacidade (LGPD) — **reescrever a página que já existe**
- [ ] Política de reembolso de produto digital — **reescrever a que já existe**
- [ ] Termos de uso — criar
- [ ] Sobre — criar
- [ ] Contato — criar
- [ ] Publicar as duas que estavam em rascunho
- [ ] Apontar "Termos e condições" em **WooCommerce → Configurações → Avançado**

> Use marcadores literais tipo `[NOME_DA_LOJA]` e `[CPF_CNPJ]` no texto. Na
> entrega é localizar e substituir — e fica óbvio se sobrou algum.

---

## Parte 4 — Limpar e exportar

Tudo que está no banco viaja no `.wpress` e reaparece na loja de cada cliente.

**Limpeza**

- [ ] **Produtos → Todos os produtos**: selecionar todos → Mover para a lixeira
- [ ] **Lixeira → Esvaziar** *(produto na lixeira também viaja)*
- [ ] **Mídia**: apagar as imagens que vieram com os produtos de teste
- [ ] **Páginas → Lixeira** e **Posts → Lixeira**: esvaziar as duas
- [ ] **Comentários**: apagar o comentário de exemplo do WordPress
- [ ] **Usuários**: só o administrador — nenhum cliente de teste
- [ ] **WooCommerce → Pedidos**: vazio

**Conferir que continua fechada**

- [ ] "Sugerir aos mecanismos de busca..." **marcado**
- [ ] Modo **"Em breve" do WooCommerce ligado**

> Os dois ficam ligados na mãe de propósito, e desligá-los é passo do checklist
> de entrega. Loja-mãe indexada pelo Google é a mesma página aparecendo em toda
> busca do nicho, competindo com a loja da sua própria cliente.

**Exportar**

- [ ] All-in-One WP Migration → **Exportar para arquivo**
- [ ] Guardar como `loja-mae-v1.wpress` com a data
- [ ] **Conferir o tamanho do arquivo.** A versão gratuita do plugin tem limite
      de importação: um `.wpress` grande demais não sobe na hospedagem da
      cliente. Sem produto e sem mídia, a mãe deve ficar bem abaixo disso.
- [ ] Anotar a versão em `versoes.md`: o que mudou e quando

> Toda correção descoberta numa entrega volta **para a loja-mãe** e vira `v2`.
> Correção feita só no clone se perde; feita na mãe, vale para todas as próximas.
