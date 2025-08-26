const express = require('express');
const cors = require('cors');
const fs = require('fs');
const chokidar = require('chokidar');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

const PORT = 5000;

app.use(cors());
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

server.listen(PORT, () => {
    console.log(`Server http://localhost:${PORT} adresinde WebSocket ile çalışıyor`);
});