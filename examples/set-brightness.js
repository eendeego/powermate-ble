const PowerMateBleDevice = require("../src");

// // Hookup event emitter
// events.EventEmitter.call(this);

// Unlimited listeners
// this.setMaxListeners(0);

if (process.argv.length < 3) {
  process.stdout.write(
    "Usage:\n  node examples/set-brightness <mac-address>\n\n"
  );
  process.exit();
}

const mac = process.argv[2];

// Create powermate instance
const powermate = new PowerMateBleDevice(mac);
process.stdout.write("Waiting for connection\n");

powermate.on("status", (status) => {
  if (status.fill === "green" && status.text === "connected") {
    process.stdout.write("Connected\n");
    process.stdout.write("Press and hold to see brightness change.\n");
  }
});

powermate.on("hold", (timeInSec) => {
  const brightness = Math.round((timeInSec * 100) / 6);
  process.stdout.write(`Setting brightness to: ${brightness}\n`);
  powermate.setLedBrightness(brightness);
});

process.on("beforeExit", (code) => {
  process.stdout.write("Exiting...");
  powermate.destroy();
});

process.on("SIGINT", () => {
  process.stdout.write("Exiting...");
  powermate.destroy();
  process.exit(0);
});
