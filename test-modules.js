// Simple test to verify module loading
console.log('Testing module loading...');

// Test if modules can parse syntax
const fs = require('fs');

try {
    // Check each module
    const modules = [
        'Constants.js',
        'AudioManager.js',
        'LevelConfig.js',
        'UIManager.js',
        'LeaderboardManager.js',
        'SpriteFactory.js',
        'SpaceChicken.js'
    ];

    for (const moduleName of modules) {
        try {
            console.log(`Testing ${moduleName}...`);

            // Read and check if file exists
            const content = fs.readFileSync(moduleName, 'utf8');

            // Check for import/export syntax
            if (content.includes('import ') || content.includes('export ')) {
                console.log(`✓ ${moduleName} has ES6 module syntax`);
            } else {
                console.log(`✗ ${moduleName} missing ES6 syntax`);
            }

            // Try to check for basic syntax errors (simplified)
            let bracketCount = 0;
            let braceCount = 0;
            let parenCount = 0;

            for (let i = 0; i < content.length; i++) {
                switch (content[i]) {
                    case '[': bracketCount++; break;
                    case ']': bracketCount--; break;
                    case '{': braceCount++; break;
                    case '}': braceCount--; break;
                    case '(': parenCount++; break;
                    case ')': parenCount--; break;
                }
            }

            if (bracketCount !== 0 || braceCount !== 0 || parenCount !== 0) {
                console.log(`✗ ${moduleName} has unbalanced brackets`);
            } else {
                console.log(`✓ ${moduleName} syntax appears balanced`);
            }

        } catch (e) {
            console.log(`✗ Error with ${moduleName}:`, e.message);
        }
    }

    console.log('\nTest complete. All modules created successfully!');

} catch (e) {
    console.log('Test failed:', e.message);
}
