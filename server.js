const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require("multer");
const path = require("path");
require("dotenv").config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use("/uploads", express.static("uploads"));

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Rename file to avoid conflicts
  },
});
const upload = multer({ storage });

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
  dbName: "wencywheels"
})
.then(() => {
  console.log(`✅ Connected to MongoDB database: ${mongoose.connection.name}`);
  createDefaultUser();
})
.catch(err => console.error("❌ MongoDB Connection Error:", err));

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false }
}, { collection: 'users' });

// Password hashing middleware
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

const User = mongoose.model('User', userSchema);

// Create default admin user
const createDefaultUser = async () => {
  try {
    const adminExists = await User.findOne({ email: 'admin@example.com' });
    if (adminExists) return;

    const admin = new User({
      name: 'Admin',
      email: 'admin@example.com',
      password: 'admin123',
      isAdmin: true
    });

    await admin.save();
    console.log('🔑 Default admin user created');
  } catch (err) {
    console.error('❌ Error creating default user:', err.message);
  }
};

// Authentication Middleware (Protects Routes)
const authenticate = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1]; // Get token from headers
  if (!token) {
    return res.status(401).json({ error: "Access denied. Please log in first." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach user info to request object
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token." });
  }
};


// 🔒 Protected Route: Get logged-in user info
app.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Auth Routes
app.post('/register', authenticate, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Check if user exists
    if (await User.findOne({ email })) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create new user
    const user = await User.create({ name, email, password });

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '5d' }
    );

    res.json({ 
      token,
      user: { id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin }
    });
  } catch (err) {
    console.error('❌ Registration error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '5d' }
    );

    res.json({ 
      token,
      user: { id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin }
    });
  } catch (err) {
    console.error('❌ Login error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});


// Vehicle Schema
const vehicleSchema = new mongoose.Schema({
  modelName: { type: String, required: true },
  plateNumber: { type: String, required: true, unique: true },
  vehicleType: { type: String, required: true, enum: ['Motorcycle', 'Car', 'Tricycle'] },
  rate: { type: Number, required: true, min: 0 },
  status: { 
    type: String, 
    required: true, 
    enum: ['Available', 'Not Available', 'Repair'], 
    default: 'Available'
  },
  imageUrl: String, 
}, { collection: 'vehicles' });

const Vehicle = mongoose.model('Vehicle', vehicleSchema);

// Get all vehicles (for Vehicles page)
app.get("/vehicles/all", authenticate, async (req, res) => {
  try {
    const vehicles = await Vehicle.find();
    res.json(vehicles);
  } catch (err) {
    console.error("Error fetching vehicles:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get only available vehicles (for Rent page)
app.get("/vehicles", authenticate, async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ status: "Available" });
    res.json(vehicles);
  } catch (err) {
    console.error("Error fetching vehicles:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Update add vehicle endpoint
app.post("/vehicles/add", authenticate, upload.single("image"), async (req, res) => {
  try {
    const { modelName, plateNumber, vehicleType, rate, status } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    if (!["Motorcycle", "Car", "Tricycle"].includes(vehicleType)) {
      return res.status(400).json({ error: "Invalid vehicle type." });
    }

    if (!["Available", "Not Available", "Repair"].includes(status)) {
      return res.status(400).json({ error: "Invalid status." });
    }

    const newVehicle = new Vehicle({
      modelName,
      plateNumber,
      vehicleType,
      rate: Number(rate),
      status,
      imageUrl,
    });

    await newVehicle.save();
    res.status(201).json({ message: "Vehicle added successfully", vehicle: newVehicle });
  } catch (err) {
    console.error("Error adding vehicle:", err);
    if (err.code === 11000) {
      return res.status(400).json({ error: "Vehicle with this plate number already exists." });
    }
    res.status(500).json({ error: err.message || "Failed to add vehicle" });
  }
});

// ✅ PUT: Rent a car (set status to "Not Available")
app.put("/vehicles/:id/rent", authenticate, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });

    if (vehicle.status === "Not Available") {
      return res.status(400).json({ error: "Vehicle already rented" });
    }

    vehicle.status = "Not Available";
    await vehicle.save();

    res.json({ message: "Vehicle rented successfully", vehicle });
  } catch (err) {
    console.error("Error renting vehicle:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Add vehicle availability check endpoint
app.get("/vehicles/:id/check-availability", authenticate, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    // Check if vehicle is available
    if (vehicle.status !== "Available") {
      return res.status(400).json({ 
        error: "Vehicle already rented",
        status: vehicle.status 
      });
    }

    res.json({ status: vehicle.status });
  } catch (error) {
    console.error("Error checking vehicle availability:", error);
    res.status(500).json({ error: "Failed to check vehicle availability" });
  }
});

// Check if vehicle has active rentals
app.get("/vehicles/:id/check-rental", authenticate, async (req, res) => {
  try {
    const activeRental = await Rental.findOne({
      vehicleId: req.params.id,
      status: { $in: ['Active', 'On-going'] },
      endTime: { $gt: new Date() }
    });

    res.json({
      isRented: !!activeRental,
      rental: activeRental ? {
        renterName: activeRental.renterName,
        endTime: activeRental.endTime
      } : null
    });
  } catch (error) {
    console.error("Error checking vehicle rental status:", error);
    res.status(500).json({ error: "Failed to check vehicle status" });
  }
});

// Rental Schema
const rentalSchema = new mongoose.Schema({
  vehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true
  },
  renterName: {
    type: String,
    required: true,
    trim: true
  },
  renterAge: {
    type: Number,
    required: true,
    min: 18
  },
  driversLicense: {
    type: String,
    required: true,
    trim: true
  },
  duration: {
    type: String,
    required: true,
    enum: ['1_day', '2_days', '1_week']
  },
  totalCost: {
    type: Number,
    required: true,
    min: 0
  },
  paymentType: {
    type: String,
    required: true,
    enum: ['Full Payment', 'Down Payment']
  },
  amountPaid: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    required: true,
    default: 'Cash'
  },
  status: {
    type: String,
    required: true,
    enum: ['Active', 'Finished', 'Cancelled'],
    default: 'Active'
  },
  remainingBalance: {
    type: Number,
    required: true,
    default: 0
  },
  endTime: {
    type: Date,
    required: true
  },
  feedback: {
    type: String,
    enum: ['Good', 'Bad'],
    default: null
  }
}, { timestamps: true });

// Add a method to check if rental has expired
rentalSchema.methods.hasExpired = function() {
  return new Date() > this.endTime;
};

const Rental = mongoose.model('Rental', rentalSchema);

// Payment Schema
const paymentSchema = new mongoose.Schema({
  rentalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rental',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    default: 'Cash'
  },
  status: {
    type: String,
    enum: ['Pending', 'Completed'],
    default: 'Pending'
  },
  date: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const Payment = mongoose.model('Payment', paymentSchema);

// Update the add-rental endpoint to use transactions
app.post("/api/add-rental", authenticate, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check vehicle availability again within transaction
    const vehicle = await Vehicle.findById(req.body.vehicleId).session(session);
    if (!vehicle || vehicle.status !== "Available") {
      throw new Error("Vehicle already rented");
    }

    // Create rental
    const rental = new Rental(req.body);
    await rental.save({ session });

    // Update vehicle status
    vehicle.status = "Not Available";
    await vehicle.save({ session });

    // Commit transaction
    await session.commitTransaction();
    res.status(201).json(rental);

  } catch (error) {
    await session.abortTransaction();
    console.error("Error creating rental:", error);
    res.status(500).json({ 
      error: error.message || "Failed to create rental" 
    });
  } finally {
    session.endSession();
  }
});

app.get("/rentals", authenticate, async (req, res) => {
  try {
    const [availableVehicles, activeRentals] = await Promise.all([
      Vehicle.find({ status: "Available" }),
      Rental.find()
        .populate('vehicleId')
        .sort({ createdAt: -1 })
    ]);
    
    const formattedRentals = activeRentals.map(rental => ({
      _id: rental._id,
      renterName: rental.renterName,
      vehicle: {
        modelName: rental.vehicleId?.modelName,
        plateNumber: rental.vehicleId?.plateNumber
      },
      status: rental.status,
      duration: rental.duration,
      createdAt: rental.createdAt,
      endTime: rental.endTime,
      remainingBalance: rental.remainingBalance,
      paymentType: rental.paymentType,
      totalCost: rental.totalCost,
      amountPaid: rental.amountPaid
    }));

    res.json({
      availableVehicles,
      activeRentals: formattedRentals.filter(rental => rental.status === 'Active')
    });
  } catch (error) {
    console.error("Error fetching rentals:", error);
    res.status(500).json({ error: "Failed to fetch rentals" });
  }
});

app.put("/rentals/:id/finish", authenticate, async (req, res) => {
  try {
    const { paymentMethod = 'Cash' } = req.body;
    const rental = await Rental.findById(req.params.id).populate('vehicleId');
    
    if (!rental) {
      return res.status(404).json({ error: "Rental not found" });
    }

    if (rental.status === 'Finished') {
      return res.status(400).json({ error: "Rental is already finished" });
    }

    // Check if there's remaining balance to be paid
    if (rental.remainingBalance > 0) {
      // Create payment record for remaining balance
      const payment = new Payment({
        rentalId: rental._id,
        amount: rental.remainingBalance,
        method: paymentMethod,
        status: 'Completed'
      });
      await payment.save();

      // Update rental payment status
      rental.amountPaid += rental.remainingBalance;
      rental.remainingBalance = 0;
      rental.paymentStatus = 'Fully Paid';
    }

    // Update rental status
    rental.status = "Finished";
    await rental.save();

    // Update vehicle status
    if (rental.vehicleId) {
      rental.vehicleId.status = "Available";
      await rental.vehicleId.save();
    }

    res.json({ 
      message: "Rental finished successfully", 
      rental: {
        _id: rental._id,
        renterName: rental.renterName,
        status: rental.status,
        paymentStatus: rental.paymentStatus,
        amountPaid: rental.amountPaid,
        remainingBalance: rental.remainingBalance,
        vehicle: {
          modelName: rental.vehicleId?.modelName,
          plateNumber: rental.vehicleId?.plateNumber
        }
      }
    });

  } catch (error) {
    console.error("Error finishing rental:", error);
    res.status(500).json({ 
      error: "Failed to finish rental",
      details: error.message 
    });
  }
});

app.put("/rentals/check-expired", authenticate, async (req, res) => {
  try {
    const now = new Date();
    const expiredRentals = await Rental.find({
      status: 'Active',
      endTime: { $lt: now }
    }).populate('vehicleId');

    // Update expired rentals and their vehicles
    for (const rental of expiredRentals) {
      rental.status = 'Finished';
      if (rental.vehicleId) {
        rental.vehicleId.status = 'Available';
        await rental.vehicleId.save();
      }
      await rental.save();
    }

    res.json({ 
      message: "Expired rentals updated",
      updatedCount: expiredRentals.length 
    });
  } catch (error) {
    console.error("Error checking expired rentals:", error);
    res.status(500).json({ error: "Failed to check expired rentals" });
  }
});

// Add payment endpoint
app.put("/rentals/:id/payment", authenticate, async (req, res) => {
  try {
    const { amount, paymentMethod } = req.body;
    const rental = await Rental.findById(req.params.id);
    
    if (!rental) {
      return res.status(404).json({ error: "Rental not found" });
    }

    // Create payment record
    const payment = new Payment({
      rentalId: rental._id,
      amount,
      paymentMethod,
      status: 'Completed'
    });
    await payment.save();

    // Update rental payment status
    rental.remainingBalance = 0;
    rental.amountPaid += amount;
    await rental.save();

    res.json({ 
      message: "Payment processed successfully",
      rental,
      payment
    });

  } catch (error) {
    console.error("Error processing payment:", error);
    res.status(500).json({ 
      error: "Failed to process payment",
      details: error.message 
    });
  }
});

// Update the history endpoint to include feedback
app.get("/rentals/history", authenticate, async (req, res) => {
  try {
    const completedRentals = await Rental.find({ status: "Finished" })
      .populate('vehicleId')
      .sort({ createdAt: -1 });

    const formattedHistory = completedRentals.map(rental => ({
      _id: rental._id,
      renterName: rental.renterName,
      vehicle: {
        modelName: rental.vehicleId?.modelName,
        plateNumber: rental.vehicleId?.plateNumber
      },
      duration: rental.duration,
      paymentType: rental.paymentType,
      totalCost: rental.totalCost,
      createdAt: rental.createdAt,
      endTime: rental.endTime,
      feedback: rental.feedback // Include feedback in the response
    }));

    res.json(formattedHistory);
  } catch (error) {
    console.error("Error fetching rental history:", error);
    res.status(500).json({ error: "Failed to fetch rental history" });
  }
});

// Add feedback endpoint
app.post("/rentals/:id/feedback", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { feedback } = req.body;

    // Validate feedback value
    if (!['Good', 'Bad'].includes(feedback)) {
      return res.status(400).json({ error: 'Invalid feedback value' });
    }

    // Find and update the rental with feedback
    const rental = await Rental.findByIdAndUpdate(
      id,
      { feedback },
      { new: true }
    );

    if (!rental) {
      return res.status(404).json({ error: 'Rental not found' });
    }

    res.json({
      message: 'Feedback submitted successfully',
      rental: {
        _id: rental._id,
        renterName: rental.renterName,
        feedback: rental.feedback
      }
    });

  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// Update vehicle
app.put("/vehicles/:id", authenticate, upload.single("image"), async (req, res) => {
  try {
    const { modelName, plateNumber, vehicleType, rate, status } = req.body;
    const updateData = {
      modelName,
      plateNumber,
      vehicleType,
      rate,
      status
    };

    if (req.file) {
      updateData.imageUrl = `/uploads/${req.file.filename}`;
    }

    const vehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!vehicle) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    res.json({ message: "Vehicle updated successfully", vehicle });
  } catch (err) {
    console.error("Error updating vehicle:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Delete vehicle
app.delete("/vehicles/:id", authenticate, async (req, res) => {
  try {
    const vehicle = await Vehicle.findByIdAndDelete(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ error: "Vehicle not found" });
    }
    res.json({ message: "Vehicle deleted successfully" });
  } catch (err) {
    console.error("Error deleting vehicle:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Add an endpoint to get income statistics
app.get("/stats/income", authenticate, async (req, res) => {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const previousMonth = new Date(startOfMonth);
    previousMonth.setMonth(previousMonth.getMonth() - 1);

    const [currentMonthIncome, previousMonthIncome] = await Promise.all([
      Payment.aggregate([
        {
          $match: {
            status: 'Completed',
            date: { $gte: startOfMonth }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]),
      Payment.aggregate([
        {
          $match: {
            status: 'Completed',
            date: { 
              $gte: previousMonth,
              $lt: startOfMonth
            }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ])
    ]);

    const current = currentMonthIncome.length > 0 ? currentMonthIncome[0].total : 0;
    const previous = previousMonthIncome.length > 0 ? previousMonthIncome[0].total : 0;
    const percentageChange = previous ? ((current - previous) / previous) * 100 : 0;

    res.json({
      currentMonth: current,
      previousMonth: previous,
      percentageChange
    });

  } catch (error) {
    console.error("Error fetching income stats:", error);
    res.status(500).json({ error: "Failed to fetch income statistics" });
  }
});

// Add sales statistics endpoints
app.get("/stats/sales", authenticate, async (req, res) => {
  try {
    // Get current date ranges
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Calculate start of week (Sunday)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    // Calculate start of year
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    // Get sales for different periods using aggregation pipeline
    const [dailySales, weeklySales, yearlySales] = await Promise.all([
      // Daily sales (today only)
      Payment.aggregate([
        {
          $match: {
            status: 'Completed',
            date: {
              $gte: today,
              $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) // Next day
            }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]),

      // Weekly sales (this week starting from Sunday)
      Payment.aggregate([
        {
          $match: {
            status: 'Completed',
            date: {
              $gte: startOfWeek,
              $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) // Include today
            }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]),

      // Yearly sales (this calendar year)
      Payment.aggregate([
        {
          $match: {
            status: 'Completed',
            date: {
              $gte: startOfYear,
              $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) // Include today
            }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ])
    ]);

    // Format response with proper calculations
    res.json({
      daily: {
        amount: dailySales[0]?.total || 0,
        date: today.toISOString().split('T')[0]
      },
      weekly: {
        amount: weeklySales[0]?.total || 0,
        startDate: startOfWeek.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0]
      },
      yearly: {
        amount: yearlySales[0]?.total || 0,
        year: today.getFullYear()
      }
    });

  } catch (error) {
    console.error("Error fetching sales stats:", error);
    res.status(500).json({ error: "Failed to fetch sales statistics" });
  }
});

// Start Server
const PORT = process.env.PORT || 5002;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));