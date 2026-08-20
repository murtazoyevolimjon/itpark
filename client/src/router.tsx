import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { MainLayout } from './components/layout/MainLayout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Courses } from './pages/Courses';
import { Groups } from './pages/Groups';
import { GroupDetail } from './pages/GroupDetail';
import { Teachers } from './pages/Teachers';
import { Students } from './pages/Students';
import { StudentProfile } from './pages/StudentProfile';
import { Attendance } from './pages/Attendance';
import { AttendanceTake } from './pages/AttendanceTake';
import { Rooms } from './pages/Rooms';
import { Employees } from './pages/Employees';
import { FinanceSummary } from './pages/FinanceSummary';
import { FinanceExpenses } from './pages/FinanceExpenses';
import { FinancePayments } from './pages/FinancePayments';
import { Profile } from './pages/Profile';
import { Skeleton } from './components/ui/Skeleton/Skeleton';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <Skeleton width="120px" height="40px" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="courses" element={<Courses />} />
        <Route path="groups" element={<Groups />} />
        <Route path="groups/:id" element={<GroupDetail />} />
        <Route path="teachers" element={<Teachers />} />
        <Route path="students" element={<Students />} />
        <Route path="students/:id" element={<StudentProfile />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="attendance/take" element={<AttendanceTake />} />
        <Route path="rooms" element={<Rooms />} />
        <Route path="employees" element={<Employees />} />
        <Route path="finance" element={<FinanceSummary />} />
        <Route path="finance/expenses" element={<FinanceExpenses />} />
        <Route path="finance/payments" element={<FinancePayments />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
