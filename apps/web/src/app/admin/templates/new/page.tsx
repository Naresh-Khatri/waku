import NewStockTemplateForm from "./NewStockTemplateForm";

export default function AdminNewTemplatePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">New stock template</h1>
        <p className="mt-1 text-sm text-[#9ca3af]">
          Set metadata, then open the editor to design the artboard. Publish
          when ready to show it in the user catalogue.
        </p>
      </div>
      <NewStockTemplateForm />
    </div>
  );
}
