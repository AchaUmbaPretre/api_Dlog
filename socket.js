const http = require('http');
const { Server } = require('socket.io');

// Serveur Socket.IO
const socketServer = http.createServer();
const io = new Server(socketServer, {
    cors: {
        origin: "*", // Permet toutes les origines (ajuste selon tes besoins)
        methods: ["GET", "POST"]
    }
});

socketServer.listen(8070, () => {
    console.log('Serveur Socket.IO écoute sur le port 8070');
});

let onlineUsers = new Map();  // Map pour suivre les utilisateurs connectés
let adminSocketId = 3;    // Variable pour stocker le socket.id de l'administrateur

// Gestion des connexions des utilisateurs
io.on('connection', (socket) => {
    console.log('Un utilisateur est connecté avec socket.id:', socket.id);

    // Lorsqu'un utilisateur s'enregistre avec son ID
    socket.on('register', (userId) => {
        console.log(`Utilisateur avec ID ${userId} est enregistré`);
        
        // Enregistrer l'utilisateur comme en ligne
        onlineUsers.set(userId, socket.id); 

        // Si l'utilisateur est un administrateur, stocker son socket.id
        if (userId === 3) {  // Remplace par l'ID de ton administrateur
            adminSocketId = socket.id;
            console.log('L\'administrateur est connecté');
        }
    });

    socket.on('disconnect', () => {
        console.log('Un utilisateur s\'est déconnecté');
        onlineUsers.forEach((value, key) => {
            if (value === socket.id) {
                onlineUsers.delete(key);  // Supprimer l'utilisateur de la liste
            }
        });

        // Si l'administrateur se déconnecte, réinitialiser adminSocketId
        if (socket.id === adminSocketId) {
            adminSocketId = null;
            console.log('L\'administrateur s\'est déconnecté');
        }
    });
});

// Fonction pour obtenir l'objet io
function getSocketIO() {
    return io;
}

// Fonction pour envoyer une notification à l'administrateur
function notifyAdmin(taskDetails) {
    if (adminSocketId) {
        const message = `Un utilisateur a ajouté une tâche : ${taskDetails.nom_tache}`;
        const io = getSocketIO();
        io.to(adminSocketId).emit('notification', { message: message, taskId: taskDetails.id_tache, id_notif: taskDetails.id_notif });
        console.log('Notification envoyée à l\'administrateur');
    }
}

// Exporter la fonction et la map
module.exports = { getSocketIO, onlineUsers, notifyAdmin };
