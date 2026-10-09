const identities = new WeakMap<object, number>();
let next = 0;
/** Identity follows the actual bytes, even when file names and sizes collide. */
export function sourceKey(source: object): number {
  let id = identities.get(source);
  if (!id) {
    id = ++next;
    identities.set(source, id);
  }
  return id;
}
