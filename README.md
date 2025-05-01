# WencyWheels - Vehicle Rental System

A comprehensive vehicle rental management system that allows administrators to manage vehicles, handle rentals, track payments, and maintain customer records.

## Description

WencyWheels is a web-based application that provides:
- Vehicle inventory management
- Rental processing and tracking
- Payment handling (Full/Down payment)
- Customer record management
- Sales statistics and reporting
- Rental history with customer feedback system

## Technologies Used

### Frontend
- React.js
- TailwindCSS
- Shadcn/ui Components
- React Router DOM
- Sonner (for notifications)
- React DatePicker
- Lucide React (for icons)

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication
- Multer (for file uploads)
- Bcrypt.js (for password hashing)
- CORS

### Development Tools
- nodemon
- dotenv
- PostCSS
- Autoprefixer

## Installation & Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/vehicle-rental-system.git
cd vehicle-rental-system
```

2. Install dependencies for both frontend and backend:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
PORT=5002
```

4. Start the backend server:
```bash
npm run server
```

5. In a new terminal, start the frontend development server:
```bash
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:5002

## Default Admin Login
```
Email: admin@example.com
Password: admin123
```
