const fs = require('fs');
const path = require('path');

// Read the index.html file
const indexPath = path.join(__dirname, 'dist', 'index.html');
let indexContent = fs.readFileSync(indexPath, 'utf8');

// Replace absolute paths with relative paths for GitHub Pages subdirectory
indexContent = indexContent.replace(/href="\/favicon.ico"/g, 'href="./favicon.ico"');
indexContent = indexContent.replace(/src="\/_expo/g, 'src="./_expo');

// Write the fixed content back
fs.writeFileSync(indexPath, indexContent);

// Create .nojekyll file to prevent Jekyll processing
const nojekyllPath = path.join(__dirname, 'dist', '.nojekyll');
fs.writeFileSync(nojekyllPath, '');

console.log('Fixed paths in index.html and added .nojekyll for GitHub Pages');