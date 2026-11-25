# Checklist de entrega

Uma loja, do clone à entrega. Cada linha corresponde a uma promessa da landing —
as 25 estão aqui, numeradas como `[P01]`…`[P25]`. Se um item não foi marcado, o
cliente não recebeu o que comprou.

**Os tempos são estimativa, não medição.** Cronometre a primeira entrega real e
corrija esta coluna. A promessa de 4–6h só vale quando existir número medido.

Legenda: **🏭 clone** = já vem pronto da loja-mãe, é só conferir ·
**✍️ cliente** = trabalho específico desta entrega

---

## Antes de abrir o notebook

Sem estes seis, não comece — cada um vira uma ida e volta que estoura o prazo.

- [ ] Pagamento confirmado
- [ ] Briefing respondido (cores, textos, história, contato)
- [ ] Domínio registrado **no nome do cliente**
- [ ] Hospedagem contratada **pelo link de afiliado**
- [ ] Conta Mercado Pago do cliente ativa
- [ ] Logo (PNG ou SVG) e os PDFs dos produtos recebidos

> Se faltar o PDF, a loja não pode ir ao ar publicada: produto sem arquivo é
> produto que vende e não entrega. Importe como rascunho e publique depois.

---

## 1. Clonar a loja-mãe · ~20 min

- [ ] Restaurar o pacote da loja-mãe na hospedagem nova
- [ ] Conferir que o WordPress abre e o painel entra
- [ ] Trocar a senha de administrador
- [ ] Criar o usuário do cliente como **Administrador** e remover credenciais de teste
- [ ] Trocar o **e-mail do usuário** administrador
- [ ] Trocar o **e-mail do site** em Configurações → Geral
- [ ] `[P01]` Loja instalada e configurada no domínio do cliente

> São dois e-mails diferentes e os dois vêm da loja-mãe apontando para um
> endereço local falso. Esquecer o segundo faz aviso de pedido, de atualização e
> de recuperação de senha caírem no vazio — e ninguém percebe até precisar.

## 2. Domínio e segurança · ~15 min

- [ ] Apontar o domínio para a hospedagem
- [ ] `[P14]` 🏭 SSL emitido e forçando HTTPS (cadeado no navegador)
- [ ] Conferir que `www` e sem `www` chegam no mesmo lugar

## 3. Identidade visual · ~20 min

- [ ] `[P02]` ✍️ Cores do briefing na paleta do `theme.json`
- [ ] `[P02]` ✍️ Logo no cabeçalho e favicon
- [ ] Conferir o contraste do texto sobre a cor principal
- [ ] Rodapé "Loja criada por Lojinha Pronta" presente — 🏭 vem do tema

> O rodapé é o motor de aquisição do negócio. Se sumiu, o tema foi editado
> errado: volte, não recrie na mão.

## 4. Páginas e textos · ~30 min

- [ ] `[P03]` 🏭 Página inicial — conferir que as três faixas carregaram
- [ ] `[P04]` ✍️ Categorias criadas conforme o briefing
- [ ] `[P05]` 🏭 Página de produto conferida (descrição, imagens, botão)
- [ ] `[P07]` ✍️ Página "Sobre" com o texto do briefing — **ou despublicada**
- [ ] `[P08]` ✍️ Página de contato com WhatsApp e formulário
- [ ] `[P20]` 🏭 Botão de WhatsApp flutuante apontando para o número do cliente

## 5. Produtos · ~30 min

- [ ] Gerar o CSV (`ferramentas/catalogo-para-woo.mjs`) a partir do briefing
- [ ] Subir os PDFs
- [ ] Preencher `Download 1 URL` de cada produto
- [ ] Importar o CSV
- [ ] `[P06]` ✍️ Até 10 produtos cadastrados
- [ ] `[P12]` Limite de downloads por produto conferido
- [ ] Publicar os produtos (entram como rascunho de propósito)

## 6. Pagamento · ~20 min

- [ ] `[P09]` ✍️ Credenciais do Mercado Pago do **cliente** no plugin
- [ ] Pix, cartão e boleto habilitados
- [ ] Sair do modo sandbox
- [ ] `[P13]` 🏭 Área do cliente acessível, com histórico de compras

> As chaves são do cliente. Se você usar as suas por engano, o dinheiro dele cai
> na sua conta — o pior erro possível nesta entrega.

## 7. E-mail · ~20 min

- [ ] `[P17]` ✍️ E-mail profissional no domínio criado
- [ ] SMTP configurado e **e-mail de teste recebido fora do spam**
- [ ] `[P11]` E-mail de confirmação de compra chegando
- [ ] Em **WooCommerce → Configurações → E-mails**: nome "De" = nome da loja
      (vem `Loja` da mãe) e endereço "De" = o e-mail novo do domínio
- [ ] ✍️ Logotipo da cliente enviado em **Modelo do e-mail** (largura 120)

> Sem SMTP, o e-mail de confirmação some no spam e a promessa `[P11]` não existe
> na prática. Não pule este passo por parecer invisível.

## 8. Regras e conformidade · ~10 min

- [ ] `[P15]` 🏭 Política de privacidade e termos com o nome e CNPJ/CPF do cliente
- [ ] `[P16]` 🏭 Política de reembolso de produto digital
- [ ] Substituir os **10 marcadores** das cinco páginas (`paginas/LEIA-ME.md`)
- [ ] **Procurar por `[` no site inteiro** — se sobrou colchete, ele está no ar
- [ ] Conferir que não sobrou nome de outro cliente nos textos
- [ ] As cinco páginas linkadas no **rodapé**

> A "Sobre" é a única que não se entrega com marcador nem com texto genérico.
> Briefing preenchido, ela vai ao ar na voz da cliente; briefing vazio, ela sai
> do ar. Loja sem página Sobre é normal — loja com Sobre escrita por robô
> derruba a confiança que faz a compradora pagar.
>
> Página jurídica sem link no rodapé não existe na prática: a compradora não
> acha, e o Procon considera que não foi informada.

## 9. Encontrabilidade · ~15 min

- [ ] `[P18]` 🏭 Títulos e descrições das páginas preenchidos
- [ ] `[P19]` ✍️ Link pronto para a bio do Instagram
- [ ] `[P21]` ✍️ Google Analytics instalado com a conta do cliente
- [ ] Loja liberada para indexação (tirar o "evitar mecanismos de busca")
- [ ] **Modo "Coming soon" do WooCommerce desligado**

> Dois interruptores diferentes, os dois ligados de fábrica, os dois invisíveis
> para quem está logado:
>
> - o WordPress instala pedindo aos buscadores que não indexem
> - o WooCommerce liga o "Coming soon" no assistente inicial
>
> Você, logado como administrador, vê a loja normal nos dois casos. O visitante
> vê "em breve" e o Google não vê nada. Confira **deslogado ou numa janela
> anônima** antes de entregar.

## 10. Compra de teste · ~30 min

**Não pule.** É o único passo que prova que a loja funciona.

- [ ] Comprar um produto de verdade, com Pix, do celular
- [ ] `[P10]` O arquivo liberou sozinho, sem você fazer nada
- [ ] `[P11]` O e-mail de confirmação chegou na caixa de entrada
- [ ] Baixar de novo pela área do cliente
- [ ] Conferir se o dinheiro caiu na conta do **cliente**
- [ ] Estornar a compra de teste
- [ ] Repetir a navegação inteira pelo celular

## 11. Entrega · ~20 min

- [ ] `[P22]` Enviar os vídeos (cadastrar produto, trocar preço, ver pedido)
- [ ] `[P23]` Enviar o manual escrito
- [ ] Entregar as credenciais e orientar a troca de senha
- [ ] `[P24]` Combinar a rodada única de ajustes, por escrito
- [ ] `[P25]` Informar a data em que terminam os 15 dias de suporte

> Escreva a data do fim do suporte na mensagem de entrega. Prazo combinado de
> viva-voz vira suporte eterno.

---

## Depois

- [ ] Registrar o tempo real de cada etapa e corrigir as estimativas acima
- [ ] Anotar o que deu errado e corrigir **na loja-mãe**, não só nesta loja
- [ ] Pedir print da primeira venda do cliente — vira prova social

> Correção feita só no clone se perde. Correção feita na loja-mãe vale para
> todas as próximas entregas.
