/* =====================================================
   VARIABLES
===================================================== */

let usbDevice = null;

let cameraStream = null;

let cameraTrack = null;

let lastPhotoBlob = null;

let loggingEnabled = false;

let logHistory = [];

const logElement =
    document.getElementById("log");


/* =====================================================
   LOG
===================================================== */

function log(
    message,
    force = false
) {

    if (
        !loggingEnabled &&
        !force
    ) {
        return;
    }

    const time =
        new Date()
        .toLocaleTimeString();

    const line =
        `[${time}] ${message}`;

    logHistory.push(line);

    logElement.textContent +=
        line + "\n";

    logElement.scrollTop =
        logElement.scrollHeight;
}


function startLogging() {

    loggingEnabled = true;

    document.getElementById(
        "loggingStatus"
    ).innerHTML =
        '<span class="good">● Log activo</span>';

    log(
        "==============================",
        true
    );

    log(
        "USB LAB PRO - LOG INICIADO",
        true
    );

    log(
        new Date()
        .toLocaleString(),
        true
    );

    log(
        "WebUSB: " +
        (
            navigator.usb
            ? "Disponible"
            : "NO disponible"
        ),
        true
    );

    log(
        "Camera API: " +
        (
            navigator.mediaDevices
            ? "Disponible"
            : "NO disponible"
        ),
        true
    );

    log(
        "==============================",
        true
    );
}


function stopLogging() {

    if (!loggingEnabled) {
        return;
    }

    log(
        "=============================="
    );

    log(
        "LOG TERMINADO"
    );

    log(
        new Date()
        .toLocaleString()
    );

    loggingEnabled = false;

    document.getElementById(
        "loggingStatus"
    ).innerHTML =
        '<span class="bad">● Log detenido</span>';
}


function clearLog() {

    logHistory = [];

    logElement.textContent = "";
}


async function copyLog() {

    try {

        await navigator.clipboard
            .writeText(
                logHistory.join("\n")
            );

    } catch(error) {

        alert(
            "No se pudo copiar el log."
        );
    }
}


function downloadLog() {

    const blob =
        new Blob(
            [
                logHistory.join("\n")
            ],
            {
                type:
                    "text/plain;charset=utf-8"
            }
        );

    const url =
        URL.createObjectURL(blob);

    const a =
        document.createElement("a");

    a.href = url;

    a.download =
        "USB-Lab-Log.txt";

    a.click();

    URL.revokeObjectURL(url);
}


/* =====================================================
   UTILIDADES
===================================================== */

function hex16(value) {

    return "0x" +
        Number(value)
        .toString(16)
        .padStart(4, "0")
        .toUpperCase();
}


function bytesToHex(bytes) {

    return Array.from(bytes)
        .map(
            byte =>
                byte
                .toString(16)
                .padStart(2, "0")
                .toUpperCase()
        )
        .join(" ");
}


function hexToBytes(input) {

    let clean =
        input
        .replace(/0x/gi, "")
        .replace(
            /[^0-9A-Fa-f]/g,
            ""
        );

    if (
        clean.length % 2
    ) {

        clean =
            "0" + clean;
    }

    const bytes =
        new Uint8Array(
            clean.length / 2
        );

    for (
        let i = 0;
        i < bytes.length;
        i++
    ) {

        bytes[i] =
            parseInt(
                clean.substring(
                    i * 2,
                    i * 2 + 2
                ),
                16
            );
    }

    return bytes;
}


function decodeText(bytes) {

    try {

        return new TextDecoder()
            .decode(bytes);

    } catch {

        return "";
    }
}


function requireUSB() {

    if (
        !usbDevice ||
        !usbDevice.opened
    ) {

        alert(
            "Conecta un dispositivo USB primero."
        );

        return false;
    }

    return true;
}


/* =====================================================
   USB CONNECT
===================================================== */

async function connectUSB() {

    if (!navigator.usb) {

        alert(
            "WebUSB no está disponible."
        );

        return;
    }

    try {

usbDevice = await navigator.usb.requestDevice({
    filters: [{}]
});

        await usbDevice.open();

        if (
            !usbDevice.configuration &&
            usbDevice.configurations.length
        ) {

            await usbDevice
                .selectConfiguration(
                    usbDevice
                    .configurations[0]
                    .configurationValue
                );
        }

        updateUSBInfo();

        document.getElementById(
            "globalStatus"
        ).innerHTML =
            '<span class="good">● USB conectado</span>';

        log(
            "USB conectado: " +
            (
                usbDevice.productName ||
                "USB"
            )
        );

        detectPossibleCameraUSB();

    } catch(error) {

        log(
            "USB ERROR: " +
            error.message,
            true
        );
    }
}


async function connectRememberedUSB() {

    try {

        const devices =
            await navigator.usb
            .getDevices();

        if (!devices.length) {

            alert(
                "No hay dispositivos autorizados."
            );

            return;
        }

        usbDevice =
            devices[0];

        await usbDevice.open();

        if (
            !usbDevice.configuration &&
            usbDevice.configurations.length
        ) {

            await usbDevice
                .selectConfiguration(
                    usbDevice
                    .configurations[0]
                    .configurationValue
                );
        }

        updateUSBInfo();

        document.getElementById(
            "globalStatus"
        ).innerHTML =
            '<span class="good">● USB conectado</span>';

        log(
            "USB autorizado reconectado"
        );

    } catch(error) {

        log(
            error.message,
            true
        );
    }
}


async function disconnectUSB() {

    if (!usbDevice) {
        return;
    }

    try {

        if (usbDevice.opened) {

            await usbDevice.close();
        }

    } catch(error) {

        log(
            error.message,
            true
        );
    }

    usbDevice = null;

    document.getElementById(
        "globalStatus"
    ).innerHTML =
        '<span class="bad">● Sin dispositivo USB</span>';

    document.getElementById(
        "deviceInfo"
    ).textContent =
        "No hay dispositivo.";
}


/* =====================================================
   USB INFO
===================================================== */

function updateUSBInfo() {

    if (!usbDevice) {
        return;
    }

    let text = "";

    text +=
        "Producto: " +
        (
            usbDevice.productName ||
            "N/A"
        ) +
        "\n";

    text +=
        "Fabricante: " +
        (
            usbDevice.manufacturerName ||
            "N/A"
        ) +
        "\n";

    text +=
        "Serial: " +
        (
            usbDevice.serialNumber ||
            "N/A"
        ) +
        "\n\n";

    text +=
        "VID: " +
        hex16(
            usbDevice.vendorId
        ) +
        "\n";

    text +=
        "PID: " +
        hex16(
            usbDevice.productId
        ) +
        "\n";

    text +=
        "Clase: " +
        usbDevice.deviceClass +
        "\n";

    text +=
        "Subclase: " +
        usbDevice.deviceSubclass +
        "\n";

    text +=
        "Protocolo: " +
        usbDevice.deviceProtocol +
        "\n";

    text +=
        "Configuraciones: " +
        usbDevice.configurations.length +
        "\n";

    if (
        usbDevice.configuration
    ) {

        text +=
            "Configuración activa: " +
            usbDevice
                .configuration
                .configurationValue;
    }

    document.getElementById(
        "deviceInfo"
    ).textContent =
        text;
}


async function listAuthorizedUSB() {

    const devices =
        await navigator.usb
        .getDevices();

    if (!devices.length) {

        log(
            "No hay dispositivos USB autorizados",
            true
        );

        return;
    }

    devices.forEach(
        (device,index) => {

            log(
                `${index + 1}. ` +
                `${device.productName || "USB"} ` +
                `${hex16(device.vendorId)} ` +
                `${hex16(device.productId)}`,
                true
            );
        }
    );
}


/* =====================================================
   CONFIG
===================================================== */

async function selectConfiguration() {

    if (!requireUSB()) {
        return;
    }

    const value =
        Number(
            document.getElementById(
                "configurationValue"
            ).value
        );

    try {

        await usbDevice
            .selectConfiguration(
                value
            );

        log(
            "Configuración seleccionada: " +
            value
        );

        updateUSBInfo();

    } catch(error) {

        log(
            error.message,
            true
        );
    }
}


async function claimInterface() {

    if (!requireUSB()) {
        return;
    }

    const n =
        Number(
            document.getElementById(
                "interfaceNumber"
            ).value
        );

    try {

        await usbDevice
            .claimInterface(n);

        log(
            "Interface reclamada: " +
            n
        );

    } catch(error) {

        log(
            error.message,
            true
        );
    }
}


async function releaseInterface() {

    if (!requireUSB()) {
        return;
    }

    const n =
        Number(
            document.getElementById(
                "interfaceNumber"
            ).value
        );

    try {

        await usbDevice
            .releaseInterface(n);

        log(
            "Interface liberada: " +
            n
        );

    } catch(error) {

        log(
            error.message,
            true
        );
    }
}


async function selectAlternateInterface() {

    if (!requireUSB()) {
        return;
    }

    const iface =
        Number(
            document.getElementById(
                "interfaceNumber"
            ).value
        );

    const alt =
        Number(
            document.getElementById(
                "alternateSetting"
            ).value
        );

    try {

        await usbDevice
            .selectAlternateInterface(
                iface,
                alt
            );

        log(
            `Interface ${iface}, alternate ${alt}`
        );

    } catch(error) {

        log(
            error.message,
            true
        );
    }
}


/* =====================================================
   SCAN USB
===================================================== */

function scanUSB() {

    if (!requireUSB()) {
        return;
    }

    const config =
        usbDevice.configuration;

    if (!config) {
        return;
    }

    let text = "";

    text +=
        `CONFIGURACIÓN ${config.configurationValue}\n\n`;

    for (
        const iface
        of config.interfaces
    ) {

        text +=
            "============================\n";

        text +=
            `INTERFACE ${iface.interfaceNumber}\n`;

        for (
            const alt
            of iface.alternates
        ) {

            text +=
                `Alternate: ${alt.alternateSetting}\n`;

            text +=
                `Clase: ${alt.interfaceClass}\n`;

            text +=
                `Subclase: ${alt.interfaceSubclass}\n`;

            text +=
                `Protocolo: ${alt.interfaceProtocol}\n`;

            if (
                alt.interfaceClass === 14
            ) {

                text +=
                    "📷 Posible dispositivo de vídeo\n";
            }

            for (
                const ep
                of alt.endpoints
            ) {

                text +=
                    `\nEndpoint ${ep.endpointNumber}\n`;

                text +=
                    `Dirección: ${ep.direction}\n`;

                text +=
                    `Tipo: ${ep.type}\n`;

                text +=
                    `Packet: ${ep.packetSize}\n`;
            }

            text += "\n";
        }
    }

    document.getElementById(
        "interfaceInfo"
    ).textContent =
        text;

    log(
        "USB analizado"
    );
}


/* =====================================================
   USB TRANSFER
===================================================== */

async function usbTransferOut() {

    if (!requireUSB()) {
        return;
    }

    const endpoint =
        Number(
            document.getElementById(
                "outEndpoint"
            ).value
        );

    const mode =
        document.getElementById(
            "outMode"
        ).value;

    const input =
        document.getElementById(
            "outData"
        ).value;

    const data =
        mode === "hex"
        ? hexToBytes(input)
        : new TextEncoder()
            .encode(input);

    try {

        const result =
            await usbDevice
            .transferOut(
                endpoint,
                data
            );

        log(
            `OUT EP${endpoint}: ` +
            `${result.bytesWritten} bytes`
        );

    } catch(error) {

        log(
            "OUT ERROR: " +
            error.message,
            true
        );
    }
}


async function usbTransferIn() {

    if (!requireUSB()) {
        return;
    }

    const endpoint =
        Number(
            document.getElementById(
                "inEndpoint"
            ).value
        );

    const length =
        Number(
            document.getElementById(
                "inLength"
            ).value
        );

    try {

        const result =
            await usbDevice
            .transferIn(
                endpoint,
                length
            );

        const bytes =
            new Uint8Array(
                result.data.buffer
            );

        document.getElementById(
            "inResult"
        ).textContent =
`Status: ${result.status}

HEX:
${bytesToHex(bytes)}

Texto:
${decodeText(bytes)}`;

        log(
            `IN EP${endpoint}: ${bytes.length} bytes`
        );

    } catch(error) {

        log(
            "IN ERROR: " +
            error.message,
            true
        );
    }
}


/* =====================================================
   CONTROL
===================================================== */

async function controlOut() {

    if (!requireUSB()) {
        return;
    }

    const setup = {

        requestType:
            document.getElementById(
                "controlOutRequestType"
            ).value,

        recipient:
            document.getElementById(
                "controlOutRecipient"
            ).value,

        request:
            Number(
                document.getElementById(
                    "controlOutRequest"
                ).value
            ),

        value:
            Number(
                document.getElementById(
                    "controlOutValue"
                ).value
            ),

        index:
            Number(
                document.getElementById(
                    "controlOutIndex"
                ).value
            )
    };

    const data =
        hexToBytes(
            document.getElementById(
                "controlOutData"
            ).value
        );

    try {

        const result =
            await usbDevice
            .controlTransferOut(
                setup,
                data
            );

        log(
            `Control OUT: ${result.status}`
        );

    } catch(error) {

        log(
            error.message,
            true
        );
    }
}


async function controlIn() {

    if (!requireUSB()) {
        return;
    }

    const setup = {

        requestType:
            document.getElementById(
                "controlInRequestType"
            ).value,

        recipient:
            document.getElementById(
                "controlInRecipient"
            ).value,

        request:
            Number(
                document.getElementById(
                    "controlInRequest"
                ).value
            ),

        value:
            Number(
                document.getElementById(
                    "controlInValue"
                ).value
            ),

        index:
            Number(
                document.getElementById(
                    "controlInIndex"
                ).value
            )
    };

    const length =
        Number(
            document.getElementById(
                "controlInLength"
            ).value
        );

    try {

        const result =
            await usbDevice
            .controlTransferIn(
                setup,
                length
            );

        const bytes =
            new Uint8Array(
                result.data.buffer
            );

        document.getElementById(
            "controlInResult"
        ).textContent =
`Status: ${result.status}

HEX:
${bytesToHex(bytes)}

Texto:
${decodeText(bytes)}`;

        log(
            `Control IN: ${bytes.length} bytes`
        );

    } catch(error) {

        log(
            error.message,
            true
        );
    }
}


/* =====================================================
   RESET
===================================================== */

async function resetUSB() {

    if (!requireUSB()) {
        return;
    }

    if (
        !confirm(
            "¿Resetear el dispositivo USB?"
        )
    ) {
        return;
    }

    try {

        await usbDevice.reset();

        log(
            "USB RESET"
        );

    } catch(error) {

        log(
            error.message,
            true
        );
    }
}


async function clearUSBHalt() {

    if (!requireUSB()) {
        return;
    }

    const direction =
        prompt(
            "Dirección: in o out",
            "in"
        );

    if (
        direction !== "in" &&
        direction !== "out"
    ) {
        return;
    }

    const endpoint =
        Number(
            prompt(
                "Endpoint:",
                "1"
            )
        );

    try {

        await usbDevice
            .clearHalt(
                direction,
                endpoint
            );

        log(
            `Clear Halt ${direction} EP${endpoint}`
        );

    } catch(error) {

        log(
            error.message,
            true
        );
    }
}


/* =====================================================
   DETECT CAMERA USB
===================================================== */

function detectPossibleCameraUSB() {

    if (
        !usbDevice ||
        !usbDevice.configuration
    ) {
        return;
    }

    let found = false;

    for (
        const iface
        of usbDevice
            .configuration
            .interfaces
    ) {

        for (
            const alt
            of iface.alternates
        ) {

            if (
                alt.interfaceClass === 14
            ) {

                found = true;
            }
        }
    }

    if (found) {

        log(
            "📷 Posible cámara USB detectada",
            true
        );

        document.getElementById(
            "cameraPanel"
        ).scrollIntoView({
            behavior:
                "smooth"
        });

        refreshCameras();
    }
}


/* =====================================================
   CAMERAS
===================================================== */

async function refreshCameras() {

    if (
        !navigator.mediaDevices
    ) {

        alert(
            "La API de cámara no está disponible."
        );

        return;
    }

    try {

        const permission =
            await navigator.mediaDevices
            .getUserMedia({
                video: true,
                audio: false
            });

        permission
            .getTracks()
            .forEach(
                track =>
                    track.stop()
            );

        const devices =
            await navigator.mediaDevices
            .enumerateDevices();

        const cameras =
            devices.filter(
                device =>
                    device.kind ===
                    "videoinput"
            );

        const select =
            document.getElementById(
                "cameraSelect"
            );

        select.innerHTML =
            '<option value="">Selecciona una cámara</option>';

        cameras.forEach(
            (camera,index) => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    camera.deviceId;

                option.textContent =
                    camera.label ||
                    `Cámara ${index + 1}`;

                select.appendChild(
                    option
                );
            }
        );

        log(
            `${cameras.length} cámara(s) encontrada(s)`
        );

    } catch(error) {

        log(
            "CAM ERROR: " +
            error.message,
            true
        );
    }
}


async function startCamera() {

    stopCamera();

    const id =
        document.getElementById(
            "cameraSelect"
        ).value;

    try {

        cameraStream =
            await navigator.mediaDevices
            .getUserMedia({

                audio: false,

                video:
                    id
                    ? {
                        deviceId: {
                            exact: id
                        },

                        width: {
                            ideal: 1920
                        },

                        height: {
                            ideal: 1080
                        }
                    }
                    : true
            });

        const video =
            document.getElementById(
                "cameraPreview"
            );

        video.srcObject =
            cameraStream;

        cameraTrack =
            cameraStream
            .getVideoTracks()[0];

        showCameraSettings();

        log(
            "Cámara iniciada: " +
            cameraTrack.label
        );

    } catch(error) {

        log(
            "CAM ERROR: " +
            error.message,
            true
        );
    }
}


function stopCamera() {

    if (cameraStream) {

        cameraStream
            .getTracks()
            .forEach(
                track =>
                    track.stop()
            );
    }

    cameraStream = null;

    cameraTrack = null;

    document.getElementById(
        "cameraPreview"
    ).srcObject =
        null;
}


/* =====================================================
   CIRCUIT CAMERA
===================================================== */

async function circuitCameraMode() {

    log(
        "🧪 Modo circuito con cámara",
        true
    );

    await refreshCameras();

    document.getElementById(
        "cameraPanel"
    ).scrollIntoView({
        behavior:
            "smooth"
    });
}


/* =====================================================
   CAMERA DETAILS
===================================================== */

function showCameraCapabilities() {

    if (!cameraTrack) {

        alert(
            "Primero inicia una cámara."
        );

        return;
    }

    const capabilities =
        cameraTrack
            .getCapabilities?.() ||
        {};

    document.getElementById(
        "cameraCapabilities"
    ).textContent =
        JSON.stringify(
            capabilities,
            null,
            2
        );
}


function showCameraSettings() {

    if (!cameraTrack) {
        return;
    }

    const settings =
        cameraTrack
        .getSettings();

    document.getElementById(
        "cameraInfo"
    ).textContent =
`CÁMARA ACTIVA

Nombre:
${cameraTrack.label}

Resolución:
${settings.width || "?"} x ${settings.height || "?"}

FPS:
${settings.frameRate || "?"}

Aspect Ratio:
${settings.aspectRatio || "?"}

Facing:
${settings.facingMode || "?"}`;
}


/* =====================================================
   PHOTO
===================================================== */

function takePhoto() {

    const video =
        document.getElementById(
            "cameraPreview"
        );

    if (!video.videoWidth) {

        alert(
            "La cámara aún no tiene imagen."
        );

        return;
    }

    const canvas =
        document.getElementById(
            "cameraCanvas"
        );

    canvas.width =
        video.videoWidth;

    canvas.height =
        video.videoHeight;

    const context =
        canvas.getContext(
            "2d"
        );

    context.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
    );

    canvas.style.display =
        "block";

    canvas.toBlob(
        blob => {

            lastPhotoBlob =
                blob;
        },

        "image/png"
    );

    log(
        "📸 Foto capturada"
    );
}


function downloadPhoto() {

    if (!lastPhotoBlob) {

        alert(
            "Primero toma una captura."
        );

        return;
    }

    const url =
        URL.createObjectURL(
            lastPhotoBlob
        );

    const a =
        document.createElement("a");

    a.href =
        url;

    a.download =
        "captura.png";

    a.click();

    URL.revokeObjectURL(url);
}


function cameraFullscreen() {

    const video =
        document.getElementById(
            "cameraPreview"
        );

    video.requestFullscreen?.();
}


/* =====================================================
   EVENTS
===================================================== */

navigator.usb
?.addEventListener(
    "connect",
    event => {

        log(
            "USB conectado: " +
            (
                event.device.productName ||
                "USB"
            ),
            true
        );
    }
);


navigator.usb
?.addEventListener(
    "disconnect",
    event => {

        log(
            "USB desconectado: " +
            (
                event.device.productName ||
                "USB"
            ),
            true
        );

        if (
            usbDevice ===
            event.device
        ) {

            usbDevice = null;

            document.getElementById(
                "globalStatus"
            ).innerHTML =
                '<span class="bad">● USB desconectado</span>';
        }
    }
);


navigator.mediaDevices
?.addEventListener(
    "devicechange",
    () => {

        log(
            "Cambió la lista de cámaras/dispositivos multimedia"
        );
    }
);


/* =====================================================
   STARTUP CHECK
===================================================== */

if (!navigator.usb) {

    log(
        "⚠ WebUSB no disponible",
        true
    );
}


if (!navigator.mediaDevices) {

    log(
        "⚠ API de cámara no disponible",
        true
    );
}
