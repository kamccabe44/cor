const SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: "What a COR is and is not",
    body: (
      <>
        <p>
          A Contracting Officer&apos;s Representative (COR) is designated in writing by a Contracting
          Officer (KO) to assist in technical monitoring and administration of a specific contract (FAR
          1.604; DFARS 201.602-2). CORs must be U.S., foreign government, or NATO/coalition government
          employees &mdash; contractor personnel may never serve as CORs.
        </p>
        <p className="mt-2">
          A COR has <strong>no authority</strong> to change price, quality, quantity, delivery, or any other
          term or condition of the contract, and cannot direct the contractor to perform work outside the
          contract&apos;s scope. Only the KO can modify a contract. Acting outside your delegated authority
          can create an unauthorized commitment that the Government may not be obligated to pay for.
        </p>
      </>
    ),
  },
  {
    title: "Your designation letter and COR file",
    body: (
      <>
        <p>Your written designation from the KO must, at minimum:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Identify the specific contract(s) and the extent of your authority</li>
          <li>Identify the limitations on your authority</li>
          <li>Specify the period covered by the designation</li>
          <li>State the authority is not redelegable</li>
          <li>State that you may be personally liable for unauthorized acts</li>
        </ul>
        <p className="mt-2">
          Maintain a COR file containing your designation letter, your qualification/training basis,
          the QASP, and documentation of every COR action you take (inspections, correspondence,
          acceptances, rejections). Record it in this tool <em>and</em> in your command&apos;s official COR
          file / CAPS-COR or equivalent system of record &mdash; this app is a personal tracking aid, not a
          system of record.
        </p>
      </>
    ),
  },
  {
    title: "COR certification levels (FAC-COR / DoD)",
    body: (
      <>
        <p>
          DoD assigns a certification level based on contract risk, complexity, and dollar value. All
          levels require CLC 106 (or equivalent) as a foundational course, ethics training, and (for
          contracts touching detainees, DoD contracts in a foreign country, or certain acquisitions)
          Combating Trafficking in Persons (CTIP) training.
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <strong>COR Level I</strong> &mdash; lower-risk, less complex requirements (e.g. simple
            supply or service orders). No prior COR experience required.
          </li>
          <li>
            <strong>COR Level II</strong> &mdash; moderate complexity/risk; generally requires
            documented experience performing Level I duties.
          </li>
          <li>
            <strong>COR Level III</strong> &mdash; high-risk, high-complexity, or high-dollar-value
            contracts (e.g. major services, systems, or contingency/OCONUS support), requiring the
            most experience and training.
          </li>
        </ul>
        <p className="mt-2 text-xs text-slate-500">
          Verify your specific level requirement and renewal cycle (commonly every 2 years) with your
          command&apos;s Acquisition Career Manager and current DAU / FAI guidance &mdash; requirements
          are periodically updated.
        </p>
      </>
    ),
  },
  {
    title: "Surveillance and the QASP",
    body: (
      <>
        <p>
          Most service contracts require a Quality Assurance Surveillance Plan (QASP) that defines what
          you inspect, how often, and by what method: 100% inspection, random/statistical sampling,
          periodic inspection, or validated customer complaint. Your surveillance must trace back to the
          contract&apos;s Performance Work Statement (PWS) performance standards and Acceptable Quality
          Levels (AQLs).
        </p>
        <p className="mt-2">
          Document every surveillance event &mdash; satisfactory or not. Unsatisfactory performance should
          reference the contract remedy clause that applies (e.g. inspection/acceptance, deductions,
          termination for cause) and be reported to the KO; CORs recommend remedies, they do not impose
          them.
        </p>
      </>
    ),
  },
  {
    title: "Invoices and WAWF",
    body: (
      <>
        <p>
          DoD contracts are generally invoiced through Wide Area Workflow (WAWF), now part of the
          Procurement Integrated Enterprise Environment (PIEE). As COR you are typically the acceptor:
          you validate that goods/services were received and conforming before electronically accepting
          the receiving report, which triggers payment. The Prompt Payment Act generally requires
          Government acceptance/inspection action within 7 days of proper invoice receipt for most
          supply/service contracts (verify the specific clause in your contract).
        </p>
        <p className="mt-2">
          Track every invoice against your obligated funds. Never let anticipated invoicing exceed
          obligated (not just total contract) value &mdash; that is an Anti-Deficiency Act (31 U.S.C.
          §1341) concern, and the funding-utilization warnings on your dashboard are meant to give you
          early warning to flag it to your KO/resource manager.
        </p>
      </>
    ),
  },
  {
    title: "Government Furnished Property (GFP)",
    body: (
      <>
        <p>
          If the contract authorizes GFP/GFE, track issue and return using DD Form 1149 (Requisition and
          Invoice/Shipping Document) or DD Form 2062 (Hand Receipt), condition codes, and location. At
          contract closeout, all GFP must be accounted for and either returned, transferred, or
          formally disposed of (FAR Part 45).
        </p>
      </>
    ),
  },
  {
    title: "Key personnel and clearances",
    body: (
      <p>
        If the contract designates key personnel, monitor their presence/substitution against the
        clause requirements (substitutions generally require KO approval). For CENTCOM/OCONUS
        requirements, also track theater-specific requirements: SOFA status, CAC/base access,
        anti-terrorism/force protection training, and any required security clearance level tied to the
        position.
      </p>
    ),
  },
  {
    title: "CENTCOM / contingency contracting considerations",
    body: (
      <>
        <p>
          Contracts performed in the USCENTCOM area of responsibility may layer additional requirements
          on top of the FAR/DFARS: theater-specific Reconstruction/Operational Contract Support
          guidance, the Synchronized Predeployment and Operational Tracker (SPOT) for contractors
          accompanying the force, Status of Forces Agreements or equivalent host-nation arrangements,
          and force protection / physical security surveillance duties that go beyond a CONUS COR role.
        </p>
        <p className="mt-2">
          Confirm current theater-specific COR requirements with your servicing contracting office
          (e.g. ACC-Rock Island&apos;s CENTCOM support elements, 408th Contracting Support Brigade, or
          the applicable Army Contracting Command element) since these are updated frequently and are
          not fully codified in the FAR/DFARS.
        </p>
      </>
    ),
  },
  {
    title: "Public data sources referenced by this app",
    body: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>USASpending.gov API</strong> (api.usaspending.gov) &mdash; publicly available, no key
          required. Used on the Import page to pull award-level obligations, PoP, recipient, NAICS/PSC,
          and place of performance for contracts already reported by the government.
        </li>
        <li>
          <strong>FAR</strong> (acquisition.gov/far) and <strong>DFARS</strong>{" "}
          (acquisition.gov/dfars) &mdash; the authoritative source for COR responsibilities cited above
          (FAR Subpart 1.6, FAR 1.602-2, DFARS 201.602-2).
        </li>
        <li>
          <strong>SAM.gov</strong> &mdash; entity registration, exclusions, and UEI lookups for
          verifying a vendor&apos;s registration status.
        </li>
        <li>
          <strong>DAU / FAI</strong> (dau.edu) &mdash; COR training courses (e.g. CLC 106) and
          certification-level guidance.
        </li>
      </ul>
    ),
  },
];

export default function ReferencePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">COR Reference Library</h1>
        <p className="max-w-2xl text-sm text-slate-500">
          A working summary of COR responsibilities compiled from publicly available FAR/DFARS guidance
          and common DoD COR practice, to orient your work as a COR supporting an Army CENTCOM unit. This
          is background information, not legal advice &mdash; always follow your specific designation
          letter, contract clauses, and command policy, which govern over anything summarized here.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {SECTIONS.map((s) => (
          <section key={s.title} className="card p-5">
            <h2 className="mb-2 text-base font-semibold text-slate-900">{s.title}</h2>
            <div className="text-sm leading-relaxed text-slate-700">{s.body}</div>
          </section>
        ))}
      </div>
    </div>
  );
}
