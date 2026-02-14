const express = require('express');
const db = require('./db'); // CHANGED
const jwt = require('jsonwebtoken');
const router = express.Router();

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).send('Token required');
    jwt.verify(token.split(' ')[1], process.env.JWT_SECRET, (err, decoded) => {
        if(err) return res.status(401).send('Invalid Token');
        req.user = decoded;
        next();
    });
};

router.post('/', verifyToken, async (req, res) => {
    const userId = req.user.id;
    const { totalAmount, items } = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [orderResult] = await connection.query(
            'INSERT INTO orders (user_id, total_amount, payment_status, order_status) VALUES (?, ?, ?, ?)',
            [userId, totalAmount, 'Paid', 'Ordered']
        );
        const orderId = orderResult.insertId;
        for (const item of items) {
            await connection.query(
                'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                [orderId, item.product_id, item.quantity, item.price]
            );
            await connection.query(
                'UPDATE products SET stock = stock - ? WHERE id = ?',
                [item.quantity, item.product_id]
            );
        }
        await connection.query('DELETE FROM cart WHERE user_id = ?', [userId]);
        await connection.commit();
        res.status(201).json({ message: 'Order placed successfully', orderId });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

router.get('/my-orders', verifyToken, async (req, res) => {
    try {
        const [orders] = await db.query('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/admin/all', verifyToken, async (req, res) => {
    if(req.user.role !== 'admin') return res.status(403).send('Access denied');
    try {
        const [orders] = await db.query(`
            SELECT orders.*, users.name as user_name 
            FROM orders 
            JOIN users ON orders.user_id = users.id 
            ORDER BY created_at DESC`);
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/admin/:id', verifyToken, async (req, res) => {
    if(req.user.role !== 'admin') return res.status(403).send('Access denied');
    const { status } = req.body;
    try {
        await db.query('UPDATE orders SET order_status = ? WHERE id = ?', [status, req.params.id]);
        res.json({ message: 'Order status updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;