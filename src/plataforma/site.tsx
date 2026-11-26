/**
 * Apresentação da plataforma, com a mesma cara de lojinhapronta.com.br.
 *
 * As classes, o CSS (public/_lp/site.css) e os ícones vêm da landing
 * publicada; o texto foi adaptado do serviço feito à mão (R$ 597) para o
 * modelo de agora: a pessoa cria a loja sozinha, testa 7 dias grátis e paga
 * por mês.
 */
import { raw } from 'hono/html'
import type { Env, Plano } from '../tipos'
import { lista, reais } from '../lib/formato'
import * as I from './icones-site'
import { MAQUETE } from './maquete-site'

const VERSAO = '2'
const WHATS = '5516982157266'
const zap = (texto: string) => `https://wa.me/${WHATS}?text=${encodeURIComponent(texto)}`
const ZAP_DUVIDA = zap('Oi! Vi a Lojinha Pronta e queria tirar uma dúvida antes de criar a minha loja.')

const ico = (svg: string) => raw(svg)

function centavos(v: number) {
  const r = reais(v).replace('R$ ', '')
  const [inteiro, cent] = r.split(',')
  return { inteiro, cent }
}

const LINKS = [
  { href: '#beneficios', texto: 'Benefícios' },
  { href: '#como-funciona', texto: 'Como funciona' },
  { href: '#incluso', texto: 'O que vem' },
  { href: '#preco', texto: 'Preço' },
  { href: '#faq', texto: 'Dúvidas' },
]

const BENEFICIOS = [
  {
    icone: I.ICONE_LOJA,
    titulo: 'Loja completa, não um site bonito',
    texto: 'Catálogo, carrinho, checkout e página do pedido funcionando. Não é página de apresentação com botão de WhatsApp: é loja que fecha venda sozinha.',
  },
  {
    icone: I.ICONE_CARTAO,
    titulo: 'Pix e cartão no automático',
    texto: 'Integração com Mercado Pago. O cliente escolhe Pix, cartão ou boleto e o dinheiro cai direto na sua conta — sem passar pela gente em momento nenhum.',
  },
  {
    icone: I.ICONE_ARQUIVO,
    titulo: 'Entrega do arquivo na hora',
    texto: 'Pagou, o sistema libera o download do PDF sozinho. Funciona às 3 da manhã, no domingo, enquanto você dá aula. Chega de mandar arquivo na mão.',
  },
  {
    icone: I.ICONE_CELULAR,
    titulo: 'Feita pro celular primeiro',
    texto: 'Quase todo mundo vai chegar pelo link do seu Instagram, no celular. A loja é desenhada nessa tela antes de qualquer outra.',
  },
  {
    icone: I.ICONE_CADEADO,
    titulo: 'Cadeado, SSL e dados protegidos',
    texto: 'Certificado de segurança já incluso em toda loja. Sem aviso de "site não seguro" espantando quem ia comprar.',
  },
  {
    icone: I.ICONE_PAINEL,
    titulo: 'Você mesma cuida de tudo',
    texto: 'Cadastrar produto, trocar preço, ver quem comprou: tudo num painel simples, no celular ou no computador. Sem plugin, sem hospedagem, sem atualização.',
  },
]

const PASSOS = [
  {
    titulo: 'Crie a loja',
    custo: '1 minuto',
    texto: 'Escolha o nome e o endereço. A loja nasce na hora, já com política de privacidade, termos de uso e política de reembolso escritos.',
    link: { href: '/cadastro', texto: 'Criar minha loja', externo: false },
  },
  {
    titulo: 'Cadastre os materiais',
    custo: 'no seu tempo',
    texto: 'Foto, preço e o arquivo. Ponha suas cores e o seu logo: a vitrine se monta sozinha, bonita no celular.',
    link: { href: 'https://www.canva.com/pt_br/criar/logotipos/', texto: 'Sem logo? Faça um no Canva', externo: true },
  },
  {
    titulo: 'Conecte o Mercado Pago',
    custo: 'grátis',
    texto: 'Um botão. O dinheiro de cada venda cai direto na sua conta, e o arquivo é liberado no instante do pagamento. A conta abre grátis com CPF.',
    link: { href: 'https://www.mercadopago.com.br', texto: 'Abrir conta no Mercado Pago', externo: true },
  },
  {
    titulo: 'Divulgue o link',
    custo: 'link pronto',
    texto: 'Põe na bio do Instagram e manda no grupo. Cada venda chega no seu e-mail, e o cliente recebe o arquivo sem você fazer nada.',
    link: null,
  },
]

const INCLUSO = [
  {
    titulo: 'A loja em si',
    itens: [
      'Loja completa no endereço sualoja.lojinhapronta.com.br',
      'Suas cores e o seu logo',
      'Página inicial com banner e destaque pros seus produtos',
      'Categorias pra organizar por matéria, idade ou tema',
      'Página de produto com fotos, descrição e botão de compra',
      'Página "Sobre" contando a sua história',
      'Página de contato com WhatsApp',
    ],
  },
  {
    titulo: 'Pagamento e entrega',
    itens: [
      'Checkout do Mercado Pago (Pix, cartão em até 12x e boleto)',
      'Entrega automática do arquivo depois do pagamento',
      'E-mail automático com o link do arquivo pro cliente',
      'Limite de quantas vezes cada arquivo pode ser baixado',
      'Página "Meus pedidos" pro cliente baixar de novo',
    ],
  },
  {
    titulo: 'Confiança e regra do jogo',
    itens: [
      'Certificado de segurança (o cadeado do navegador)',
      'Política de privacidade e termos de uso adequados à LGPD',
      'Política de reembolso de produto digital escrita pra você',
    ],
  },
  {
    titulo: 'Pra te acharem no Google e no Instagram',
    itens: [
      'Título e descrição prontos pro Google em todas as páginas',
      'Link da loja pronto pra bio do Instagram',
      'Botão de WhatsApp flutuante pra dúvida antes da compra',
      'Google Analytics, se você quiser medir as visitas',
    ],
  },
  {
    titulo: 'Pra você não depender de ninguém',
    itens: [
      'Painel simples pra cadastrar produto e trocar preço',
      'Aviso por e-mail a cada venda',
      'Arquivos de até 95 MB por produto',
      'Suporte por WhatsApp pra dúvida de uso',
    ],
  },
]

const PERGUNTAS = [
  {
    p: 'Em qual plataforma a loja é feita?',
    r: 'Na própria Lojinha Pronta. Você não instala nada, não contrata hospedagem e não atualiza plugin: entra no painel, cadastra o produto e pronto. A gente cuida do servidor, da segurança e das atualizações.',
  },
  {
    p: 'Preciso saber mexer com site?',
    r: 'Não. Se você posta no Instagram, consegue. O painel tem poucas telas, em português, e funciona no celular. Travou em alguma coisa? Me chama no WhatsApp que eu te guio por mensagem.',
  },
  {
    p: 'Onde eu recebo o dinheiro das vendas?',
    r: 'Direto na sua conta do Mercado Pago, que é sua e está no seu CPF ou CNPJ. O dinheiro vai do cliente pra você sem passar pela gente, e não ficamos com porcentagem de venda nenhuma.',
  },
  {
    p: 'A entrega do arquivo é automática mesmo?',
    r: 'É. Quando o Mercado Pago confirma o pagamento, o arquivo é liberado na hora e o link chega no e-mail do cliente. Pix confirma em segundos; boleto, quando compensa. Você não precisa fazer nada.',
  },
  {
    p: 'Quanto custa e como eu cancelo?',
    r: 'Você testa 7 dias grátis, sem cartão. Depois, é o valor do plano por mês, no cartão. Cancela pelo próprio painel, quando quiser e sem multa: a loja fica no ar até o fim do mês já pago.',
  },
  {
    p: 'Preciso ter CNPJ?',
    r: 'Não. Dá pra vender com CPF: a conta do Mercado Pago abre com CPF, e as páginas de privacidade e termos usam o documento que você tiver.',
  },
  {
    p: 'Posso usar meu próprio domínio?',
    r: 'Toda loja já nasce com um endereço pronto, tipo sualoja.lojinhapronta.com.br. Domínio próprio (sualoja.com.br) está chegando no plano Profissional.',
  },
]

export function PaginaInicial({ env, planos }: { env: Env; planos: Plano[] }) {
  const dias = Number(env.DIAS_TESTE) || 7
  const menor = planos.reduce((m, p) => Math.min(m, p.preco_centavos), Infinity)
  const ano = new Date().getUTCFullYear()

  return (
    <>
      {raw('<!doctype html>')}
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
          <meta name="theme-color" content="#0a2531" />
          <title>Lojinha Pronta — Crie sua loja de material digital</title>
          <meta
            name="description"
            content={`Crie sua loja de apostila, molde e material digital em minutos. Pix e cartão no automático, entrega do arquivo na hora. ${dias} dias grátis.`}
          />
          <meta property="og:title" content="Lojinha Pronta — Sua loja pronta pra vender" />
          <meta property="og:description" content="Loja virtual pra quem vende material digital. O cliente paga por Pix ou cartão e recebe o arquivo na hora, sozinho." />
          <meta property="og:image" content={`${env.SITE_URL}/og.png`} />
          <link rel="icon" type="image/svg+xml" href="/_lp/favicon.svg" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap"
          />
          <link rel="stylesheet" href={`/_lp/site.css?v=${VERSAO}`} />
          <script src={`/_lp/site.js?v=${VERSAO}`} defer></script>
        </head>
        <body>
          <a class="pular-para-conteudo" href="#beneficios">
            Pular para o conteúdo
          </a>
          <header class="navbar">
            <div class="container navbar__interno">
              <a href="#topo" class="navbar__marca">
                <span class="navbar__selo" aria-hidden="true">
                  {ico(I.SELO)}
                </span>
                <span class="navbar__nome">Lojinha Pronta</span>
              </a>
              <nav class="navbar__links" aria-label="Seções da página">
                {LINKS.map((l) => (
                  <a href={l.href} class="navbar__link">
                    {l.texto}
                  </a>
                ))}
              </nav>
              <a class="navbar__entrar" href="/entrar">
                Entrar
              </a>
              <a class="btn btn--primario navbar__cta" href="/cadastro">
                Criar minha loja
              </a>
              <button class="navbar__hamburguer" aria-expanded="false" aria-controls="menu-mobile" aria-label="Abrir menu">
                <span></span>
                <span></span>
              </button>
            </div>
            <div class="navbar__mobile" id="menu-mobile" hidden>
              <nav aria-label="Seções da página (celular)">
                {LINKS.map((l, i) => (
                  <a href={l.href} style={`--i: ${i};`}>
                    {l.texto}
                  </a>
                ))}
              </nav>
              <a class="btn btn--primario btn--bloco" href="/cadastro">
                Criar minha loja grátis
              </a>
              <a class="navbar__mobile-entrar" href="/entrar">
                Já tenho loja · Entrar
              </a>
            </div>
          </header>

          <main>
            <section class="hero" id="topo">
              <div class="hero__aurora" aria-hidden="true">
                <span class="hero__mancha hero__mancha--coral"></span>
                <span class="hero__mancha hero__mancha--azul"></span>
                <span class="hero__mancha hero__mancha--petroleo"></span>
              </div>
              <div class="hero__grao" aria-hidden="true"></div>
              <div class="container hero__interno">
                <div class="hero__texto">
                  <h1 class="hero__titulo">
                    <span class="hero__linha">
                      <span style="--i: 0;">Sua loja pronta</span>
                    </span>
                    <span class="hero__linha">
                      <span style="--i: 1;">pra vender</span>
                    </span>
                  </h1>
                  <p class="hero__sub">
                    Pra quem vende apostila, molde ou material de escola bíblica. Você cria a loja em minutos, o cliente paga por Pix ou cartão e recebe o arquivo na
                    hora, sozinho.
                  </p>
                  <div class="hero__botoes">
                    <a class="btn btn--primario btn--grande" href="/cadastro">
                      Criar minha loja grátis
                    </a>
                    <a class="btn btn--fantasma btn--grande" href="#preco">
                      Ver os planos{ico(I.SETA_BAIXO)}
                    </a>
                  </div>
                  <ul class="hero__numeros">
                    <li class="hero__numero" style="--i: 0;">
                      <strong>{dias} dias</strong>
                      <span>grátis pra testar, sem cartão</span>
                    </li>
                    <li class="hero__numero" style="--i: 1;">
                      <strong>{Number.isFinite(menor) ? reais(menor) : '—'}</strong>
                      <span>por mês, cancele quando quiser</span>
                    </li>
                    <li class="hero__numero" style="--i: 2;">
                      <strong>0%</strong>
                      <span>de taxa sobre as suas vendas</span>
                    </li>
                  </ul>
                </div>
                <div class="hero__visual">{raw(MAQUETE)}</div>
              </div>
            </section>

            <section class="secao secao--beneficios" id="beneficios">
              <div class="container">
                <div class="secao__cabecalho reveal">
                  <p class="eyebrow">O que você leva</p>
                  <h2 class="secao__titulo">Uma loja que vende sem você estar do outro lado</h2>
                  <p class="secao__lead">
                    Não é site de apresentação com botão de WhatsApp. É loja de verdade: o cliente entra, escolhe, paga e recebe — do começo ao fim, sozinho.
                  </p>
                </div>
                <ul class="beneficios__grade">
                  {BENEFICIOS.map((b, i) => (
                    <li class="beneficio reveal" style={`--reveal-delay: ${i * 70}ms;`}>
                      <span class="beneficio__brilho" aria-hidden="true"></span>
                      <span class="beneficio__icone">{ico(b.icone)}</span>
                      <h3 class="beneficio__titulo">{b.titulo}</h3>
                      <p class="beneficio__texto">{b.texto}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section class="secao secao--clara secao--prereq" id="como-funciona">
              <div class="container">
                <div class="secao__cabecalho reveal">
                  <p class="eyebrow">Como funciona</p>
                  <h2 class="secao__titulo">Sua loja no ar em quatro passos</h2>
                  <p class="secao__lead">
                    Sem formulário, sem esperar ninguém. Você faz no seu tempo, pelo celular ou pelo computador — e a conta do Mercado Pago é sua, do primeiro dia.
                  </p>
                </div>
                <ul class="prereq__lista">
                  {PASSOS.map((p, i) => (
                    <li class="prereq reveal" style={`--reveal-delay: ${i * 80}ms;`}>
                      <div class="prereq__num" aria-hidden="true">
                        {i + 1}
                      </div>
                      <div class="prereq__corpo">
                        <div class="prereq__topo">
                          <h3 class="prereq__titulo">{p.titulo}</h3>
                          <span class="prereq__custo">{p.custo}</span>
                        </div>
                        <p class="prereq__texto">{p.texto}</p>
                        {p.link && (
                          <a
                            class="prereq__link"
                            href={p.link.href}
                            target={p.link.externo ? '_blank' : undefined}
                            rel={p.link.externo ? 'noopener noreferrer' : undefined}
                          >
                            {p.link.texto}
                            {p.link.externo ? ico(I.EXTERNO) : null}
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                <p class="prereq__nota reveal">
                  Travou em alguma etapa? Sem problema —{' '}
                  <a href={ZAP_DUVIDA} target="_blank" rel="noopener noreferrer">
                    me chama no WhatsApp
                  </a>{' '}
                  que eu te guio por mensagem, passo a passo.
                </p>
              </div>
            </section>

            <section class="secao secao--escura secao--pacote" id="incluso">
              <div class="container">
                <div class="secao__cabecalho reveal">
                  <p class="eyebrow">Tudo incluso</p>
                  <h2 class="secao__titulo">Tudo que a sua loja precisa, já pronto</h2>
                  <p class="secao__lead">
                    Não tem instalação, plugin nem hospedagem pra contratar. Você cria a conta e a loja já nasce com tudo isso funcionando, em qualquer plano.
                  </p>
                </div>
                <div class="pacote__grade">
                  {INCLUSO.map((g, i) => (
                    <div class="pacote__grupo reveal" style={`--reveal-delay: ${i * 80}ms;`}>
                      <h3 class="pacote__grupo-titulo">
                        <span class="pacote__grupo-num">{String(i + 1).padStart(2, '0')}</span>
                        {g.titulo}
                      </h3>
                      <ul class="pacote__itens">
                        {g.itens.map((t, j) => (
                          <li style={`--i: ${j};`}>
                            <span class="pacote__check" aria-hidden="true">
                              {ico(I.CHECK)}
                            </span>
                            {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <div class="pacote__fecho reveal">
                  <p>
                    Teste tudo por <strong>{dias} dias grátis</strong>, sem cartão.
                  </p>
                  <a class="btn btn--primario" href="/cadastro">
                    Criar minha loja
                  </a>
                </div>
              </div>
            </section>

            <section class="secao secao--portfolio" id="portfolio">
              <div class="container">
                <div class="secao__cabecalho reveal">
                  <p class="eyebrow">Feito e no ar</p>
                  <h2 class="secao__titulo">Loja de verdade, vendendo de verdade</h2>
                  <p class="secao__lead">Antes de oferecer pra você, eu montei pra mim.</p>
                </div>
                <ul class="vitrine__grade vitrine__grade--uma">
                  <li class="vitrine reveal vitrine--destaque" style="--reveal-delay: 0ms;">
                    <div class="vitrine__card">
                      <div class="vitrine__visual">
                        <div class="vitrine__preview" aria-hidden="true">
                          <div class="vitrine__preview-barra">
                            <span></span>
                            <span></span>
                            <span></span>
                          </div>
                          <div class="vitrine__preview-corpo">
                            <span class="vitrine__preview-marca">Loja do Kiwi</span>
                            <span class="vitrine__preview-linha"></span>
                            <span class="vitrine__preview-linha vitrine__preview-linha--curta"></span>
                            <div class="vitrine__preview-grade">
                              <i></i>
                              <i></i>
                              <i></i>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div class="vitrine__corpo">
                        <h3 class="vitrine__nome">Loja do Kiwi</h3>
                        <p class="vitrine__descricao">
                          Loja de material pedagógico digital: planejamento alinhado à BNCC, educação especial, inclusão e autismo. O arquivo é entregue em PDF na hora do
                          pagamento.
                        </p>
                        <ul class="vitrine__tags">
                          <li>Material pedagógico</li>
                          <li>Educação especial e inclusão</li>
                          <li>Entrega automática</li>
                        </ul>
                      </div>
                    </div>
                  </li>
                </ul>
                <p class="vitrine__chamada reveal">
                  Quer ver a sua no lugar dessa? <a href="/cadastro">Crie a sua agora.</a>
                </p>
              </div>
            </section>

            <section class="secao secao--preco" id="preco">
              <div class="container">
                <div class="secao__cabecalho secao__cabecalho--centro reveal">
                  <p class="eyebrow">Preço</p>
                  <h2 class="secao__titulo">Um preço por mês. Sem taxa por venda, sem fidelidade.</h2>
                </div>
                <div class="planos-site">
                  {planos.map((p, i) => {
                    const v = centavos(p.preco_centavos)
                    const destaque = i === planos.length - 1
                    return (
                      <div class="preco__moldura reveal" style={`--reveal-delay: ${i * 90}ms;`}>
                        {destaque && <span class="preco__aura" aria-hidden="true"></span>}
                        <div class="preco__card">
                          <span class="preco__brilho" aria-hidden="true"></span>
                          <div class={`preco__selo${destaque ? '' : ' preco__selo--suave'}`}>{p.nome}</div>
                          <div class="preco__valor">
                            <span class="preco__moeda">R$</span>
                            <span class="preco__numero">
                              {v.inteiro}
                              <span class="preco__centavos">,{v.cent}</span>
                            </span>
                          </div>
                          <p class="preco__forma">por mês · {p.descricao.toLowerCase()}</p>
                          <ul class="preco__lista">
                            {lista(p.recursos).map((r, j) => (
                              <li style={`--i: ${j};`}>
                                <span aria-hidden="true">{ico(I.CHECK)}</span>
                                {r}
                              </li>
                            ))}
                          </ul>
                          <a class={`btn ${destaque ? 'btn--primario' : 'btn--fantasma'} btn--bloco btn--grande`} href="/cadastro">
                            Começar {dias} dias grátis
                          </a>
                          <p class="preco__obs">Sem cartão pra testar. Depois, cobrança mensal no cartão.</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <p class="planos-site__nota reveal">
                  <strong>Sem taxa por venda:</strong> você paga só a tarifa do Mercado Pago, que fica com ele. Cancela pelo painel quando quiser, e a loja fica no ar até
                  o fim do mês já pago.
                </p>
              </div>
            </section>

            <section class="secao secao--clara secao--faq" id="faq">
              <div class="container faq__interno">
                <div class="faq__coluna-titulo reveal">
                  <p class="eyebrow">Dúvidas</p>
                  <h2 class="secao__titulo">O que todo mundo pergunta antes de começar</h2>
                  <p class="secao__lead">
                    Se a sua dúvida não estiver aqui,{' '}
                    <a href={ZAP_DUVIDA} target="_blank" rel="noopener noreferrer">
                      me manda no WhatsApp
                    </a>
                    . Respondo por mensagem mesmo — é mais rápido pros dois.
                  </p>
                </div>
                <ul class="faq__lista">
                  {PERGUNTAS.map((q, i) => (
                    <li class={`faq__item reveal${i === 0 ? ' is-aberto' : ''}`} style={`--reveal-delay: ${i * 55}ms;`}>
                      <h3>
                        <button class="faq__pergunta" id={`faq-botao-${i}`} aria-expanded={i === 0 ? 'true' : 'false'} aria-controls={`faq-painel-${i}`}>
                          <span>{q.p}</span>
                          <span class="faq__sinal" aria-hidden="true">
                            <i></i>
                            <i></i>
                          </span>
                        </button>
                      </h3>
                      <div class="faq__painel" id={`faq-painel-${i}`} role="region" aria-labelledby={`faq-botao-${i}`}>
                        <div class="faq__painel-interno">
                          <p>{q.r}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section class="secao secao--sobre" id="sobre">
              <div class="container sobre__interno">
                <div class="sobre__texto reveal">
                  <p class="eyebrow">Sobre</p>
                  <h2 class="secao__titulo">Quem faz a Lojinha Pronta</h2>
                  <p class="sobre__paragrafo">
                    Meu nome é Kaique, sou desenvolvedor e criei a Lojinha Pronta depois de perceber uma coisa: tem muita professora vendendo apostila e atividade por PDF
                    no WhatsApp, mandando arquivo na mão, uma venda de cada vez, cobrando por Pix e conferindo comprovante de madrugada.
                  </p>
                  <p class="sobre__paragrafo">
                    Isso não é falta de produto bom. É falta de loja. E orçamento de agência pra fazer loja virtual costuma vir em milhares de reais, com reunião, prazo
                    longo e conversa técnica que ninguém pediu.
                  </p>
                  <p class="sobre__paragrafo">
                    Então eu fiz a loja que eu queria pra elas: você cria sozinha, em minutos, e paga por mês menos que um lanche. Sem reunião, sem orçamento, sem projeto
                    que vira novela. Você cadastra o material e começa a vender.
                  </p>
                  <p class="sobre__assinatura">— Kaique</p>
                </div>
              </div>
            </section>

            <section class="secao secao--cta" id="contato">
              <div class="cta__aurora" aria-hidden="true">
                <span></span>
                <span></span>
              </div>
              <div class="container cta__interno reveal">
                <h2 class="cta__titulo">Bora colocar a sua loja no ar?</h2>
                <p class="cta__texto">
                  Cria a conta, escolhe o endereço e cadastra o primeiro material. São {dias} dias grátis, sem cartão — se não fizer sentido, é só não assinar.
                </p>
                <a class="btn btn--primario btn--grande cta__botao" href="/cadastro">
                  Criar minha loja grátis
                </a>
                <p class="cta__numero">
                  Dúvida antes?{' '}
                  <a href={ZAP_DUVIDA} target="_blank" rel="noopener noreferrer">
                    (16) 98215-7266
                  </a>
                </p>
              </div>
            </section>
          </main>

          <footer class="rodape">
            <div class="container rodape__interno">
              <div class="rodape__marca">
                <strong>Lojinha Pronta</strong>
                <span>Loja virtual pra quem vende material digital</span>
              </div>
              <nav class="rodape__links" aria-label="Rodapé">
                {LINKS.map((l) => (
                  <a href={l.href}>{l.texto}</a>
                ))}
                <a href="/entrar">Entrar</a>
              </nav>
              <div class="rodape__legal">
                <p>© {ano} Lojinha Pronta · WhatsApp (16) 98215-7266</p>
                <p class="rodape__movcode">
                  Um produto{' '}
                  <a href="https://movcode.com.br" target="_blank" rel="noopener noreferrer">
                    MovCode
                  </a>
                </p>
              </div>
            </div>
          </footer>

          <div class="zap-fixo" aria-hidden="true">
            <a class="zap-fixo__botao" href="/cadastro" tabindex={-1}>
              <span>
                Criar minha loja grátis<small>{dias} dias pra testar, sem cartão</small>
              </span>
            </a>
          </div>
        </body>
      </html>
    </>
  )
}
