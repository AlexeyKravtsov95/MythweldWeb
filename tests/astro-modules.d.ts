// Plain `tsc` cannot read `.astro` files; `astro check` type-checks them for
// real. Tests only pass imported components to the Container API.
declare module "*.astro" {
  type Container = import("astro/container").experimental_AstroContainer;
  const component: Parameters<Container["renderToString"]>[0];
  export default component;
}
