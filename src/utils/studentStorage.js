export function persistStudentSession(data) {
  if (!data) return;
  localStorage.setItem('studentData', JSON.stringify(data));
  if (data.token) {
    localStorage.setItem('authToken', data.token);
  }
}

export function clearStudentSession() {
  localStorage.removeItem('studentData');
  localStorage.removeItem('authToken');
}
