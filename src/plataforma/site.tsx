/**
 * Apresentação da plataforma (a página inicial de app.lojinhapronta.com.br e
 * de lojinhapronta.com.br).
 *
 * O texto veio da landing do serviço feito à mão, adaptado ao modelo de agora:
 * a pessoa cria a loja sozinha, testa 7 dias grátis e paga por mês. O visual
 * é o mesmo sistema do painel e da vitrine (tokens.css + site.css); o serifado
 * fica só nos títulos daqui.
 */
import { raw } from 'hono/html'
import type { Env, Plano } from '../tipos'
import { lista, reais } from '../lib/formato'
import { urlEstatico } from '../estaticos'
import * as I from './icones-site'
import { MAQUETE } from './maquete-site'

const WHATS = '5516982157266'
const zap = (texto: string) => `https://wa.me/${WHATS}?text=${encodeURIComponent(texto)}`
const ZAP_DUVIDA = zap('Oi! Vi a Lojinha Pronta e queria tirar uma dúvida antes de criar a minha loja.')
const FONTES = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Inter:wght@400;500;600&display=swap'

const ico = (svg: string) => raw(svg)

function centavos(v: number) {
  const r = reais(v).replace(/^R\$\s/, '')
  const [inteiro, cent] = r.split(',')
  return { inteiro, cent }
}

/** A marca: a sacola com o visto, em SVG (a mesma do favicon). */
function Marca() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" class="marca__selo">
      <rect width="64" height="64" rx="15" fill="#0a2531" />
      <path d="M16 24 19.5 13.5h25L48 24" fill="none" stroke="#ff6b5b" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M19 24v25.5h26V24" fill="none" stroke="#ff6b5b" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round" />
      <path d="m25.5 36 5 5 9-9.5" fill="none" stroke="#f7f5f2" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  )
}

/** Cabeçalho de seção: rótulo, título e texto de abertura. */
function Cabecalho({ rotulo, titulo, texto, centro, id }: { rotulo: string; titulo: string; texto?: any; centro?: boolean; id?: string }) {
  return (
    <header class={`secao__cabecalho${centro ? ' secao__cabecalho--centro' : ''} reveal`}>
      <p class="rotulo">{rotulo}</p>
      <h2 class="secao__titulo" id={id}>
        {titulo}
      </h2>
      {texto && <p class="secao__lead">{texto}</p>}
    </header>
  )
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
  // A página mora em lojinhapronta.com.br; cadastro e login, em app.
  const app = env.APP_URL
  const dias = Number(env.DIAS_TESTE) || 7
  const menor = planos.reduce((m, p) => Math.min(m, p.preco_centavos), Infinity)
  const ano = new Date().getUTCFullYear()
  const descricao = `Crie sua loja de apostila, molde e material digital em minutos. Pix e cartão no automático, entrega do arquivo na hora. ${dias} dias grátis.`
  const imagem = `${env.APP_URL}${urlEstatico('og.png')}`

  return (
    <>
      {raw('<!doctype html>')}
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
          <meta name="theme-color" content="#ffffff" />
          <title>Lojinha Pronta — Crie sua loja de material digital</title>
          <meta name="description" content={descricao} />
          <link rel="canonical" href={`${env.SITE_URL}/`} />
          <meta property="og:type" content="website" />
          <meta property="og:locale" content="pt_BR" />
          <meta property="og:site_name" content="Lojinha Pronta" />
          <meta property="og:url" content={`${env.SITE_URL}/`} />
          <meta property="og:title" content="Lojinha Pronta — Sua loja pronta pra vender" />
          <meta property="og:description" content="Loja virtual pra quem vende material digital. O cliente paga por Pix ou cartão e recebe o arquivo na hora, sozinho." />
          <meta property="og:image" content={imagem} />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta property="og:image:alt" content="Lojinha Pronta: sua loja pronta pra vender material digital" />
          <meta name="twitter:card" content="summary_large_image" />
          <link rel="icon" type="image/svg+xml" href={urlEstatico('favicon.svg')} />
          <link rel="apple-touch-icon" href={urlEstatico('icone-180.png')} />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
          <link rel="stylesheet" href={FONTES} />
          <link rel="stylesheet" href={urlEstatico('site.css')} />
          <script type="application/ld+json">
            {raw(
              JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'Organization',
                name: 'Lojinha Pronta',
                url: `${env.SITE_URL}/`,
                logo: `${env.APP_URL}${urlEstatico('icone-180.png')}`,
              }).replace(/</g, '\\u003c'),
            )}
          </script>
          <script src={urlEstatico('site.js')} defer></script>
        </head>
        <body>
          <a class="pular" href="#conteudo">
            Pular para o conteúdo
          </a>
          <header class="navbar">
            <div class="container navbar__interno">
              <a href="#topo" class="marca">
                <Marca />
                <span>Lojinha Pronta</span>
              </a>
              <nav class="navbar__links" aria-label="Seções da página">
                {LINKS.map((l) => (
                  <a href={l.href}>{l.texto}</a>
                ))}
              </nav>
              <div class="navbar__acoes">
                <a class="navbar__entrar" href={`${app}/entrar`}>
                  Entrar
                </a>
                <a class="btn btn--primario btn--pequeno" href={`${app}/cadastro`}>
                  Criar minha loja
                </a>
                <button class="navbar__menu" type="button" aria-expanded="false" aria-controls="menu-celular" aria-label="Abrir menu">
                  <span></span>
                  <span></span>
                </button>
              </div>
            </div>
            <div class="navbar__celular" id="menu-celular" hidden>
              <nav class="container" aria-label="Seções da página">
                {LINKS.map((l) => (
                  <a href={l.href}>{l.texto}</a>
                ))}
                <a href={`${app}/entrar`}>Já tenho loja · Entrar</a>
                <a class="btn btn--primario btn--grande btn--largo" href={`${app}/cadastro`}>
                  Criar minha loja grátis
                </a>
              </nav>
            </div>
          </header>

          <main id="conteudo">
            <section class="capa" id="topo" aria-labelledby="titulo-capa">
              <div class="container capa__interno">
                <div class="capa__texto">
                  <p class="rotulo">Loja virtual para material digital</p>
                  <h1 id="titulo-capa">
                    Sua loja pronta <span>pra vender</span>
                  </h1>
                  <p class="capa__sub">
                    Pra quem vende apostila, molde ou material de escola bíblica. Você cria a loja em minutos, o cliente paga por Pix ou cartão e recebe o arquivo na
                    hora, sozinho.
                  </p>
                  <div class="capa__botoes">
                    <a class="btn btn--primario btn--grande" href={`${app}/cadastro`}>
                      Criar minha loja grátis
                    </a>
                    <a class="btn btn--secundario btn--grande" href="#preco">
                      Ver os planos
                    </a>
                  </div>
                  <dl class="capa__numeros">
                    <div>
                      <dt>grátis pra testar, sem cartão</dt>
                      <dd>{dias} dias</dd>
                    </div>
                    <div>
                      <dt>por mês, cancele quando quiser</dt>
                      <dd>{Number.isFinite(menor) ? reais(menor) : '—'}</dd>
                    </div>
                    <div>
                      <dt>de taxa sobre as suas vendas</dt>
                      <dd>0%</dd>
                    </div>
                  </dl>
                </div>
                <div class="capa__visual">{raw(MAQUETE)}</div>
              </div>
            </section>

            <section class="secao" id="beneficios" aria-labelledby="titulo-beneficios">
              <div class="container">
                <Cabecalho
                  id="titulo-beneficios"
                  rotulo="O que você leva"
                  titulo="Uma loja que vende sem você estar do outro lado"
                  texto="Não é site de apresentação com botão de WhatsApp. É loja de verdade: o cliente entra, escolhe, paga e recebe, do começo ao fim, sozinho."
                />
                <ul class="beneficios">
                  {BENEFICIOS.map((b) => (
                    <li class="reveal">
                      <span class="icone-quadro">{ico(b.icone)}</span>
                      <h3>{b.titulo}</h3>
                      <p>{b.texto}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section class="secao secao--fundo" id="como-funciona" aria-labelledby="titulo-passos">
              <div class="container">
                <Cabecalho
                  id="titulo-passos"
                  rotulo="Como funciona"
                  titulo="Sua loja no ar em quatro passos"
                  texto="Sem formulário, sem esperar ninguém. Você faz no seu tempo, pelo celular ou pelo computador, e a conta do Mercado Pago é sua desde o primeiro dia."
                />
                <ol class="passos">
                  {PASSOS.map((p, i) => (
                    <li class="passo reveal">
                      <div class="passo__topo">
                        <span class="passo__num" aria-hidden="true">
                          {i + 1}
                        </span>
                        <span class="etiqueta">{p.custo}</span>
                      </div>
                      <h3>{p.titulo}</h3>
                      <p>{p.texto}</p>
                      {p.link && (
                        <a class="link-seta" href={p.link.externo ? p.link.href : `${app}${p.link.href}`} target={p.link.externo ? '_blank' : undefined} rel={p.link.externo ? 'noopener noreferrer' : undefined}>
                          {p.link.texto}
                          {p.link.externo ? ico(I.EXTERNO) : null}
                          {p.link.externo && <span class="sr-only"> (abre em outra aba)</span>}
                        </a>
                      )}
                    </li>
                  ))}
                </ol>
                <p class="secao__nota reveal">
                  Travou em alguma etapa?{' '}
                  <a href={ZAP_DUVIDA} target="_blank" rel="noopener noreferrer">
                    Me chama no WhatsApp
                  </a>{' '}
                  que eu te guio por mensagem, passo a passo.
                </p>
              </div>
            </section>

            <section class="secao" id="incluso" aria-labelledby="titulo-incluso">
              <div class="container">
                <Cabecalho
                  id="titulo-incluso"
                  rotulo="Tudo incluso"
                  titulo="Tudo que a sua loja precisa, já pronto"
                  texto="Não tem instalação, plugin nem hospedagem pra contratar. Você cria a conta e a loja já nasce com tudo isso funcionando, em qualquer plano."
                />
                <div class="incluso">
                  {INCLUSO.map((g) => (
                    <div class="incluso__grupo reveal">
                      <h3>{g.titulo}</h3>
                      <ul class="lista-check">
                        {g.itens.map((t) => (
                          <li>
                            {ico(I.CHECK)}
                            {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <div class="faixa-cta reveal">
                  <p>
                    Teste tudo por <strong>{dias} dias grátis</strong>, sem cartão.
                  </p>
                  <a class="btn btn--primario" href={`${app}/cadastro`}>
                    Criar minha loja
                  </a>
                </div>
              </div>
            </section>

            <section class="secao secao--fundo" id="portfolio" aria-labelledby="titulo-portfolio">
              <div class="container">
                <Cabecalho id="titulo-portfolio" rotulo="Feito e no ar" titulo="Loja de verdade, vendendo de verdade" texto="Antes de oferecer pra você, eu montei pra mim." />
                <article class="caso reveal">
                  <div class="caso__previa" aria-hidden="true">
                    <span class="caso__nome">Loja do Kiwi</span>
                    <span class="caso__linha"></span>
                    <span class="caso__linha caso__linha--curta"></span>
                    <span class="caso__grade">
                      <i></i>
                      <i></i>
                      <i></i>
                    </span>
                  </div>
                  <div class="caso__texto">
                    <h3>Loja do Kiwi</h3>
                    <p>
                      Loja de material pedagógico digital: planejamento alinhado à BNCC, educação especial, inclusão e autismo. O arquivo é entregue em PDF na hora do
                      pagamento.
                    </p>
                    <ul class="caso__tags">
                      <li class="etiqueta">Material pedagógico</li>
                      <li class="etiqueta">Educação especial e inclusão</li>
                      <li class="etiqueta">Entrega automática</li>
                    </ul>
                  </div>
                </article>
                <p class="secao__nota reveal">
                  Quer ver a sua no lugar dessa? <a href={`${app}/cadastro`}>Crie a sua agora</a>.
                </p>
              </div>
            </section>

            <section class="secao" id="preco" aria-labelledby="titulo-preco">
              <div class="container">
                <Cabecalho id="titulo-preco" centro rotulo="Preço" titulo="Um preço por mês. Sem taxa por venda, sem fidelidade." />
                <div class="planos">
                  {planos.map((p, i) => {
                    const v = centavos(p.preco_centavos)
                    const destaque = i === planos.length - 1 && planos.length > 1
                    return (
                      <article class={`plano reveal${destaque ? ' plano--destaque' : ''}`}>
                        <div class="plano__topo">
                          <h3>{p.nome}</h3>
                          {destaque && <span class="etiqueta etiqueta--marca">Recomendado</span>}
                        </div>
                        <p class="plano__desc">{p.descricao}</p>
                        <p class="plano__preco">
                          <span class="plano__moeda">R$</span>
                          <strong>{v.inteiro}</strong>
                          <span class="plano__centavos">,{v.cent}</span>
                          <span class="plano__periodo">/mês</span>
                        </p>
                        <ul class="lista-check">
                          {lista(p.recursos).map((r) => (
                            <li>
                              {ico(I.CHECK)}
                              {r}
                            </li>
                          ))}
                        </ul>
                        <a class={`btn ${destaque ? 'btn--primario' : 'btn--secundario'} btn--largo`} href={`${app}/cadastro`}>
                          Começar {dias} dias grátis
                        </a>
                        <p class="plano__obs">Sem cartão pra testar. Depois, cobrança mensal no cartão.</p>
                      </article>
                    )
                  })}
                </div>
                <p class="secao__nota secao__nota--centro reveal">
                  <strong>Sem taxa por venda:</strong> você paga só a tarifa do Mercado Pago, que fica com ele. Cancela pelo painel quando quiser, e a loja fica no ar até o
                  fim do mês já pago.
                </p>
              </div>
            </section>

            <section class="secao secao--fundo" id="faq" aria-labelledby="titulo-faq">
              <div class="container faq">
                <Cabecalho
                  id="titulo-faq"
                  rotulo="Dúvidas"
                  titulo="O que todo mundo pergunta antes de começar"
                  texto={
                    <>
                      Se a sua dúvida não estiver aqui,{' '}
                      <a href={ZAP_DUVIDA} target="_blank" rel="noopener noreferrer">
                        me manda no WhatsApp
                      </a>
                      . Respondo por mensagem mesmo: é mais rápido pros dois.
                    </>
                  }
                />
                <div class="faq__lista">
                  {PERGUNTAS.map((q, i) => (
                    <details class="faq__item" name="faq" open={i === 0}>
                      <summary>
                        {q.p}
                        <span class="faq__sinal" aria-hidden="true"></span>
                      </summary>
                      <p>{q.r}</p>
                    </details>
                  ))}
                </div>
              </div>
            </section>

            <section class="secao" id="sobre" aria-labelledby="titulo-sobre">
              <div class="container sobre reveal">
                <p class="rotulo">Sobre</p>
                <h2 class="secao__titulo" id="titulo-sobre">
                  Quem faz a Lojinha Pronta
                </h2>
                <p>
                  Meu nome é Kaique, sou desenvolvedor e criei a Lojinha Pronta depois de perceber uma coisa: tem muita professora vendendo apostila e atividade por PDF no
                  WhatsApp, mandando arquivo na mão, uma venda de cada vez, cobrando por Pix e conferindo comprovante de madrugada.
                </p>
                <p>
                  Isso não é falta de produto bom. É falta de loja. E orçamento de agência pra fazer loja virtual costuma vir em milhares de reais, com reunião, prazo longo e
                  conversa técnica que ninguém pediu.
                </p>
                <p>
                  Então eu fiz a loja que eu queria pra elas: você cria sozinha, em minutos, e paga por mês menos que um lanche. Sem reunião, sem orçamento, sem projeto que
                  vira novela. Você cadastra o material e começa a vender.
                </p>
                <p class="sobre__assinatura">— Kaique</p>
              </div>
            </section>

            <section class="secao secao--cta" id="contato" aria-labelledby="titulo-cta">
              <div class="container">
                <div class="cta reveal">
                  <h2 id="titulo-cta">Bora colocar a sua loja no ar?</h2>
                  <p>Cria a conta, escolhe o endereço e cadastra o primeiro material. São {dias} dias grátis, sem cartão: se não fizer sentido, é só não assinar.</p>
                  <a class="btn btn--primario btn--grande" href={`${app}/cadastro`}>
                    Criar minha loja grátis
                  </a>
                  <p class="cta__zap">
                    Dúvida antes?{' '}
                    <a href={ZAP_DUVIDA} target="_blank" rel="noopener noreferrer">
                      {ico(I.ZAP)}
                      (16) 98215-7266
                    </a>
                  </p>
                </div>
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
                <a href={`${app}/entrar`}>Entrar</a>
                <a href={`${app}/termos`}>Termos de uso</a>
                <a href={`${app}/privacidade`}>Privacidade</a>
              </nav>
              <div class="rodape__legal">
                <p>© {ano} Lojinha Pronta · <span>WhatsApp (16) 98215-7266</span></p>
                <p>
                  Um produto{' '}
                  <a href="https://movcode.com.br" target="_blank" rel="noopener noreferrer">
                    MovCode
                  </a>
                </p>
              </div>
            </div>
          </footer>

          <div class="cta-fixo" data-cta-fixo>
            <a class="btn btn--primario btn--largo" href={`${app}/cadastro`}>
              Criar minha loja grátis
              <small>{dias} dias pra testar, sem cartão</small>
            </a>
          </div>
        </body>
      </html>
    </>
  )
}
