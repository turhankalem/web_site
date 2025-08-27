const express = require('express');
const cors = require('cors');
const fs = require('fs');
const chokidar = require('chokidar');
const http = require('http');
const { Server } = require('socket.io');
const fetch = require('node-fetch');
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:3000", "https://inspiring-granita-dc6afc.netlify.app"],
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 5000;

app.use(cors({
    origin: ["http://localhost:3000", "https://inspiring-granita-dc6afc.netlify.app"]
}));
app.use(express.json());

// Text dosyası yolu
const TEXT_FILE_PATH = '../text-file/data.txt';
let textContent = "Dosya yükleniyor...";

// Text dosyasını oku
function readTextFile() {
    try {
        textContent = fs.readFileSync(TEXT_FILE_PATH, 'utf8');
        console.log('Text dosyası okundu');
        return textContent;
    } catch (error) {
        textContent = 'Dosya bulunamadı: ' + error.message;
        console.log('Dosya okuma hatası:', error.message);
        return textContent;
    }
}

// İlk başta dosyayı oku
readTextFile();

// Text dosyasını takip et - WebSocket ile bildirim gönder
chokidar.watch(TEXT_FILE_PATH).on('change', () => {
    console.log('Text dosyası güncellendi! WebSocket ile bildirim gönderiliyor...');
    const newContent = readTextFile();
    
    // Tüm bağlı kullanıcılara yeni veriyi gönder
    io.emit('dataUpdated', {
        content: newContent,
        lastUpdated: new Date().toISOString()
    });
});

// Socket.IO bağlantıları
io.on('connection', (socket) => {
    console.log('Kullanıcı bağlandı:', socket.id);
    
    // Yeni bağlanan kullanıcıya mevcut veriyi gönder
    socket.emit('dataUpdated', {
        content: textContent,
        lastUpdated: new Date().toISOString()
    });
    
    socket.on('disconnect', () => {
        console.log('Kullanıcı ayrıldı:', socket.id);
    });
});

// API endpoint - text verisini döndür (eski yöntem de çalışsın)
app.get('/api/data', (req, res) => {
    res.json({ 
        content: textContent, 
        lastUpdated: new Date().toISOString() 
    });
});

// Test endpoint
app.get('/', (req, res) => {
    res.json({ message: "Backend WebSocket ile çalışıyor!" });
});
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'alive', timestamp: new Date() });
});

server.listen(PORT, () => {
    console.log(`Server http://localhost:${PORT} adresinde WebSocket ile çalışıyor`);
	
    const RENDER_URL = process.env.RENDER_EXTERNAL_URL || 'https://website-backend-mi4i.onrender.com';
    
    setInterval(() => {
        console.log('Pinging self to stay alive...');
        fetch(`${RENDER_URL}/health`)
            .catch(err => console.log('Ping error:', err));
    }, 14 * 60 * 1000);
});