let peer = null;
let connections = [];
let localStream = null;
let audioContext = null;
let mediaRecorder = null;
let currentRoomId = null;

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

createRoomBtn.addEventListener('click', () => {
    currentRoomId = peer.id;
    myRoomId.textContent = `Your Room ID: ${currentRoomId}`;
    updateRoomStatus('Room created and waiting for participants');
    createRoomBtn.disabled = true;
    joinBtn.disabled = true;
    roomIdInput.disabled = true;
});

joinBtn.addEventListener('click', async () => {
    const roomId = roomIdInput.value;
    if (!roomId) return;

    try {
        const conn = peer.connect(roomId);
        connections.push(conn);
        
        conn.on('open', () => {
            currentRoomId = roomId;
            updateRoomStatus('Connected to room');
            createRoomBtn.disabled = true;
            joinBtn.disabled = true;
            roomIdInput.disabled = true;
        });
        
        const call = peer.call(roomId, localStream);
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
