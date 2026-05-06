import NewTemplateForm from "./NewTemplateForm";

export default function NewTemplatePage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">New template</h1>
      <p className="mt-1 text-sm text-[#9ca3af]">
        Paste IR JSON + a params schema. The visual editor lands in Phase 3.
      </p>
      <div className="mt-6">
        <NewTemplateForm />
      </div>
    </div>
  );
}
