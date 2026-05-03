const express = require('express');
const http = require('http');
const https = require('https');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.json());
app.use(express.static(path.join(__dirname)));

let users = {};
let documentContent = '';

// JDoodle Code Execution Route
app.post('/run-code', (req, res) => {
    const { code, language, versionIndex } = req.body;

    const postData = JSON.stringify({
        clientId:     "a061172ed01d8c518c0766b62b14a5a8",      // ⬅️ apna Client ID daalo
        clientSecret: "398ed76bc862a6f3b367169fbf61cc43f8ca278f129a9a2942d4d2d768204172",  // ⬅️ apna Client Secret daalo
        script:       code,
        language:     language,
        versionIndex: versionIndex
    });

    const options = {
        hostname: 'api.jdoodle.com',
        path: '/v1/execute',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const request = https.request(options, (response) => {
        let data = '';
        response.on('data', (chunk) => { data += chunk; });
        response.on('end', () => { res.json(JSON.parse(data)); });
    });

    request.on('error', (err) => {
        res.json({ output: "Error: " + err.message });
    });

    request.write(postData);
    request.end();
});

// Socket.IO
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7'];
    const userColor = colors[Math.floor(Math.random() * colors.length)];

    socket.emit('load-document', documentContent);

    socket.on('user-join', (username) => {
        users[socket.id] = { username, color: userColor };
        io.emit('update-users', Object.values(users));
        io.emit('user-notification', `${username} joined the document`);
    });

    socket.on('text-change', (data) => {
        documentContent = data.content;
        socket.broadcast.emit('receive-changes', data);
    });

    socket.on('disconnect', () => {
        if (users[socket.id]) {
            io.emit('user-notification', `${users[socket.id].username} left the document`);
            delete users[socket.id];
            io.emit('update-users', Object.values(users));
        }
        console.log('User disconnected:', socket.id);
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});