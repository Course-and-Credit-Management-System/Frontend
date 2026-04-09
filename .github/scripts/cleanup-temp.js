const fs = require('fs');
const path = require('path');

// Define which files to clean up from the workspace root
const rootDir = process.cwd();
const filesToClean = [];

try {
  const files = fs.readdirSync(rootDir);
  for (const file of files) {
    // Target any Python scripts (.py) or files starting with 'temp'
    if (file.endsWith('.py') || file.startsWith('temp')) {
      const filePath = path.join(rootDir, file);
      // Ensure we only delete files, not directories
      if (fs.statSync(filePath).isFile()) {
        fs.unlinkSync(filePath);
        filesToClean.push(file);
      }
    }
  }
  
  // Output JSON as expected by the hook runtime
  console.log(JSON.stringify({ 
    systemMessage: filesToClean.length > 0 
      ? `Cleaned up temporary files: ${filesToClean.join(', ')}` 
      : "No temporary files to clean up." 
  }));
} catch (error) {
  // Exit gracefully zero even if there's an error, 
  // so we don't break the agent teardown
  console.error(JSON.stringify({ systemMessage: `Cleanup failed: ${error.message}` }));
  process.exit(0);
}
