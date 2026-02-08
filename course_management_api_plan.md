# Course and Credit Management API Plan

## Core Entities

### Courses
- `GET /api/v1/courses/` - List all courses
- `POST /api/v1/courses/` - Create new course
- `GET /api/v1/courses/{course_id}` - Get course details
- `PUT /api/v1/courses/{course_id}` - Update course
- `DELETE /api/v1/courses/{course_id}` - Delete course

### Students
- `GET /api/v1/students/` - List all students
- `POST /api/v1/students/` - Create new student
- `GET /api/v1/students/{student_id}` - Get student details
- `PUT /api/v1/students/{student_id}` - Update student
- `DELETE /api/v1/students/{student_id}` - Delete student

### Enrollments
- `GET /api/v1/enrollments/` - List all enrollment requests
- `POST /api/v1/enrollments/` - Create enrollment request
- `GET /api/v1/enrollments/{enrollment_id}` - Get enrollment details
- `PUT /api/v1/enrollments/{enrollment_id}` - Update enrollment status
- `DELETE /api/v1/enrollments/{enrollment_id}` - Cancel enrollment

### Student-specific endpoints
- `GET /api/v1/students/{student_id}/courses` - Get student's enrolled courses
- `GET /api/v1/students/{student_id}/enrollments` - Get student's enrollment requests
- `POST /api/v1/students/{student_id}/enroll` - Enroll in course

### Course-specific endpoints
- `GET /api/v1/courses/{course_id}/students` - Get enrolled students
- `GET /api/v1/courses/{course_id}/enrollments` - Get enrollment requests for course

## Data Models

### Course Model
```python
class Course(BaseModel):
    id: str
    code: str
    name: str
    department: str
    credits: int
    type: Literal['Core', 'Elective', 'Prerequisite']
    max_students: Optional[int] = None
    prerequisites: List[str] = []
    created_at: datetime
    updated_at: datetime
```

### Student Model
```python
class Student(BaseModel):
    id: str
    name: str
    email: str
    department: str
    initials: str
    avatar: str
    total_credits: int = 0
    created_at: datetime
    updated_at: datetime
```

### Enrollment Model
```python
class Enrollment(BaseModel):
    id: str
    student_id: str
    course_id: str
    status: Literal['Enrolled', 'Pending', 'Conflict', 'Waitlisted']
    date: datetime
    created_at: datetime
    updated_at: datetime
```