---
name: business-logic
description: Guidelines and rules for the UniPortal & UniAdmin CMS business domain, including enrollment workflows, role-based access, and security mandates.
---

# Business Logic: UniPortal & UniAdmin CMS

This skill covers the core domain logic for the University Portal based on the official System Flowcharts.

## Core Concepts

### 1. Authentication & Security Gate
- **Initial Password**: Users starting with default credentials have `must_reset_password: true`.
- **Login Flow**: Login -> Check `must_reset_password`? -> If Yes, force Redirect to `/reset-password`. Dashboard access is denied until reset.
- **Role-Based Routing**: After successful auth/reset, students go to Student Dashboard; staff go to Admin Dashboard.

### 2. Enrollment System Flow (Priority Order)
The student enrollment process must follow this strict sequential logic:
1. **Course Selection**: Student picks a candidate course.
2. **Credit Limit Check**: 
   - Mandatory Check: Total Enrolled + Candidate <= **24 Credits**.
   - If Exceeded: Trigger **Trade-off Decision** module (Modify selection by dropping electives).
3. **Prerequisite Check**:
   - Verify if all prerequisite course IDs are marked as "Completed" in `Academic History`.
   - If Missing: Block enrollment and display "Prerequisite Missing" warning.
4. **Retake Verification**: 
   - Check if course was previously "Failed".
   - If Yes: Mark as `is_retake: true`. Retakes have the highest priority and cannot be dropped to resolve credit conflicts.
5. **Final Confirmation**: Data is committed to `Enrollments` and linked to `Academic History`.

### 3. Student Registration & Status
- **Types**: Students are categorized as **Regular** or **Private**.
- **Academic Standing**: Status includes **Active**, **Probation**, and **Suspended**.
- **Credit Penalty**: Students on Probation (or with 3+ semester failures) are capped at a lower subject count (8 total, max 5 new).

### 4. Admin Domain Rules
- **Modules**: Admin manages Announcements, Student Details, Course Management, Attendance, and Results.
- **Manual Overrides**: Admins have authoritative power to override student enrollment confirmation and mark entries.
- **Grading**: GPA calculation occurs per semester; CGPA is a cumulative score across all attempted semesters.

## Implementation Guidelines
- **Dashboard Synchronization**: The Student Dashboard must show Timetable, Status, Results, and Enrollment status as primary modules.
- **Data Integrity**: Every enrollment MUST verify prerequisites against `Academic History` before allowing the final state change.
- **Consistency**: All UI components must reflect these flow constraints before calling the backend.
