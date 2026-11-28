/**
 * robots.txt e sitemap.xml da plataforma (as lojas têm os próprios, em
 * src/loja/index.tsx).
 *
 *   lojinhapronta.com.br       a apresentação: liberada, com sitemap
 *   app.lojinhapronta.com.br   conta e painel: nada ali é para o Google. As
 *                              telas abertas (cadastro, entrar) já saem com
 *                              noindex; o resto fica bloqueado para não gastar
 *                              a visita do robô em página fechada.
 */
import type { Env } from '../tipos'

const TEXTO = { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' }
const XML = { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' }

export function robotsDoSite(env: Env): Response {
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${env.SITE_URL}/sitemap.xml\n`, { headers: TEXTO })
}

export function sitemapDoSite(env: Env): Response {
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    `<url><loc>${env.SITE_URL}/</loc></url>\n` +
    '</urlset>\n'
  return new Response(xml, { headers: XML })
}

export function robotsDoApp(): Response {
  const corpo = ['User-agent: *', 'Disallow: /painel', 'Disallow: /admin', 'Disallow: /webhooks', 'Disallow: /api/', 'Disallow: /redefinir/', ''].join(
    '\n',
  )
  return new Response(corpo, { headers: TEXTO })
}
