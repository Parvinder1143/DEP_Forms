const fs = require('fs');

let content = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

// Fix the backslash escape issues
content = content.replace(/\\\$/g, '$');
content = content.replace(/\\`/g, '`');

fs.writeFileSync('src/app/admin/page.tsx', content, 'utf8');
console.log('Fixed escape chars.');
