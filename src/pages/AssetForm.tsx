import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { AssetCategory, AssetCondition, AssetStatus, Location } from '@/types/asset'
import { ASSET_CONDITIONS, ASSET_STATUSES } from '@/types/asset'

interface FormState {
  category_id: string
  make: string
  model: string
  serial_no: string
  condition: AssetCondition
  location_id: string
  status: AssetStatus
  notes: string
}

const EMPTY_FORM: FormState = {
  category_id: '',
  make: '',
  model: '',
  serial_no: '',
  condition: 'good',
  location_id: '',
  status: 'in_stock',
  notes: '',
}

const FIELD_CLASS = 'w-full rounded-radius-md border border-border bg-bg px-3 py-2 text-sm text-text-primary'
const LABEL_CLASS = 'mb-1 block text-sm font-medium text-text-primary'

export function AssetForm() {
  const { id } = useParams()
  const isEditing = Boolean(id)
  const navigate = useNavigate()

  const [categories, setCategories] = useState<AssetCategory[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [isLoading, setIsLoading] = useState(isEditing)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('asset_categories')
      .select('id, name, tag_prefix, is_depreciable, is_physical, default_useful_life_months, default_tax_depr_rate')
      .order('name')
      .then(({ data }) => setCategories(data ?? []))

    supabase
      .from('locations')
      .select('id, name, type, parent_id')
      .order('name')
      .then(({ data }) => setLocations(data ?? []))
  }, [])

  useEffect(() => {
    if (!id) return
    supabase
      .from('assets')
      .select('category_id, make, model, serial_no, condition, location_id, status, notes')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          setError(error.message)
        } else if (data) {
          setForm({
            category_id: data.category_id ?? '',
            make: data.make ?? '',
            model: data.model ?? '',
            serial_no: data.serial_no ?? '',
            condition: data.condition,
            location_id: data.location_id ?? '',
            status: data.status,
            notes: data.notes ?? '',
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
    if (!form.category_id) {
      setError('Category is required.')
      return
    }

    setIsSaving(true)
    setError(null)

    const payload = {
      category_id: form.category_id,
      make: form.make.trim() || null,
      model: form.model.trim() || null,
      serial_no: form.serial_no.trim() || null,
      condition: form.condition,
      location_id: form.location_id || null,
      notes: form.notes.trim() || null,
    }

    if (isEditing && id) {
      const { error } = await supabase
        .from('assets')
        .update({ ...payload, status: form.status })
        .eq('id', id)
      setIsSaving(false)
      if (error) {
        setError(error.message)
        return
      }
      navigate(`/assets/${id}`)
    } else {
      const { data, error } = await supabase.from('assets').insert(payload).select('id').single()
      setIsSaving(false)
      if (error) {
        setError(error.message)
        return
      }
      navigate(`/assets/${data.id}`)
    }
  }

  if (isLoading) {
    return <div className="p-8 text-text-secondary">Loading...</div>
  }

  return (
    <div className="p-8">
      <h1 className="mb-6 text-3xl">{isEditing ? 'Edit asset' : 'Add asset'}</h1>

      <form onSubmit={handleSubmit} className="card-in max-w-lg space-y-4">
        <div>
          <label className={LABEL_CLASS}>Category *</label>
          <select
            value={form.category_id}
            onChange={(e) => update('category_id', e.target.value)}
            required
            className={FIELD_CLASS}
          >
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLASS}>Make</label>
            <input value={form.make} onChange={(e) => update('make', e.target.value)} className={FIELD_CLASS} />
          </div>
          <div>
            <label className={LABEL_CLASS}>Model</label>
            <input value={form.model} onChange={(e) => update('model', e.target.value)} className={FIELD_CLASS} />
          </div>
        </div>

        <div>
          <label className={LABEL_CLASS}>Serial number</label>
          <input
            value={form.serial_no}
            onChange={(e) => update('serial_no', e.target.value)}
            className={FIELD_CLASS}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLASS}>Condition *</label>
            <select
              value={form.condition}
              onChange={(e) => update('condition', e.target.value as AssetCondition)}
              className={FIELD_CLASS}
            >
              {ASSET_CONDITIONS.map((condition) => (
                <option key={condition} value={condition}>
                  {condition}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL_CLASS}>Location</label>
            <select
              value={form.location_id}
              onChange={(e) => update('location_id', e.target.value)}
              className={FIELD_CLASS}
            >
              <option value="">None</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isEditing && (
          <div>
            <label className={LABEL_CLASS}>Status</label>
            <select
              value={form.status}
              onChange={(e) => update('status', e.target.value as AssetStatus)}
              className={FIELD_CLASS}
            >
              {ASSET_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className={LABEL_CLASS}>Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
            rows={3}
            className={FIELD_CLASS}
          />
        </div>

        {error && <p className="text-sm text-error-text">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-radius-md bg-brand-red px-4 py-2 text-sm font-medium text-text-on-brand hover:bg-brand-red-deep disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : isEditing ? 'Save changes' : 'Create asset'}
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
