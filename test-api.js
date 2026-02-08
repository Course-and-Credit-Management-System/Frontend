import fetch from 'node-fetch';

async function testFrontendAPI() {
  try {
    // First login
    const loginResponse = await fetch('http://localhost:8000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'TNT-2036',
        password: 'admin123',
        role: 'student'
      })
    });
    
    if (!loginResponse.ok) {
      console.log('Login failed:', loginResponse.status);
      return;
    }
    
    // Get cookies from login
    const cookies = loginResponse.headers.get('set-cookie');
    
    // Now test results API
    const resultsResponse = await fetch('http://localhost:8000/api/v1/student/results', {
      headers: { 'Cookie': cookies }
    });
    
    if (!resultsResponse.ok) {
      console.log('Results API failed:', resultsResponse.status);
      return;
    }
    
    const data = await resultsResponse.json();
    console.log('✅ Frontend API test successful!');
    console.log('Student:', data.student.name);
    console.log('Credits:', data.academic_summary.total_credits_earned);
    console.log('CGPA:', data.academic_summary.cgpa);
    
    // Show course details
    const firstSem = data.academic_summary.semesters[0];
    console.log('\nFirst semester courses:');
    firstSem.results.slice(0, 3).forEach((course, i) => {
      console.log(`  ${i+1}. ${course.course_code} - ${course.course_title}`);
      console.log(`     Grade: ${course.grade}, Credits: ${course.credit_unit}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testFrontendAPI();
