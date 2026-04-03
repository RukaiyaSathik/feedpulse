const jwt = require('jsonwebtoken');

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Missing credentials',
        message: 'Email and password are required',
      });
    }

    // Check against hardcoded admin credentials from .env
    if (
      email !== process.env.ADMIN_EMAIL ||
      password !== process.env.ADMIN_PASSWORD
    ) {
      return res.status(401).json({
        success: false,
        data: null,
        error: 'Invalid credentials',
        message: 'Invalid email or password',
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { email, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      success: true,
      data: { token, email, role: 'admin' },
      error: null,
      message: 'Login successful',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: null,
      error: error.message,
      message: 'Login failed',
    });
  }
};

module.exports = { login };