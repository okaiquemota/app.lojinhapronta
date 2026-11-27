// Arquivos importados como texto pelo wrangler (ver "rules" no wrangler.jsonc).
declare module '*.css' {
  const texto: string
  export default texto
}
declare module '*.js.txt' {
  const texto: string
  export default texto
}
declare module '*.png' {
  const dados: ArrayBuffer
  export default dados
}
declare module '*.svg' {
  const texto: string
  export default texto
}
