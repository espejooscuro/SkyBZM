

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const webDir = path.join(__dirname, '../src/web');
const distDir = path.join(webDir, 'dist');

console.log('🔧 Checking web build...');

// Check if dist exists
if (fs.existsSync(distDir)) {
  console.log('✅ Web app already built');
  process.exit(0);
}

console.log('📦 Building web app for the first time...');

try {
  // Install dependencies if node_modules doesn't exist
  const nodeModulesDir = path.join(webDir, 'node_modules');
  if (!fs.existsSync(nodeModulesDir)) {
    console.log('📥 Installing web dependencies...');
    execSync('npm install', { 
      cwd: webDir, 
      stdio: 'inherit',
      shell: true 
    });
  }

  // Build the app
  console.log('🏗️ Building React app...');
  execSync('npm run build', { 
    cwd: webDir, 
    stdio: 'inherit',
    shell: true 
  });

  console.log('✅ Web app built successfully!\n');
} catch (error) {
  console.error('❌ Error building web app:', error.message);
  console.log('\n⚠️  Web interface will not be available.');
  console.log('💡 You can build it manually later with:');
  console.log('   cd src/web');
  console.log('   npm install');
  console.log('   npm run build\n');
  process.exit(0); // Don't fail the entire app
}


