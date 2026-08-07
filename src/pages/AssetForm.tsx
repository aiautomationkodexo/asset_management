import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { AssetCategory, AssetCondition, AssetStatus, Location } from '@/types/asset'
import { ASSET_CONDITIONS, ASSET_STATUSES } from '@/types/asset'
import { ASSET_STATUS_LABELS } from '@/lib/assetStatusStyle'
import { Card } from '@/components/ui/Card'
import { Label } from '@/components/ui/Label'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { buttonClass } from '@/components/ui/buttonStyles'
import { sentenceCase } from '@/lib/utils'

interface FormState {
  category_id: string
  make: string
  model: string
  serial_no: string
  condition: AssetCondition | ''
  location_id: string
  status: AssetStatus
  notes: string
}

const EMPTY_FORM: FormState = {
  category_id: '',
  make: '',
  model: '',
  serial_no: '',
  condition: '',
  location_id: '',
  status: 'in_stock',
  notes: '',
}

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
    if (!form.condition) {
      setError('Condition is required.')
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
    return <div className="p-4 sm:p-8 text-text-secondary">Loading...</div>
  }

  return (
    <div className="p-4 sm:p-8">
      <h1 className="text-h3 mb-6">{isEditing ? 'Edit asset' : 'Add asset'}</h1>

      <Card as="form" onSubmit={handleSubmit} className="card-in max-w-lg space-y-4 p-6">
        <div>
          <Label>Category *</Label>
          <Select value={form.category_id} onChange={(e) => update('category_id', e.target.value)} required>
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Make</Label>
            <Input value={form.make} onChange={(e) => update('make', e.target.value)} />
          </div>
          <div>
            <Label>Model</Label>
            <Input value={form.model} onChange={(e) => update('model', e.target.value)} />
          </div>
        </div>

        <div>
          <Label>Serial number</Label>
          <Input value={form.serial_no} onChange={(e) => update('serial_no', e.target.value)} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Condition *</Label>
            <Select value={form.condition} onChange={(e) => update('condition', e.target.value as AssetCondition)}>
              <option value="" disabled>
                Select condition
              </option>
              {ASSET_CONDITIONS.map((condition) => (
                <option key={condition} value={condition}>
                  {sentenceCase(condition)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Location</Label>
            <Select value={form.location_id} onChange={(e) => update('location_id', e.target.value)}>
              <option value="">None</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {isEditing && (
          <div>
            <Label>Status</Label>
            <Select value={form.status} onChange={(e) => update('status', e.target.value as AssetStatus)}>
              {ASSET_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {ASSET_STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div>
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={3} />
        </div>

        {error && <p className="text-sm text-error-text">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={isSaving} className={buttonClass('primary')}>
            {isSaving ? 'Saving...' : isEditing ? 'Save changes' : 'Create asset'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className={buttonClass('tertiary')}>
            Cancel
          </button>
        </div>
      </Card>
    </div>
  )
}
