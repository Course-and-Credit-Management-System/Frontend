const html = require('fs').readFileSync('C:/Frontend/Frontend/pages/AdminManualEnrollment.tsx', 'utf8'); 
const regex = />([^<{]+)</g; 
let match; 
while(match = regex.exec(html)) { 
    if(match[1].trim().length > 2 && !match[1].includes(";") && match[1].trim() !== "N/A" && match[1].trim() !== "CU") 
        console.log(match[1].trim()); 
}