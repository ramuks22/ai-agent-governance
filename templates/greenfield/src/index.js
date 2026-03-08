export function main() {
  return 'ai-governance-greenfield-template';
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.stdout.write(`${main()}\n`);
}
