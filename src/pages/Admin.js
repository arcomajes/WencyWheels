import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";

const Admin = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
    window.location.reload(); // Add this line to reload the page
  };

  const [isRentCarModalOpen, setIsRentCarModalOpen] = useState(false);
  const [availableCars, setAvailableCars] = useState([]);
  const [selectedCar, setSelectedCar] = useState(null);
  const [rentalHours, setRentalHours] = useState(1);
  const [renterName, setRenterName] = useState("");
  const [renterAge, setRenterAge] = useState("");
  const [idType, setIdType] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRental, setSelectedRental] = useState(null);
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [vehicles, setVehicles] = useState({ availableVehicles: [], activeRentals: [] });
  const [salesStats, setSalesStats] = useState({
    daily: {
      amount: 0,
      date: new Date().toISOString().split('T')[0]
    },
    weekly: {
      amount: 0,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    },
    yearly: {
      amount: 0,
      year: new Date().getFullYear()
    }
  });

  const showNotification = useCallback((message, type = "success") => {
    if (type === "error") {
      toast.error(message);
    } else {
      toast.success(message);
    }
  }, []);

  useEffect(() => {
    if (isRentCarModalOpen) {
      fetchAvailableCars();
    }
  }, [isRentCarModalOpen]);

  const fetchAvailableCars = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5002/vehicles", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      const available = data.filter((car) => car.status === "Available");
      setAvailableCars(available);
      setVehicles(prev => ({
        ...prev,
        availableVehicles: available
      }));
    } catch (err) {
      console.error("Error fetching cars:", err);
    }
  };

  const fetchRentals = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5002/rentals", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch rentals");

      const data = await response.json();
      setVehicles({
        availableVehicles: data.availableVehicles || [],
        activeRentals: data.activeRentals || []
      });
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching rentals:", error);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRentals();
  }, [fetchRentals]);

  useEffect(() => {
    const fetchSalesStats = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("http://localhost:5002/stats/sales", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        const data = await response.json();
        setSalesStats(data);
      } catch (error) {
        console.error("Error fetching sales stats:", error);
      }
    };

    fetchSalesStats();
  }, []);

  const handleRent = async () => {
    if (selectedCar) {
      try {
        const token = localStorage.getItem("token");

        const res = await fetch(
          `http://localhost:5002/vehicles/${selectedCar._id}/rent`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const result = await res.json();

        if (!res.ok) {
          showNotification(result.error || "Failed to rent the car.", "error");
          return;
        }

        showNotification(
          `Successfully rented ${result.vehicle.modelName} - ${result.vehicle.plateNumber}`
        );

        fetchAvailableCars();
        setIsRentCarModalOpen(false);
        setSelectedCar(null);
      } catch (err) {
        console.error("Rent error:", err.message);
        showNotification("Something went wrong!", "error");
      }
    }
  };

  const handleFinishRental = async (rentalId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5002/rentals/${rentalId}/finish`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          remainingPayment: selectedRental.remainingBalance || 0,
          paymentMethod: 'Cash'
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.details || "Failed to finish rental");
      }

      showNotification("Rental finished successfully");
      
      fetchRentals();
      setIsFinishModalOpen(false);
      setSelectedRental(null);

    } catch (error) {
      console.error("Error finishing rental:", error);
      showNotification(error.message, "error");
    }
  };

  const handlePayment = async (rentalId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5002/rentals/${rentalId}/payment`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: selectedRental.remainingBalance,
          paymentMethod: 'Cash'
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to process payment");
      }

      setSelectedRental({
        ...selectedRental,
        remainingBalance: 0,
        paymentStatus: 'Fully Paid'
      });

      showNotification("Payment processed successfully");
    } catch (error) {
      console.error("Error processing payment:", error);
      showNotification(error.message, "error");
    }
  };

  const calculateRemainingTime = (startDate, duration) => {
    if (!startDate) return { text: 'N/A', isExpired: false };

    const now = new Date();
    const start = new Date(startDate);
    
    const durationHours = {
      '1_day': 24,
      '2_days': 48,
      '1_week': 168
    }[duration] || 24;

    const endTime = new Date(start.getTime() + (durationHours * 60 * 60 * 1000));
    const remainingMs = endTime - now;
    const isExpired = remainingMs <= 0;

    if (isExpired) {
      return { text: 'Expired', isExpired: true };
    }

    const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
    const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

    return {
      text: `${remainingHours}h ${remainingMinutes}m`,
      isExpired: false
    };
  };

  const checkExpiredRentals = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5002/rentals/check-expired", {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to update expired rentals');
      }

      fetchRentals();
    } catch (error) {
      console.error("Error checking expired rentals:", error);
    }
  }, [fetchRentals]);

  useEffect(() => {
    const interval = setInterval(checkExpiredRentals, 60000);
    return () => clearInterval(interval);
  }, [checkExpiredRentals]);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex flex-col">
              <CardTitle>Dashboard Overview</CardTitle>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate("/admin/vehicles")}>
                Cars
              </Button>
              <Button variant="ghost" onClick={() => navigate("/admin/history")}>
                History
              </Button>
              <Button variant="ghost" onClick={() => navigate("/admin/rent-a-car")}>
                Rent
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleLogout}
              >
                Logout
              </Button>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Available Vehicles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[260px] overflow-y-auto custom-scrollbar">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10">
                      <TableRow className="h-[52px]">
                        <TableHead>Image</TableHead>
                        <TableHead>Vehicle Model</TableHead>
                        <TableHead>Plate Number</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Rate/Hour</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow className="h-[52px]">
                          <TableCell colSpan={6} className="text-center">
                            Loading...
                          </TableCell>
                        </TableRow>
                      ) : vehicles.availableVehicles?.length === 0 ? (
                        <TableRow className="h-[52px]">
                          <TableCell colSpan={6} className="text-center">
                            No available vehicles
                          </TableCell>
                        </TableRow>
                      ) : (
                        vehicles.availableVehicles?.map((vehicle) => (
                          <TableRow key={vehicle._id} className="h-[52px]">
                            <TableCell>
                              <div className="w-12 h-12 rounded-md overflow-hidden border border-gray-200">
                                {vehicle.imageUrl ? (
                                  <img
                                    src={`http://localhost:5002${vehicle.imageUrl}`}
                                    alt={vehicle.modelName}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.src = '/images/no-image.png'; // Add a default image in your public/images folder
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                    <svg
                                      className="w-6 h-6 text-gray-400"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                      xmlns="http://www.w3.org/2000/svg"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                      />
                                    </svg>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{vehicle.modelName}</TableCell>
                            <TableCell>{vehicle.plateNumber}</TableCell>
                            <TableCell>{vehicle.vehicleType}</TableCell>
                            <TableCell>₱{vehicle.rate}</TableCell>
                            <TableCell>
                              <Badge variant="success">Available</Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Currently Rented Vehicles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[260px] overflow-y-auto custom-scrollbar">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10">
                      <TableRow className="h-[52px]">
                        <TableHead>Image</TableHead>
                        <TableHead>Client Name</TableHead>
                        <TableHead>Car Type</TableHead>
                        <TableHead>Car Number</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Remaining Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow className="h-[52px]">
                          <TableCell colSpan={6} className="text-center">
                            Loading...
                          </TableCell>
                        </TableRow>
                      ) : vehicles.activeRentals?.filter(rental => rental.status === 'Active').length === 0 ? (
                        <TableRow className="h-[52px]">
                          <TableCell colSpan={6} className="text-center">
                            No active rentals
                          </TableCell>
                        </TableRow>
                      ) : (
                        vehicles.activeRentals?.filter(rental => rental.status === 'Active').map((rental) => {
                          const remainingTime = calculateRemainingTime(rental.createdAt, rental.duration);
                          return (
                            <TableRow 
                              key={rental._id} 
                              className="h-[52px] cursor-pointer"
                              onClick={() => {
                                if (!remainingTime.isExpired) {
                                  setSelectedRental(rental);
                                  setIsFinishModalOpen(true);
                                }
                              }}
                            >
                              <TableCell>
                                <div className="w-12 h-12 rounded-md overflow-hidden border border-gray-200">
                                  {rental.vehicle?.imageUrl ? (
                                    <img
                                      src={`http://localhost:5002${rental.vehicle.imageUrl}`}
                                      alt={rental.vehicle?.modelName}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = '/images/no-image.png'; // Add a default image in your public/images folder
                                      }}
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                      <svg
                                        className="w-6 h-6 text-gray-400"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        xmlns="http://www.w3.org/2000/svg"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth="2"
                                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                        />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{rental.renterName}</TableCell>
                              <TableCell>{rental.vehicle?.modelName || 'N/A'}</TableCell>
                              <TableCell>{rental.vehicle?.plateNumber || 'N/A'}</TableCell>
                              <TableCell>
                                <Badge variant={
                                  rental.status !== 'Active' ? 'destructive' :
                                  rental.paymentType === 'Down Payment' && rental.remainingBalance > 0
                                    ? 'warning'
                                    : 'success'
                                }>
                                  {rental.status !== 'Active' ? 'Finished' :
                                   rental.paymentType === 'Down Payment' && rental.remainingBalance > 0
                                    ? 'Partially Paid'
                                    : 'Active'}
                                </Badge>
                              </TableCell>
                              <TableCell>{remainingTime.text}</TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="h-full flex flex-col">
            <div className="grid grid-rows-3 gap-6 flex-1">
              {[
                { 
                  title: "Daily Sales", 
                  value: `₱${(salesStats.daily?.amount || 0).toFixed(2)}`,
                  date: salesStats.daily?.date || 'Today',
                  icon: "📅",
                  className: "bg-green-50 border-green-200"
                },
                { 
                  title: "Weekly Sales", 
                  value: `₱${(salesStats.weekly?.amount || 0).toFixed(2)}`,
                  date: salesStats.weekly ? `${salesStats.weekly.startDate} - ${salesStats.weekly.endDate}` : 'This Week',
                  icon: "📊",
                  className: "bg-red-50 border-red-200"
                },
                { 
                  title: "Yearly Sales", 
                  value: `₱${(salesStats.yearly?.amount || 0).toFixed(2)}`,
                  date: `Year ${salesStats.yearly?.year || new Date().getFullYear()}`,
                  icon: "📈",
                  className: "bg-yellow-50 border-yellow-200"
                }
              ].map((stat, index) => (
                <Card key={stat.title} className={`${stat.className} flex-1`}>
                  <CardContent className="h-full flex flex-col justify-center pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-base font-semibold ${
                          stat.title === "Daily Sales" ? "text-green-800" :
                          stat.title === "Weekly Sales" ? "text-red-800" :
                          "text-yellow-800"
                        }`}>
                          {stat.title}
                        </p>
                        <p className={`text-sm mt-1 ${
                          stat.title === "Daily Sales" ? "text-green-600" :
                          stat.title === "Weekly Sales" ? "text-red-600" :
                          "text-yellow-600"
                        }`}>
                          {stat.date}
                        </p>
                      </div>
                      <span className={`text-3xl ${
                        stat.title === "Daily Sales" ? "text-green-600" :
                        stat.title === "Weekly Sales" ? "text-red-600" :
                        "text-yellow-600"
                      }`}>
                        {stat.icon}
                      </span>
                    </div>
                    <p className={`text-3xl font-bold mt-3 ${
                      stat.title === "Daily Sales" ? "text-green-800" :
                      stat.title === "Weekly Sales" ? "text-red-800" :
                      "text-yellow-800"
                    }`}>
                      {stat.value}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {isRentCarModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6">
              <h2 className="text-xl font-bold mb-4">Rent a Car</h2>

              <label className="block mb-2 font-medium">Select Vehicle:</label>
              <select
                className="w-full p-2 border rounded mb-4"
                value={selectedCar?._id || ""}
                onChange={(e) =>
                  setSelectedCar(availableCars.find(car => car._id === e.target.value))
                }
              >
                <option value="" disabled>Select a car</option>
                {availableCars.map((car) => (
                  <option key={car._id} value={car._id}>
                    {car.modelName} - {car.plateNumber}
                  </option>
                ))}
              </select>

              <label className="block mb-1 font-medium">Hours for Rental:</label>
              <input
                type="number"
                className="w-full p-2 border rounded mb-4"
                value={rentalHours}
                onChange={(e) => setRentalHours(Number(e.target.value))}
                min={1}
                required
              />

              {selectedCar && (
                <p className="mb-4 text-sm text-gray-700">
                  Rate per hour: ₱{selectedCar.rate.toFixed(2)} <br />
                  Total: ₱{(selectedCar.rate * rentalHours).toFixed(2)}
                </p>
              )}

              <label className="block mb-1 font-medium">Name of Renter:</label>
              <input
                type="text"
                className="w-full p-2 border rounded mb-4"
                value={renterName}
                onChange={(e) => setRenterName(e.target.value)}
                required
              />

              <label className="block mb-1 font-medium">Age:</label>
              <input
                type="number"
                className="w-full p-2 border rounded mb-4"
                value={renterAge}
                onChange={(e) => setRenterAge(Number(e.target.value))}
                min={18}
                required
              />

              <label className="block mb-1 font-medium">ID Type:</label>
              <input
                type="text"
                className="w-full p-2 border rounded mb-4"
                value={idType}
                onChange={(e) => setIdType(e.target.value)}
                required
              />

              <label className="block mb-1 font-medium">ID Number:</label>
              <input
                type="text"
                className="w-full p-2 border rounded mb-4"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                required
              />

              <label className="block mb-2 font-medium">Payment Method:</label>
              <select
                className="w-full p-2 border rounded mb-6"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="Cash">Cash</option>
                <option value="GCash">GCash</option>
              </select>

              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setIsRentCarModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRent}
                  disabled={!selectedCar || !rentalHours || !renterName || !renterAge || !idType || !idNumber}
                >
                  Confirm Rent
                </Button>
              </div>
            </div>
          </div>
        )}

        {isFinishModalOpen && selectedRental && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
              <h2 className="text-xl font-bold mb-4">Finish Rental</h2>
              
              <div className="space-y-4">
                <div>
                  <p className="font-medium">Renter: {selectedRental.renterName}</p>
                  <p className="text-gray-600">Vehicle: {selectedRental.vehicle?.modelName}</p>
                  <p className="text-gray-600">Plate Number: {selectedRental.vehicle?.plateNumber}</p>
                  <p className="text-gray-600">
                    End Time: {(() => {
                      const startDate = new Date(selectedRental.createdAt);
                      const durationHours = {
                        '1_day': 24,
                        '2_days': 48,
                        '1_week': 168
                      }[selectedRental.duration] || 24;
                      
                      const endDate = new Date(startDate.getTime() + (durationHours * 60 * 60 * 1000));
                      
                      return endDate.toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      });
                    })()}
                  </p>
                  
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium">Payment Status</p>
                    <div className="flex justify-between items-center mt-2">
                      <Badge variant={
                        selectedRental.paymentType === 'Down Payment' && selectedRental.remainingBalance > 0
                          ? 'warning'
                          : 'success'
                      }>
                        {selectedRental.paymentType === 'Down Payment' && selectedRental.remainingBalance > 0 
                          ? 'Partially Paid' 
                          : 'Fully Paid'}
                      </Badge>
                      <span className="font-medium">
                        Total Cost: ₱{selectedRental.totalCost}
                      </span>
                    </div>
                    
                    {selectedRental.paymentType === 'Down Payment' && selectedRental.remainingBalance > 0 && (
                      <div className="mt-3">
                        <p className="text-red-600 font-medium">
                          Remaining Balance: ₱{selectedRental.remainingBalance}
                        </p>
                        <Button
                          onClick={() => handlePayment(selectedRental._id)}
                          className="mt-2 w-full"
                        >
                          Set as Paid
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setIsFinishModalOpen(false);
                      setSelectedRental(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleFinishRental(selectedRental._id)}
                    disabled={selectedRental.paymentType === 'Down Payment' && selectedRental.remainingBalance > 0}
                  >
                    Finish Rental
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;