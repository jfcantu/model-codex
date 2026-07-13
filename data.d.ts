// The @modyfi/vite-plugin-yaml plugin turns `*.yaml` imports into parsed JS.
// We type them as `unknown` here and validate/narrow at the data-loading layer.
declare module '*.yaml' {
  const data: unknown
  export default data
}
