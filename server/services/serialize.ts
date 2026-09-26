import mongoose from 'mongoose';

/**
 * Fast read path: `.lean()` queries are 4-5x cheaper than hydrating Mongoose
 * documents (3,000 bookings: ~50ms vs ~260-360ms), but they skip schema
 * defaults and the toJSON transform. This restores both so the API output is
 * identical to `doc.toJSON()`: missing top-level fields get their schema
 * default (older rows lack e.g. `source`/`commission`), `_id` becomes `id`,
 * `__v` is dropped.
 */
type Row = Record<string, any>;
const defaultsCache = new WeakMap<mongoose.Model<any>, [string, () => unknown][]>();

function defaultsFor(model: mongoose.Model<any>) {
  let list = defaultsCache.get(model);
  if (list) return list;
  list = [];
  for (const [path, type] of Object.entries(model.schema.paths) as [string, any][]) {
    if (path.includes('.') || path === '_id' || path === '__v') continue;
    const dv = type.defaultValue;
    if (dv !== undefined) list.push([path, typeof dv === 'function' ? dv : () => dv]);
    else if (type.instance === 'Array') list.push([path, () => []]);
  }
  defaultsCache.set(model, list);
  return list;
}

export function serializeLean<T extends Row>(model: mongoose.Model<any>, rows: T[], extra?: (out: Row) => void): Row[] {
  const defaults = defaultsFor(model);
  return rows.map(row => {
    const out: Row = { ...row };
    for (const [path, make] of defaults) if (out[path] === undefined) out[path] = make();
    out.id = out._id;
    delete out._id;
    delete out.__v;
    extra?.(out);
    return out;
  });
}

/** CommRecord's toJSON also exposes the aliases the Communications page reads */
export const commAliases = (c: Row) => {
  c.recipientId = c.guestId;
  c.templateName = c.template;
};
