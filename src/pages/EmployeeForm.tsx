import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { EmploymentStatus } from '@/types/employee'
import { EMPLOYMENT_STATUSES } from '@/types/employee'
import type { Location } from '@/types/asset'

interface FormState {
  employee_code: string
  name: string
  work_email: string
  department: string
  designation: string
  join_date: string
  employment_status: EmploymentStatus
  location_id: string
}

const EMPTY_FORM: FormState = {
  employee_code: '',
  name: '',
  work_email: '',
  department: '',
  designation: '',
  join_date: '',
  employment_status: 'active',
  location_id: '',
}

const FIELD_CLASS = 'w-full rounded-radius-md border border-border bg-bg px-3 py-2 text-sm text-text-primary'
const LABEL_CLASS = 'mb-1 block text-sm font-medium text-text-primary'

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
      .select('employee_code, name, work_email, department, designation, join_date, employment_status, location_id')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          setError(error.message)
        } else if (data) {
          setForm({
            employee_code: data.employee_code,
            name: data.name,
            work_email: data.work_email,
            department: data.department ?? '',
            designation: data.designation ?? '',
            join_date: data.join_date ?? '',
            employment_status: data.employment_status,
            location_id: data.location_id ?? '',
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
      name: form.name.trim(),
      work_email: form.work_email.trim(),
      department: form.department.trim() || null,
      designation: form.designation.trim() || null,
      join_date: form.join_date || null,
      employment_status: form.employment_status,
      location_id: form.location_id || null,
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
      <h1 className="mb-6 text-3xl">{isEditing ? 'Edit employee' : 'Add employee'}</h1>

      <form onSubmit={handleSubmit} className="card-in max-w-lg space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLASS}>Employee code *</label>
            <input
              value={form.employee_code}
              onChange={(e) => update('employee_code', e.target.value)}
              required
              className={FIELD_CLASS}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Name *</label>
            <input value={form.name} onChange={(e) => update('name', e.target.value)} required className={FIELD_CLASS} />
          </div>
        </div>

        <div>
          <label className={LABEL_CLASS}>Work email *</label>
          <input
            type="email"
            value={form.work_email}
            onChange={(e) => update('work_email', e.target.value)}
            required
            className={FIELD_CLASS}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLASS}>Department</label>
            <input value={form.department} onChange={(e) => update('department', e.target.value)} className={FIELD_CLASS} />
          </div>
          <div>
            <label className={LABEL_CLASS}>Designation</label>
            <input
              value={form.designation}
              onChange={(e) => update('designation', e.target.value)}
              className={FIELD_CLASS}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLASS}>Join date</label>
            <input
              type="date"
              value={form.join_date}
              onChange={(e) => update('join_date', e.target.value)}
              className={FIELD_CLASS}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Location</label>
            <select value={form.location_id} onChange={(e) => update('location_id', e.target.value)} className={FIELD_CLASS}>
              <option value="">None</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={LABEL_CLASS}>Employment status</label>
          <select
            value={form.employment_status}
            onChange={(e) => update('employment_status', e.target.value as EmploymentStatus)}
            className={FIELD_CLASS}
          >
            {EMPLOYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-error-text">{error}</p>}
        {offboardingNote && <p className="text-sm text-warning-text">{offboardingNote}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-radius-md bg-brand-red px-4 py-2 text-sm font-medium text-text-on-brand hover:bg-brand-red-deep disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : isEditing ? 'Save changes' : 'Create employee'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-radius-md border border-border bg-bg-alt px-4 py-2 text-sm font-medium text-text-primary hover:bg-border"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
