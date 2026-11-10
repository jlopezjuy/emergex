/**
 * Whether a menu item must match its route exactly instead of by prefix.
 *
 * A parent item such as /administracion turns off only while the current page belongs to a
 * more specific menu item (/administracion/proveedores), so the menu marks a single item.
 * On its own sub-pages that are not menu items (/encuestas/campanias) it stays highlighted.
 */
export function coincidenciaExacta(ruta: string, rutasMenu: readonly string[], urlActual: string): boolean {
  const url = urlActual.split(/[?#]/)[0];
  return rutasMenu.some(
    (otra) => otra !== ruta && otra.startsWith(`${ruta}/`) && (url === otra || url.startsWith(`${otra}/`)),
  );
}
