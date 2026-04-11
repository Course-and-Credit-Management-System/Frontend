const fs = require('fs');

let adminSrc = fs.readFileSync('C:/Frontend/Frontend/pages/AdminDashboard.tsx', 'utf-8');

adminSrc = adminSrc.replace(/>\s*Operations\s*Overview\s*</g, '>{t("Operations Overview")}<');
adminSrc = adminSrc.replace(/>\s*Synchronizing\s*</g, '>{t("Synchronizing")}<');
adminSrc = adminSrc.replace(/>\s*Institutional intelligence and administrative priorities synchronized in real-time.\s*</g, '>{t("Institutional intelligence and administrative priorities synchronized in real-time.")}<');
adminSrc = adminSrc.replace(/>\s*Sync\s*</g, '>{t("Sync")}<');
adminSrc = adminSrc.replace(/>\s*Announce\s*</g, '>{t("Announce")}<');
adminSrc = adminSrc.replace(/>\s*Attention\s*</g, '>{t("Attention")}<');

fs.writeFileSync('C:/Frontend/Frontend/pages/AdminDashboard.tsx', adminSrc);

console.log("Updated via Regex.");