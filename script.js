// script.js
const serviceUUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const characteristicUUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';

let device;
let characteristic;
let isConnected = false;

// Chart configs
const maxPoints = 50;  // Increased for smoother trends with 100ms updates
let accelData = { x: [], y: [], z: [] };
let gyroData = { x: [], y: [], z: [] };
let fsrData = [];
let tempData = [];
let accelChart, gyroChart, fsrChart, tempChart;

// Initialize charts
function initCharts() {
    // Accel Chart
    const accelCtx = document.getElementById('accelChart').getContext('2d');
    accelChart = new Chart(accelCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                { label: 'Accel X', data: accelData.x, borderColor: '#FF6384', fill: false, tension: 0.1 },
                { label: 'Accel Y', data: accelData.y, borderColor: '#36A2EB', fill: false, tension: 0.1 },
                { label: 'Accel Z', data: accelData.z, borderColor: '#FFCE56', fill: false, tension: 0.1 }
            ]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: false } },
            animation: { duration: 0 }  // Fast updates, no animation lag
        }
    });

    // Gyro Chart
    const gyroCtx = document.getElementById('gyroChart').getContext('2d');
    gyroChart = new Chart(gyroCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                { label: 'Gyro X', data: gyroData.x, borderColor: '#4BC0C0', fill: false, tension: 0.1 },
                { label: 'Gyro Y', data: gyroData.y, borderColor: '#9966FF', fill: false, tension: 0.1 },
                { label: 'Gyro Z', data: gyroData.z, borderColor: '#FF9F40', fill: false, tension: 0.1 }
            ]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: false } },
            animation: { duration: 0 }
        }
    });

    // FSR Chart (Line for pressure trends)
    const fsrCtx = document.getElementById('fsrChart').getContext('2d');
    fsrChart = new Chart(fsrCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                { label: 'FSR Pressure', data: fsrData, borderColor: '#E74C3C', fill: false, tension: 0.1 }
            ]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true, max: 4095 } },
            animation: { duration: 0 }
        }
    });

    // Temp Chart (Bar gauge style)
    const tempCtx = document.getElementById('tempChart').getContext('2d');
    tempChart = new Chart(tempCtx, {
        type: 'bar',
        data: {
            labels: ['Temperature (°C)'],
            datasets: [
                { label: 'Temp', data: tempData, backgroundColor: '#3498DB' }
            ]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true, suggestedMax: 50 } },  // Adjust max based on expected temp
            animation: { duration: 0 }
        }
    });
}

initCharts();  // Call on load

// Connect button
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
        document.getElementById('disconnectBtn').disabled = false;
        isConnected = true;
    } catch (error) {
        console.error(error);
        document.getElementById('status').textContent = 'Status: Error - ' + error.message;
    }
});

// Disconnect button
document.getElementById('disconnectBtn').addEventListener('click', async () => {
    if (device && device.gatt.connected) {
        device.gatt.disconnect();
    }
    document.getElementById('status').textContent = 'Status: Disconnected';
    document.getElementById('connectBtn').disabled = false;
    document.getElementById('disconnectBtn').disabled = true;
    isConnected = false;
});

// Reset charts button
document.getElementById('resetChartsBtn').addEventListener('click', () => {
    // Clear data arrays
    accelData = { x: [], y: [], z: [] };
    gyroData = { x: [], y: [], z: [] };
    fsrData = [];
    tempData = [];

    // Update all charts
    [accelChart, gyroChart, fsrChart, tempChart].forEach(chart => {
        chart.data.labels = [];
        chart.data.datasets.forEach(dataset => dataset.data = []);
        chart.update();
    });
});

function handleData(event) {
    if (!isConnected) return;  // Prevent updates if disconnected

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

    // Update charts with new data (fast, no animation)
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

    // Temp (update bar with latest)
    tempData = [data.temp || 0];
    tempChart.data.datasets[0].data = tempData;
    tempChart.update();
}
