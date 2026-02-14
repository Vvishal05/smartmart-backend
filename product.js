const express = require('express');
const db = require('./db'); // CHANGED
const router = express.Router();

router.get('/', async (req, res) => {
    const { search, category } = req.query;
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (search) {
        query += ' AND name LIKE ?';
        params.push(`%${search}%`);
    }
    if (category) {
        query += ' AND category = ?';
        params.push(category);
    }

    try {
        const [products] = await db.query(query, params);
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    const { name, description, price, image, category, stock } = req.body;
    try {
        await db.query('INSERT INTO products (name, description, price, image, category, stock) VALUES (?, ?, ?, ?, ?, ?)', 
        [name, description, price, image, category, stock]);
        res.status(201).json({ message: 'Product added' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM products WHERE id = ?', [req.params.id]);
        res.json({ message: 'Product deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;