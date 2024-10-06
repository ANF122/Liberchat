const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Définir le dossier public pour servir les fichiers HTML, CSS, JS
app.use(express.static(path.join(__dirname, 'public')));

// Servir le fichier sitemap.xml
app.get('/sitemap.xml', (req, res) => {
    res.sendFile(path.join(__dirname, 'sitemap.xml'));
});

let activeUsers = {}; // Pour garder une trace des utilisateurs actifs
let banVotes = {}; // Pour stocker les votes de bannissement

io.on('connection', (socket) => {
    console.log('Un utilisateur est connecté');

    // Lorsqu'un nouvel utilisateur rejoint, on lui demande son nom
    socket.on('register', (username) => {
        activeUsers[socket.id] = username; // Stocke le nom d'utilisateur
        console.log(`${username} a rejoint le chat.`);
        io.emit('chat message', `${username} a rejoint le chat.`);
    });

    // Écoute les messages entrants et les redistribue
    socket.on('chat message', (msg) => {
        io.emit('chat message', msg);
    });

    

    // Lorsqu'un utilisateur se déconnecte
    socket.on('disconnect', () => {
        const username = activeUsers[socket.id];
        if (username) {
            delete activeUsers[socket.id];
            console.log(`${username} a quitté le chat.`);
            io.emit('chat message', `${username} a quitté le chat.`);
        }
    });
});

// Lancer le serveur sur le port 3000
server.listen(3000, () => {
    console.log('Serveur lancé sur le port 3000');
});
