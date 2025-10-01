// Import required modules
const express = require('express');
const amqp = require('amqplib/callback_api');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Get environment variables
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const PORT = process.env.PORT || 3000;

let connection, channel;

// Connect to RabbitMQ
function connectRabbitMQ() {
    amqp.connect(RABBITMQ_URL, (err, conn) => {
        if (err) {
            console.error('Error connecting to RabbitMQ:', err);
            return;
        }
        connection = conn;
        conn.createChannel((err, ch) => {
            if (err) {
                console.error('Error creating channel:', err);
                conn.close();
                return;
            }
            channel = ch;
            const queue = 'orders'; // Match Lab 3 queue name
            channel.assertQueue(queue, { durable: false });
            console.log('Connected to RabbitMQ, queue:', queue);
        });
    });
}

connectRabbitMQ();

// POST /orders endpoint
app.post('/orders', (req, res) => {
    const order = req.body;
    if (!channel) {
        return res.status(500).json({ error: 'RabbitMQ channel not available' });
    }
    try {
        const queue = 'orders';
        const msg = JSON.stringify(order);
        channel.sendToQueue(queue, Buffer.from(msg));
        console.log('Sent order to queue:', msg);
        res.json({ message: 'Order placed', order });
    } catch (error) {
        console.error('Error sending to queue:', error);
        res.status(500).json({ error: 'Failed to place order' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'order-service' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Order service running on http://localhost:${PORT}`);
});

// Cleanup on process exit
process.on('SIGTERM', () => {
    if (connection) connection.close();
    process.exit(0);
});
