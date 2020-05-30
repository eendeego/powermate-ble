# powermate-ble

Interact with a PowerMate Bluethooth device

## Install

```sh
npm install powermate-ble --save
```

Or

```sh
yarn add powermate-ble
```

## Examples

### Events

```sh
node examples/events <mac-addres>
```

### LED Brightness

```sh
node examples/set-brightness <mac-addres>
```

## Usage

```
const PowerMateBleDevice = require("powermate-ble");
const powermate = new PowerMateBleDevice(macAddress);
```

### Events

#### Status

```js
powermate.on("status", (status) => {});
```

`status` will be one of:

- `PowerMateBleDevice.DISCONNECTED_STATUS`
- `PowerMateBleDevice.SCANNING_STATUS`
- `PowerMateBleDevice.CONNECTED_STATUS`

#### Battery

```js
powermate.on("battery", (batteryLevel) => {});
```

`batteryLevel` ranges from 0 to 100.

#### Wheel

```js
powermate.on("right", () => {});
powermate.on("left", () => {});
powermate.on("downRight", () => {});
powermate.on("downLeft", () => {});
```

#### Button push

Called only on release

```js
powermate.on("press", () => {});
```

```js
powermate.on("hold", (timeInSec) => {});
```

`timeInSec` ranges from 1 to 6. After that, the device disconnects.

```js
powermate.on("longPress", () => {});
```

This will be called twice if a `hold` event is sent earlier.

### LED Brightness

```
powermate.setLedBrightness(brightness);
```

`brightness` ranges from 0 to 100.

## Acknowledgements

The code for interfacing with the PowerMate Bluetooth device is an adaptation for isolate node module usage of [node-red-contrib-powermateble](https://www.npmjs.com/package/node-red-contrib-powermateble).

All the events that have correspondence with Powermate USB use the same names as [node-powermate](https://www.npmjs.com/package/powermate).
