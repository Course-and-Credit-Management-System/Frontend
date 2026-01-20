import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import AdminEnrollment from './pages/AdminEnrollment';
import AdminCourses from './pages/AdminCourses';
import AdminStudents from './pages/AdminStudents';
import AdminGrading from './pages/AdminGrading';
import AdminStudentDetails from './pages/AdminStudentDetails';
import StudentDashboard from './pages/StudentDashboard';
import StudentEnrollment from './pages/StudentEnrollment';
import StudentResults from './pages/StudentResults';
import StudentStatus from './pages/StudentStatus';
import StudentCourses from './pages/StudentCourses';
import CourseDetails from './pages/CourseDetails';
import { User, Role } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  // Persistence check (Mock)
  useEffect(() => {
    const saved = localStorage.getItem('uni_user');
    if (saved) {
      setUser(JSON.parse(saved));
    }
  }, []);

  const handleLogin = (role: Role) => {
    const mockUser: User = role === 'admin' 
      ? { id: '1', name: 'Admin User', role: 'admin', email: 'admin@uni.edu', department: 'System Administrator', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDeYYxM11iABXX-u3Uerr-eLUrNpD8OzAwdLkay0c-WKyfHJEtfsbS9pNWBzE8CrzNEpJVjNZJjKvGIVwktLiACubk3Yy2Qm7j6qF4vnpIIjZdAYnXsaHIkq5JIwVmIlIyHruWSbJC45jdM4ldEH2wO6xd9dyGMADy-V4avrwwDqvB9eoCTD6_qFlGOQjhyy2OQPTMMQA3z6pmO78OwbyngDurkaap4CP-E2f7TmbsAxQrEl-tkEmzmtiGX8TtK_EQjzQEfV9qf2Em8' }
      : { id: '2', name: 'Alex Student', role: 'student', email: 'alex.s@uni.edu', department: 'Computer Science', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAsDfL5LdpU8Mq8Q5IrpcF4GMGlgGyyBJnhh3N3XU40PdMbfU-gWqM1WSHvqwYkI7W78n8GVqPc4FausYV_9JNh5CwDULjrQG5519gZavYraETcCV-3N71JUZBbrtbA94CVCiaTOvC9u8lDIEGEMA2OVtEvigKrpTDc-7htmogJHgOlDpAqgHvI51HOmW8doMEp7luPKyfO3owajj2eNu79SEECYpw35erBanvfiqGMovFOCCsbQbpTxKZhLL_NjuIoeFiZecqwADO3' };
    
    setUser(mockUser);
    localStorage.setItem('uni_user', JSON.stringify(mockUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('uni_user');
  };

  return (
    <HashRouter>
      <Routes>
        <Route 
          path="/login" 
          element={
            user ? (
              <Navigate to={user.role === 'admin' ? "/admin/dashboard" : "/student/dashboard"} replace />
            ) : (
              <Login onLogin={handleLogin} />
            )
          } 
        />
        
        {/* Admin Routes */}
        {user?.role === 'admin' ? (
          <>
            <Route path="/admin/dashboard" element={<AdminDashboard user={user} onLogout={handleLogout} />} />
            <Route path="/admin/enrollment" element={<AdminEnrollment user={user} onLogout={handleLogout} />} />
            <Route path="/admin/courses" element={<AdminCourses user={user} onLogout={handleLogout} />} />
            <Route path="/admin/courses/:courseId" element={<CourseDetails user={user} onLogout={handleLogout} />} />
            <Route path="/admin/students" element={<AdminStudents user={user} onLogout={handleLogout} />} />
            <Route path="/admin/students/:studentId" element={<AdminStudentDetails user={user} onLogout={handleLogout} />} />
            <Route path="/admin/grading" element={<AdminGrading user={user} onLogout={handleLogout} />} />
            <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
          </>
        ) : user?.role === 'student' ? (
          <>
            {/* Student Routes */}
            <Route path="/student/dashboard" element={<StudentDashboard user={user} onLogout={handleLogout} />} />
            <Route path="/student/enrollment" element={<StudentEnrollment user={user} onLogout={handleLogout} />} />
            <Route path="/student/results" element={<StudentResults user={user} onLogout={handleLogout} />} />
            <Route path="/student/status" element={<StudentStatus user={user} onLogout={handleLogout} />} />
            <Route path="/student/courses" element={<StudentCourses user={user} onLogout={handleLogout} />} />
            <Route path="/student/courses/:courseId" element={<CourseDetails user={user} onLogout={handleLogout} />} />
            <Route path="*" element={<Navigate to="/student/dashboard" replace />} />
          </>
        ) : (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>
    </HashRouter>
  );
};

export default App;