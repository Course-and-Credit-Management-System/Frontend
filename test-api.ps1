# Test login
$loginBody = @{
    username = "TNT-2036"
    password = "admin123"
    role = "student"
} | ConvertTo-Json

$loginResponse = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -SessionVariable session

Write-Host "Login Status:" $loginResponse.StatusCode

if ($loginResponse.StatusCode -eq 200) {
    Write-Host "Login successful!"
    
    # Test results API
    $resultsResponse = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/student/results" -WebSession $session
    
    Write-Host "Results Status:" $resultsResponse.StatusCode
    
    if ($resultsResponse.StatusCode -eq 200) {
        $data = $resultsResponse.Content | ConvertFrom-Json
        Write-Host "Student:" $data.student.name
        Write-Host "Credits:" $data.academic_summary.total_credits_earned
        Write-Host "CGPA:" $data.academic_summary.cgpa
        Write-Host "Number of semesters:" $data.academic_summary.semesters.Count
        
        # Show first few courses
        $firstSem = $data.academic_summary.semesters[0]
        Write-Host "`nFirst semester courses:"
        for ($i = 0; $i -lt [Math]::Min(3, $firstSem.results.Count); $i++) {
            $course = $firstSem.results[$i]
            Write-Host "  $($i+1). $($course.course_code) - $($course.course_title)"
            Write-Host "     Grade: $($course.grade), Credits: $($course.credit_unit)"
        }
    } else {
        Write-Host "Results error:" $resultsResponse.Content
    }
} else {
    Write-Host "Login error:" $loginResponse.Content
}
