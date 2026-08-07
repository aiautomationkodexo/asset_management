import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Papa from 'papaparse'
import { supabase } from '@/lib/supabase'
import type { Employee } from '@/types/employee'
import type { Location } from '@/types/asset'
import type { EmployeeColumnMapping, EmployeeImportRow } from '@/lib/employeeImport'
import {
  EMPLOYEE_IMPORT_FIELDS,
  EMPLOYEE_IMPORT_FIELD_LABELS,
  autoMapEmployeeColumns,
  validateEmployeeRows,
} from '@/lib/employeeImport'
import { Card } from '@/components/ui/Card'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { buttonClass } from '@/components/ui/buttonStyles'

const ROW_STATUS_LABELS: Record<EmployeeImportRow['status'], string> = {
  insert: 'Insert',
  update: 'Update',
  error: 'Error',
}

type Step = 'upload' | 'mapping' | 'preview' | 'done'

export function EmployeeImport() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('upload')
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<EmployeeColumnMapping>({})
  const [results, setResults] = useState<EmployeeImportRow[]>([])
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<{
    inserted: number
    updated: number
    errors: number
    missing: Array<{ employee_code: string; name: string }>
  } | null>(null)
  const [existingEmployees, setExistingEmployees] = useState<Employee[]>([])

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setFileName(file.name)
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const parsedHeaders = result.meta.fields ?? []
        setHeaders(parsedHeaders)
        setRows(result.data)
        setMapping(autoMapEmployeeColumns(parsedHeaders))
        setStep('mapping')
      },
      error: (err) => setError(err.message),
    })
  }

  async function runDryRun() {
    setIsBusy(true)
    setError(null)
    try {
      const [{ data: existing }, { data: locations }] = await Promise.all([
        supabase.from('employees').select('*'),
        supabase.from('locations').select('id, name, type, parent_id'),
      ])
      setExistingEmployees((existing ?? []) as Employee[])
      const validated = validateEmployeeRows(rows, mapping, (existing ?? []) as Employee[], (locations ?? []) as Location[])
      setResults(validated)
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate rows.')
    } finally {
      setIsBusy(false)
    }
  }

  async function commitImport() {
    setIsBusy(true)
    setError(null)
    const inserts = results.filter((r) => r.status === 'insert').map((r) => r.resolved!)
    const updates = results.filter((r) => r.status === 'update')
    const errorCount = results.filter((r) => r.status === 'error').length

    try {
      if (inserts.length > 0) {
        const { error: insertError } = await supabase.from('employees').insert(inserts)
        if (insertError) throw insertError
      }
      for (const row of updates) {
        const { error: updateError } = await supabase.from('employees').update(row.resolved!).eq('id', row.existingId!)
        if (updateError) throw updateError
      }

      const touchedCodes = new Set(results.filter((r) => r.status !== 'error').map((r) => r.mapped.employee_code.toLowerCase()))
      const missing = existingEmployees
        .filter((e) => !touchedCodes.has(e.employee_code.toLowerCase()))
        .map((e) => ({ employee_code: e.employee_code, name: e.full_name }))

      setSummary({ inserted: inserts.length, updated: updates.length, errors: errorCount, missing })
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.')
    } finally {
      setIsBusy(false)
    }
  }

  const insertCount = results.filter((r) => r.status === 'insert').length
  const updateCount = results.filter((r) => r.status === 'update').length
  const errorCount = results.filter((r) => r.status === 'error').length

  return (
    <div className="p-4 sm:p-8">
      <h1 className="text-h3 mb-6">Bulk import employees</h1>

      {error && <p className="mb-4 text-sm text-error-text">{error}</p>}

      {step === 'upload' && (
        <Card className="card-in max-w-lg space-y-4 p-6">
          <p className="text-sm text-text-secondary">
            Upload a CSV. Existing employees are matched by employee code and updated; new codes are inserted.
            Employees missing from the file are left untouched — never deleted.
          </p>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFile}
            className="w-full rounded-radius-sm border border-border bg-bg px-3 py-2 text-sm text-text-primary"
          />
        </Card>
      )}

      {step === 'mapping' && (
        <Card className="card-in max-w-lg space-y-4 p-6">
          <p className="text-sm text-text-secondary">
            {fileName} — {rows.length} row{rows.length === 1 ? '' : 's'}.
          </p>
          {EMPLOYEE_IMPORT_FIELDS.map((field) => (
            <div key={field}>
              <Label>{EMPLOYEE_IMPORT_FIELD_LABELS[field]}</Label>
              <Select
                value={mapping[field] ?? ''}
                onChange={(e) => setMapping((prev) => ({ ...prev, [field]: e.target.value || undefined }))}
              >
                <option value="">— not mapped —</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </Select>
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button onClick={runDryRun} disabled={isBusy} className={buttonClass('primary')}>
              {isBusy ? 'Validating...' : 'Preview import'}
            </button>
          </div>
        </Card>
      )}

      {step === 'preview' && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <Badge tone="success">{insertCount} new</Badge>
            <Badge tone="info">{updateCount} update</Badge>
            <Badge tone="error">{errorCount} error</Badge>
          </div>

          <Card className="max-h-96 overflow-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="sticky top-0 border-b border-border bg-bg-alt text-left text-text-secondary">
                <tr>
                  <th className="px-3 py-2 font-medium">Row</th>
                  <th className="px-3 py-2 font-medium">Code</th>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Reasons</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.rowNumber} className="border-b border-divider last:border-0">
                    <td className="px-3 py-2 text-text-primary">{r.rowNumber}</td>
                    <td className="px-3 py-2 text-text-primary">{r.mapped.employee_code}</td>
                    <td className="px-3 py-2 text-text-primary">{r.mapped.name}</td>
                    <td className="px-3 py-2 text-text-primary">{ROW_STATUS_LABELS[r.status]}</td>
                    <td className="px-3 py-2 text-text-secondary">{r.reasons.join('; ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <button
            onClick={commitImport}
            disabled={isBusy || insertCount + updateCount === 0}
            className={buttonClass('primary')}
          >
            {isBusy ? 'Importing...' : `Commit import (${insertCount + updateCount})`}
          </button>
        </div>
      )}

      {step === 'done' && summary && (
        <Card className="card-in max-w-lg space-y-3 p-6">
          <p className="text-text-primary">
            Inserted <strong>{summary.inserted}</strong>, updated <strong>{summary.updated}</strong>.
          </p>
          <p className="text-sm text-text-secondary">
            {summary.errors} error row{summary.errors === 1 ? '' : 's'} skipped.
          </p>
          {summary.missing.length > 0 && (
            <div>
              <p className="mb-1 text-sm font-medium text-warning-text">
                Flagged — {summary.missing.length} existing employee{summary.missing.length === 1 ? '' : 's'} not in
                this file (left untouched, not deleted):
              </p>
              <ul className="max-h-40 list-disc space-y-0.5 overflow-auto pl-5 text-sm text-text-secondary">
                {summary.missing.map((m) => (
                  <li key={m.employee_code}>
                    {m.name} (<code>{m.employee_code}</code>)
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button onClick={() => navigate('/employees')} className={buttonClass('primary')}>
            Go to employees
          </button>
        </Card>
      )}
    </div>
  )
}
