import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { SimpleAuthProvider } from './contexts/SimpleAuthContext'
import { SimpleProtectedRoute } from './components/SimpleProtectedRoute'
import { AdminOnlyRoute } from './components/AdminOnlyRoute'
import { Layout } from './components/Layout'
import { SimpleLogin } from './pages/SimpleLogin'
import { Unauthorized } from './pages/Unauthorized'
import { Dashboard } from './pages/Dashboard'
import { PublicScan } from './pages/PublicScan'
import { AssetList } from './pages/AssetList'
import { AssetDetail } from './pages/AssetDetail'
import { AssetForm } from './pages/AssetForm'
import { BulkImport } from './pages/BulkImport'
import { ImportHistory } from './pages/ImportHistory'
import { UserList } from './pages/UserList'
import { EmployeeList } from './pages/EmployeeList'
import { EmployeeDetail } from './pages/EmployeeDetail'
import { EmployeeForm } from './pages/EmployeeForm'
import { EmployeeImport } from './pages/EmployeeImport'
import { CustodyExceptions } from './pages/CustodyExceptions'
import { OffboardingClearance } from './pages/OffboardingClearance'
import { PurchaseList } from './pages/PurchaseList'
import { PurchaseDetail } from './pages/PurchaseDetail'
import { PurchaseForm } from './pages/PurchaseForm'
import { Depreciation } from './pages/Depreciation'
import { Reports } from './pages/Reports'

// Gated by a simple client-side email/password check (see
// SimpleAuthContext) rather than the Supabase-backed auth in AuthContext —
// that flow is still available if full auth needs to come back later.
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SimpleAuthProvider>
          <Routes>
            <Route path="/login" element={<SimpleLogin />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/a/:slug" element={<PublicScan />} />

            <Route element={<SimpleProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/assets" element={<AssetList />} />
                <Route path="/assets/:id" element={<AssetDetail />} />
                <Route path="/employees" element={<EmployeeList />} />
                <Route path="/employees/:id" element={<EmployeeDetail />} />
                <Route path="/custody/exceptions" element={<CustodyExceptions />} />
                <Route path="/offboarding/:id" element={<OffboardingClearance />} />
                <Route path="/purchases" element={<PurchaseList />} />
                <Route path="/purchases/:id" element={<PurchaseDetail />} />
                <Route path="/depreciation" element={<Depreciation />} />
                <Route path="/reports" element={<Reports />} />

                <Route element={<AdminOnlyRoute />}>
                  <Route path="/assets/new" element={<AssetForm />} />
                  <Route path="/assets/import" element={<BulkImport />} />
                  <Route path="/assets/import/history" element={<ImportHistory />} />
                  <Route path="/assets/:id/edit" element={<AssetForm />} />
                  <Route path="/employees/new" element={<EmployeeForm />} />
                  <Route path="/employees/:id/edit" element={<EmployeeForm />} />
                  <Route path="/employees/import" element={<EmployeeImport />} />
                  <Route path="/users" element={<UserList />} />
                  <Route path="/purchases/new" element={<PurchaseForm />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SimpleAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
