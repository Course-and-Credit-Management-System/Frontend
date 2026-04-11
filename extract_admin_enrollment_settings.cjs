const fs = require('fs');
const file = 'C:/Frontend/Frontend/pages/AdminEnrollmentSettings.tsx';
const src = fs.readFileSync(file, 'utf8');

const regex = />([^<{]+)</g;
let match;
while ((match = regex.exec(src)) !== null) {
    const text = match[1].trim();
    if (text.length > 0 && !text.includes('&') && !text.includes('}') && text !== '—' && !text.match(/^[0-9]+$/)) {
        console.log(text);
    }
}
