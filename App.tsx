import React, { useEffect, useState } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import SimpleLogin from "./pages/SimpleLogin";
import ResetPassword from "./pages/ResetPassword";

import ForgotPassword from "./pages/ForgotPassword";
import ResetPasswordToken from "./pages/ResetPasswordToken";

import AdminDashboard from "./pages/AdminDashboard";
import AdminEnrollment from "./pages/AdminEnrollment";
import AdminCourses from "./pages/AdminCourses";
import AdminStudents from "./pages/AdminStudents";
import AdminGrading from "./pages/AdminGrading";
import AdminStudentDetails from "./pages/AdminStudentDetails";
import AdminAnnouncements from "./pages/AdminAnnouncements";
// ✅ NEW: Manual Enrollment Page
import AdminManualEnrollment from "./pages/AdminManualEnrollment";
import AdminEnrollmentSettings from "./pages/AdminEnrollmentSettings";
import AdminMessages from "./pages/AdminMessages";
import AdminChatPage from "./pages/AdminChatPage";

// ✅ NEW: admin-only course details page (rename your file to AdminCourseDetails.tsx)
import AdminCourseDetails from "./pages/AdminCourseDetails";

import StudentDashboard from "./pages/StudentDashboard";
import StudentEnrollment from "./pages/StudentEnrollment";
import StudentResults from "./pages/StudentResults";
import StudentStatus from "./pages/StudentStatus";
import StudentCourses from "./pages/StudentCourses";
import StudentChatPage from "./pages/StudentChatPage";
import StudentChatTrigger from "./components/StudentChatTrigger";
import StudentProgressCurrent from "./pages/StudentProgressCurrent";
import StudentTrackSelection from "./pages/StudentTrackSelection";
import StudentMajorSelection from "./pages/StudentMajorSelection";
import StudentAnnouncements from "./pages/StudentAnnouncements";
import StudentMajorLocked from "./pages/StudentMajorLocked";

// ✅ student course details page stays as CourseDetails.tsx (student-facing)
import CourseDetails from "./pages/CourseDetails";

import { User } from "./types";
import { api } from "./lib/api";
import { UIProvider } from "./context/UIContext";

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);

  const syncStudentEnrollmentSettings = async () => {
    try {
      const setting = await api.studentEnrollmentSettingCurrent();
      localStorage.setItem("max_credits", String(setting.max_credits));
      localStorage.setItem("student_enrollment_setting_current", JSON.stringify(setting));
    } catch {
      // non-blocking for app bootstrap
    }
  };

  useEffect(() => {
    const boot = async () => {
      try {
        const me = await api.me();
        setUser(me);
        sessionStorage.setItem("user", JSON.stringify(me));
        sessionStorage.setItem("role", me.role);
        sessionStorage.setItem("must_reset_password", String(!!me.must_reset_password));
        if (me.role === "student" && !me.must_reset_password) {
          await syncStudentEnrollmentSettings();
        }
      } catch {
        setUser(null);
      } finally {
        setBooting(false);
      }
    };

    boot();
  }, []);

  const handleLogin = (userFromBackend: User) => {
    setUser(userFromBackend);
    sessionStorage.setItem("user", JSON.stringify(userFromBackend));
    sessionStorage.setItem("role", userFromBackend.role);
    sessionStorage.setItem("must_reset_password", String(!!userFromBackend.must_reset_password));
    if (userFromBackend.role === "student" && !userFromBackend.must_reset_password) {
      void syncStudentEnrollmentSettings();
    }
  };

  const handlePasswordReset = (updatedUser: User) => {
    setUser(updatedUser);
    sessionStorage.setItem("user", JSON.stringify(updatedUser));
    sessionStorage.setItem("role", updatedUser.role);
    sessionStorage.setItem("must_reset_password", String(!!updatedUser.must_reset_password));
    if (updatedUser.role === "student" && !updatedUser.must_reset_password) {
      void syncStudentEnrollmentSettings();
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
      sessionStorage.removeItem("user");
      sessionStorage.removeItem("role");
      sessionStorage.removeItem("must_reset_password");
      localStorage.removeItem("access_token");
    }
  };

  if (booting) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <UIProvider>
      <HashRouter>
        <Routes>
        {/* ✅ Public routes ALWAYS available */}
        <Route path="/reset-password-token" element={<ResetPasswordToken />} />

        {/* ✅ Existing in-app reset route (must_reset_password flow) */}
        <Route
          path="/reset-password"
          element={
            !user ? (
              <Navigate to="/login" replace />
            ) : (
              <ResetPassword user={user} onPasswordReset={handlePasswordReset} />
            )
          }
        />

        {/* Public routes - accessible without login */}
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password-token" element={<ResetPasswordToken />} />
        <Route path="/simple-login" element={<SimpleLogin />} />

        {/* ✅ If user must reset password, force all routes to reset page */}
        {user?.must_reset_password ? (
          <>
            {/* duplicate public routes inside this branch for safety */}
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password-token" element={<ResetPasswordToken />} />

            <Route path="*" element={<Navigate to="/reset-password" replace />} />
          </>
        ) : (
          <>
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

            {/* duplicate public routes inside this branch for safety */}
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password-token" element={<ResetPasswordToken />} />

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

                {/* ✅ FIX: admin course details uses AdminCourseDetails (NOT CourseDetails) */}
                <Route
                  path="/admin/courses/:courseId"
                  element={<AdminCourseDetails user={user} onLogout={handleLogout} />}
                />

                {/* Manual Enrollment Route */}
                <Route
                  path="/admin/enrollment/manual"
                  element={<AdminManualEnrollment user={user} onLogout={handleLogout} />}
                />
                <Route
                  path="/admin/enrollment-settings"
                  element={<AdminEnrollmentSettings user={user} onLogout={handleLogout} />}
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
                  path="/admin/announcements"
                  element={<AdminAnnouncements user={user} onLogout={handleLogout} />}
                />
                <Route
                  path="/admin/messages"
                  element={<AdminMessages user={user} onLogout={handleLogout} />}
                />
                <Route
                  path="/admin/grading"
                  element={<AdminGrading user={user} onLogout={handleLogout} />}
                />
                <Route
                  path="/admin/chatbot"
                  element={<AdminChatPage user={user} onLogout={handleLogout} />}
                />

                <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
              </>
            ) : user?.role === "student" ? (
              <>
                <Route
                  path="/student/dashboard"
                  element={<StudentDashboard user={user} onLogout={handleLogout} />}
                />
                <Route
                  path="/student/progress/current"
                  element={<StudentProgressCurrent user={user} onLogout={handleLogout} />}
                />
                <Route
                  path="/student/major/track"
                  element={<StudentTrackSelection user={user} onLogout={handleLogout} />}
                />
                <Route
                  path="/student/major/select"
                  element={<StudentMajorSelection user={user} onLogout={handleLogout} />}
                />
                <Route
                  path="/student/major/locked"
                  element={<StudentMajorLocked user={user} onLogout={handleLogout} />}
                />
                <Route
                  path="/student/enrollment"
                  element={<StudentEnrollment user={user} onLogout={handleLogout} />}
                />
                <Route
                  path="/student/enrollment/view/:courseId"
                  element={<CourseDetails user={user} onLogout={handleLogout} />}
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
                  path="/student/chatbot"
                  element={<StudentChatPage user={user} onLogout={handleLogout} />}
                />

                {/* ✅ student course details stays CourseDetails */}
                <Route
                  path="/student/courses/:courseId"
                  element={<CourseDetails user={user} onLogout={handleLogout} />}
                />
                <Route
                  path="/student/announcements"
                  element={<StudentAnnouncements user={user} onLogout={handleLogout} />}
                />

                <Route path="*" element={<Navigate to="/student/dashboard" replace />} />
              </>
            ) : (
              <Route path="*" element={<Navigate to="/login" replace />} />
            )}
          </>
        )}
      </Routes>
      <StudentChatTrigger visible={!!user && user.role === "student" && !user.must_reset_password} />
      </HashRouter>
    </UIProvider>
  );
};

export default App;
