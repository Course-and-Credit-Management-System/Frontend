# Login and get session cookie
$loginBody = @{
    username = "TNT-2036"
    password = "admin123"
    role = "student"
} | ConvertTo-Json

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$loginResponse = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -WebSession $session

Write-Host "Login Status:" $loginResponse.StatusCode

if ($loginResponse.StatusCode -eq 200) {
    Write-Host "Login successful!"
    
    # Test PDF download
    try {
        $pdfResponse = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/student/results/certificate/pdf?type=semester" -WebSession $session -OutFile "test_certificate.pdf"
        Write-Host "PDF Download Status:" $pdfResponse.StatusCode
        Write-Host "File saved as: test_certificate.pdf"
        Write-Host "File size:" (Get-Item "test_certificate.pdf").Length "bytes"
    } catch {
        Write-Host "PDF Download Error:" $_.Exception.Message
    }
} else {
    Write-Host "Login failed"
}
