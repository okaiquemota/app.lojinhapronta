import type { AppPainel } from './comum'
import { tela } from './comum'
import { AreaTexto, Botao, Campo, Cartao, Marcador, avisar } from '../ui'
import { agora, campo, corValida, emailValido, normalizarWhatsapp, soNumeros, whatsappVisivel } from '../../lib/formato'
import { apagar, arquivoEnviado, guardarImagem } from '../../lib/arquivos'
import { urlImagem } from '../../lib/lojas'
import { enderecoVisivel } from '../../lib/dominio'
import { conferirSenha, hashSenha } from '../../lib/seguranca'
import { problemaNaSenha } from '../../lib/protecao'
import { fecharOutrasSessoes } from '../../lib/sessao'

/** Combinações testadas para contraste do texto branco sobre o botão. */
const PALETAS = [
  { nome: 'Petróleo', marca: '#124559', destaque: '#cf3f2b' },
  { nome: 'Floresta', marca: '#1f4d3a', destaque: '#c2581f' },
  { nome: 'Ameixa', marca: '#4a2545', destaque: '#c23a6b' },
  { nome: 'Marinho', marca: '#1d3461', destaque: '#d1495b' },
  { nome: 'Terracota', marca: '#5c2e1f', destaque: '#b5532c' },
  { nome: 'Grafite', marca: '#22262a', destaque: '#2f6fdb' },
  { nome: 'Lavanda', marca: '#3f3570', destaque: '#8a4fd6' },
  { nome: 'Rosa', marca: '#6b2340', destaque: '#d6336c' },
]

function linkValido(l: string): string {
  if (!l) return ''
  if (l.startsWith('/') && !l.startsWith('//')) return l.slice(0, 300)
  if (/^https:\/\/[^\s]+$/.test(l)) return l.slice(0, 300)
  return ''
}

function CampoImagem({ rotulo, nome, atual, ajuda }: { rotulo: string; nome: string; atual: string | null; ajuda: string }) {
  return (
    <div class="campo campo-imagem">
      <label for={`c-${nome}`}>{rotulo}</label>
      {atual && (
        <div class="campo-imagem__atual">
          <img src={urlImagem(atual)} alt="" />
          <label>
            <input type="checkbox" name={`remover_${nome}`} value="1" /> remover
          </label>
        </div>
      )}
      <input id={`c-${nome}`} type="file" name={nome} accept="image/jpeg,image/png,image/webp" data-reduzir-imagem={nome === 'logo' ? '600' : '2000'} />
      <p class="campo__ajuda">{ajuda}</p>
    </div>
  )
}

export function rotasLoja(app: AppPainel) {
  // ── aparência ────────────────────────────────────────────────────────────
  app.get('/aparencia', (c) => {
    const l = c.get('loja')
    return tela(
      c,
      { ativo: 'aparencia', titulo: 'Aparência' },
      <form method="post" enctype="multipart/form-data" class="form" data-enviando="Salvando…">
        <div class="grade-produto">
          <div class="grade-produto__principal">
            <Cartao titulo="Nome e logo">
              <Campo rotulo="Nome da loja" nome="nome" valor={l.nome} obrigatorio max={60} />
              <Campo rotulo="Frase da loja" nome="descricao" valor={l.descricao} max={160} ajuda="Aparece no rodapé e no Google. Ex.: Material pedagógico para baixar e imprimir." />
              <CampoImagem rotulo="Logo" nome="logo" atual={l.logo_key} ajuda="PNG com fundo transparente fica melhor. Sem logo, o nome aparece escrito." />
            </Cartao>

            <Cartao titulo="Cores">
              <div class="paletas" role="group" aria-label="Combinações prontas">
                {PALETAS.map((p) => (
                  <button type="button" class="paleta" data-paleta={`${p.marca},${p.destaque}`} title={p.nome}>
                    <span style={`background:${p.marca}`}></span>
                    <span style={`background:${p.destaque}`}></span>
                  </button>
                ))}
              </div>
              <div class="linha-campos">
                <div class="campo">
                  <label for="c-cor_marca">Cor principal</label>
                  <input id="c-cor_marca" type="color" name="cor_marca" value={l.cor_marca} data-cor="marca" />
                  <p class="campo__ajuda">Títulos, preço, rodapé.</p>
                </div>
                <div class="campo">
                  <label for="c-cor_destaque">Cor dos botões</label>
                  <input id="c-cor_destaque" type="color" name="cor_destaque" value={l.cor_destaque} data-cor="destaque" />
                  <p class="campo__ajuda">“Comprar agora”. Precisa ser escura o bastante para o texto branco.</p>
                </div>
              </div>
              <div class="previa-cores" style={`--marca:${l.cor_marca};--destaque:${l.cor_destaque}`} data-previa>
                <strong>{l.nome}</strong>
                <span class="previa-cores__preco">R$ 19,90</span>
                <span class="previa-cores__botao">Comprar agora</span>
                <small data-contraste></small>
              </div>
            </Cartao>

            <Cartao titulo="Chamada da página inicial">
              <p class="texto-suave">Com banner, ele aparece no lugar da chamada. Sem banner, a chamada é desenhada com as suas cores.</p>
              <Campo rotulo="Título" nome="chamada_titulo" valor={l.chamada_titulo} max={80} placeholder={`Bem-vinda à ${l.nome}`} />
              <Campo rotulo="Texto" nome="chamada_texto" valor={l.chamada_texto} max={160} placeholder="Material digital para baixar na hora" />
              <CampoImagem rotulo="Banner (computador)" nome="banner" atual={l.banner_key} ajuda="Largo, 1600 × 500 px. Evite texto pequeno: no celular ele encolhe." />
              <CampoImagem rotulo="Banner (celular)" nome="banner_celular" atual={l.banner_celular_key} ajuda="Opcional. Mais alto, 1080 × 1080 px." />
              <Campo rotulo="Link do banner" nome="banner_link" valor={l.banner_link} max={300} placeholder="/produtos" ajuda="Para onde o banner leva. Ex.: /categoria/pascoa" />
            </Cartao>

            <Cartao titulo="Faixa de aviso">
              <Campo rotulo="Texto" nome="aviso" valor={l.aviso} max={100} placeholder="10% de desconto no Pix até domingo" ajuda="Barra fina no topo de todas as páginas. Vazio esconde." />
              <Campo rotulo="Link" nome="aviso_link" valor={l.aviso_link} max={300} placeholder="/produtos" />
            </Cartao>
          </div>
          <div class="grade-produto__lateral">
            <div class="acoes-form acoes-form--fixa">
              <Botao>Salvar aparência</Botao>
            </div>
          </div>
        </div>
      </form>,
    )
  })

  app.post('/aparencia', async (c) => {
    const l = c.get('loja')
    const f = await c.req.parseBody()
    const nome = campo(f.nome, 60)
    if (nome.length < 2) {
      avisar(c, 'A loja precisa de um nome.', 'erro')
      return c.redirect('/painel/aparencia')
    }
    const cores = {
      marca: corValida(String(f.cor_marca)) ? String(f.cor_marca).toLowerCase() : l.cor_marca,
      destaque: corValida(String(f.cor_destaque)) ? String(f.cor_destaque).toLowerCase() : l.cor_destaque,
    }

    const imagens: Record<'logo' | 'banner' | 'banner_celular', string | null> = { logo: l.logo_key, banner: l.banner_key, banner_celular: l.banner_celular_key }
    const velhas: string[] = []
    try {
      for (const k of ['logo', 'banner', 'banner_celular'] as const) {
        const novo = arquivoEnviado(f[k])
        if (novo) {
          if (imagens[k]) velhas.push(imagens[k]!)
          imagens[k] = await guardarImagem(c.env, l.id, novo)
        } else if (f[`remover_${k}`]) {
          if (imagens[k]) velhas.push(imagens[k]!)
          imagens[k] = null
        }
      }
    } catch (e) {
      avisar(c, (e as Error).message, 'erro')
      return c.redirect('/painel/aparencia')
    }

    await c.env.DB.prepare(
      `UPDATE lojas SET nome = ?, descricao = ?, cor_marca = ?, cor_destaque = ?, logo_key = ?, banner_key = ?, banner_celular_key = ?,
         banner_link = ?, chamada_titulo = ?, chamada_texto = ?, aviso = ?, aviso_link = ?, atualizada_em = ? WHERE id = ?`,
    )
      .bind(
        nome,
        campo(f.descricao, 160),
        cores.marca,
        cores.destaque,
        imagens.logo,
        imagens.banner,
        imagens.banner_celular,
        linkValido(campo(f.banner_link, 300)),
        campo(f.chamada_titulo, 80),
        campo(f.chamada_texto, 160),
        campo(f.aviso, 100),
        linkValido(campo(f.aviso_link, 300)),
        agora(),
        l.id,
      )
      .run()
    await apagar(c.env, ...velhas)
    avisar(c, 'Aparência salva. Abra a loja para ver.')
    return c.redirect('/painel/aparencia')
  })

  // ── dados da loja ────────────────────────────────────────────────────────
  app.get('/configuracoes', (c) => {
    const l = c.get('loja')
    return tela(
      c,
      { ativo: 'configuracoes', titulo: 'Dados da loja' },
      <form method="post" class="form">
        <Cartao titulo="Atendimento">
          <div class="linha-campos">
            <Campo rotulo="WhatsApp" nome="whatsapp" valor={l.whatsapp ? whatsappVisivel(l.whatsapp) : ''} modo="tel" placeholder="(16) 99999-9999" ajuda="Vira o botão verde flutuante da loja." />
            <Campo rotulo="Instagram" nome="instagram" valor={l.instagram} prefixo="@" placeholder="sualoja" max={40} />
          </div>
          <Campo rotulo="E-mail de atendimento" nome="email_contato" tipo="email" valor={l.email_contato} max={200} ajuda="Aparece na página de contato e recebe as respostas dos e-mails de pedido." />
        </Cartao>

        <Cartao titulo="Para as páginas de privacidade, termos e contato">
          <p class="texto-suave">A loja já vem com essas páginas escritas. Estes dados completam o texto — a lei exige que a compradora saiba quem está vendendo.</p>
          <div class="linha-campos">
            <Campo rotulo="Nome do responsável" nome="responsavel" valor={l.responsavel} max={80} />
            <Campo rotulo="CPF ou CNPJ" nome="documento" valor={l.documento} max={20} modo="numeric" />
          </div>
          <Campo rotulo="Cidade / UF" nome="cidade_uf" valor={l.cidade_uf} max={60} placeholder="Ribeirão Preto / SP" />
          <AreaTexto
            rotulo="Sobre a loja"
            nome="sobre"
            valor={l.sobre}
            linhas={7}
            max={4000}
            placeholder="Quem faz o material, há quanto tempo, como ele é feito. Escreva na primeira pessoa."
            ajuda="Vazio, a página “Sobre” não aparece. Página sobre na sua voz vende mais do que texto genérico."
          />
        </Cartao>

        <Cartao titulo="Loja">
          <dl class="dados">
            <dt>Endereço</dt>
            <dd>{enderecoVisivel(c.env, l)}</dd>
          </dl>
          <Marcador nome="aberta" marcado={!!l.aberta} rotulo="Loja aberta" ajuda="Desmarcada, a vitrine mostra “voltamos logo” e ninguém compra." />
          <Campo rotulo="Google Analytics (opcional)" nome="ga4" valor={l.ga4} placeholder="G-XXXXXXXXXX" max={20} ajuda="O código de medição da sua conta do Google Analytics." />
        </Cartao>
        <div class="acoes-form">
          <Botao>Salvar dados</Botao>
        </div>
      </form>,
    )
  })

  app.post('/configuracoes', async (c) => {
    const l = c.get('loja')
    const f = await c.req.parseBody()
    const email = campo(f.email_contato, 200).toLowerCase()
    if (email && !emailValido(email)) {
      avisar(c, 'O e-mail de atendimento parece errado.', 'erro')
      return c.redirect('/painel/configuracoes')
    }
    const ga4 = campo(f.ga4, 20).toUpperCase()
    const doc = soNumeros(campo(f.documento, 20))
    await c.env.DB.prepare(
      `UPDATE lojas SET whatsapp = ?, instagram = ?, email_contato = ?, responsavel = ?, documento = ?, cidade_uf = ?, sobre = ?, ga4 = ?,
         aberta = ?, atualizada_em = ? WHERE id = ?`,
    )
      .bind(
        normalizarWhatsapp(campo(f.whatsapp, 30)),
        campo(f.instagram, 40).replace(/^@/, '').replace(/[^A-Za-z0-9._]/g, ''),
        email,
        campo(f.responsavel, 80),
        formatarDocumento(doc),
        campo(f.cidade_uf, 60),
        campo(f.sobre, 4000),
        /^G-[A-Z0-9]{4,15}$/.test(ga4) ? ga4 : '',
        f.aberta ? 1 : 0,
        agora(),
        l.id,
      )
      .run()
    avisar(c, 'Dados salvos.')
    return c.redirect('/painel/configuracoes')
  })

  // ── minha conta ──────────────────────────────────────────────────────────
  app.get('/conta', (c) => {
    const u = c.get('usuario')
    return tela(
      c,
      { ativo: 'conta', titulo: 'Minha conta' },
      <>
        <Cartao titulo="Seus dados">
          <form method="post" action="/painel/conta" class="form">
            <Campo rotulo="Seu nome" nome="nome" valor={u.nome} obrigatorio max={80} />
            <dl class="dados">
              <dt>E-mail de acesso</dt>
              <dd>{u.email}</dd>
            </dl>
            <Botao tipo="secundario">Salvar</Botao>
          </form>
        </Cartao>
        <Cartao titulo="Trocar senha">
          <form method="post" action="/painel/conta/senha" class="form">
            <Campo rotulo="Senha atual" nome="atual" tipo="password" obrigatorio autocomplete="current-password" />
            <Campo rotulo="Nova senha" nome="nova" tipo="password" obrigatorio min={8} max={128} autocomplete="new-password" ajuda="Pelo menos 8 caracteres. Trocar a senha encerra as outras sessões abertas." />
            <Botao tipo="secundario">Trocar senha</Botao>
          </form>
        </Cartao>
      </>,
    )
  })

  app.post('/conta', async (c) => {
    const nome = campo((await c.req.parseBody()).nome, 80)
    if (nome.length >= 2) await c.env.DB.prepare('UPDATE usuarios SET nome = ? WHERE id = ?').bind(nome, c.get('usuario').id).run()
    avisar(c, 'Dados salvos.')
    return c.redirect('/painel/conta')
  })

  app.post('/conta/senha', async (c) => {
    const f = await c.req.parseBody()
    const u = await c.env.DB.prepare('SELECT senha_hash FROM usuarios WHERE id = ?').bind(c.get('usuario').id).first<{ senha_hash: string }>()
    const nova = String(f.nova ?? '')
    if (!u || !(await conferirSenha(String(f.atual ?? ''), u.senha_hash))) {
      avisar(c, 'A senha atual não confere.', 'erro')
    } else {
      const problema = await problemaNaSenha(nova, c.get('usuario').email)
      if (problema) {
        avisar(c, problema, 'erro')
      } else {
        await c.env.DB.prepare('UPDATE usuarios SET senha_hash = ? WHERE id = ?').bind(await hashSenha(nova), c.get('usuario').id).run()
        // Quem sabia a senha antiga perde o acesso agora, em qualquer aparelho.
        await fecharOutrasSessoes(c, c.get('usuario').id)
        avisar(c, 'Senha trocada. As outras sessões abertas foram encerradas.')
      }
    }
    return c.redirect('/painel/conta')
  })
}

function formatarDocumento(n: string): string {
  if (n.length === 11) return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${n.slice(9)}`
  if (n.length === 14) return `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5, 8)}/${n.slice(8, 12)}-${n.slice(12)}`
  return n
}
