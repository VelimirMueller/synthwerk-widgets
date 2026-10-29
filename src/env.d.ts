// Vite inlines a CSS file as a string with the `?inline` suffix.
declare module '*.css?inline' {
  const css: string
  export default css
}
