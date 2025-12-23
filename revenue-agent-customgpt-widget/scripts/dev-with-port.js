#!/usr/bin/env node

const { spawn, execSync } = require('child_process');
const net = require('net');
const fs = require('fs');
const path = require('path');

/**
 * Remove Next.js lock file if it exists
 */
function removeLockFile() {
  const lockFile = path.join(process.cwd(), '.next', 'dev', 'lock');
  try {
    if (fs.existsSync(lockFile)) {
      fs.unlinkSync(lockFile);
      console.log('Removed stale Next.js lock file');
    }
  } catch (error) {
    // Ignore errors - lock file might be in use
  }
}

/**
 * Kill any existing Next.js dev processes
 */
function killExistingNextProcesses() {
  try {
    // Try to find and kill Next.js processes
    if (process.platform === 'win32') {
      // Windows
      try {
        execSync('taskkill /F /IM node.exe /FI "WINDOWTITLE eq next*"', { stdio: 'ignore' });
      } catch (e) {
        // Ignore if no processes found
      }
    } else {
      // Unix-like systems
      try {
        const result = execSync('lsof -ti:3000,3001,3002,3003,3004', { encoding: 'utf8' });
        const pids = result.trim().split('\n').filter(Boolean);

        if (pids.length > 0) {
          console.log(`Found ${pids.length} process(es) using ports, terminating...`);
          pids.forEach(pid => {
            try {
              execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
            } catch (e) {
              // Process might have already died
            }
          });
          // Give processes time to die
          execSync('sleep 1');
        }
      } catch (e) {
        // No processes found on those ports
      }
    }
  } catch (error) {
    // Ignore errors - processes might not exist
  }
}

/**
 * Check if a port is available
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(false);
      }
    });

    server.once('listening', () => {
      server.close();
      resolve(true);
    });

    server.listen(port);
  });
}

/**
 * Find the next available port starting from the given port
 */
async function findAvailablePort(startPort = 3000, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    const available = await isPortAvailable(port);

    if (available) {
      return port;
    }

    console.log(`Port ${port} is in use, trying next port...`);
  }

  throw new Error(`Could not find an available port after ${maxAttempts} attempts`);
}

/**
 * Start the Next.js dev server on an available port
 */
async function startDevServer() {
  try {
    // Clean up any existing processes and lock files
    console.log('Checking for existing Next.js processes...');
    killExistingNextProcesses();
    removeLockFile();

    const port = await findAvailablePort(3000);

    console.log(`\nStarting Next.js dev server on port ${port}...\n`);

    // Spawn Next.js dev server with the available port
    const nextProcess = spawn('next', ['dev', '-p', port.toString()], {
      stdio: 'inherit',
      shell: true
    });

    // Handle process termination
    nextProcess.on('error', (error) => {
      console.error('Failed to start dev server:', error);
      process.exit(1);
    });

    nextProcess.on('exit', (code) => {
      process.exit(code || 0);
    });

    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
      nextProcess.kill('SIGINT');
    });

    process.on('SIGTERM', () => {
      nextProcess.kill('SIGTERM');
    });

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

startDevServer();
