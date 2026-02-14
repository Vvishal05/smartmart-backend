const express = require('express');
const db = require('./db'); // CHANGED
const jwt = require('jsonwebtoken');
const router = express.Router();

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ message: 'No token provided' });
    
    jwt.verify(token.split(' ')[1], process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ message: 'Unauthorized' });
        req.userId = decoded.id;
        next();
    });
};

router.get('/', verifyToken, async (req, res) => {
    try {
        const query = `
            SELECT c.id, c.quantity, p.name, p.price, p.image, p.id as product_id
            FROM cart c 
            JOIN products p ON c.product_id = p.id 
            WHERE c.user_id = ?`;
        const [cartItems] = await db.query(query, [req.userId]);
        res.json(cartItems);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', verifyToken, async (req, res) => {
    const { productId, quantity } = req.body;
    try {
        const [existing] = await db.query('SELECT * FROM cart WHERE user_id = ? AND product_id = ?', [req.userId, productId]);
        if (existing.length > 0) {
            await db.query('UPDATE cart SET quantity = quantity + ? WHERE id = ?', [quantity, existing[0].id]);
        } else {
            await db.query('INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)', [req.userId, productId, quantity]);
        }
        res.json({ message: 'Added to cart' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', verifyToken, async (req, res) => {
    try {
        await db.query('DELETE FROM cart WHERE id = ?', [req.params.id]);
        res.json({ message: 'Item removed' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;