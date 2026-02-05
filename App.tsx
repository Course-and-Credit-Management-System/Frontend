import React, { useEffect, useState } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";

import AdminDashboard from "./pages/AdminDashboard";
import AdminEnrollment from "./pages/AdminEnrollment";
import AdminCourses from "./pages/AdminCourses";
import AdminStudents from "./pages/AdminStudents";
import AdminGrading from "./pages/AdminGrading";
import AdminStudentDetails from "./pages/AdminStudentDetails";

import StudentDashboard from "./pages/StudentDashboard";
import StudentEnrollment from "./pages/StudentEnrollment";
import StudentResults from "./pages/StudentResults";
import StudentStatus from "./pages/StudentStatus";
import StudentCourses from "./pages/StudentCourses";

import CourseDetails from "./pages/CourseDetails";

import { User } from "./types";
import { api } from "./lib/api";

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);

  // ✅ Cookie auth boot: ask backend who I am (cookie is sent automatically)
  useEffect(() => {
    const boot = async () => {
      try {
        const me = await api.me(); // uses credentials: "include"
        setUser(me);
        sessionStorage.setItem("user", JSON.stringify(me));
        sessionStorage.setItem("role", me.role);
      } catch (e) {
        setUser(null);
        sessionStorage.removeItem("user");
        sessionStorage.removeItem("role");
        sessionStorage.removeItem("must_reset_password");
      } finally {
        setBooting(false);
      }
    };

    boot();
  }, []);

  // ✅ Login now passes the REAL user object
  const handleLogin = (userFromBackend: User) => {
    setUser(userFromBackend);
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
      sessionStorage.removeItem("user");
      sessionStorage.removeItem("role");
      sessionStorage.removeItem("must_reset_password");
    }
  };

  if (booting) {
    return <div style={{ padding: 20 }}>Loading...</div>;
  }

  return (
    <HashRouter>
      <Routes>
        <Route
          path="/login"
          element={
            user ? (
              <Navigate
                to={user.role === "admin" ? "/admin/dashboard" : "/student/dashboard"}
                replace
              />
            ) : (
              <Login onLogin={handleLogin as any} />
            )
          }
        />

        {/* Admin Routes */}
        {user?.role === "admin" ? (
          <>
            <Route
              path="/admin/dashboard"
              element={<AdminDashboard user={user} onLogout={handleLogout} />}
            />
            <Route
              path="/admin/enrollment"
              element={<AdminEnrollment user={user} onLogout={handleLogout} />}
            />
            <Route
              path="/admin/courses"
              element={<AdminCourses user={user} onLogout={handleLogout} />}
            />
            <Route
              path="/admin/courses/:courseId"
              element={<CourseDetails user={user} onLogout={handleLogout} />}
            />
            <Route
              path="/admin/students"
              element={<AdminStudents user={user} onLogout={handleLogout} />}
            />
            <Route
              path="/admin/students/:studentId"
              element={<AdminStudentDetails user={user} onLogout={handleLogout} />}
            />
            <Route
              path="/admin/grading"
              element={<AdminGrading user={user} onLogout={handleLogout} />}
            />
            <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
          </>
        ) : user?.role === "student" ? (
          <>
            {/* Student Routes */}
            <Route
              path="/student/dashboard"
              element={<StudentDashboard user={user} onLogout={handleLogout} />}
            />
            <Route
              path="/student/enrollment"
              element={<StudentEnrollment user={user} onLogout={handleLogout} />}
            />
            <Route
              path="/student/results"
              element={<StudentResults user={user} onLogout={handleLogout} />}
            />
            <Route
              path="/student/status"
              element={<StudentStatus user={user} onLogout={handleLogout} />}
            />
            <Route
              path="/student/courses"
              element={<StudentCourses user={user} onLogout={handleLogout} />}
            />
            <Route
              path="/student/courses/:courseId"
              element={<CourseDetails user={user} onLogout={handleLogout} />}
            />
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
