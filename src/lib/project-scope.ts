export function splitProjectScope(scope: string): string[] {
  return scope.split(/,\s*|\s+und\s+/).map((service) => service.trim()).filter(Boolean);
}
