const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8090';
const STUDENT_AUTH_TOKEN_KEY = 'authToken';
const ADMIN_AUTH_TOKEN_KEY = 'adminAuthToken';

function fallbackStatusMessage(status) {
  switch (status) {
    default:
      return 'Unknown error. Status: ' + status;
  }
}

function extractBackendMessage(payload) {
  if (!payload) return null;
  if (typeof payload === 'string') return payload;
  if (typeof payload === 'object') {
      return payload.message || payload.detail || payload.error || null;
  }
  return '';
}

function sanitizeErrorMessage(rawMessage, status) {
  const cleaned = String(rawMessage || '')
    .replace(/\s*\[(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s+[^\]]+\]\s*/gi, ' ')
    .replace(/^request failed\s*\(\d{3}\)\s*[:-]?\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned || fallbackStatusMessage(status);
}

function normalizeStudent(student) {
  if (!student) return student;
  const latestTermEnrollmentRaw = student.latestTermEnrollment || student.latest_term_enrollment;
  const latestTermEnrollment =
    latestTermEnrollmentRaw && typeof latestTermEnrollmentRaw === 'object'
      ? {
          ...latestTermEnrollmentRaw,
          academicYear:
            latestTermEnrollmentRaw.academicYear
            || latestTermEnrollmentRaw.academic_year
            || '',
          semester:
            latestTermEnrollmentRaw.semester ?? latestTermEnrollmentRaw.termSemester ?? null,
          termStatus:
            latestTermEnrollmentRaw.termStatus
            || latestTermEnrollmentRaw.term_status
            || '',
          section: latestTermEnrollmentRaw.section || '',
          majorClassId:
            latestTermEnrollmentRaw.majorClassId
            || latestTermEnrollmentRaw.major_class_id
            || null,
          majorClassLabel:
            latestTermEnrollmentRaw.majorClassLabel
            || latestTermEnrollmentRaw.major_class_label
            || '',
          updatedAt:
            latestTermEnrollmentRaw.updatedAt
            || latestTermEnrollmentRaw.updated_at
            || null
        }
      : null;
  return {
    ...student,
    id: student.id || student.studentid,
    studentid: student.studentid || student.id,
    registrationId: student.registrationId || student.registrationid || student.registration_id || null,
    namemm: student.namemm || student.nameMm || student.name_mm || student.fullName || '',
    nameen: student.nameen || student.nameEn || student.name_en || '',
    father_name: student.father_name || student.fatherName || '',
    mother_name: student.mother_name || student.motherName || '',
    gender: student.gender || '',
    birthplace: student.birthplace || student.place_of_birth || student.placeOfBirth || '',
    date_of_birth: student.date_of_birth || student.dateOfBirth || '',
    nrc_number: student.nrc_number || student.nrcNumber || '',
    exam_roll_no: student.exam_roll_no || student.examRollNo || student.entrance_roll_no || student.entranceRollNo || '',
    student_name: student.student_name || student.studentName || student.full_name || student.fullName || '',
    phone: student.phone || student.phone_number || student.phoneNumber || '',
    user_name: student.user_name || student.username || '',
    currentyear: student.currentyear ?? student.currentYear ?? null,
    academic_semester: student.academic_semester || student.academicSemester || student.semester || '',
    major: student.major || student.major_code || student.specialization || '',
    academicyearentered: student.academicyearentered || student.academicYearEntered || '',
    matriculation_rollno: student.matriculation_rollno || student.matriculation_roll_no || student.matriculationRollNo || '',
    matriculation_passed_year: student.matriculation_passed_year || student.matriculationPassedYear || '',
    totalmarks_obtained:
      student.totalmarks_obtained
      ?? student.total_marks_obtained
      ?? student.totalMarksObtained
      ?? student.total_marks
      ?? student.totalMarks
      ?? null,
    division_or_state: student.division_or_state || student.divisionOrState || '',
    township: student.township || '',
    address: student.address || '',
    assigned_class: student.assigned_class || student.assignedClass || '',
    status: student.status || '',
    globalStatus: student.globalStatus || student.global_status || student.status || '',
    payment_status: student.payment_status || student.paymentStatus || '',
    payment_academic_year: student.payment_academic_year || student.paymentAcademicYear || '',
    paymentStatus: student.paymentStatus || student.payment_status || '',
    paymentAcademicYear: student.paymentAcademicYear || student.payment_academic_year || '',
    passportphoto: student.passportphoto || student.passportPhoto || student.passport_photo || '',
    nrcfrontimage: student.nrcfrontimage || student.nrcFrontImage || student.nrc_front_image || '',
    nrcbackimage: student.nrcbackimage || student.nrcBackImage || student.nrc_back_image || '',
    father_id: student.father_id || student.fatherId || null,
    mother_id: student.mother_id || student.motherId || null,
    rejection_reason: student.rejection_reason || student.rejectionReason || '',
    is_benefit_student: student.is_benefit_student ?? student.isBenefitStudent ?? false,
    is_hostel_student: student.is_hostel_student ?? student.isHostelStudent ?? false,
    is_on_break: student.is_on_break ?? student.isOnBreak ?? false,
    latestTermEnrollment,
    latest_term_enrollment: latestTermEnrollment
  };
}

function normalizeAdmin(admin) {
  if (!admin) return admin;
  return {
    ...admin,
    adminname: admin.adminname || admin.adminName || admin.fullName || ''
  };
}

function normalizeParent(parent) {
  if (!parent) return parent;
  return {
    ...parent,
    id: parent.id || parent.parentid,
    parentid: parent.parentid || parent.id,
    studentid: parent.studentid || parent.studentId || parent.student_id,
    full_name: parent.full_name || parent.fullName || '',
    relation: parent.relation || '',
    job_position: parent.job_position || parent.jobPosition || '',
    education: parent.education || '',
    address: parent.address || '',
    phone_number: parent.phone_number || parent.phone || parent.phoneNumber || '',
    ethnic: parent.ethnic || '',
    religion: parent.religion || '',
    birthplace: parent.birthplace || '',
    nrc_number: parent.nrc_number || parent.nrcNumber || '',
    nrc_front_image: parent.nrc_front_image || parent.nrcFrontImage || '',
    nrc_back_image: parent.nrc_back_image || parent.nrcBackImage || ''
  };
}

const decodeJwtPayload = (token) => {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  try { return JSON.parse(atob(parts[1])); } catch (_) { return null; }
};

const looksLikeAdminToken = (token) => {
  const normalized = String(token || '').trim();
  if (!normalized) return false;
  if (/^dev-token-admin-/i.test(normalized)) return true;

  const payload = decodeJwtPayload(normalized);
  if (!payload || typeof payload !== 'object') return false;

  const topRole = String(payload.role || '').trim().toUpperCase();
  if (topRole === 'ADMIN' || topRole === 'ROLE_ADMIN') return true;

  const appMetaRole = String(payload?.app_metadata?.role || '').trim().toUpperCase();
  if (appMetaRole === 'ADMIN' || appMetaRole === 'ROLE_ADMIN') return true;

  const userMetaRole = String(payload?.user_metadata?.role || '').trim().toUpperCase();
  if (userMetaRole === 'ADMIN' || userMetaRole === 'ROLE_ADMIN') return true;

  const appMetaRoles = payload?.app_metadata?.roles;
  if (Array.isArray(appMetaRoles)) { return appMetaRoles.includes('ADMIN'); }

  return false;
};

const isAdminUiRoute = () => {
  if (typeof window === 'undefined') return false;
  return String(window.location?.pathname || '').startsWith('/admin');
};

async function resolveAccessToken(requestPath = '') {
  const studentToken = localStorage.getItem(STUDENT_AUTH_TOKEN_KEY);
  const adminToken = localStorage.getItem(ADMIN_AUTH_TOKEN_KEY);
  const hasAdminSession = Boolean(localStorage.getItem('adminData'));
  const isAdminApi = String(requestPath || '').startsWith('/api/admin/');
  const preferAdminToken = hasAdminSession && (isAdminUiRoute() || isAdminApi);

  if (preferAdminToken) { return adminToken; }

  if (studentToken && studentToken.trim()) { return studentToken; }

  if (hasAdminSession) { return adminToken; }

  try { return null; } catch (_) { return null; }
  return null;
}

async function apiRequest(path, options = {}) {
  const token = await resolveAccessToken(path);
  const isAuthRoute = path.startsWith('/api/auth/');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (!isAuthRoute && token && !headers.Authorization) { headers.Authorization = `Bearer ${token}`; }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await response.text();
  let payload = null;
  try { payload = JSON.parse(text); } catch (error) { payload = text; }

  if (!response.ok) { throw new Error(sanitizeErrorMessage(extractBackendMessage(payload), response.status)); }

  return payload;
}

export const api = {
  registerStudent(body) { return apiRequest('/api/auth/register', { method: 'POST', body }); },
  loginStudent(body) { return apiRequest('/api/auth/login', { method: 'POST', body }); },
  loginAdmin(body) { return apiRequest('/api/auth/admin-login', { method: 'POST', body }); },
  getStudents(email) { return apiRequest(`/api/students?email=${email}`); },
  getStudentById(studentId) { return apiRequest(`/api/students/${studentId}`); },
  updateStudent(studentId, body) { return apiRequest(`/api/students/${studentId}`, { method: 'PUT', body }); },
};

export { API_BASE_URL };