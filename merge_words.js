const fs = require('fs');
const path = require('path');

const cincoPath = path.join(__dirname, 'Cinco2.txt');
const wordsJsPath = path.join(__dirname, 'words.js');

const cincoContent = fs.readFileSync(cincoPath, 'utf8');
const wordsJsContent = fs.readFileSync(wordsJsPath, 'utf8');

// Extract words from Cinco2.txt
// Format is "WORD", per line
const newWords = cincoContent.split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('"'))
    .map(line => line.replace(/"/g, '').replace(/,/g, ''))
    .filter(word => word.length === 5); // Ensure they are 5 letters

// Parse words.js to find WORDS_DATA
const wordsDataMatch = wordsJsContent.match(/const WORDS_DATA = \[(.*?)\];/s);
if (!wordsDataMatch) {
    console.error('Could not find WORDS_DATA in words.js');
    process.exit(1);
}

const existingWordsStr = wordsDataMatch[1];
const existingWords = existingWordsStr.split(',').map(w => w.trim().replace(/'/g, '').replace(/"/g, '')).filter(w => w !== '');

// Combine and deduplicate
const allWords = Array.from(new Set([...existingWords, ...newWords]));

// Reconstruct WORDS_DATA
const updatedWordsDataStr = `const WORDS_DATA = [${allWords.map(w => `'${w}'`).join(', ')}];`;
const updatedWordsJsContent = wordsJsContent.replace(/const WORDS_DATA = \[.*?\];/s, updatedWordsDataStr);

fs.writeFileSync(wordsJsPath, updatedWordsJsContent);
console.log(`Successfully added ${newWords.length} words from Cinco2.txt to words.js`);
console.log(`Total words in WORDS_DATA: ${allWords.length}`);
