const express = require('express');
const router = express.Router();
const { PaymentLink } = require('../models');

// Get all payment links
router.get('/', async (req, res) => {
  try {
    const paymentLinks = await PaymentLink.findAll({
      order: [['createdAt', 'DESC']],
    });
    res.json(paymentLinks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get active payment links
router.get('/active', async (req, res) => {
  try {
    const paymentLinks = await PaymentLink.findAll({
      where: { isActive: true },
      order: [['createdAt', 'DESC']],
    });
    res.json(paymentLinks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create payment link
router.post('/', async (req, res) => {
  try {
    const { name, url } = req.body;
    
    if (!name || !url) {
      return res.status(400).json({ error: 'Name and URL are required' });
    }

    const paymentLink = await PaymentLink.create({ 
      name: name.trim(), 
      url: url.trim() 
    });
    
    res.status(201).json(paymentLink);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update payment link
router.put('/:id', async (req, res) => {
  try {
    const { name, url, isActive } = req.body;
    const paymentLink = await PaymentLink.findByPk(req.params.id);
    
    if (!paymentLink) {
      return res.status(404).json({ error: 'Payment link not found' });
    }

    await paymentLink.update({ 
      name: name?.trim(), 
      url: url?.trim(), 
      isActive 
    });
    
    res.json(paymentLink);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete payment link
router.delete('/:id', async (req, res) => {
  try {
    const paymentLink = await PaymentLink.findByPk(req.params.id);
    
    if (!paymentLink) {
      return res.status(404).json({ error: 'Payment link not found' });
    }

    await paymentLink.destroy();
    res.json({ message: 'Payment link deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;