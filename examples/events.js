const PowerMateBleDevice = require("../src");

// // Hookup event emitter
// events.EventEmitter.call(this);

// Unlimited listeners
// this.setMaxListeners(0);

if (process.argv.length < 3) {
  process.stdout.write("Usage:\n  node examples/events <mac-address>\n\n");
  process.exit(1);
}

const macAddress = process.argv[2];

// Create powermate instance
const powermate = new PowerMateBleDevice(macAddress);

powermate.on("status", (status) => process.stdout.write(`status: ${status}\n`));

powermate.on("right", () => process.stdout.write("right\n"));
powermate.on("left", () => process.stdout.write("left\n"));
powermate.on("downRight", () => process.stdout.write("downRight\n"));
powermate.on("downLeft", () => process.stdout.write("downLeft\n"));

powermate.on("press", () => process.stdout.write("press\n"));
powermate.on("longPress", () => process.stdout.write("longPress\n"));
powermate.on("hold", (timeInSec) =>
  process.stdout.write(`hold: ${timeInSec}s\n`)
);

powermate.on("battery", (batteryLevel) =>
  process.stdout.write(`battery: ${batteryLevel}%\n`)
);

process.on("beforeExit", (code) => {
  process.stdout.write("Exiting...");
  powermate.destroy();
});

process.on("SIGINT", () => {
  process.stdout.write("Exiting...");
  powermate.destroy();
  process.exit(0);
});
