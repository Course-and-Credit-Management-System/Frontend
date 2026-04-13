# Migration Plan: Friend's Frontend Project

## Overview
This document outlines the migration plan and reference information to integrate components and pages from a friend's React project into the current system.

## 1. Dependencies to Evaluate
The incoming project (`package.json`) uses the following key dependencies. If the imported pages rely on these, they must be installed in our project:
- `@supabase/supabase-js` (^2.95.3): Used for backend API/Database interactions.
- `@emailjs/browser` (^4.4.1): Used for sending emails directly from the frontend (e.g., registration confirmations).
- `xlsx` (^0.18.5): Used for Excel file parsing or generation (likely for admin spreadsheet exports/imports).

*Command to install (if needed later):*
```bash
npm install @supabase/supabase-js @emailjs/browser xlsx
```

## 2. Route Mapping
The incoming project (`App.js`) defines the following routes which need to be mapped or integrated into our main router (`App.tsx`):

### Public Routes
- `/` -> `HomePage`
- `/register` -> `NewStudentRegister`
- `/login` -> `LoginPage`
- `/admin-login` -> `AdminLogin`

### Student Routes
- `/student-dashboard`, `/dashboard` -> `StudentDashboard`
- `/student-home` -> `StudentHome`
- `/student-details`, `/registration/start`, `/registration/:step` -> `StudentDetailsForm` (Multi-step form)
- `/class-enrollment`, `/enrollment` -> `ClassEnrollment`
- `/payment` -> `Payment`

### Admin Routes
- `/admin-dashboard` -> `AdminDashboard`
- `/admin/term-management` -> `AdminTermManagement`
- `/admin-dashboard/new-student-draft-detail/:recordId` -> `NewStudentDraftDetail`
- `/admin-dashboard/submitted-details/:studentId` -> `SubmittedDetailsReview`

## 3. Integration Approach
For each new page being migrated, the workflow will be:
1. **Context Sharing:** Provide the UI screenshot, the related code file(s), and the desired placement (e.g., "Add after the login page").
2. **Dependency Resolution:** Identify if the file imports any of the special packages (Supabase, EmailJS, xlsx) or child components/assets that need to be brought over.
3. **Route Integration:** Add the route to our `App.tsx` and place the component in the appropriate directory (e.g., `pages/`).
4. **Style Alignment:** Ensure their CSS/Tailwind classes align with the host project's theme.
*(Note: Localization and Shared State migrations are ignored for this initial integration phase as requested).*

## NewStudentRegister.tsx Final Code Backup

```tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import nrcCatalog from '../data/nrc.json';

export default function NewStudentRegister() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [nrcDisabled, setNrcDisabled] = useState(false);
  const [windowSettings, setWindowSettings] = useState<any>(null);
  const [windowLoading, setWindowLoading] = useState(true);

  // Form data state
  const [formData, setFormData] = useState({
    studentName: '',
    fatherName: '',
    motherName: '',
    gender: '',
    dobDay: '',
    dobMonth: '',
    dobYear: '',
    nrcRegion: '',
    nrcTownship: '',
    nrcType: '',
    nrcNumber: '',
    nrcPending: false,
    birthplace: '',
    address: '',
    phone: '',
    email: '',
    entranceRollNo: '',
    matricRollNo: '',
    matricPassYear: '',
    totalMarks: ''
  });

  const nrcTypes = [
    '\u1014\u102D\u102F\u1004\u103A',
    '\u1027\u100A\u1037\u103A',
    '\u1015\u103C\u102F'
  ];
  
  const toMyanmarDigits = (value: any) =>
    String(value).replace(/[0-9]/g, (d) => '\u1040\u1041\u1042\u1043\u1044\u1045\u1046\u1047\u1048\u1049'[Number(d)]);
  
  const normalizeLocalizedDigits = (value: any) =>
    String(value ?? '').replace(/[\u1040-\u1049]/g, (digit) => String(digit.charCodeAt(0) - 0x1040));
  
  const parseLocalizedInteger = (value: any) => {
    const normalized = normalizeLocalizedDigits(value).trim();
    if (!normalized || !/^-?\d+$/.test(normalized)) return null;
    const parsed = Number.parseInt(normalized, 10);
    return Number.isNaN(parsed) ? null : parsed;
  };
  
  const nrcRegions = Array.from(new Set(nrcCatalog.map((row: any) => String(row.state_code).trim())))
    .sort((a, b) => Number(a) - Number(b));
  
  const nrcTownships = nrcCatalog
    .filter((row: any) => String(row.state_code).trim() === formData.nrcRegion)
    .map((row: any) => ({
      code: String(row.township_code_mm || '').trim(),
      nameMm: String(row.township_mm || '').trim(),
      nameEn: String(row.township_en || '').trim()
    }))
    .filter((row: any) => row.code)
    .sort((a: any, b: any) => a.code.localeCompare(b.code));
  
  // Months
  const months = [
    'ဇန်နဝါရီ', 'ဖေဖော်ဝါရီ', 'မတ်', 'ဧပြီ', 'မေ', 'ဇွန်',
    'ဇူလိုင်', 'သြဂုတ်', 'စက်တင်ဘာ', 'အောက်တိုဘာ', 'နိုဝင်ဘာ', 'ဒီဇင်ဘာ'
  ];

  // Load registration window settings on mount
  useEffect(() => {
    let isMounted = true;
    api.getRegistrationWindowSettings()
      .then((data: any) => {
        if (!isMounted) return;
        setWindowSettings(data || null);
      })
      .catch(() => {
        setWindowSettings(null);
      })
      .finally(() => {
        if (isMounted) {
          setWindowLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const isRegistrationClosed = () => {
    if (!windowSettings) return false;
    const open = windowSettings.isOpen ?? true;
    if (!open) return true;
    if (!windowSettings.registrationDeadline) return false;
    const deadline = new Date(windowSettings.registrationDeadline);
    if (Number.isNaN(deadline.getTime())) return false;
    return Date.now() > deadline.getTime();
  };

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;
    const checked = target.checked;
    
    if (type === 'checkbox' && name === 'nrcPending') {
      setNrcDisabled(checked);
      setFormData({
        ...formData,
        nrcPending: checked,
        nrcRegion: checked ? '' : formData.nrcRegion,
        nrcTownship: checked ? '' : formData.nrcTownship,
        nrcType: checked ? '' : formData.nrcType,
        nrcNumber: checked ? '' : formData.nrcNumber
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value,
        ...(name === 'nrcRegion' ? { nrcTownship: '' } : {})
      });
    }
  };

  // Form validation
  const validateForm = () => {
    const errors = [];

    if (!formData.studentName.trim()) errors.push('ကျောင်းသားအမည် ဖြည့်ပါ');
    if (!formData.fatherName.trim()) errors.push('အဖအမည် ဖြည့်ပါ');
    if (!formData.motherName.trim()) errors.push('အမေအမည် ဖြည့်ပါ');
    if (!formData.gender) errors.push('လိင် ရွေးချယ်ပါ');
    if (!formData.dobDay || !formData.dobMonth || !formData.dobYear) {
      errors.push('မွေးသက္ကရာဇ် အပြည့်အစုံ ဖြည့်ပါ');
    }
    if (!formData.nrcPending) {
      if (!formData.nrcRegion || !formData.nrcTownship || !formData.nrcType || !formData.nrcNumber) {
        errors.push('မှတ်ပုံတင်အမှတ် အပြည့်အစုံ ဖြည့်ပါ');
      }
      if (formData.nrcRegion && formData.nrcTownship && !nrcTownships.some((t: any) => t.code === formData.nrcTownship)) {
        errors.push('Selected NRC township is not valid for this region');
      }
      if (formData.nrcNumber && !/^[0-9\u1040-\u1049]{6}$/.test(formData.nrcNumber)) {
        errors.push('မှတ်ပုံတင်နံပါတ် ၆ လုံး ဖြည့်ပါ');
      }
    }
    if (!formData.phone.trim()) errors.push('ဖုန်းနံပါတ် ဖြည့်ပါ');
    if (!formData.email.trim()) errors.push('အီးမေးလ် ဖြည့်ပါ');
    if (!formData.birthplace.trim()) errors.push('မွေးဖွားရာဒေသ ဖြည့်ပါ');
    if (!formData.address.trim()) errors.push('နေရပ်လိပ်စာ ဖြည့်ပါ');
    if (!formData.email.includes('@')) errors.push('အီးမေးလ် မှန်ကန်ပါစေ');
    if (!formData.entranceRollNo.trim()) errors.push('ဝင်ခွင့်အမှတ်စဉ် ဖြည့်ပါ');
    if (!formData.matricRollNo.trim()) errors.push('တက္ကသိုလ်ဝင်တန်းခုံအမှတ် ဖြည့်ပါ');
    const matricYearValue = parseLocalizedInteger(formData.matricPassYear);
    if (!formData.matricPassYear.trim()) {
      errors.push('အောင်မြင်သည့်နှစ် ဖြည့်ပါ');
    } else if (matricYearValue === null) {
      errors.push('Matriculation pass year must be a number (example: 2024)');
    } else if (matricYearValue < 1900 || matricYearValue > 2100) {
      errors.push('Matriculation pass year is out of range');
    }

    const totalMarksValue = parseLocalizedInteger(formData.totalMarks);
    if (!formData.totalMarks.trim()) {
      errors.push('စုစုပေါင်းရမှတ် ဖြည့်ပါ');
    } else if (totalMarksValue === null) {
      errors.push('Total marks must be a number');
    } else if (totalMarksValue < 0 || totalMarksValue > 600) {
      errors.push('Total marks must be between 0 and 600');
    }

    if (errors.length > 0) {
      alert(errors.join('\n'));
      return false;
    }
    return true;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!windowLoading && isRegistrationClosed()) {
      alert('🔒 စာရင်းသွင်းခြင်းပိတ်ထားပါသည်။ ကျေးဇူးပြု၍ သတ်မှတ်ထားသောလက်ခံကာလအတွင်းထပ်မံကြိုးစားပါ။');
      return;
    }

    if (!validateForm()) return;

    setLoading(true);

    try {
      // Build NRC string
      const nrcString = formData.nrcPending
        ? '\u101C\u103B\u103E\u1031\u102C\u1000\u103A\u1011\u102C\u1038\u1006\u1032'
        : `${toMyanmarDigits(formData.nrcRegion)}/${formData.nrcTownship}/${formData.nrcType}/${formData.nrcNumber}`;

      // Build date of birth
      const dateOfBirth = `${formData.dobYear}-${formData.dobMonth}-${formData.dobDay}`;

      const matricYear = parseLocalizedInteger(formData.matricPassYear);
      const totalMarks = parseLocalizedInteger(formData.totalMarks);
      if (matricYear === null || totalMarks === null) {
        alert('Invalid numeric values for matriculation pass year or total marks.');
        setLoading(false);
        return;
      }
      const currentAcademicYear = new Date().getFullYear().toString();

      const payload = {
        // snake_case
        student_name: formData.studentName,
        father_name: formData.fatherName,
        mother_name: formData.motherName,
        gender: formData.gender,
        nrc_number: nrcString,
        date_of_birth: dateOfBirth,
        birthplace: formData.birthplace,
        exam_roll_no: formData.entranceRollNo,
        matriculation_year: matricYear,
        matriculation_passed_year: matricYear,
        total_marks: totalMarks,
        exam_year: matricYear,
        exam_center: 'UIT',
        division_or_state: formData.nrcRegion || 'Yangon',
        township: formData.nrcTownship || 'Insein',
        address: formData.address,
        phone: formData.phone,
        department_id: '00000000-0000-0000-0000-000000000001',
        semester_id: '00000000-0000-0000-0000-000000000001',
        full_name: formData.studentName,
        name_mm: formData.studentName,
        name_en: '',
        email: formData.email,
        matriculation_roll_no: formData.matricRollNo,
        current_year: 1,
        academic_year_entered: currentAcademicYear,
        university_admission: 'UIT',
        status: 'PENDING',

        // camelCase (Spring DTO compatibility)
        studentName: formData.studentName,
        fullName: formData.studentName,
        fatherName: formData.fatherName,
        motherName: formData.motherName,
        nrcNumber: nrcString,
        dateOfBirth: dateOfBirth,
        divisionOrState: formData.nrcRegion || 'Yangon',
        entranceRollNo: formData.entranceRollNo,
        matriculationYear: matricYear,
        totalMarks: totalMarks,
        examYear: matricYear,
        departmentId: '00000000-0000-0000-0000-000000000001',
        semesterId: '00000000-0000-0000-0000-000000000001',
        nameMm: formData.studentName,
        nameEn: '',
        matriculationRollNo: formData.matricRollNo,
        matriculationPassedYear: matricYear,
        totalMarksObtained: totalMarks,
        currentYear: 1,
        academicYearEntered: currentAcademicYear,
        universityAdmission: 'UIT'
      };

      await api.registerStudent(payload);
      alert('✅ စာရင်းသွင်းခြင်း အောင်မြင်ပါသည်!\n\nwait for admin approval and check your email.');
      navigate('/');

    } catch (error: any) {
      console.error('Error:', error);
      if (error?.status === 409 || error?.status === 400) {
        alert(error?.message || 'Registration data is invalid.');
      } else {
        alert('❌ စာရင်းသွင်းခြင်း မအောင်မြင်ပါ။ ထပ်မံကြိုးစားပါ။\n\n' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex justify-center items-start">
      <div className="w-full max-w-4xl bg-white p-7 md:p-10 rounded-[32px] border border-slate-100 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 group relative overflow-hidden">
        {/* Decorative corner element */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-teal-50 to-white rounded-bl-full pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity"></div>

        <div className="text-center border-b-2 border-slate-100 pb-8 mb-8 relative z-10">
          <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">
            📝 System Registration
          </h2>
          <p className="mt-4 text-slate-500 bg-slate-50 border border-slate-100 border-l-4 border-l-teal-600 rounded-xl p-4 text-sm text-left">
            အောက်ပါအချက်အလက်များကို တက္ကသိုလ်ဝင်တန်းလျှောက်လွှာစာအုပ်(မြန်မာအက္ခရာ font)ဖြင့်သာ ဖြည့်သွင်းပါရန်
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6 relative z-10">
          
          {/* Student Name */}
          <div className="grid gap-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              ကျောင်းသားအမည်: <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="studentName"
              value={formData.studentName}
              onChange={handleChange}
              placeholder="ကျောင်းသားအမည် ထည့်ပါ"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-slate-50/50 text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Father Name */}
            <div className="grid gap-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                အဖအမည်: <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="fatherName"
                value={formData.fatherName}
                onChange={handleChange}
                placeholder="အဖအမည် ထည့်ပါ"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-slate-50/50 text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all"
                required
              />
            </div>

            {/* Mother Name */}
            <div className="grid gap-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                အမေအမည်: <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="motherName"
                value={formData.motherName}
                onChange={handleChange}
                placeholder="အမေအမည် ထည့်ပါ"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-slate-50/50 text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all"
                required
              />
            </div>
          </div>

          {/* Gender */}
          <div className="grid gap-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              လိင်: <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 border border-slate-200 rounded-xl bg-slate-50/50 px-4 py-3 font-semibold text-slate-700 cursor-pointer hover:border-teal-500 transition-colors">
                <input
                  type="radio"
                  name="gender"
                  value="ကျား"
                  checked={formData.gender === 'ကျား'}
                  onChange={handleChange}
                  className="text-teal-600 focus:ring-teal-500 w-4 h-4"
                  required
                />
                <span>ကျား (Male)</span>
              </label>
              <label className="flex items-center gap-2 border border-slate-200 rounded-xl bg-slate-50/50 px-4 py-3 font-semibold text-slate-700 cursor-pointer hover:border-teal-500 transition-colors">
                <input
                  type="radio"
                  name="gender"
                  value="မ"
                  checked={formData.gender === 'မ'}
                  onChange={handleChange}
                  className="text-teal-600 focus:ring-teal-500 w-4 h-4"
                  required
                />
                <span>မ (Female)</span>
              </label>
            </div>
          </div>

          {/* Date of Birth */}
          <div className="grid gap-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              မွေးသက္ကရာဇ်: <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              <select
                name="dobDay"
                value={formData.dobDay}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-slate-50/50 text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all appearance-none cursor-pointer"
                required
              >
                <option value="">ရက်</option>
                {[...Array(31)].map((_, i) => (
                  <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                    {i + 1}
                  </option>
                ))}
              </select>

              <select
                name="dobMonth"
                value={formData.dobMonth}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-slate-50/50 text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all appearance-none cursor-pointer"
                required
              >
                <option value="">လ</option>
                {months.map((month, index) => (
                  <option key={index} value={String(index + 1).padStart(2, '0')}>
                    {month}
                  </option>
                ))}
              </select>

              <select
                name="dobYear"
                value={formData.dobYear}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-slate-50/50 text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all appearance-none cursor-pointer"
                required
              >
                <option value="">နှစ်</option>
                {[...Array(30)].map((_, i) => {
                  const year = 2010 - i;
                  return <option key={year} value={year}>{year}</option>;
                })}
              </select>
            </div>
          </div>

          {/* NRC Number */}
          <div className="grid gap-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              မှတ်ပုံတင်အမှတ်: <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr_1fr_2fr] gap-3">
              <select
                name="nrcRegion"
                value={formData.nrcRegion}
                onChange={handleChange}
                disabled={nrcDisabled}
                required={!nrcDisabled}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-slate-50/50 text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all appearance-none cursor-pointer disabled:opacity-50"
              >
                <option value="">ဒေသ</option>
                {nrcRegions.map((region) => (
                  <option key={region} value={region}>{toMyanmarDigits(region)}</option>
                ))}
              </select>

              <select
                name="nrcTownship"
                value={formData.nrcTownship}
                onChange={handleChange}
                disabled={nrcDisabled}
                required={!nrcDisabled}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-slate-50/50 text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all appearance-none cursor-pointer disabled:opacity-50"
              >
                <option value="">မြို့နယ်</option>
                {nrcTownships.map((township) => (
                  <option key={township.code} value={township.code}>{township.code} - {township.nameMm || township.nameEn}</option>
                ))}
              </select>

              <select
                name="nrcType"
                value={formData.nrcType}
                onChange={handleChange}
                disabled={nrcDisabled}
                required={!nrcDisabled}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-slate-50/50 text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all appearance-none cursor-pointer disabled:opacity-50"
              >
                <option value="">အမျိုးအစား</option>
                {nrcTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>

              <input
                type="text"
                name="nrcNumber"
                value={formData.nrcNumber}
                onChange={handleChange}
                placeholder="၆ လုံး"
                maxLength={6}
                disabled={nrcDisabled}
                required={!nrcDisabled}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-slate-50/50 text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all disabled:opacity-50"
              />
            </div>
            
            <div className="mt-2">
              <label className="inline-flex items-center gap-2 border border-slate-200 rounded-xl bg-slate-50/50 px-4 py-3 font-semibold text-slate-700 cursor-pointer hover:border-teal-500 transition-colors w-max">
                <input
                  type="checkbox"
                  name="nrcPending"
                  checked={formData.nrcPending}
                  onChange={handleChange}
                  className="text-teal-600 focus:ring-teal-500 rounded border-slate-300 w-4 h-4"
                />
                <span>လျှောက်ထားဆဲ</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Birthplace */}
            <div className="grid gap-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                မွေးဖွားရာဒေသ: <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="birthplace"
                value={formData.birthplace}
                onChange={handleChange}
                placeholder="မွေးဖွားရာမြို့/ဒေသ"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-slate-50/50 text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all"
                required
              />
            </div>

            {/* Address */}
            <div className="grid gap-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                နေရပ်လိပ်စာ: <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="နေရပ်လိပ်စာ"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-slate-50/50 text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all"
                required
              />
            </div>

            {/* Phone */}
            <div className="grid gap-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                ဖုန်းနံပါတ်: <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="09xxxxxxxxx"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-slate-50/50 text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all"
                required
              />
            </div>

            {/* Email */}
            <div className="grid gap-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                အီးမေးလ်: <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="example@gmail.com"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-slate-50/50 text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 border border-slate-100 p-6 rounded-2xl">
            {/* Entrance Roll No */}
            <div className="grid gap-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                ဝင်ခွင့်အမှတ်စဉ်: <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="entranceRollNo"
                value={formData.entranceRollNo}
                onChange={handleChange}
                placeholder="ဝင်ခွင့်အမှတ်စဉ် ထည့်ပါ"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all"
                required
              />
            </div>

            {/* Matriculation Roll No */}
            <div className="grid gap-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                တက္ကသိုလ်ဝင်တန်းခုံအမှတ်: <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="matricRollNo"
                value={formData.matricRollNo}
                onChange={handleChange}
                placeholder="ခုံအမှတ် ထည့်ပါ"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all"
                required
              />
            </div>

            {/* Matriculation Pass Year */}
            <div className="grid gap-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                တက္ကသိုလ်ဝင်တန်းအောင်မြင်သည့်နှစ်: <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="matricPassYear"
                value={formData.matricPassYear}
                onChange={handleChange}
                placeholder="ဥပမာ - 2024"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all"
                required
              />
            </div>

            {/* Total Marks */}
            <div className="grid gap-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                တက္ကသိုလ်ဝင်တန်းစုစုပေါင်းရမှတ်: <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="totalMarks"
                value={formData.totalMarks}
                onChange={handleChange}
                placeholder="စုစုပေါင်းရမှတ် ထည့်ပါ"
                min="0"
                max="600"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all"
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-8 pt-8 border-t border-slate-100 flex flex-col-reverse sm:flex-row gap-4 sm:justify-end items-center">
            <button 
              type="button" 
              className="w-full sm:w-auto rounded-2xl flex items-center justify-center gap-2 px-8 py-4 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
              onClick={() => navigate('/')}
            >
              နောက်သို့
            </button>
            <button 
              type="submit" 
              className="w-full sm:w-auto rounded-2xl flex items-center justify-center gap-2 bg-teal-600 text-white px-8 py-4 font-bold shadow-lg shadow-teal-600/20 hover:shadow-teal-600/30 hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'စာရင်းသွင်းနေသည်...' : 'Register'}
              <span className="material-icons-outlined text-sm ml-1">arrow_forward</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

