// Builds a human-readable "field: old -> new" summary for audit-log descriptions.
// Skips arrays/objects (e.g. images, details) - those aren't meaningfully diffable as text.
const describeChanges = (before, after, labels) => {
  const parts = [];
  for (const [key, label] of Object.entries(labels)) {
    const a = before[key];
    const b = after[key];
    if (typeof a === 'object' || typeof b === 'object') continue;
    const aStr = a === null || a === undefined || a === '' ? '-' : String(a);
    const bStr = b === null || b === undefined || b === '' ? '-' : String(b);
    if (aStr === bStr) continue;

    // Sequelize DECIMAL fields round-trip as strings ("100.00" vs "100") with no real
    // change - compare numerically first so re-saving the same form doesn't log a false diff.
    const aNum = Number(aStr);
    const bNum = Number(bStr);
    if (aStr !== '-' && bStr !== '-' && !Number.isNaN(aNum) && !Number.isNaN(bNum) && aNum === bNum) continue;

    parts.push(`${label} "${aStr}" → "${bStr}"`);
  }
  return parts;
};

module.exports = { describeChanges };
