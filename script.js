// script.js
const serviceUUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';  // Your SERVICE_UUID
const characteristicUUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';  // Your CHARACTERISTIC_UUID

let device;
let characteristic;

// Chart data and configs
const maxPoints = 20;  // Rolling window for graph points
let accelData = { x: [], y: [], z: [] };
let gyroData = { x: [], y: [], z: [] };
let fsrData = [];
let tempData = [];
let accelChart, gyroChart, fsrChart, tempChart;

// Initialize charts
const accelCtx = document.getElementById('accelChart').getContext('2d');
accelChart = new Chart(accelCtx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [
            { label: 'Accel X', data: accelData.x, borderColor: 'red', fill: false },
            { label: 'Accel Y', data: accelData.y, borderColor: 'green', fill: false },
            { label: 'Accel Z', data: accelData.z, borderColor: 'blue', fill: false }
        ]
    },
    options: {
        scales: { y: { beginAtZero: false } },
        responsive: true,
        plugins: { legend: { position: 'top' } }
    }
});

const gyroCtx = document.getElementById('gyroChart').getContext('2d');
gyroChart = new Chart(gyroCtx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [
            { label: 'Gyro X', data: gyroData.x, borderColor: 'red', fill: false },
            { label: 'Gyro Y', data: gyroData.y, borderColor: 'green', fill: false },
            { label: 'Gyro Z', data: gyroData.z, borderColor: 'blue', fill: false }
        ]
    },
    options: {
        scales: { y: { beginAtZero: false } },
        responsive: true,
        plugins: { legend: { position: 'top' } }
    }
});

const fsrCtx = document.getElementById('fsrChart').getContext('2d');
fsrChart = new Chart(fsrCtx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [
            { label: 'FSR Pressure', data: fsrData, borderColor: 'orange', fill: false }
        ]
    },
    options: {
        scales: { y: { beginAtZero: true, max: 4095 } },  // FSR range
        responsive: true,
        plugins: { legend: { position: 'top' } }
    }
});

const tempCtx = document.getElementById('tempChart').getContext('2d');
tempChart = new Chart(tempCtx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [
            { label: 'Temperature (°C)', data: tempData, borderColor: 'purple', fill: false }
        ]
    },
    options: {
        scales: { y: { beginAtZero: false } },
        responsive: true,
        plugins: { legend: { position: 'top' } }
    }
});

document.getElementById('connectBtn').addEventListener('click', async () => {
    try {
        device = await navigator.bluetooth.requestDevice({
            filters: [{ name: 'ESP32_Sensor' }],
            optionalServices: [serviceUUID]
        });
        const server = await device.gatt.connect();
        const service = await server.getPrimaryService(serviceUUID);
        characteristic = await service.getCharacteristic(characteristicUUID);

        await characteristic.startNotifications();
        characteristic.addEventListener('characteristicvaluechanged', handleData);

        document.getElementById('status').textContent = 'Status: Connected';
        document.getElementById('connectBtn').disabled = true;
    } catch (error) {
        console.error(error);
        document.getElementById('status').textContent = 'Status: Error - ' + error.message;
    }
});

function handleData(event) {
    const value = new TextDecoder().decode(event.target.value);
    console.log('Received: ' + value);
    let data;
    try {
        data = JSON.parse(value);
    } catch {
        data = {};
    }

    // Update text displays
    document.getElementById('fsr').textContent = data.fsr || 'N/A';
    document.getElementById('accelX').textContent = data.accel?.x || 'N/A';
    document.getElementById('accelY').textContent = data.accel?.y || 'N/A';
    document.getElementById('accelZ').textContent = data.accel?.z || 'N/A';
    document.getElementById('gyroX').textContent = data.gyro?.x || 'N/A';
    document.getElementById('gyroY').textContent = data.gyro?.y || 'N/A';
    document.getElementById('gyroZ').textContent = data.gyro?.z || 'N/A';
    document.getElementById('temp').textContent = data.temp || 'N/A';

    // Update graphs
    const timestamp = new Date().toLocaleTimeString();

    // Accel
    accelData.x.push(data.accel?.x || 0);
    accelData.y.push(data.accel?.y || 0);
    accelData.z.push(data.accel?.z || 0);
    if (accelData.x.length > maxPoints) {
        accelData.x.shift(); accelData.y.shift(); accelData.z.shift();
    }
    accelChart.data.labels.push(timestamp);
    if (accelChart.data.labels.length > maxPoints) accelChart.data.labels.shift();
    accelChart.data.datasets[0].data = accelData.x;
    accelChart.data.datasets[1].data = accelData.y;
    accelChart.data.datasets[2].data = accelData.z;
    accelChart.update();

    // Gyro
    gyroData.x.push(data.gyro?.x || 0);
    gyroData.y.push(data.gyro?.y || 0);
    gyroData.z.push(data.gyro?.z || 0);
    if (gyroData.x.length > maxPoints) {
        gyroData.x.shift(); gyroData.y.shift(); gyroData.z.shift();
    }
    gyroChart.data.labels.push(timestamp);
    if (gyroChart.data.labels.length > maxPoints) gyroChart.data.labels.shift();
    gyroChart.data.datasets[0].data = gyroData.x;
    gyroChart.data.datasets[1].data = gyroData.y;
    gyroChart.data.datasets[2].data = gyroData.z;
    gyroChart.update();

    // FSR
    fsrData.push(data.fsr || 0);
    if (fsrData.length > maxPoints) fsrData.shift();
    fsrChart.data.labels.push(timestamp);
    if (fsrChart.data.labels.length > maxPoints) fsrChart.data.labels.shift();
    fsrChart.data.datasets[0].data = fsrData;
    fsrChart.update();

    // Temp
    tempData.push(data.temp || 0);
    if (tempData.length > maxPoints) tempData.shift();
    tempChart.data.labels.push(timestamp);
    if (tempChart.data.labels.length > maxPoints) tempChart.data.labels.shift();
    tempChart.data.datasets[0].data = tempData;
    tempChart.update();
}
