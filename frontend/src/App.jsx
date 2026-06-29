import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { SettingsProvider } from './contexts/SettingsContext';
import Home           from './pages/Home';
import Login          from './pages/Login';
import Register       from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword  from './pages/ResetPassword';
import Dashboard      from './pages/Dashboard';
import AdminDashboard      from './pages/Admin/Dashboard';
import AdminUsers          from './pages/Admin/Users';
import AdminPlans          from './pages/Admin/Plans';
import AdminFeatures       from './pages/Admin/FeatureManagement';
import TissIngestion         from './pages/Admin/TissIngestion';
import VersionDiffGenerator  from './pages/Admin/VersionDiffGenerator';
import SwaggerVisual    from './pages/Tools/SwaggerVisual';
import TissGenerator    from './pages/Tools/TissGenerator';
import TissViewer       from './pages/Tools/TissViewer';
import TissIde            from './pages/Tools/TissIde';
import VersionComparator  from './pages/Tools/VersionComparator';
import SystemSettings     from './pages/Admin/SystemSettings/SystemSettings';
import PrivateRoute   from './components/PrivateRoute';
import AdminRoute     from './components/AdminRoute';

export default function App() {
  return (
    <BrowserRouter>
    <SettingsProvider>
      <Toaster position="top-right" richColors />
      <Routes>
        {/* Públicas */}
        <Route path="/"                element={<Home />} />
        <Route path="/login"           element={<Login />} />
        <Route path="/register"        element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password"  element={<ResetPassword />} />

        {/* Usuário logado */}
        <Route path="/dashboard" element={
          <PrivateRoute><Dashboard /></PrivateRoute>
        } />

        {/* Admin */}
        <Route path="/admin/dashboard" element={
          <AdminRoute><AdminDashboard /></AdminRoute>
        } />
        <Route path="/admin/users" element={
          <AdminRoute><AdminUsers /></AdminRoute>
        } />
        <Route path="/admin/plans" element={
          <AdminRoute><AdminPlans /></AdminRoute>
        } />
        <Route path="/admin/features" element={
          <AdminRoute><AdminFeatures /></AdminRoute>
        } />
        <Route path="/admin/tiss/ingestion" element={
          <AdminRoute><TissIngestion /></AdminRoute>
        } />
        <Route path="/admin/tools/version-diff" element={
          <AdminRoute><VersionDiffGenerator /></AdminRoute>
        } />
        <Route path="/admin/settings" element={
          <AdminRoute><SystemSettings /></AdminRoute>
        } />

        {/* Ferramentas */}
        <Route path="/tools/swagger" element={
          <PrivateRoute><SwaggerVisual /></PrivateRoute>
        } />
        <Route path="/tools/generator" element={
          <PrivateRoute><TissGenerator /></PrivateRoute>
        } />
        <Route path="/tools/viewer" element={
          <PrivateRoute><TissViewer /></PrivateRoute>
        } />
        <Route path="/tools/ide" element={
          <PrivateRoute><TissIde /></PrivateRoute>
        } />
        <Route path="/tools/version-diff" element={
          <PrivateRoute><VersionComparator /></PrivateRoute>
        } />
      </Routes>
    </SettingsProvider>
    </BrowserRouter>
  );
}
