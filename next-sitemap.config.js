/**
 * Configuracion de next-sitemap, que corre en el postbuild.
 *
 * El script `postbuild` ya estaba en package.json pero este archivo nunca se
 * habia creado, asi que `npm run build` fallaba al final aunque Next compilara
 * bien.
 *
 * En produccion hay que setear SITE_URL con el dominio real: el fallback a
 * localhost sirve para que el build corra local, pero genera un sitemap que no
 * se puede publicar.
 *
 * @type {import('next-sitemap').IConfig}
 */
module.exports = {
  siteUrl: process.env.SITE_URL ?? "http://localhost:3000",
  generateRobotsTxt: true,
  // Todo lo que esta detras de login no va al sitemap ni se deja indexar.
  exclude: ["/admin", "/admin/*", "/superadmin", "/superadmin/*", "/perfil/*"],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/superadmin", "/perfil", "/api"],
      },
    ],
  },
};
