import type { AppPainel, Ctx } from './comum'
import { tela } from './comum'
import { AreaTexto, BarraAcoes, Botao, Busca, Campo, CampoArquivo, Cartao, Etiqueta, Icone, Marcador, Nota, Selecao, Vazio, avisar } from '../ui'
import type { Aviso } from '../ui'
import type { Categoria, Produto } from '../../tipos'
import { agora, campo, centavosDeTexto, centavosParaCampo, lista, plural, reais, slugificar, tamanhoArquivo } from '../../lib/formato'
import { gerarId } from '../../lib/seguranca'
import { apagar, arquivoDaLoja, arquivoEnviado, enviarArquivoDireto, guardarArquivo, guardarImagem } from '../../lib/arquivos'
import type { Limite } from '../../lib/arquivos'
import { contarProdutosAtivos, limiteDeArquivo, limiteDeProdutos, urlImagem } from '../../lib/lojas'
import { conferirTamanho, mbTexto } from '../../lib/limites'
import { urlDaLoja } from '../../lib/dominio'

async function categoriasDa(c: Ctx): Promise<Categoria[]> {
  const r = await c.env.DB.prepare('SELECT * FROM categorias WHERE loja_id = ? ORDER BY ordem, nome').bind(c.get('loja').id).all<Categoria>()
  return r.results
}

async function produtoDa(c: Ctx, id: string): Promise<Produto | null> {
  return c.env.DB.prepare('SELECT * FROM produtos WHERE id = ? AND loja_id = ?').bind(id, c.get('loja').id).first<Produto>()
}

async function slugLivre(c: Ctx, nome: string): Promise<string> {
  const base = slugificar(nome) || 'produto'
  let s = base
  for (let i = 2; await c.env.DB.prepare('SELECT 1 FROM produtos WHERE loja_id = ? AND slug = ?').bind(c.get('loja').id, s).first(); i++) {
    s = `${base}-${i}`
  }
  return s
}

// ── lista ──────────────────────────────────────────────────────────────────

function Lista({ c, produtos, categorias, q }: { c: Ctx; produtos: Produto[]; categorias: Categoria[]; q: string }) {
  const nomeCat = new Map(categorias.map((k) => [k.id, k.nome]))
  const base = urlDaLoja(c.env, c.get('loja'))
  if (!produtos.length && !q) {
    return (
      <Cartao>
        <Vazio titulo="Nenhum produto ainda" icone="produtos">
          <p>Cadastre o primeiro: nome, preço, uma foto e o arquivo que a cliente recebe depois de pagar.</p>
          <Botao href="/painel/produtos/novo" icone="mais">
            Cadastrar produto
          </Botao>
        </Vazio>
      </Cartao>
    )
  }
  return (
    <Cartao>
      <Busca valor={q} placeholder="Buscar produto" rotulo="Buscar produto" />
      {produtos.length ? (
        <ul class="lista-produtos">
          {produtos.map((p) => {
            const capa = lista(p.imagens)[0]
            return (
              <li>
                <a href={`/painel/produtos/${p.id}`} class="lista-produtos__item">
                  <span class="miniatura">{capa ? <img src={urlImagem(capa)} alt="" loading="lazy" /> : <Icone nome="imagem" />}</span>
                  <span class="lista-produtos__info">
                    <strong>{p.nome}</strong>
                    <small>
                      {p.categoria_id ? nomeCat.get(p.categoria_id) : 'Sem categoria'}
                      {p.arquivo_nome ? ` · ${p.arquivo_nome}` : ''}
                    </small>
                  </span>
                  <span class="lista-produtos__meta">
                    <span class="lista-produtos__preco">{p.preco_centavos === 0 ? 'Grátis' : reais(p.preco_centavos)}</span>
                    <span class="lista-produtos__estado">
                      {p.arquivado ? (
                        <Etiqueta>Arquivado</Etiqueta>
                      ) : p.ativo ? (
                        <Etiqueta cor="verde">À venda</Etiqueta>
                      ) : !p.arquivo_key ? (
                        <Etiqueta cor="amarelo">Falta o arquivo</Etiqueta>
                      ) : (
                        <Etiqueta>Escondido</Etiqueta>
                      )}
                    </span>
                  </span>
                </a>
                {p.ativo && !p.arquivado ? (
                  <a class="botao-icone" href={`${base}/produto/${p.slug}`} target="_blank" rel="noopener" aria-label={`Ver ${p.nome} na loja (abre em outra aba)`} title="Ver na loja">
                    <Icone nome="externo" />
                  </a>
                ) : (
                  <span class="botao-icone" aria-hidden="true"></span>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <Vazio titulo={`Nada encontrado para “${q}”`} icone="busca">
          <Botao href="/painel/produtos" tipo="secundario">
            Ver todos os produtos
          </Botao>
        </Vazio>
      )}
    </Cartao>
  )
}

// ── formulário ─────────────────────────────────────────────────────────────

function verNaLoja(c: Ctx, p: Produto) {
  if (!p.ativo || p.arquivado) return undefined
  return (
    <Botao href={`${urlDaLoja(c.env, c.get('loja'))}/produto/${p.slug}`} alvo="_blank" tipo="secundario" icone="externo">
      Ver na loja
    </Botao>
  )
}

type Situacao = 'a_venda' | 'falta_arquivo' | 'arquivado' | 'escondido'

export function situacaoDe(p: Produto): Situacao {
  if (p.arquivado) return 'arquivado'
  if (!p.arquivo_key) return 'falta_arquivo'
  return p.ativo ? 'a_venda' : 'escondido'
}

/** Por que o produto não pode ir à venda agora (ou null se pode). */
async function motivoParaNaoVender(c: Ctx, temArquivo: boolean, jaAtivo: boolean): Promise<string | null> {
  if (!temArquivo) return 'falta o arquivo que a cliente recebe. Envie o arquivo em “Arquivo entregue” e salve.'
  if (jaAtivo) return null
  const loja = c.get('loja')
  const limiteP = await limiteDeProdutos(c.env, loja)
  if (limiteP !== null && (await contarProdutosAtivos(c.env, loja.id)) >= limiteP) {
    return `seu plano permite ${limiteP} produtos à venda e esse limite já foi atingido. Esconda outro produto ou mude de plano.`
  }
  return null
}

/** Topo da edição: diz se está na loja, por quê não está e o que fazer. */
export function SituacaoDoProduto({ produto }: { produto: Produto }) {
  const s = situacaoDe(produto)
  const acao = (valor: 'vender' | 'esconder', texto: string, tipo: 'principal' | 'secundario' = 'principal') => (
    <form method="post" action={`/painel/produtos/${produto.id}/situacao`} class="form form--linha">
      <Botao tipo={tipo} nome="acao" valor={valor}>
        {texto}
      </Botao>
    </form>
  )
  if (s === 'a_venda') {
    return (
      <Cartao titulo={<>Situação: <Etiqueta cor="verde">À venda</Etiqueta></>} descricao="Está na vitrine e pode ser comprado." acao={acao('esconder', 'Esconder da loja', 'secundario')} />
    )
  }
  if (s === 'falta_arquivo') {
    return (
      <Cartao titulo={<>Situação: <Etiqueta cor="amarelo">Escondido · falta o arquivo</Etiqueta></>}>
        <Nota tipo="alerta">
          Ele não aparece na loja porque ainda não tem o arquivo que a cliente baixa depois de pagar. <a href="#c-arquivo">Envie o arquivo</a> em
          “Arquivo entregue”, deixe “À venda” marcado e clique em <strong>Salvar produto</strong>: ele entra na loja na hora.
        </Nota>
      </Cartao>
    )
  }
  if (s === 'arquivado') {
    return (
      <Cartao
        titulo={<>Situação: <Etiqueta>Arquivado</Etiqueta></>}
        descricao="Foi excluído depois de já ter vendas: saiu da loja, e quem comprou continua baixando."
        acao={acao('vender', 'Colocar à venda de novo')}
      />
    )
  }
  return (
    <Cartao
      titulo={<>Situação: <Etiqueta>Escondido</Etiqueta></>}
      descricao="Está pronto para vender, mas foi escondido da loja. Quem já comprou continua baixando."
      acao={acao('vender', 'Colocar à venda')}
    />
  )
}

/** Excluir fica longe do salvar, no fim da página, e pede confirmação. */
function ZonaDePerigo({ produto }: { produto: Produto }) {
  return (
    <Cartao class="cartao--perigo" titulo="Excluir produto" descricao="Se ele já foi vendido, é arquivado: sai da loja e quem comprou continua baixando.">
      <form method="post" action={`/painel/produtos/${produto.id}/excluir`}>
        <Botao tipo="perigo" icone="lixeira" confirmar={`Excluir “${produto.nome}”?`} confirmarCom="Excluir produto">
          Excluir produto
        </Botao>
      </form>
    </Cartao>
  )
}

type Valores = {
  nome: string
  preco: string
  preco_de: string
  categoria_id: string
  resumo: string
  descricao: string
  limite_downloads: string
  ativo: boolean
  destaque: boolean
}

function valoresDe(p?: Produto | null): Valores {
  return {
    nome: p?.nome ?? '',
    preco: p ? centavosParaCampo(p.preco_centavos) : '',
    preco_de: centavosParaCampo(p?.preco_de_centavos),
    categoria_id: p?.categoria_id ?? '',
    resumo: p?.resumo ?? '',
    descricao: p?.descricao ?? '',
    limite_downloads: p ? (p.limite_downloads == null ? '' : String(p.limite_downloads)) : '5',
    // Escondido só por falta de arquivo: o "À venda" vem marcado, para que
    // anexar o arquivo e salvar já coloque o produto na loja.
    ativo: p ? !!p.ativo || (!p.arquivo_key && !p.arquivado) : true,
    destaque: !!p?.destaque,
  }
}

function Formulario({
  produto,
  v,
  categorias,
  erros,
  limite,
}: {
  produto?: Produto | null
  v: Valores
  categorias: Categoria[]
  erros: Record<string, string>
  limite: Limite
}) {
  const imagens = lista(produto?.imagens)
  return (
    <form method="post" enctype="multipart/form-data" class="form form--produto" data-enviando="Salvando…" data-envio-direto="/painel/arquivos">
      <div class="grade-produto">
        <div class="grade-produto__principal">
          <Cartao titulo="O produto">
            <Campo rotulo="Nome" nome="nome" valor={v.nome} obrigatorio max={120} erro={erros.nome} placeholder="Ex.: Alfabeto ilustrado · 42 páginas" />
            <div class="linha-campos">
              <Campo rotulo="Preço" nome="preco" valor={v.preco} obrigatorio prefixo="R$" moeda placeholder="0,00" erro={erros.preco} ajuda="Digite só os números: 1990 vira 19,90. Deixe 0,00 para material grátis." />
              <Campo rotulo="Preço antigo (opcional)" nome="preco_de" valor={v.preco_de} prefixo="R$" moeda placeholder="0,00" ajuda="Aparece riscado ao lado do preço." />
            </div>
            <Selecao
              rotulo="Categoria"
              nome="categoria_id"
              valor={v.categoria_id}
              opcoes={[{ valor: '', texto: 'Sem categoria' }, ...categorias.map((k) => ({ valor: k.id, texto: k.nome }))]}
              ajuda={
                <>
                  <a href="/painel/categorias">Criar ou editar categorias</a>
                </>
              }
            />
            <Campo rotulo="Resumo" nome="resumo" valor={v.resumo} max={200} placeholder="Uma frase que aparece perto do preço" />
            <AreaTexto
              rotulo="Descrição"
              nome="descricao"
              valor={v.descricao}
              linhas={9}
              max={6000}
              ajuda="Linha em branco separa parágrafos. Comece a linha com “- ” para fazer lista e com “## ” para um subtítulo."
            />
          </Cartao>

          <Cartao titulo="Fotos" descricao="A primeira vira a capa. Quadrada fica melhor na vitrine.">
            {imagens.length > 0 && (
              <ul class="galeria-edicao">
                {imagens.map((k, i) => (
                  <li>
                    <img src={urlImagem(k)} alt={`Foto ${i + 1}`} />
                    {i === 0 && <span class="galeria-edicao__capa">Capa</span>}
                    <label class="galeria-edicao__remover">
                      <input type="checkbox" name="remover_imagem" value={k} /> Remover
                    </label>
                  </li>
                ))}
              </ul>
            )}
            <CampoArquivo
              rotulo={imagens.length ? 'Adicionar fotos' : 'Fotos do produto'}
              nome="imagens"
              aceita="image/jpeg,image/png,image/webp"
              multiplo
              reduzir
              ajuda="JPG, PNG ou WEBP. Fotos grandes do celular são reduzidas antes de subir."
            />
          </Cartao>
        </div>

        <div class="grade-produto__lateral">
          <Cartao titulo="Arquivo entregue" descricao="É o que a cliente baixa depois de pagar.">
            {produto?.arquivo_key ? (
              <div class="arquivo-atual">
                <Icone nome="arquivo" />
                <span>
                  <strong>{produto.arquivo_nome}</strong>
                  <small>{tamanhoArquivo(produto.arquivo_tamanho)}</small>
                </span>
              </div>
            ) : (
              <Nota tipo="alerta">Sem arquivo, o produto não vai para a vitrine.</Nota>
            )}
            <CampoArquivo
              rotulo={produto?.arquivo_key ? 'Trocar arquivo' : 'Enviar arquivo'}
              nome="arquivo"
              aceita=".pdf,.zip,.rar,.png,.jpg,.jpeg,.docx,.xlsx,.pptx,.mp3,.mp4,.epub"
              direto
              limite={limite}
              erro={erros.arquivo}
              ajuda={`PDF, ZIP, imagem ou planilha, até ${mbTexto(limite.max)} no seu plano. Quem já comprou recebe a versão nova.`}
            />
            <input type="hidden" name="arquivo_key" value="" />
            <Campo
              rotulo="Limite de downloads por compra"
              nome="limite_downloads"
              valor={v.limite_downloads}
              tipo="number"
              min={1}
              modo="numeric"
              ajuda="Vazio = sem limite. Um limite baixo desencoraja repassar o link."
            />
          </Cartao>

          <Cartao titulo="Na vitrine">
            <Marcador
              nome="ativo"
              marcado={v.ativo}
              rotulo="À venda"
              ajuda={produto?.arquivo_key || !produto ? 'Desmarque para esconder sem apagar.' : 'Fica marcado: o produto entra na loja assim que tiver o arquivo.'}
            />
            <Marcador nome="destaque" marcado={v.destaque} rotulo="Destaque" ajuda="Aparece primeiro na página inicial." />
            {erros.ativo && <p class="campo__erro">{erros.ativo}</p>}
          </Cartao>
        </div>
      </div>
      <BarraAcoes nota={produto ? 'As mudanças valem na loja assim que você salvar.' : 'O produto entra na loja quando tiver arquivo e estiver à venda.'}>
        <Botao href="/painel/produtos" tipo="fantasma">
          Cancelar
        </Botao>
        <Botao>{produto ? 'Salvar produto' : 'Cadastrar produto'}</Botao>
      </BarraAcoes>
    </form>
  )
}

/** Lê o formulário, sobe arquivos e grava. Devolve erros para redesenhar a tela. */
async function salvar(c: Ctx, existente: Produto | null): Promise<{ ok: true; id: string; aviso: string } | { ok: false; v: Valores; erros: Record<string, string> }> {
  const loja = c.get('loja')
  const f = await c.req.parseBody({ all: true })
  const um = (k: string) => (Array.isArray(f[k]) ? (f[k] as any[])[0] : f[k])
  const v: Valores = {
    nome: campo(um('nome'), 120),
    preco: campo(um('preco'), 20),
    preco_de: campo(um('preco_de'), 20),
    categoria_id: campo(um('categoria_id'), 60),
    resumo: campo(um('resumo'), 200),
    descricao: campo(um('descricao'), 6000),
    limite_downloads: campo(um('limite_downloads'), 6),
    ativo: !!um('ativo'),
    destaque: !!um('destaque'),
  }
  const erros: Record<string, string> = {}
  if (v.nome.length < 2) erros.nome = 'Dê um nome ao produto.'
  const preco = centavosDeTexto(v.preco)
  if (preco === null) erros.preco = 'Preço inválido. Digite só os números, por exemplo 1990 para R$ 19,90.'
  else if (preco > 0 && preco < 100) erros.preco = 'O Mercado Pago não aceita cobrança abaixo de R$ 1,00. Use 0 para grátis.'
  const precoDe = v.preco_de ? centavosDeTexto(v.preco_de) || null : null
  const limite = v.limite_downloads ? Math.max(1, Math.min(999, Number(v.limite_downloads) || 0)) : null

  let categoriaId: string | null = null
  if (v.categoria_id) {
    const k = await c.env.DB.prepare('SELECT id FROM categorias WHERE id = ? AND loja_id = ?').bind(v.categoria_id, loja.id).first<{ id: string }>()
    categoriaId = k?.id ?? null
  }
  if (Object.keys(erros).length) return { ok: false, v, erros }

  // arquivos
  const limiteArq = await limiteDeArquivo(c.env, loja)
  const novasImagens: string[] = []
  let arquivo: { key: string; nome: string; tamanho: number } | null = null
  try {
    const imgs = (Array.isArray(f.imagens) ? f.imagens : [f.imagens]).map(arquivoEnviado).filter((x): x is File => !!x)
    for (const img of imgs.slice(0, 10)) novasImagens.push(await guardarImagem(c.env, loja.id, img))
    const direto = typeof um('arquivo_key') === 'string' ? String(um('arquivo_key')) : ''
    const arq = arquivoEnviado(um('arquivo'))
    if (direto) {
      arquivo = await arquivoDaLoja(c.env, loja.id, direto)
      if (!arquivo) throw new Error('O envio do arquivo não terminou. Tente de novo.')
      // O envio direto já conferiu; confere de novo caso o plano tenha mudado no meio.
      const erro = conferirTamanho(arquivo.tamanho, limiteArq.max, limiteArq.podeSubir)
      if (erro) throw new Error(erro)
    } else if (arq) arquivo = await guardarArquivo(c.env, loja.id, arq, limiteArq)
  } catch (e) {
    await apagar(c.env, ...novasImagens, arquivo?.key)
    return { ok: false, v, erros: { arquivo: (e as Error).message } }
  }

  const remover = new Set((Array.isArray(f.remover_imagem) ? f.remover_imagem : [f.remover_imagem]).filter((x): x is string => typeof x === 'string'))
  const anteriores = lista(existente?.imagens)
  const imagens = [...anteriores.filter((k) => !remover.has(k)), ...novasImagens].slice(0, 12)
  const temArquivo = !!(arquivo || existente?.arquivo_key)

  // Ficar à venda exige arquivo e caber no plano.
  let ativo = v.ativo
  let aviso = existente ? 'Produto salvo.' : 'Produto cadastrado.'
  if (ativo) {
    const motivo = await motivoParaNaoVender(c, temArquivo, !!existente?.ativo && !existente.arquivado)
    if (motivo) {
      ativo = false
      aviso = `Produto salvo, mas escondido: ${motivo}`
    } else if (existente && !existente.ativo) aviso = 'Produto salvo e colocado à venda.'
  }

  const t = agora()
  const id = existente?.id ?? gerarId()
  if (existente) {
    await c.env.DB.prepare(
      `UPDATE produtos SET nome = ?, categoria_id = ?, resumo = ?, descricao = ?, preco_centavos = ?, preco_de_centavos = ?, imagens = ?,
         arquivo_key = ?, arquivo_nome = ?, arquivo_tamanho = ?, limite_downloads = ?, ativo = ?, destaque = ?, arquivado = 0, atualizado_em = ?
       WHERE id = ? AND loja_id = ?`,
    )
      .bind(
        v.nome,
        categoriaId,
        v.resumo,
        v.descricao,
        preco,
        precoDe,
        JSON.stringify(imagens),
        arquivo?.key ?? existente.arquivo_key,
        arquivo?.nome ?? existente.arquivo_nome,
        arquivo?.tamanho ?? existente.arquivo_tamanho,
        limite,
        ativo ? 1 : 0,
        v.destaque ? 1 : 0,
        t,
        id,
        loja.id,
      )
      .run()
    // A imagem removida sai do R2. O arquivo antigo fica: pedidos antigos ainda o
    // têm guardado como cópia, e o de agora passa a valer para todos.
    await apagar(c.env, ...anteriores.filter((k) => remover.has(k)))
  } else {
    await c.env.DB.prepare(
      `INSERT INTO produtos (id, loja_id, categoria_id, nome, slug, resumo, descricao, preco_centavos, preco_de_centavos, imagens,
         arquivo_key, arquivo_nome, arquivo_tamanho, limite_downloads, ativo, destaque, criado_em, atualizado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        loja.id,
        categoriaId,
        v.nome,
        await slugLivre(c, v.nome),
        v.resumo,
        v.descricao,
        preco,
        precoDe,
        JSON.stringify(imagens),
        arquivo?.key ?? null,
        arquivo?.nome ?? null,
        arquivo?.tamanho ?? null,
        limite,
        ativo ? 1 : 0,
        v.destaque ? 1 : 0,
        t,
        t,
      )
      .run()
  }
  return { ok: true, id, aviso }
}

export function rotasProdutos(app: AppPainel) {
  // Envio direto do arquivo do produto (o JS do painel chama antes de salvar).
  app.put('/arquivos', async (c) => {
    try {
      const nome = decodeURIComponent(c.req.header('x-nome-arquivo') ?? 'arquivo.pdf').slice(0, 200)
      const loja = c.get('loja')
      return c.json(await enviarArquivoDireto(c.env, loja.id, c.req.raw, nome, await limiteDeArquivo(c.env, loja)))
    } catch (e) {
      const msg = (e as Error).message
      return c.json({ erro: msg }, msg.includes('máximo') ? 413 : 400)
    }
  })

  app.get('/produtos', async (c) => {
    const q = campo(c.req.query('q'), 80)
    const loja = c.get('loja')
    const r = q
      ? await c.env.DB.prepare('SELECT * FROM produtos WHERE loja_id = ? AND nome LIKE ? ORDER BY arquivado, criado_em DESC LIMIT 200')
          .bind(loja.id, `%${q.replace(/[%_]/g, '')}%`)
          .all<Produto>()
      : await c.env.DB.prepare('SELECT * FROM produtos WHERE loja_id = ? ORDER BY arquivado, criado_em DESC LIMIT 500').bind(loja.id).all<Produto>()
    const categorias = await categoriasDa(c)
    return tela(
      c,
      {
        ativo: 'produtos',
        titulo: 'Produtos',
        acoes: (
          <Botao href="/painel/produtos/novo" icone="mais">
            Novo produto
          </Botao>
        ),
      },
      <Lista c={c} produtos={r.results} categorias={categorias} q={q} />,
    )
  })

  app.get('/produtos/novo', async (c) => {
    return tela(
      c,
      { ativo: 'produtos', titulo: 'Novo produto', voltar: { href: '/painel/produtos', texto: 'Produtos' } },
      <Formulario v={valoresDe(null)} categorias={await categoriasDa(c)} erros={{}} limite={await limiteDeArquivo(c.env, c.get('loja'))} />,
    )
  })

  app.post('/produtos/novo', async (c) => {
    const r = await salvar(c, null)
    if (!r.ok) {
      return tela(
        c,
        { ativo: 'produtos', titulo: 'Novo produto', voltar: { href: '/painel/produtos', texto: 'Produtos' }, aviso: erroGeral, status: 422 },
        <Formulario v={r.v} categorias={await categoriasDa(c)} erros={r.erros} limite={await limiteDeArquivo(c.env, c.get('loja'))} />,
      )
    }
    avisar(c, r.aviso, r.aviso.includes('escondido') ? 'erro' : 'ok')
    return c.redirect(`/painel/produtos/${r.id}`)
  })

  app.get('/produtos/:id', async (c) => {
    const p = await produtoDa(c, c.req.param('id'))
    if (!p) return c.notFound()
    return tela(
      c,
      {
        ativo: 'produtos',
        titulo: p.nome,
        voltar: { href: '/painel/produtos', texto: 'Produtos' },
        acoes: verNaLoja(c, p),
      },
      <>
        <SituacaoDoProduto produto={p} />
        <Formulario produto={p} v={valoresDe(p)} categorias={await categoriasDa(c)} erros={{}} limite={await limiteDeArquivo(c.env, c.get('loja'))} />
        <ZonaDePerigo produto={p} />
      </>,
    )
  })

  app.post('/produtos/:id', async (c) => {
    const p = await produtoDa(c, c.req.param('id'))
    if (!p) return c.notFound()
    const r = await salvar(c, p)
    if (!r.ok) {
      return tela(
        c,
        { ativo: 'produtos', titulo: p.nome, voltar: { href: '/painel/produtos', texto: 'Produtos' }, acoes: verNaLoja(c, p), aviso: erroGeral, status: 422 },
        <>
          <SituacaoDoProduto produto={p} />
          <Formulario produto={p} v={r.v} categorias={await categoriasDa(c)} erros={r.erros} limite={await limiteDeArquivo(c.env, c.get('loja'))} />
          <ZonaDePerigo produto={p} />
        </>,
      )
    }
    avisar(c, r.aviso, r.aviso.includes('escondido') ? 'erro' : 'ok')
    return c.redirect(`/painel/produtos/${p.id}`)
  })

  // Colocar à venda / esconder sem passar pelo formulário inteiro.
  app.post('/produtos/:id/situacao', async (c) => {
    const p = await produtoDa(c, c.req.param('id'))
    if (!p) return c.notFound()
    const acao = (await c.req.parseBody()).acao
    if (acao === 'esconder') {
      await c.env.DB.prepare('UPDATE produtos SET ativo = 0, atualizado_em = ? WHERE id = ?').bind(agora(), p.id).run()
      avisar(c, 'Produto escondido. Ele saiu da loja, e quem já comprou continua baixando.')
    } else if (acao === 'vender') {
      const motivo = await motivoParaNaoVender(c, !!p.arquivo_key, !!p.ativo && !p.arquivado)
      if (motivo) avisar(c, `Ainda não dá para colocar à venda: ${motivo}`, 'erro')
      else {
        await c.env.DB.prepare('UPDATE produtos SET ativo = 1, arquivado = 0, atualizado_em = ? WHERE id = ?').bind(agora(), p.id).run()
        avisar(c, 'Produto à venda. Já aparece na loja.')
      }
    }
    return c.redirect(`/painel/produtos/${p.id}`)
  })

  app.post('/produtos/:id/excluir', async (c) => {
    const p = await produtoDa(c, c.req.param('id'))
    if (!p) return c.notFound()
    const vendido = await c.env.DB.prepare('SELECT 1 FROM pedido_itens WHERE produto_id = ? LIMIT 1').bind(p.id).first()
    if (vendido) {
      // Já vendido: some da vitrine, mas o arquivo continua para quem comprou.
      await c.env.DB.prepare('UPDATE produtos SET ativo = 0, destaque = 0, arquivado = 1, atualizado_em = ? WHERE id = ?').bind(agora(), p.id).run()
      avisar(c, 'Produto arquivado. Ele saiu da loja, e quem já comprou continua baixando.')
    } else {
      await c.env.DB.prepare('DELETE FROM produtos WHERE id = ?').bind(p.id).run()
      await apagar(c.env, ...lista(p.imagens), p.arquivo_key)
      avisar(c, 'Produto excluído.')
    }
    return c.redirect('/painel/produtos')
  })

  // ── categorias ───────────────────────────────────────────────────────────

  app.get('/categorias', async (c) => {
    const cats = await categoriasDa(c)
    const contagem = await c.env.DB.prepare('SELECT categoria_id, COUNT(*) AS n FROM produtos WHERE loja_id = ? AND arquivado = 0 GROUP BY categoria_id')
      .bind(c.get('loja').id)
      .all<{ categoria_id: string; n: number }>()
    const n = new Map(contagem.results.map((r) => [r.categoria_id, r.n]))
    return tela(
      c,
      { ativo: 'categorias', titulo: 'Categorias' },
      <div class="pilha pilha--texto">
        <Cartao titulo="Nova categoria" descricao="Categorias organizam a vitrine e aparecem na página inicial da loja.">
          <form method="post" action="/painel/categorias" class="form form--linha">
            <Campo rotulo="Nome" nome="nome" obrigatorio max={60} placeholder="Ex.: Alfabetização" />
            <Botao icone="mais">Criar</Botao>
          </form>
        </Cartao>
        <Cartao titulo="Suas categorias" descricao={cats.length ? 'A ordem define a sequência na loja: o menor número aparece primeiro.' : undefined}>
          {cats.length ? (
            <ul class="lista-categorias">
              {cats.map((k) => (
                <li>
                  <form method="post" action={`/painel/categorias/${k.id}`} class="form form--linha">
                    <input name="nome" value={k.nome} maxlength={60} aria-label={`Nome da categoria ${k.nome}`} required />
                    <input name="ordem" value={String(k.ordem)} type="number" class="campo-ordem" aria-label={`Ordem de ${k.nome} na loja`} title="Ordem na loja" />
                    <span class="lista-categorias__contagem">{plural(n.get(k.id) ?? 0, 'produto', 'produtos')}</span>
                    <Botao tipo="secundario" pequeno>
                      Salvar
                    </Botao>
                    <Botao
                      tipo="perigo"
                      pequeno
                      nome="excluir"
                      valor="1"
                      icone="lixeira"
                      rotulo={`Excluir ${k.nome}`}
                      confirmar={`Excluir a categoria “${k.nome}”? Os produtos dela ficam sem categoria.`}
                      confirmarCom="Excluir categoria"
                    />
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <Vazio titulo="Nenhuma categoria ainda" icone="categorias">
              <p>Exemplos: “Alfabetização”, “Datas comemorativas”, “Moldes”.</p>
            </Vazio>
          )}
        </Cartao>
      </div>,
    )
  })

  app.post('/categorias', async (c) => {
    const nome = campo((await c.req.parseBody()).nome, 60)
    const loja = c.get('loja')
    if (nome.length < 2) {
      avisar(c, 'Dê um nome à categoria.', 'erro')
      return c.redirect('/painel/categorias')
    }
    let slug = slugificar(nome) || 'categoria'
    if (await c.env.DB.prepare('SELECT 1 FROM categorias WHERE loja_id = ? AND slug = ?').bind(loja.id, slug).first()) slug = `${slug}-${Date.now() % 10000}`
    const ordem = await c.env.DB.prepare('SELECT COALESCE(MAX(ordem),0)+1 AS o FROM categorias WHERE loja_id = ?').bind(loja.id).first<{ o: number }>()
    await c.env.DB.prepare('INSERT INTO categorias (id, loja_id, nome, slug, ordem) VALUES (?, ?, ?, ?, ?)').bind(gerarId(), loja.id, nome, slug, ordem?.o ?? 1).run()
    avisar(c, `Categoria “${nome}” criada.`)
    return c.redirect('/painel/categorias')
  })

  app.post('/categorias/:id', async (c) => {
    const f = await c.req.parseBody()
    const loja = c.get('loja')
    const id = c.req.param('id')
    if (f.excluir) {
      await c.env.DB.prepare('DELETE FROM categorias WHERE id = ? AND loja_id = ?').bind(id, loja.id).run()
      avisar(c, 'Categoria excluída.')
    } else {
      const nome = campo(f.nome, 60)
      if (nome.length >= 2) {
        await c.env.DB.prepare('UPDATE categorias SET nome = ?, ordem = ? WHERE id = ? AND loja_id = ?')
          .bind(nome, Number(f.ordem) || 0, id, loja.id)
          .run()
        avisar(c, 'Categoria salva.')
      }
    }
    return c.redirect('/painel/categorias')
  })
}

const erroGeral: Aviso = { tipo: 'erro', texto: 'Confira os campos marcados.' }
