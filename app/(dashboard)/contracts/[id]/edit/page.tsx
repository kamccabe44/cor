import { notFound } from "next/navigation";
import ContractForm from "@/components/ContractForm";
import { contracts as contractsRepo } from "@/lib/data";
import { updateContract, deleteContract } from "@/lib/actions";

export default async function EditContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contract = contractsRepo.get(id);
  if (!contract) notFound();

  const updateWithId = updateContract.bind(null, id);
  const deleteWithId = deleteContract.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Edit Contract</h1>
        <p className="text-sm text-slate-500">{contract.contract_number} &middot; {contract.title}</p>
      </div>
      <ContractForm action={updateWithId} contract={contract} submitLabel="Save Changes" />
      <form action={deleteWithId} className="card p-6">
        <p className="mb-3 text-sm text-slate-600">
          Deleting a contract permanently removes all associated deliverables, surveillance logs, invoices, GFP
          records, correspondence, personnel, and modification history.
        </p>
        <button type="submit" className="rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100">
          Delete Contract
        </button>
      </form>
    </div>
  );
}
