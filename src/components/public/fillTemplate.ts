// Fills `{name}`-style placeholders in an already-translated `lang.tsx`
// string. Never used to compose new copy, only to substitute values into
// strings the translation blocks own.
export function fillTemplate(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? values[key] : match,
  );
}
