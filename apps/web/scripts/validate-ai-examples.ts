import { TemplateDocumentZ } from "../src/components/template-editor/schema";
import { AI_TEMPLATE_EXAMPLES } from "../src/components/template-editor/ai-prompt";

let failed = 0;
for (const [i, doc] of AI_TEMPLATE_EXAMPLES.entries()) {
  const res = TemplateDocumentZ.safeParse(doc);
  if (!res.success) {
    failed++;
    const issue = res.error.issues[0];
    const path = issue?.path.join(".") || "(root)";
    console.error(
      `ai-prompt example #${i} fails schema: ${path}: ${issue?.message ?? "unknown"}`,
    );
  }
}
if (failed > 0) {
  console.error(
    `\n${failed} example(s) drifted from TemplateDocumentZ. Update ai-prompt.ts (and the prompt string itself if the schema added/changed fields).`,
  );
  process.exit(1);
}
console.log(`ai-prompt: ${AI_TEMPLATE_EXAMPLES.length} examples validated.`);
