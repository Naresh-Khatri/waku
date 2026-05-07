/**
 * System-template seeding is suspended while the editor migrates from
 * the old `@waku/ir` tree shape to the flat `TemplateDocument` shape.
 * Re-enable once flat-document equivalents of the system templates exist.
 */
async function main() {
  console.log(
    "seed-system-templates: skipped — pending flat-document rewrite of @waku/templates",
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
