const noble = require("noble");
const { EventEmitter } = require("events");
const util = require("util");

const SERVICE_UUID = "25598cf7424040a69910080f19f91ebc";
const BATTERY_CHAR_UUID = "50f09cc9fe1d4c79a962b3a7cd3e5584";
const KNOB_CHAR_UUID = "9cf53570ddd947f3ba6309acefc60415";
const LED_CHAR_UUID = "847d189e86ee4bd2966f800832b1259d";

const LED_BRIGHTNESS_MIN = 161;
const LED_BRIGHTNESS_MAX = 191;

const DISCONNECTED_STATUS = "disconnected";
const SCANNING_STATUS = "scanning";
const CONNECTED_STATUS = "connected";

class PowerMateBleDevice extends EventEmitter {
  static get DISCONNECTED_STATUS() {
    return DISCONNECTED_STATUS;
  }
  static get SCANNING_STATUS() {
    return SCANNING_STATUS;
  }
  static get CONNECTED_STATUS() {
    return CONNECTED_STATUS;
  }

  #mac;
  #verbose;
  #peripheral;
  #service;
  #batteryChar;
  #knobChar;
  #ledChar;

  #onDiscoverHandler = this.onDiscover.bind(this);
  #onStateChangeHandler = this.onStateChange.bind(this);
  #onConnectHandler = this.onConnect.bind(this);
  #onDisconnectHandler = this.onDisconnect.bind(this);
  #onBatteryReadHandler = this.onBatteryRead.bind(this);
  #onKnobReadHandler = this.onKnobRead.bind(this);

  constructor(mac, options = {}) {
    super();
    this.setMaxListeners(0);

    this.#mac = mac.toLowerCase();
    const { verbose = false } = options;
    this.#verbose = verbose;

    this.init();
  }

  init() {
    // Setup noble
    noble.on("discover", this.#onDiscoverHandler);
    noble.on("stateChange", this.#onStateChangeHandler);

    // Trigger initial scan (if ready)
    this.onStateChange(noble.state);
  }

  setLedBrightness(level) {
    // Check the LED characteristic is set
    if (!this.#ledChar) {
      return;
    }

    // Map percentage to min / max range
    const mappedLevel =
      level >= 0
        ? Math.round(
            this.map(level, 0, 100, LED_BRIGHTNESS_MIN, LED_BRIGHTNESS_MAX)
          )
        : 160; // Pulse

    // Write the value
    this.#ledChar.write(new Buffer([mappedLevel]), true, function (err) {
      if (err) console.log(err);
    });
  }

  destroy() {
    // Disconnect peripheral
    if (this.#peripheral) {
      this.#peripheral.disconnect();
      this.onDisconnect(null, true);
    }

    // Stop scanning
    noble.stopScanning();

    // Remove listeners
    noble.removeListener("stateChange", this.#onStateChangeHandler);
    noble.removeListener("discover", this.#onDiscoverHandler);
  }

  onStateChange(state) {
    if (state === "poweredOn" && !this.#peripheral) {
      this.emit("status", SCANNING_STATUS);
      noble.startScanning([SERVICE_UUID], false);
    }
  }

  onDiscover(peripheral) {
    // Check mac address matches
    if (this.#mac != peripheral.address.toLowerCase()) {
      return;
    }

    // Save the peripheral
    this.#peripheral = peripheral;

    // Listen for connection events
    this.#peripheral.on("connect", this.#onConnectHandler);
    this.#peripheral.on("disconnect", this.#onDisconnectHandler);

    // Attempt to connect
    this.#peripheral.connect(function (err) {
      if (err) {
        console.log(err);
      }
    });
  }

  onConnect(err) {
    // Discover services and characteristics (filter serial data service)
    this.#peripheral.discoverSomeServicesAndCharacteristics(
      [SERVICE_UUID],
      [BATTERY_CHAR_UUID, KNOB_CHAR_UUID, LED_CHAR_UUID],
      (err, services, chars) => {
        if (err) {
          console.log(err);
        }

        // Store the service
        this.#service = services[0];

        // Store the chars
        for (let i = 0; i < chars.length; i++) {
          switch (chars[i].uuid) {
            case BATTERY_CHAR_UUID:
              this.#batteryChar = chars[i];
              break;
            case KNOB_CHAR_UUID:
              this.#knobChar = chars[i];
              break;
            case LED_CHAR_UUID:
              this.#ledChar = chars[i];
              break;
          }
        }

        // Signup for battery notifications
        this.#batteryChar.notify(true, (error) => {
          if (err) {
            console.log("Error signing up for battery notifications");
            return;
          }
          if (this.#verbose) {
            console.log(
              "PowerMateBleDevice: Signed up for battery notifications"
            );
          }
        });

        // Listen for battery notifications
        this.#batteryChar.on("read", this.#onBatteryReadHandler);

        // Signup for knob notifications
        this.#knobChar.notify(true, (error) => {
          if (err) {
            console.log("Error signing up for knob notifications");
            return;
          }
          if (this.#verbose) {
            console.log("PowerMateBleDevice: Signed up for knob notifications");
          }
        });

        // Listen for knob notifications
        this.#knobChar.on("read", this.#onKnobReadHandler);
      }
    );

    this.emit("status", CONNECTED_STATUS);
  }

  onDisconnect(err, closing) {
    // Remove handlers
    if (this.#peripheral) {
      this.#peripheral.removeListener("connect", this.#onConnectHandler);
      this.#peripheral.removeListener("disconnect", this.#onDisconnectHandler);
    }

    if (this.#knobChar) {
      this.#knobChar.removeListener("read", this.#onKnobReadHandler);
    }

    if (this.#batteryChar) {
      this.#batteryChar.removeListener("read", this.#onBatteryReadHandler);
    }

    // Get rid of the peripheral and characteristic references
    this.#peripheral = undefined;
    this.#service = undefined;
    this.#batteryChar = undefined;
    this.#knobChar = undefined;
    this.#ledChar = undefined;

    if (!closing) {
      this.emit("status", DISCONNECTED_STATUS);

      this.onStateChange(noble.state);
    }
  }

  onBatteryRead(data, isNotification) {
    const value = data.readUInt8(0);

    this.emit("battery", value);
  }

  onKnobRead(data, isNotification) {
    const rawValue = data.readUInt8(0);

    switch (rawValue) {
      case 101:
        this.emit("press");
        break;
      case 104:
        this.emit("right");
        break;
      case 103:
        this.emit("left");
        break;

      case 114:
      case 115:
      case 116:
      case 117:
      case 118:
      case 119:
        this.emit("hold", rawValue - 113);
        break;
      case 112:
        this.emit("downRight");
        break;
      case 105:
        this.emit("downLeft");
        break;
      case 102:
        this.emit("longPress");
        break;
    }
  }

  map(x, in_min, in_max, out_min, out_max) {
    return ((x - in_min) * (out_max - out_min)) / (in_max - in_min) + out_min;
  }
}

module.exports = PowerMateBleDevice;
