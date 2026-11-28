/**
 * Termos de uso e política de privacidade da própria Lojinha Pronta: o contrato
 * com a lojista (quem cria a loja e paga a mensalidade). As páginas de cada
 * loja, para as compradoras, ficam em src/loja/legal.tsx.
 *
 * Quem responde pelo serviço fica em EMPRESA (os mesmos dados do Poupin). A
 * MovCode ainda não tem CNPJ: responde a pessoa física que usa o nome MovCode.
 * Quando a empresa for aberta, troque `responsavel` pela razão social e
 * preencha `cnpj` (o CPF sai do texto). Campo vazio some do texto.
 */
import type { Child } from 'hono/jsx'
import type { Env } from '../tipos'
import { Documento, Marca } from './layout'

export const EMPRESA = {
  nome: 'MovCode',
  /** Nome completo ou razão social de quem responde pelo serviço. */
  responsavel: 'Kaique Henrique Alves Mota',
  cpf: '449.369.118-28',
  cnpj: '',
  /** Endereço físico (exigido pelo Decreto 7.962/2013). */
  endereco: 'Rua Francisco Buonvicini, 786, Jardim Jandaia, Ribeirão Preto/SP, CEP 14060-380',
  email: 'contato@movcode.com.br',
  /** Encarregados pelo tratamento de dados pessoais (LGPD). */
  encarregados: 'Vinicius Hallal e Kaique Mota',
  whatsapp: '(16) 98215-7266',
  whatsappLink: 'https://wa.me/5516982157266',
  /** Cidade/UF do foro do contrato. Vazio: vale o foro do domicílio da lojista. */
  foro: 'Ribeirão Preto/SP',
}

const ATUALIZACAO = '28/11/2026'

function Contato() {
  return (
    <>
      pelo WhatsApp <a href={EMPRESA.whatsappLink}>{EMPRESA.whatsapp}</a>
      {EMPRESA.email && (
        <>
          {' '}
          ou pelo e-mail <a href={`mailto:${EMPRESA.email}`}>{EMPRESA.email}</a>
        </>
      )}
    </>
  )
}

function quem() {
  const documento = EMPRESA.cnpj ? `CNPJ nº ${EMPRESA.cnpj}` : EMPRESA.cpf && `CPF nº ${EMPRESA.cpf}`
  const operador = [
    EMPRESA.responsavel || EMPRESA.nome,
    EMPRESA.responsavel && EMPRESA.nome && EMPRESA.responsavel !== EMPRESA.nome && `que atua sob o nome ${EMPRESA.nome}`,
    documento,
    EMPRESA.endereco && `com endereço em ${EMPRESA.endereco}`,
  ]
    .filter(Boolean)
    .join(', ')
  return `a Lojinha Pronta, serviço operado por ${operador}`
}

function PaginaLegal({ env, titulo, descricao, children }: { env: Env; titulo: string; descricao: string; children: Child }) {
  return (
    <Documento titulo={`${titulo} · Lojinha Pronta`} descricao={descricao} indexar classe="corpo-central">
      <main class="central central--texto">
        <Marca href={env.SITE_URL} />
        <article class="central__caixa texto-legal">
          <h1>{titulo}</h1>
          <p class="central__sub">Última atualização: {ATUALIZACAO}.</p>
          {children}
        </article>
        <p class="central__rodape">
          <a href="/termos">Termos de uso</a> · <a href="/privacidade">Política de privacidade</a> · <a href={env.SITE_URL}>Lojinha Pronta</a>
        </p>
      </main>
    </Documento>
  )
}

export function Termos({ env }: { env: Env }) {
  return (
    <PaginaLegal env={env} titulo="Termos de uso" descricao="Regras de uso da Lojinha Pronta para quem cria e mantém uma loja na plataforma.">
      <p>
        Estes termos valem entre você, que cria uma loja, e {quem()}. Ao criar a conta, você declara que leu e concorda com eles e com a{' '}
        <a href="/privacidade">política de privacidade</a>.
      </p>

      <h2>1. O que é o serviço</h2>
      <p>
        A Lojinha Pronta é uma plataforma para vender produtos digitais (arquivos para baixar). Você monta a loja no painel, cadastra os produtos e conecta a sua
        própria conta do Mercado Pago. A loja fica no ar em um endereço do tipo <em>suaLoja.{env.DOMINIO_RAIZ}</em>.
      </p>

      <h2>2. Sua conta</h2>
      <ul>
        <li>Você precisa ter 18 anos ou mais, ou ser representante de uma empresa, e informar dados verdadeiros.</li>
        <li>A senha é pessoal. Tudo o que for feito com o seu acesso é de sua responsabilidade.</li>
        <li>Avise a gente assim que suspeitar que alguém entrou na sua conta.</li>
      </ul>

      <h2>3. Teste grátis, planos e cobrança</h2>
      <ul>
        <li>Toda loja nasce com {env.DIAS_TESTE} dias de teste grátis, sem cartão.</li>
        <li>
          Depois do teste, a loja continua no ar com um plano pago, cobrado todo mês no cartão de crédito pela Stripe. O preço e os limites de cada plano aparecem
          no painel, em <strong>Plano</strong>, antes da assinatura.
        </li>
        <li>A assinatura renova sozinha a cada mês até você cancelar. Você pode cancelar quando quiser, no próprio painel, sem multa.</li>
        <li>Ao cancelar, a loja fica no ar até o fim do mês já pago. Não há devolução proporcional de mês em andamento.</li>
        <li>
          Se o cartão for recusado, a Stripe tenta cobrar de novo nos dias seguintes. Com mais de 14 dias de atraso, a vitrine sai do ar até o pagamento, mas quem já
          comprou continua baixando os arquivos.
        </li>
        <li>Se o preço de um plano mudar, avisamos com pelo menos 30 dias de antecedência. Assinaturas ativas mantêm o valor até você trocar de plano.</li>
      </ul>

      <h2>4. As vendas da sua loja</h2>
      <ul>
        <li>
          O dinheiro das vendas vai direto para a sua conta do Mercado Pago. A Lojinha Pronta não recebe, não guarda e não repassa esse dinheiro, e não cobra
          comissão sobre as vendas. As tarifas do Mercado Pago são as da sua conta lá.
        </li>
        <li>
          Você é a vendedora: responde pelos produtos, pelo atendimento às compradoras, por reembolsos e cancelamentos, pela emissão de nota fiscal e pelos
          impostos das suas vendas.
        </li>
        <li>A loja já vem com termos, política de privacidade e política de reembolso para as compradoras. Mantenha seus dados de contato atualizados no painel.</li>
      </ul>

      <h2>5. O que não pode ser vendido</h2>
      <p>É proibido usar a plataforma para vender ou divulgar:</p>
      <ul>
        <li>material que você não tem direito de vender (cópia de livro, curso, molde, fonte ou arte de outra pessoa sem autorização);</li>
        <li>conteúdo ilegal, de exploração sexual, de ódio, de violência ou que incentive crimes;</li>
        <li>arquivos com vírus ou qualquer programa feito para causar dano;</li>
        <li>produtos que prometam o que não entregam, ou golpes de qualquer tipo.</li>
      </ul>
      <p>
        Ao receber denúncia ou perceber algo assim, podemos tirar o produto ou a loja do ar, avisando você. Em caso grave ou repetido, a conta pode ser encerrada
        sem devolução do mês em andamento.
      </p>

      <h2>6. Arquivos e conteúdo</h2>
      <ul>
        <li>O conteúdo da loja (textos, imagens e arquivos) continua sendo seu. Você nos autoriza a guardar e exibir esse conteúdo só para fazer a loja funcionar.</li>
        <li>Cada plano tem um tamanho máximo por arquivo, mostrado no painel.</li>
        <li>Guarde sempre uma cópia dos seus arquivos. A plataforma não substitui o seu próprio backup.</li>
      </ul>

      <h2>7. Disponibilidade</h2>
      <p>
        Trabalhamos para manter a plataforma no ar o tempo todo, mas pode haver paradas para manutenção ou por falha de fornecedores (hospedagem, Mercado Pago,
        Stripe). Não respondemos por vendas que deixaram de acontecer nesses períodos, nem por problemas causados pelo Mercado Pago, pela Stripe ou pela internet da
        compradora.
      </p>

      <h2>8. Encerramento</h2>
      <p>
        Você pode encerrar a conta a qualquer momento, cancelando o plano e pedindo a exclusão pelos nossos canais de contato. Depois do encerramento, a loja sai do ar
        e os dados são apagados nos prazos da <a href="/privacidade">política de privacidade</a>.
      </p>

      <h2>9. Mudanças nestes termos</h2>
      <p>Se mudarmos algo importante, avisamos pelo e-mail da conta ou pelo painel antes de a mudança valer. Continuar usando a plataforma depois disso é concordar.</p>

      <h2>10. Contato e foro</h2>
      <p>
        Dúvidas, suporte e denúncias: <Contato />. Estes termos seguem as leis do Brasil.
        {EMPRESA.foro ? ` Fica eleito o foro de ${EMPRESA.foro}, salvo quando a lei garantir a você o foro do seu domicílio.` : ' Fica eleito o foro do seu domicílio.'}
      </p>
    </PaginaLegal>
  )
}

export function Privacidade({ env }: { env: Env }) {
  return (
    <PaginaLegal env={env} titulo="Política de privacidade" descricao="Quais dados a Lojinha Pronta guarda, para quê e como você pede para ver, corrigir ou apagar.">
      <p>
        Esta política explica como {quem()} trata os dados de quem cria loja na plataforma e das compradoras dessas lojas, segundo a Lei Geral de Proteção de Dados
        (Lei 13.709/2018).
      </p>

      <h2>1. Dados das lojistas</h2>
      <p>Quando você cria e usa a loja, guardamos:</p>
      <ul>
        <li>nome, e-mail e senha (a senha é guardada embaralhada, nunca em texto);</li>
        <li>dados da loja que você preenche: nome, CPF ou CNPJ, cidade, WhatsApp, Instagram e e-mail de contato;</li>
        <li>a ligação com a sua conta do Mercado Pago (guardada cifrada) e o identificador da sua assinatura na Stripe;</li>
        <li>endereço IP e horário de acesso, para segurança e para evitar abuso.</li>
      </ul>
      <p>
        Os dados do cartão da mensalidade ficam só com a Stripe: a Lojinha Pronta nunca vê o número do cartão.
      </p>

      <h2>2. Dados das compradoras</h2>
      <p>
        Em cada compra guardamos nome, e-mail, os produtos e a situação do pagamento, para liberar o download e mandar o link por e-mail. Nesse caso, quem decide
        sobre os dados é a loja onde a compra foi feita (a controladora), e a Lojinha Pronta trata os dados em nome dela (operadora). O pagamento acontece no Mercado
        Pago, e os dados do cartão ou do Pix ficam só lá.
      </p>

      <h2>3. Para que usamos</h2>
      <ul>
        <li>fazer a loja funcionar: vitrine, pedidos, entrega dos arquivos e e-mails de compra, de venda e de troca de senha (execução do contrato);</li>
        <li>cobrar a mensalidade (execução do contrato);</li>
        <li>proteger a plataforma contra fraude, robôs e acesso indevido (legítimo interesse);</li>
        <li>cumprir obrigações legais e fiscais.</li>
      </ul>
      <p>Não vendemos dados e não mandamos propaganda de terceiros.</p>

      <h2>4. Com quem compartilhamos</h2>
      <p>Só com os fornecedores que fazem o serviço funcionar, cada um para a sua parte:</p>
      <ul>
        <li>Cloudflare: hospedagem, banco de dados, arquivos e proteção contra robôs;</li>
        <li>Mercado Pago: pagamento das vendas de cada loja;</li>
        <li>Stripe: cobrança da mensalidade;</li>
        <li>Resend: envio dos e-mails automáticos;</li>
        <li>Google Analytics, só nas lojas em que a lojista ligar essa opção.</li>
      </ul>
      <p>Alguns desses fornecedores guardam dados fora do Brasil, com as garantias previstas na LGPD.</p>

      <h2>5. Cookies</h2>
      <p>
        Usamos apenas os cookies necessários: o que mantém você conectada ao painel e o que guarda o carrinho na loja. Não usamos cookies de propaganda. A
        verificação anti-robô da Cloudflare pode usar dados técnicos do navegador.
      </p>

      <h2>6. Por quanto tempo</h2>
      <ul>
        <li>Dados da conta e da loja: enquanto a conta existir. Depois do encerramento, apagamos em até 90 dias, menos o que a lei manda guardar.</li>
        <li>Pedidos: pelo prazo exigido pelas leis fiscais e de defesa do consumidor (até 5 anos).</li>
      </ul>

      <h2>7. Seus direitos</h2>
      <p>
        Você pode pedir a qualquer momento para confirmar se tratamos seus dados, ver, corrigir, levar para outro serviço ou apagar, e retirar o consentimento quando
        ele for a base. Compradoras podem falar direto com a loja ou com a gente. Peça <Contato />. Respondemos em até 15 dias.
        {EMPRESA.encarregados && ` Os encarregados pelo tratamento de dados pessoais são ${EMPRESA.encarregados}.`}
      </p>

      <h2>8. Segurança</h2>
      <p>
        Usamos conexão cifrada (HTTPS) em todas as páginas, senha embaralhada, token do Mercado Pago cifrado, arquivos à venda liberados só depois do pagamento
        confirmado e limites contra tentativas repetidas de login. Se acontecer um incidente que possa trazer risco a você, avisamos e comunicamos a ANPD.
      </p>

      <h2>9. Mudanças</h2>
      <p>Se esta política mudar de forma importante, avisamos pelo e-mail da conta ou pelo painel.</p>
    </PaginaLegal>
  )
}
