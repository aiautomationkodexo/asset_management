import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { EmploymentStatus } from '@/types/employee'
import { EMPLOYMENT_STATUSES } from '@/types/employee'
import type { Location } from '@/types/asset'
import { Card } from '@/components/ui/Card'
import { Label } from '@/components/ui/Label'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { buttonClass } from '@/components/ui/buttonStyles'

interface FormState {
  employee_code: string
  full_name: string
  work_email: string
  department: string
  designation: string
  join_date: string
  employment_status: EmploymentStatus
  location: string
}

const EMPTY_FORM: FormState = {
  employee_code: '',
  full_name: '',
  work_email: '',
  department: '',
  designation: '',
  join_date: '',
  employment_status: 'active',
  location: '',
}

export function EmployeeForm() {
  const { id } = useParams()
  const isEditing = Boolean(id)
  const navigate = useNavigate()

  const [locations, setLocations] = useState<Location[]>([])
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [isLoading, setIsLoading] = useState(isEditing)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [offboardingNote, setOffboardingNote] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('locations')
      .select('id, name, type, parent_id')
      .order('name')
      .then(({ data }) => setLocations(data ?? []))
  }, [])

  useEffect(() => {
    if (!id) return
    supabase
      .from('employees')
      .select('employee_code, full_name, work_email, department, designation, join_date, employment_status, location')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          setError(error.message)
        } else if (data) {
          setForm({
            employee_code: data.employee_code,
            full_name: data.full_name,
            work_email: data.work_email,
            department: data.department ?? '',
            designation: data.designation ?? '',
            join_date: data.join_date ?? '',
            employment_status: data.employment_status,
            location: data.location ?? '',
          })
        }
        setIsLoading(false)
      })
  }, [id])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setIsSaving(true)
    setError(null)
    setOffboardingNote(null)

    const payload = {
      employee_code: form.employee_code.trim(),
      full_name: form.full_name.trim(),
      work_email: form.work_email.trim(),
      department: form.department.trim() || null,
      designation: form.designation.trim() || null,
      join_date: form.join_date || null,
      employment_status: form.employment_status,
      location: form.location || null,
    }

    if (isEditing && id) {
      const { error } = await supabase.from('employees').update(payload).eq('id', id)
      setIsSaving(false)
      if (error) {
        setError(error.message)
        return
      }
      if (form.employment_status === 'notice' || form.employment_status === 'exited') {
        setOffboardingNote(
          'Employment status changed — an offboarding clearance checklist has been generated for any open assignments.'
        )
      }
      navigate(`/employees/${id}`)
    } else {
      const { data, error } = await supabase.from('employees').insert(payload).select('id').single()
      setIsSaving(false)
      if (error) {
        setError(error.message)
        return
      }
      navigate(`/employees/${data.id}`)
    }
  }

  if (isLoading) {
    return <div className="p-8 text-text-secondary">Loading...</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-h3 mb-6">{isEditing ? 'Edit employee' : 'Add employee'}</h1>

      <Card as="form" onSubmit={handleSubmit} className="card-in max-w-lg space-y-4 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Employee code *</Label>
            <Input value={form.employee_code} onChange={(e) => update('employee_code', e.target.value)} required />
          </div>
          <div>
            <Label>Name *</Label>
            <Input value={form.full_name} onChange={(e) => update('full_name', e.target.value)} required />
          </div>
        </div>

        <div>
          <Label>Work email *</Label>
          <Input type="email" value={form.work_email} onChange={(e) => update('work_email', e.target.value)} required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Department</Label>
            <Input value={form.department} onChange={(e) => update('department', e.target.value)} />
          </div>
          <div>
            <Label>Designation</Label>
            <Input value={form.designation} onChange={(e) => update('designation', e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Join date</Label>
            <Input type="date" value={form.join_date} onChange={(e) => update('join_date', e.target.value)} />
          </div>
          <div>
            <Label>Location</Label>
            <Select value={form.location} onChange={(e) => update('location', e.target.value)}>
              <option value="">None</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.name}>
                  {loc.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <Label>Employment status</Label>
          <Select
            value={form.employment_status}
            onChange={(e) => update('employment_status', e.target.value as EmploymentStatus)}
          >
            {EMPLOYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>

        {error && <p className="text-sm text-error-text">{error}</p>}
        {offboardingNote && <p className="text-sm text-warning-text">{offboardingNote}</p>}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={isSaving} className={buttonClass('primary')}>
            {isSaving ? 'Saving...' : isEditing ? 'Save changes' : 'Create employee'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className={buttonClass('tertiary')}>
            Cancel
          </button>
        </div>
      </Card>
    </div>
  )
}
