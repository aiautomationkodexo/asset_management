import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Papa from 'papaparse'
import { supabase } from '@/lib/supabase'
import type { AssetCategory, Location } from '@/types/asset'
import type { ColumnMapping, ImportRowResult } from '@/lib/csvImport'
import { IMPORT_FIELDS, IMPORT_FIELD_LABELS, autoMapColumns, validateRows } from '@/lib/csvImport'

const FIELD_CLASS = 'w-full rounded-radius-md border border-border bg-bg px-3 py-2 text-sm text-text-primary'
const LABEL_CLASS = 'mb-1 block text-sm font-medium text-text-primary'

type Step = 'upload' | 'mapping' | 'preview' | 'done'

export function BulkImport() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('upload')
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<ColumnMapping>({})
  const [results, setResults] = useState<ImportRowResult[]>([])
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [commitSummary, setCommitSummary] = useState<{ inserted: number; errors: number; duplicates: number } | null>(
    null
  )

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
        setMapping(autoMapColumns(parsedHeaders))
        setStep('mapping')
      },
      error: (err) => setError(err.message),
    })
  }

  async function runDryRun() {
    setIsBusy(true)
    setError(null)
    try {
      const [{ data: categories }, { data: locations }, { data: existing }] = await Promise.all([
        supabase.from('asset_categories').select('id, name, tag_prefix, is_depreciable, is_physical, default_useful_life_months, default_tax_depr_rate'),
        supabase.from('locations').select('id, name, type, parent_id'),
        supabase.from('assets').select('serial_no').not('serial_no', 'is', null),
      ])

      const existingSerials = new Set(
        ((existing ?? []) as { serial_no: string }[]).map((r) => r.serial_no.trim().toLowerCase())
      )

      const validated = validateRows(
        rows,
        mapping,
        (categories ?? []) as AssetCategory[],
        (locations ?? []) as Location[],
        existingSerials
      )
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

    const okRows = results.filter((r) => r.status === 'ok' && r.resolved)
    const errorCount = results.filter((r) => r.status === 'error').length
    const duplicateCount = results.filter((r) => r.status === 'duplicate').length
    const payload = okRows.map((r) => r.resolved!)

    try {
      if (payload.length > 0) {
        const { error: insertError } = await supabase.from('assets').insert(payload)
        if (insertError) throw insertError
      }

      await supabase.from('import_batches').insert({
        filename: fileName,
        total_rows: results.length,
        inserted_count: payload.length,
        error_count: errorCount,
        duplicate_count: duplicateCount,
        status: 'committed',
      })

      setCommitSummary({ inserted: payload.length, errors: errorCount, duplicates: duplicateCount })
      setStep('done')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed.'
      setError(message)
      await supabase
        .from('import_batches')
        .insert({
          filename: fileName,
          total_rows: results.length,
          inserted_count: 0,
          error_count: errorCount,
          duplicate_count: duplicateCount,
          status: 'failed',
          error_message: message,
        })
        .then(
          () => {},
          () => {}
        )
    } finally {
      setIsBusy(false)
    }
  }

  const okCount = results.filter((r) => r.status === 'ok').length
  const errorCount = results.filter((r) => r.status === 'error').length
  const duplicateCount = results.filter((r) => r.status === 'duplicate').length

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl">Bulk import assets</h1>
        <Link
          to="/assets/import/history"
          className="text-sm text-brand-red hover:underline"
        >
          Import history
        </Link>
      </div>

      {error && <p className="mb-4 text-sm text-error-text">{error}</p>}

      {step === 'upload' && (
        <div className="card-in max-w-lg space-y-4 rounded-radius-lg border border-border bg-bg-elevated p-6 shadow-sm">
          <p className="text-sm text-text-secondary">
            Upload a CSV file. The first row must be a header row. You'll map columns to asset
            fields on the next step.
          </p>
          <input type="file" accept=".csv,text/csv" onChange={handleFile} className={FIELD_CLASS} />
        </div>
      )}

      {step === 'mapping' && (
        <div className="card-in max-w-lg space-y-4 rounded-radius-lg border border-border bg-bg-elevated p-6 shadow-sm">
          <p className="text-sm text-text-secondary">
            {fileName} — {rows.length} row{rows.length === 1 ? '' : 's'}. Map each field to a column.
          </p>
          {IMPORT_FIELDS.map((field) => (
            <div key={field}>
              <label className={LABEL_CLASS}>{IMPORT_FIELD_LABELS[field]}</label>
              <select
                value={mapping[field] ?? ''}
                onChange={(e) =>
                  setMapping((prev) => ({ ...prev, [field]: e.target.value || undefined }))
                }
                className={FIELD_CLASS}
              >
                <option value="">— not mapped —</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button
              onClick={runDryRun}
              disabled={isBusy}
              className="rounded-radius-md bg-brand-red px-4 py-2 text-sm font-medium text-text-on-brand hover:bg-brand-red-deep disabled:opacity-50"
            >
              {isBusy ? 'Validating...' : 'Preview import'}
            </button>
            <button
              type="button"
              onClick={() => setStep('upload')}
              className="rounded-radius-md border border-border bg-bg-alt px-4 py-2 text-sm font-medium text-text-primary hover:bg-border"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-4">
          <div className="flex gap-4 text-sm">
            <span className="rounded-radius-pill border border-success-border bg-success-bg px-3 py-1 text-success-text">
              {okCount} to insert
            </span>
            <span className="rounded-radius-pill border border-warning-border bg-warning-bg px-3 py-1 text-warning-text">
              {duplicateCount} duplicate
            </span>
            <span className="rounded-radius-pill border border-error-border bg-error-bg px-3 py-1 text-error-text">
              {errorCount} error
            </span>
          </div>

          <div className="max-h-96 overflow-auto rounded-radius-lg border border-border bg-bg-elevated shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-bg-alt text-left text-text-secondary">
                <tr>
                  <th className="px-3 py-2 font-medium">Row</th>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 font-medium">Make / Model</th>
                  <th className="px-3 py-2 font-medium">Serial</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Reasons</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.rowNumber} className="border-b border-divider last:border-0">
                    <td className="px-3 py-2 text-text-primary">{r.rowNumber}</td>
                    <td className="px-3 py-2 text-text-primary">{r.mapped.category}</td>
                    <td className="px-3 py-2 text-text-primary">
                      {[r.mapped.make, r.mapped.model].filter(Boolean).join(' ')}
                    </td>
                    <td className="px-3 py-2 text-text-primary">{r.mapped.serial_no || '—'}</td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          r.status === 'ok'
                            ? 'text-success-text'
                            : r.status === 'duplicate'
                              ? 'text-warning-text'
                              : 'text-error-text'
                        }
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-text-secondary">{r.reasons.join('; ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3">
            <button
              onClick={commitImport}
              disabled={isBusy || okCount === 0}
              className="rounded-radius-md bg-brand-red px-4 py-2 text-sm font-medium text-text-on-brand hover:bg-brand-red-deep disabled:opacity-50"
            >
              {isBusy ? 'Importing...' : `Commit import (${okCount})`}
            </button>
            <button
              type="button"
              onClick={() => setStep('mapping')}
              className="rounded-radius-md border border-border bg-bg-alt px-4 py-2 text-sm font-medium text-text-primary hover:bg-border"
            >
              Back to mapping
            </button>
          </div>
        </div>
      )}

      {step === 'done' && commitSummary && (
        <div className="card-in max-w-lg space-y-4 rounded-radius-lg border border-border bg-bg-elevated p-6 shadow-sm">
          <p className="text-text-primary">
            Imported <strong>{commitSummary.inserted}</strong> asset
            {commitSummary.inserted === 1 ? '' : 's'}.
          </p>
          <p className="text-sm text-text-secondary">
            {commitSummary.duplicates} duplicate row{commitSummary.duplicates === 1 ? '' : 's'} and{' '}
            {commitSummary.errors} error row{commitSummary.errors === 1 ? '' : 's'} were skipped.
          </p>
          <button
            onClick={() => navigate('/assets')}
            className="rounded-radius-md bg-brand-red px-4 py-2 text-sm font-medium text-text-on-brand hover:bg-brand-red-deep"
          >
            Go to assets
          </button>
        </div>
      )}
    </div>
  )
}
