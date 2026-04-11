import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      maxlength: [50, 'Name cannot be more than 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },
    passwordHash: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    virtualBalance: {
      type: Number,
      required: true,
      default: 100000,
      min: 0,
    },
    totalDeposited: {
      type: Number,
      required: true,
      default: 100000,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    avatar: {
      type: String,
      default: null,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
userSchema.index({ createdAt: -1 });
userSchema.index({ virtualBalance: -1 });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

// Get user's total portfolio value (virtual balance + holdings value)
userSchema.methods.getTotalPortfolioValue = async function () {
  const Portfolio = mongoose.model('Portfolio');
  const Stock = mongoose.model('Stock');
  
  const holdings = await Portfolio.find({ userId: this._id, quantity: { $gt: 0 } });
  
  let holdingsValue = 0;
  for (const holding of holdings) {
    const stock = await Stock.findOne({ symbol: holding.symbol });
    if (stock) {
      holdingsValue += holding.quantity * stock.currentPrice;
    }
  }
  
  return this.virtualBalance + holdingsValue;
};

// Get user's initials for avatar
userSchema.virtual('initials').get(function () {
  return this.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
});

// To JSON transformation
userSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

const User = mongoose.model('User', userSchema);

export default User;
