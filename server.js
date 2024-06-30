const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
require('dotenv').config(); // Load environment variables

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const users = {};

// Connect to MongoDB Atlas
const mongoURI = process.env.MONGO_URI;
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected...'))
    .catch(err => console.log('MongoDB connection error:', err));

// Define User schema and model
const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    email: { type: String, unique: true, required: true }
});
const User = mongoose.model('User', userSchema);

// Define Message schema and model
const messageSchema = new mongoose.Schema({
    sender: { type: String, required: true },
    recipient: { type: String, required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

app.use(express.static('public'));
app.use(express.json());

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('register', (username) => {
        users[username] = socket.id;
        console.log(`User registered: ${username} with socket ID: ${socket.id}`);
    });

    socket.on('private message', async ({ recipient, message }) => {
        console.log(`Private message from ${socket.id} to ${recipient}: ${message}`);
        const recipientSocketId = users[recipient];
        const senderUsername = Object.keys(users).find(key => users[key] === socket.id);

        // Save message to the database
        const newMessage = new Message({ sender: senderUsername, recipient, message });
        await newMessage.save();

        if (recipientSocketId) {
            io.to(recipientSocketId).emit('private message', {
                message,
                sender: senderUsername
            });
        } else {
            console.log(`Recipient ${recipient} not found`);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
        for (let username in users) {
            if (users[username] === socket.id) {
                delete users[username];
                break;
            }
        }
    });
});

// Endpoint to register user
app.post('/register', async (req, res) => {
    const { username, email } = req.body;
    try {
        const userExists = await User.findOne({ username });
        const emailExists = await User.findOne({ email });
        if (userExists) {
            res.status(400).send('Username already registered. Please log in.');
        } else if (emailExists) {
            res.status(400).send('Email already registered. Please use a different email.');
        } else {
            const user = new User({ username, email });
            await user.save();
            res.status(201).send('User registered successfully');
        }
    } catch (error) {
        res.status(400).send(error.message);
    }
});

// Endpoint to login user
app.post('/login', async (req, res) => {
    const { username } = req.body;
    try {
        const user = await User.findOne({ username });
        if (user) {
            res.status(200).send('Login successful');
        } else {
            res.status(400).send('User not found');
        }
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// Endpoint to get messages
app.post('/messages', async (req, res) => {
    const { username } = req.body;
    try {
        const messages = await Message.find({
            $or: [{ sender: username }, { recipient: username }]
        }).sort({ timestamp: 1 });
        res.status(200).json(messages);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

server.listen(3000, () => {
    console.log('Listening on *:3000');
});
