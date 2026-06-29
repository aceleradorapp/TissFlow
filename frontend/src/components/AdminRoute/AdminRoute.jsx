import { Navigate } from 'react-router-dom';

export default function AdminRoute({ children }) {
  const token = localStorage.getItem('tissflow_token');
  const user  = JSON.parse(localStorage.getItem('tissflow_user') ?? 'null');

  if (!token)                          return <Navigate to="/login"     replace />;
  if (user?.role !== 'proprietario')   return <Navigate to="/dashboard" replace />;

  return children;
}
