import ContractForm from "@/components/ContractForm";
import { createContract } from "@/lib/actions";

export default function NewContractPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Add Contract</h1>
        <p className="text-sm text-slate-500">Enter the contract details from your COR appointment letter and the contract file.</p>
      </div>
      <ContractForm action={createContract} submitLabel="Create Contract" />
    </div>
  );
}
