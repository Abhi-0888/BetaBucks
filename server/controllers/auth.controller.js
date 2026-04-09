import { User, Transaction, Portfolio } from '../models/index.js';
import { generateToken } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

// Register new user
export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Check if user exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: 'Email already registered',
    });
  }

  // Create user
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash: password, // Will be hashed by pre-save hook
  });

  // Generate token
  const token = generateToken(user._id);

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        virtualBalance: user.virtualBalance,
        totalDeposited: user.totalDeposited,
        role: user.role,
        avatar: user.avatar,
      },
      token,
    },
  });
});

// Login user
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user with password
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials',
    });
  }

  // Check if account is active
  if (!user.isActive) {
    return res.status(403).json({
      success: false,
      message: 'Account is suspended',
    });
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials',
    });
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  // Generate token
  const token = generateToken(user._id);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        virtualBalance: user.virtualBalance,
        totalDeposited: user.totalDeposited,
        role: user.role,
        avatar: user.avatar,
        initials: user.initials,
      },
      token,
    },
  });
});

// Get current user
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  res.json({
    success: true,
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      virtualBalance: user.virtualBalance,
      totalDeposited: user.totalDeposited,
      role: user.role,
      avatar: user.avatar,
      initials: user.initials,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
    },
  });
});

// Update profile
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, avatar } = req.body;
  
  const updateData = {};
  if (name) updateData.name = name;
  if (avatar !== undefined) updateData.avatar = avatar;

  const user = await User.findByIdAndUpdate(
    req.userId,
    updateData,
    { new: true, runValidators: true }
  );

  res.json({
    success: true,
    message: 'Profile updated',
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      initials: user.initials,
    },
  });
});

// Reset balance to initial amount
export const resetBalance = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  // Reset balance
  user.virtualBalance = 100000;
  await user.save();

  // Clear all holdings
  await Portfolio.deleteMany({ userId: req.userId });
  
  // Note: Optionally clear transactions too, but let's keep history
  // await Transaction.deleteMany({ userId: req.userId });

  res.json({
    success: true,
    message: 'Balance reset to ₹1,00,000. All holdings cleared.',
    data: {
      virtualBalance: user.virtualBalance,
      holdingsCleared: true,
    },
  });
});

export default {
  register,
  login,
  getMe,
  updateProfile,
  resetBalance,
};
