// script.js
const serviceUUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';  // Your SERVICE_UUID
const characteristicUUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';  // Your CHARACTERISTIC_UUID

let device;
let characteristic;

// Chart data and config
const maxPoints = 20;  // Rolling window for graph points
let accelData = { x: [], y: [], z: [] };
let accelChart;

// Initialize chart once page loads
const accelCtx = document.getElementById('accelChart').getContext('2d');
accelChart = new Chart(accelCtx, {
    type: 'line',  // Line graph for trends
    data: {
        labels: [],  // Timestamps
        datasets: [
            { label: 'Accel X', data: accelData.x, borderColor: 'red', fill: false },
            { label: 'Accel Y', data: accelData.y, borderColor: 'green', fill: false },
            { label: 'Accel Z', data: accelData.z, borderColor: 'blue', fill: false }
        ]
    },
    options: {
        scales: { y: { beginAtZero: false } },  // Allow negative values
        responsive: true
    }
});

document.getElementById('connectBtn').addEventListener('click', async () => {
    try {
        device = await navigator.bluetooth.requestDevice({
            filters: [{ name: 'ESP32_Sensor' }],  // Filter by your device name
            optionalServices: [serviceUUID]
        });
        const server = await device.gatt.connect();
        const service = await server.getPrimaryService(serviceUUID);
        characteristic = await service.getCharacteristic(characteristicUUID);

        // Start notifications
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
    const value = new TextDecoder().decode(event.target.value);  // Decode BLE data as string
    console.log('Received: ' + value);
    let data;
    try {
        data = JSON.parse(value);  // Parse if using JSON format
    } catch {
        data = {};  // Fallback if not JSON
    }

    // Update UI text
    document.getElementById('fsr').textContent = data.fsr || 'N/A';
    document.getElementById('accelX').textContent = data.accel?.x || 'N/A';
    document.getElementById('accelY').textContent = data.accel?.y || 'N/A';
    document.getElementById('accelZ').textContent = data.accel?.z || 'N/A';
    document.getElementById('gyroX').textContent = data.gyro?.x || 'N/A';
    document.getElementById('gyroY').textContent = data.gyro?.y || 'N/A';
    document.getElementById('gyroZ').textContent = data.gyro?.z || 'N/A';
    document.getElementById('temp').textContent = data.temp || 'N/A';

    // Update graph with latest accel data
    const timestamp = new Date().toLocaleTimeString();  // X-axis label
    accelData.x.push(data.accel?.x || 0);
    accelData.y.push(data.accel?.y || 0);
    accelData.z.push(data.accel?.z || 0);

    // Roll off old data if exceeding maxPoints
    if (accelData.x.length > maxPoints) {
        accelData.x.shift();
        accelData.y.shift();
        accelData.z.shift();
    }

    accelChart.data.labels.push(timestamp);
    if (accelChart.data.labels.length > maxPoints) accelChart.data.labels.shift();

    accelChart.data.datasets[0].data = accelData.x;
    accelChart.data.datasets[1].data = accelData.y;
    accelChart.data.datasets[2].data = accelData.z;
    accelChart.update();  // Refresh graph
}