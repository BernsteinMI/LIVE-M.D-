let peer = null;
let connections = [];
let localStream = null;
let audioContext = null;
let mediaRecorder = null;
let currentRoomId = null;
let roomCodeMap = new Map(); // Maps short codes to peer IDs
let myRoomCode = null;

const talkButton = document.getElementById('talkButton');
const joinBtn = document.getElementById('joinBtn');
const createRoomBtn = document.getElementById('createRoomBtn');
const roomIdInput = document.getElementById('roomId');
const roomStatus = document.getElementById('roomStatus');
const myRoomId = document.getElementById('myRoomId');

async function initializePeer() {
    peer = new Peer();
    
    peer.on('open', (id) => {
        console.log('My peer ID is: ' + id);
        createRoomBtn.disabled = false;
    });

    peer.on('connection', handleConnection);
    peer.on('call', handleIncomingCall);

    await setupAudio();
}

async function setupAudio() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new AudioContext();
    } catch (error) {
        console.error('Error accessing microphone:', error);
    }
}

function handleConnection(conn) {
    connections.push(conn);
    updateRoomStatus(`Participant connected (${connections.length} total)`);
    conn.on('data', handleIncomingData);
    conn.on('close', () => {
        connections = connections.filter(c => c !== conn);
        updateRoomStatus(`Participant disconnected (${connections.length} remaining)`);
    });
}

async function handleIncomingCall(call) {
    call.answer(localStream);
    call.on('stream', handleRemoteStream);
}

function handleRemoteStream(stream) {
    const audio = new Audio();
    audio.srcObject = stream;
    audio.play();
}

function handleIncomingData(data) {
    console.log('Received:', data);
}

function updateRoomStatus(status) {
    roomStatus.textContent = status;
}

function generateRoomCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
}

function mapRoomCodeToPeerId(code, peerId) {
    roomCodeMap.set(code, peerId);
}

createRoomBtn.addEventListener('click', () => {
    currentRoomId = peer.id;
    myRoomCode = generateRoomCode();
    mapRoomCodeToPeerId(myRoomCode, currentRoomId);
    
    myRoomId.textContent = `Your Room Code: ${myRoomCode}`;
    updateRoomStatus('Room created and waiting for participants');
    createRoomBtn.disabled = true;
    joinBtn.disabled = true;
    roomIdInput.disabled = true;
});

joinBtn.addEventListener('click', async () => {
    const roomCode = roomIdInput.value.toUpperCase();
    if (!roomCode || roomCode.length !== 4) {
        updateRoomStatus('Please enter a valid 4-character room code');
        return;
    }

    try {
        // First try to connect using the room code as a peer ID (for backward compatibility)
        let targetPeerId = roomCodeMap.get(roomCode) || roomCode;
        const conn = peer.connect(targetPeerId);
        connections.push(conn);
        
        conn.on('open', () => {
            currentRoomId = targetPeerId;
            updateRoomStatus('Connected to room');
            createRoomBtn.disabled = true;
            joinBtn.disabled = true;
            roomIdInput.disabled = true;
        });
        
        const call = peer.call(targetPeerId, localStream);
        call.on('stream', handleRemoteStream);
    } catch (error) {
        updateRoomStatus('Failed to join room');
        console.error('Connection error:', error);
    }
});

talkButton.addEventListener('mousedown', () => {
    if (!localStream) return;
    
    talkButton.classList.add('active');
    connections.forEach(conn => {
        if (conn.open) {
            mediaRecorder = new MediaRecorder(localStream);
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    conn.send(event.data);
                }
            };
            mediaRecorder.start(100);
        }
    });
});

talkButton.addEventListener('mouseup', () => {
    talkButton.classList.remove('active');
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    }
});

// Initialize the application
createRoomBtn.disabled = true;
initializePeer();
