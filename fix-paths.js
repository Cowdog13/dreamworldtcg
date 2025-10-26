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

// Copy CardList.csv from public to dist
const csvSourcePath = path.join(__dirname, 'public', 'CardList.csv');
const csvDestPath = path.join(__dirname, 'dist', 'CardList.csv');
if (fs.existsSync(csvSourcePath)) {
  fs.copyFileSync(csvSourcePath, csvDestPath);
  console.log('Copied CardList.csv from public to dist');
} else {
  console.warn('Warning: public/CardList.csv not found');
}

// Copy cards folder from public to dist
const cardsSourcePath = path.join(__dirname, 'public', 'cards');
const cardsDestPath = path.join(__dirname, 'dist', 'cards');
if (fs.existsSync(cardsSourcePath)) {
  // Create dist/cards directory if it doesn't exist
  if (!fs.existsSync(cardsDestPath)) {
    fs.mkdirSync(cardsDestPath, { recursive: true });
  }
  // Copy all files from public/cards to dist/cards
  const cardFiles = fs.readdirSync(cardsSourcePath);
  cardFiles.forEach(file => {
    fs.copyFileSync(
      path.join(cardsSourcePath, file),
      path.join(cardsDestPath, file)
    );
  });
  console.log(`Copied ${cardFiles.length} card images from public/cards to dist/cards`);
} else {
  console.warn('Warning: public/cards folder not found');
}

console.log('Fixed paths in index.html and added .nojekyll for GitHub Pages');