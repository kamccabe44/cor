import { getCorProfile } from "@/lib/data";
import { saveCorProfile } from "@/lib/actions";
import { Field, TextAreaField, SelectField, FormGrid, SubmitButton } from "@/components/Field";

export const dynamic = "force-dynamic";

export default function ProfilePage() {
  const profile = getCorProfile();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">COR Profile</h1>
        <p className="max-w-2xl text-sm text-slate-500">
          Your appointment and certification record. Per DFARS 201.602-2, your COR file must include a copy
          of the contracting officer&apos;s letter of designation, your qualification/certification basis,
          and documentation of your COR actions. Keep this current alongside your official COR file.
        </p>
      </div>

      <form action={saveCorProfile} className="card flex flex-col gap-6 p-6">
        <FormGrid>
          <Field label="Full Name" name="full_name" defaultValue={profile.full_name} />
          <Field label="Rank / Grade" name="rank_grade" defaultValue={profile.rank_grade} />
          <Field label="Unit" name="unit" defaultValue={profile.unit} placeholder="e.g. ARCENT, USACE, 1st TSC" />
          <Field label="Duty Title" name="duty_title" defaultValue={profile.duty_title} />
          <Field label="Email" name="email" type="email" defaultValue={profile.email} />
          <Field label="Phone" name="phone" defaultValue={profile.phone} />
          <Field label="DoDAAC" name="dodaac" defaultValue={profile.dodaac} />
          <SelectField
            label="COR Certification Level"
            name="cor_level"
            defaultValue={profile.cor_level}
            options={[
              { value: "", label: "Not certified" },
              { value: "I", label: "COR Level I" },
              { value: "II", label: "COR Level II" },
              { value: "III", label: "COR Level III" },
            ]}
          />
          <Field label="Appointment Letter Date" name="appointment_letter_date" type="date" defaultValue={profile.appointment_letter_date} />
          <Field label="CLC 106 Completion Date" name="clc106_date" type="date" defaultValue={profile.clc106_date} />
          <Field label="Certification Completion Date" name="cert_completion_date" type="date" defaultValue={profile.cert_completion_date} />
          <Field label="Certification Expiration Date" name="cert_expiration_date" type="date" defaultValue={profile.cert_expiration_date} />
          <Field label="Ethics Training Date" name="ethics_training_date" type="date" defaultValue={profile.ethics_training_date} />
          <Field label="CTIP Training Date" name="ctip_training_date" type="date" defaultValue={profile.ctip_training_date} />
          <Field label="Supervising Contracting Officer" name="supervising_co" defaultValue={profile.supervising_co} />
          <Field label="KO Email" name="supervising_co_email" type="email" defaultValue={profile.supervising_co_email} />
          <Field label="KO Phone" name="supervising_co_phone" defaultValue={profile.supervising_co_phone} />
          <Field label="Administrative CO / DCMA" name="administrative_co_dcma" defaultValue={profile.administrative_co_dcma} />
          <TextAreaField label="Notes" name="notes" defaultValue={profile.notes} />
        </FormGrid>
        <div>
          <SubmitButton>Save Profile</SubmitButton>
        </div>
      </form>
    </div>
  );
}
