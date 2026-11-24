/**
 * As páginas que toda loja precisa ter e ninguém quer escrever. Vieram das
 * páginas da loja-mãe do WordPress (legado/wordpress/paginas), generalizadas
 * para qualquer material digital e preenchidas com os dados da lojista.
 *
 * Campo que a lojista não preencheu vira um texto neutro — nunca um
 * "[CPF_CNPJ]" aparecendo para a compradora.
 */
import type { Loja } from '../tipos'
import { linkWhatsapp, whatsappVisivel } from '../lib/formato'
import { ir } from './layout'

function quem(l: Loja) {
  return l.documento ? `${l.nome}, inscrita sob o CPF/CNPJ ${l.documento}` : l.nome
}

function Email({ l }: { l: Loja }) {
  return l.email_contato ? <a href={`mailto:${l.email_contato}`}>{l.email_contato}</a> : <>o e-mail indicado na página de contato</>
}

const ATUALIZACAO = '24/11/2026'

export function Privacidade({ l, base }: { l: Loja; base: string }) {
  return (
    <>
      <p>
        Esta página explica quais dados a {l.nome} coleta quando você compra aqui, para que eles servem e o que você pode pedir a qualquer momento. Ela segue a Lei
        Geral de Proteção de Dados (Lei 13.709/2018).
      </p>
      <p class="nota">Última atualização: {ATUALIZACAO}.</p>
      <h2>Quem é responsável pelos seus dados</h2>
      <p>
        {quem(l)}, é a controladora dos dados tratados neste site. Contato para qualquer assunto de privacidade: <Email l={l} />.
      </p>
      <h2>Que dados coletamos e por quê</h2>
      <div class="tabela-texto">
        <table>
          <thead>
            <tr>
              <th>Dado</th>
              <th>Quando</th>
              <th>Para quê</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Nome e e-mail</td>
              <td>Na compra</td>
              <td>Emitir o pedido, enviar o link do arquivo e dar suporte</td>
            </tr>
            <tr>
              <td>Dados de pagamento</td>
              <td>No checkout do Mercado Pago</td>
              <td>Processar o Pix, o cartão ou o boleto — ficam com o Mercado Pago, não com esta loja</td>
            </tr>
            <tr>
              <td>Histórico de pedidos</td>
              <td>Depois da compra</td>
              <td>Permitir que você baixe o arquivo de novo</td>
            </tr>
            <tr>
              <td>Endereço de IP e dados de navegação</td>
              <td>Ao visitar o site</td>
              <td>Segurança e medição de acessos</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>Não coletamos dados do seu cartão. Os números do cartão são digitados direto no ambiente do Mercado Pago e nunca passam por este site.</p>
      <h2>Com que base legal tratamos esses dados</h2>
      <ul>
        <li>
          <strong>Execução de contrato</strong> — nome, e-mail e histórico de pedidos: sem eles não há como entregar o que você comprou.
        </li>
        <li>
          <strong>Obrigação legal</strong> — guardamos registros de acesso e dados fiscais pelo prazo que a lei exige.
        </li>
        <li>
          <strong>Legítimo interesse</strong> — dados de navegação, para manter o site funcionando e seguro.
        </li>
      </ul>
      <h2>Com quem compartilhamos</h2>
      <p>Só com quem precisa para a loja funcionar, e só o necessário:</p>
      <ul>
        <li>
          <strong>Mercado Pago</strong> — processa a cobrança.
        </li>
        <li>
          <strong>Lojinha Pronta</strong> — plataforma que hospeda esta loja e guarda os pedidos.
        </li>
        <li>
          <strong>Serviço de envio de e-mail</strong> — entrega as mensagens automáticas do pedido.
        </li>
      </ul>
      <p>Não vendemos e não alugamos seus dados para ninguém.</p>
      <h2>Cookies</h2>
      <p>
        Usamos um cookie para guardar o seu carrinho — sem ele a compra não completa.
        {l.ga4 ? ' Também usamos o Google Analytics, que conta visitas sem identificar você pelo nome.' : ''} Dá para bloquear cookies nas configurações do
        navegador, mas aí o carrinho para de funcionar.
      </p>
      <h2>Por quanto tempo guardamos</h2>
      <p>
        Os dados do pedido ficam guardados para que você possa baixar o arquivo de novo quando quiser. Dados fiscais e registros de acesso são mantidos pelos
        prazos legais. Você pode pedir a exclusão a qualquer momento.
      </p>
      <h2>Seus direitos</h2>
      <p>A LGPD garante que você pode, sem pagar nada:</p>
      <ul>
        <li>saber quais dados seus nós temos;</li>
        <li>corrigir dado errado ou incompleto;</li>
        <li>pedir uma cópia dos seus dados;</li>
        <li>pedir a exclusão dos dados que não somos obrigados a guardar;</li>
        <li>saber com quem compartilhamos seus dados.</li>
      </ul>
      <p>
        Para exercer qualquer um deles, escreva para <Email l={l} />. Respondemos em até 15 dias. Se pedir a exclusão, você perde o acesso aos arquivos comprados —
        guarde-os no seu computador antes.
      </p>
      <h2>Mudanças nesta política</h2>
      <p>Se algo mudar, atualizamos esta página e a data do topo.</p>
      <p>
        Veja também os <a href={ir(base, '/termos-de-uso')}>Termos de uso</a>.
      </p>
    </>
  )
}

export function Reembolso({ l, base }: { l: Loja; base: string }) {
  return (
    <>
      <p>
        Todos os produtos da {l.nome} são digitais: você paga e recebe um arquivo para baixar. Isso muda como funciona a devolução, e esta página explica exatamente
        como.
      </p>
      <h2>Você tem 7 dias para desistir</h2>
      <p>
        O Código de Defesa do Consumidor (art. 49) dá a você 7 dias corridos a partir da compra para desistir de qualquer produto comprado pela internet, sem
        precisar explicar o motivo. Isso vale aqui, inclusive para arquivo já baixado.
      </p>
      <p>
        É só escrever para <Email l={l} />
        {l.whatsapp ? (
          <>
            {' '}
            ou chamar no WhatsApp <a href={linkWhatsapp(l.whatsapp)}>{whatsappVisivel(l.whatsapp)}</a>
          </>
        ) : null}{' '}
        com o número do pedido.
      </p>
      <h2>Como o dinheiro volta</h2>
      <ul>
        <li>
          <strong>Pix</strong> — devolvido pelo Mercado Pago para a mesma conta, em até 5 dias úteis.
        </li>
        <li>
          <strong>Cartão de crédito</strong> — o estorno é feito na hora do nosso lado; quem devolve é a operadora, e costuma aparecer na fatura seguinte ou na outra.
        </li>
        <li>
          <strong>Boleto</strong> — devolvido por Pix ou transferência, na conta que você indicar, em até 5 dias úteis.
        </li>
      </ul>
      <p>Depois do reembolso, o acesso ao arquivo é encerrado e o download deixa de funcionar.</p>
      <h2>Se o problema for o arquivo, resolvemos antes</h2>
      <p>
        Arquivo que não abre, download que não completa, e-mail que não chegou: isso é caso de conserto. Fale com a gente e reenviamos — normalmente no mesmo dia.
        Se mesmo assim não resolver, devolvemos o dinheiro, mesmo passados os 7 dias.
      </p>
      <p>
        Antes de escrever, confira o spam e a aba “Promoções”. Você também pode pedir o link de novo em <a href={ir(base, '/meus-pedidos')}>Meus pedidos</a>.
      </p>
      <h2>O que não dá para desfazer</h2>
      <p>Passados os 7 dias, arquivo entregue e funcionando não tem devolução, nem troca por outro produto.</p>
    </>
  )
}

export function Termos({ l, base }: { l: Loja; base: string }) {
  return (
    <>
      <p>Ao comprar na {l.nome} você concorda com as regras abaixo. Elas são curtas de propósito.</p>
      <p class="nota">Última atualização: {ATUALIZACAO}.</p>
      <h2>Quem somos</h2>
      <p>
        Esta loja é operada por {quem(l)}, com contato em <Email l={l} />.
      </p>
      <h2>O que vendemos</h2>
      <p>
        Material digital: arquivos para baixar. Não enviamos nada pelos Correios e não há frete. A descrição de cada produto diz o formato e o que está incluído —
        leia antes de comprar.
      </p>
      <h2>Como funciona a compra</h2>
      <ul>
        <li>Você escolhe o produto e paga por Pix, cartão ou boleto, no ambiente do Mercado Pago.</li>
        <li>O acesso ao arquivo é liberado quando o pagamento é confirmado. Pix e cartão costumam confirmar em segundos; boleto pode levar até 3 dias úteis.</li>
        <li>Você recebe um e-mail com o link dos arquivos. O mesmo link fica na página do pedido.</li>
        <li>Preços podem mudar a qualquer momento. Vale o preço que estava na tela quando você fechou o pedido.</li>
      </ul>
      <h2>O que você pode fazer com o material</h2>
      <p>Comprando, você recebe uma licença pessoal e intransferível. Pode imprimir e usar quantas vezes quiser no seu próprio uso, e guardar uma cópia de segurança.</p>
      <p>Não pode:</p>
      <ul>
        <li>revender, sortear ou distribuir o arquivo, de graça ou pago;</li>
        <li>subir em drive compartilhado, grupo de WhatsApp, Telegram ou qualquer lugar onde outras pessoas baixem;</li>
        <li>editar o material e apresentá-lo como seu.</li>
      </ul>
      <p>Compartilhar material comprado é violação de direito autoral (Lei 9.610/1998) e pode gerar o cancelamento do acesso, além das medidas legais cabíveis.</p>
      <h2>Devolução</h2>
      <p>
        Você tem 7 dias para desistir da compra, e arquivo com problema a gente conserta ou devolve o dinheiro. As regras completas estão na{' '}
        <a href={ir(base, '/politica-de-reembolso')}>Política de reembolso</a>.
      </p>
      <h2>Disponibilidade</h2>
      <p>
        Fazemos o possível para o site ficar sempre no ar, mas ele depende de serviços de terceiros. Se uma falha atrapalhar a entrega de um pedido pago,
        resolvemos o pedido — reenviando o arquivo ou devolvendo o dinheiro.
      </p>
      <h2>Privacidade</h2>
      <p>
        O que fazemos com os seus dados está na <a href={ir(base, '/politica-de-privacidade')}>Política de privacidade</a>.
      </p>
      <h2>Lei e foro</h2>
      <p>Estes termos seguem a lei brasileira. Qualquer questão fica no foro do domicílio do consumidor, como manda o Código de Defesa do Consumidor.</p>
    </>
  )
}

export function Contato({ l, base }: { l: Loja; base: string }) {
  return (
    <>
      <p>
        Dúvida sobre um material, problema com um download ou pedido que não chegou: fale com a gente
        {l.responsavel ? `. Quem responde é ${l.responsavel}` : ''}.
      </p>
      <div class="contatos">
        {l.whatsapp && (
          <a class="contato contato--zap" href={linkWhatsapp(l.whatsapp, `Oi! Vim pela loja ${l.nome}.`)} target="_blank" rel="noopener">
            <strong>WhatsApp</strong>
            <span>{whatsappVisivel(l.whatsapp)} · o caminho mais rápido</span>
          </a>
        )}
        {l.email_contato && (
          <a class="contato" href={`mailto:${l.email_contato}`}>
            <strong>E-mail</strong>
            <span>{l.email_contato} · resposta em até 1 dia útil</span>
          </a>
        )}
        {l.instagram && (
          <a class="contato" href={`https://instagram.com/${l.instagram}`} target="_blank" rel="noopener">
            <strong>Instagram</strong>
            <span>@{l.instagram}</span>
          </a>
        )}
      </div>
      <p>Se for sobre um pedido, mande o número dele — está no e-mail de confirmação. Com o número, a gente resolve na primeira mensagem.</p>
      <h2>Antes de escrever, talvez já esteja resolvido</h2>
      <ul>
        <li>
          <strong>Não recebi o e-mail com o arquivo.</strong> Veja no spam e na aba “Promoções”, ou peça o link de novo em{' '}
          <a href={ir(base, '/meus-pedidos')}>Meus pedidos</a>.
        </li>
        <li>
          <strong>Paguei no boleto e nada chegou.</strong> Boleto leva até 3 dias úteis para compensar. O acesso libera sozinho quando cair.
        </li>
        <li>
          <strong>O arquivo não abre.</strong> Baixe pelo computador e abra com um leitor de PDF. Se continuar, escreva — a gente reenvia.
        </li>
      </ul>
      <h2>Quem somos</h2>
      <p>
        {l.nome}
        {l.documento ? ` · CPF/CNPJ ${l.documento}` : ''}
        {l.cidade_uf ? ` · ${l.cidade_uf}` : ''}
        <br />
        Loja 100% digital: não temos atendimento presencial.
      </p>
    </>
  )
}
