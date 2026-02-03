/// <reference types="vite/client" />

declare module "*.js?url" {
  const url: string
  export default url
}

declare module "gif.js/dist/gif.worker.js?url" {
  const url: string
  export default url
}
