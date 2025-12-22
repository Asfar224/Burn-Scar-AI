const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Burn Scar Analysis App...\n');

// Start backend
console.log('📡 Starting backend server...');
const backend = spawn('python', ['api.py'], {
  cwd: path.join(__dirname, '../backend'),
  stdio: 'inherit',
  shell: true
});

// Start frontend
console.log('⚛️  Starting frontend...');
const frontend = spawn('npm', ['start'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  shell: true
});

// Handle exit
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  backend.kill();
  frontend.kill();
  process.exit();
});

backend.on('error', (err) => {
  console.error('❌ Backend error:', err);
});

frontend.on('error', (err) => {
  console.error('❌ Frontend error:', err);
});


