import { FormGrid, TextArea, TextInput } from '@/components/admin/fields'
import { toInputDate } from '@/components/admin/ui'
import type { ContractorDetail } from '@/lib/server/contractors'

export function ContractorFields({ c }: { c?: ContractorDetail }) {
  return (
    <FormGrid>
      <TextInput label="Full name" name="name" required defaultValue={c?.name} />
      <TextInput
        label="Mobile number"
        name="mobile"
        required
        inputMode="numeric"
        pattern="[6-9][0-9]{9}"
        maxLength={10}
        defaultValue={c?.mobile}
        hint="Used as the login username."
      />
      <TextInput label="Alternate mobile" name="alternateMobile" inputMode="numeric" maxLength={10} defaultValue={c?.alternate_mobile ?? ''} />
      <TextInput label="Email" name="email" type="email" defaultValue={c?.email ?? ''} />
      <TextInput label="Address" name="address" className="sm:col-span-2" defaultValue={c?.address ?? ''} />
      <TextInput label="Area" name="area" defaultValue={c?.area ?? ''} />
      <TextInput label="City" name="city" defaultValue={c?.city ?? 'Jaipur'} />
      <TextInput label="District" name="district" defaultValue={c?.district ?? ''} />
      <TextInput label="State" name="state" defaultValue={c?.state ?? 'Rajasthan'} />
      <TextInput label="PIN code" name="pinCode" inputMode="numeric" maxLength={6} defaultValue={c?.pin_code ?? ''} />
      <TextInput label="Joining date" name="joiningDate" type="date" required defaultValue={toInputDate(c?.joining_date ?? new Date())} />
      <TextArea label="Internal notes" name="notes" className="sm:col-span-2" defaultValue={c?.notes ?? ''} />
    </FormGrid>
  )
}
