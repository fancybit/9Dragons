const ComfyUIMCP = require('./src/main');

let mcpInstance = null;

async function startMCP() {
  if (!mcpInstance) {
    mcpInstance = new ComfyUIMCP();
    await mcpInstance.start();
  }
  return mcpInstance;
}

async function stopMCP() {
  if (mcpInstance) {
    await mcpInstance.stop();
    mcpInstance = null;
  }
}

function getMCP() {
  return mcpInstance;
}

// Export for Trae and other modules
module.exports = {
  ComfyUIMCP,
  startMCP,
  stopMCP,
  getMCP
};

// Main entry point
if (require.main === module) {
  (async () => {
    await startMCP();
    console.log('ComfyUI MCP is running. Press Ctrl+C to stop.');
    
    // Keep process running
    process.on('SIGINT', async () => {
      console.log('\nStopping ComfyUI MCP...');
      await stopMCP();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log('\nStopping ComfyUI MCP...');
      await stopMCP();
      process.exit(0);
    });
  })();
}