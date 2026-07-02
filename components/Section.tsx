export default function Section({
  id,
  title,
  count,
  addForm,
  children,
}: {
  id: string;
  title: string;
  count: number;
  addForm: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="card scroll-mt-4 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">
          {title} <span className="ml-1 text-sm font-normal text-slate-400">({count})</span>
        </h2>
      </div>
      <div className="overflow-x-auto">{children}</div>
      <details className="mt-4 rounded-md border border-dashed border-slate-300 p-3">
        <summary className="cursor-pointer text-sm font-medium text-blue-700">+ Add new entry</summary>
        <div className="mt-3">{addForm}</div>
      </details>
    </section>
  );
}
