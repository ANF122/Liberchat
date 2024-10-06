const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Définir le dossier public pour servir les fichiers HTML, CSS, JS
app.use(express.static(path.join(__dirname, 'public')));

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

    // Initiation d'un vote pour bannir un utilisateur
    socket.on('initiate ban vote', (userToBan) => {
        if (!banVotes[userToBan]) {
            banVotes[userToBan] = { yes: 0, no: 0, voters: new Set() };
            io.emit('chat message', `Un vote pour bannir ${userToBan} a été initié. Votez avec /ban <user>`);
        }
    });

    // Gérer le vote pour le bannissement d'un utilisateur
    socket.on('vote ban', (userToBan, vote) => {
        if (banVotes[userToBan] && !banVotes[userToBan].voters.has(activeUsers[socket.id])) {
            banVotes[userToBan].voters.add(activeUsers[socket.id]);
            if (vote === 'yes') {
                banVotes[userToBan].yes++;
            } else {
                banVotes[userToBan].no++;
            }
            io.emit('chat message', `${activeUsers[socket.id]} a voté ${vote === 'yes' ? 'oui' : 'non'} pour bannir ${userToBan}.`);

            // Vérifie si tous les utilisateurs ont voté
            if (banVotes[userToBan].voters.size === Object.keys(activeUsers).length) {
                finalizeBanVote(userToBan);
            }
        }
    });

    // Finaliser le vote de bannissement
    function finalizeBanVote(userToBan) {
        const totalVotes = banVotes[userToBan].yes + banVotes[userToBan].no;
        const yesPercentage = banVotes[userToBan].yes / totalVotes;
        
        if (yesPercentage >= 0.75) { // 75% pour le bannissement
            io.emit('chat message', `${userToBan} a été banni du chat par vote de la communauté.`);
            delete activeUsers[userToBan]; // Retire l'utilisateur des utilisateurs actifs
        } else {
            io.emit('chat message', `Le vote pour bannir ${userToBan} n'a pas atteint la majorité requise.`);
        }
        delete banVotes[userToBan]; // Supprime le vote de bannissement
    }

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

