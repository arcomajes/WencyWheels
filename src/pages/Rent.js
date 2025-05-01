import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useNavigate } from "react-router-dom";

function Rent() {
  const [vehicles, setVehicles] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { token } = useAuth();
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [paymentType, setPaymentType] = useState('');
  const [amountPaid, setAmountPaid] = useState(0);
  const [renterDetails, setRenterDetails] = useState({
    name: "",
    age: "",
    driversLicense: "",
    startDate: null,
    endDate: null
  });
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const navigate = useNavigate();

  const fetchVehicles = useCallback(async () => {
    try {
      const response = await fetch("http://localhost:5002/vehicles", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error("Failed to fetch vehicles");
      
      const data = await response.json();
      setVehicles(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const calculateDuration = (start, end) => {
    if (!start || !end) return 0;
    const diffTime = Math.abs(new Date(end) - new Date(start));
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    return diffHours;
  };

  const showNotification = useCallback((message, type = "success") => {
    if (type === "error") {
      toast.error(message);
    } else {
      toast.success(message);
    }
  }, []);

  const handleRent = async () => {
    if (!selectedVehicle) return;

    try {
      const checkResponse = await fetch(`http://localhost:5002/vehicles/${selectedVehicle._id}/check-availability`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const checkData = await checkResponse.json();
      if (!checkResponse.ok || checkData.status !== 'Available') {
        throw new Error('Vehicle is no longer available');
      }

      const duration = calculateDuration(renterDetails.startDate, renterDetails.endDate);
      if (duration <= 0) {
        throw new Error('Invalid rental duration');
      }

      let rentalDuration;
      if (duration <= 24) {
        rentalDuration = '1_day';
      } else if (duration <= 48) {
        rentalDuration = '2_days';
      } else {
        rentalDuration = '1_week';
      }

      const totalCost = selectedVehicle.rate * duration;

      const rentalData = {
        vehicleId: selectedVehicle._id,
        renterName: renterDetails.name.trim(),
        renterAge: Number(renterDetails.age),
        driversLicense: renterDetails.driversLicense.trim(),
        startDate: renterDetails.startDate,
        endDate: renterDetails.endDate,
        endTime: renterDetails.endDate,
        duration: rentalDuration,
        totalCost: Number(totalCost),
        paymentType,
        amountPaid: Number(amountPaid),
        paymentMethod: 'Cash',
        status: 'Active',
        remainingBalance: Number(totalCost - amountPaid)
      };

      const response = await fetch("http://localhost:5002/api/add-rental", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(rentalData)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to rent vehicle");
      }

      showNotification(`Successfully rented ${selectedVehicle.modelName}`);
      
      setSelectedVehicle(null);
      setRenterDetails({
        name: "",
        age: "",
        driversLicense: "",
        startDate: null,
        endDate: null
      });
      setPaymentType('');
      setAmountPaid(0);
      setError(null);
      await fetchVehicles();

    } catch (err) {
      console.error('Rental Error:', err);
      showNotification(err.message, "error");
    }
  };

  const filteredVehicles = vehicles.filter(vehicle => 
    vehicleFilter === 'all' ? true : vehicle.vehicleType.toLowerCase() === vehicleFilter.toLowerCase()
  );

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-lg">Loading...</p>
    </div>
  );

  return (
    <div className="bg-gray-100 min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Rent a Vehicle</CardTitle>
              
            </div>
            <Button
              variant="secondary"
              onClick={() => navigate("/admin")}
            >
              Back to Dashboard
            </Button>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Available Vehicles</CardTitle>
                <select
                  value={vehicleFilter}
                  onChange={(e) => setVehicleFilter(e.target.value)}
                  className="p-2 border rounded-md text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="motorcycle">Motorcycle</option>
                  <option value="car">Car</option>
                  <option value="tricycle">Tricycle</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar">
                <div className="space-y-4">
                  {filteredVehicles.length === 0 ? (
                    <div className="text-center text-gray-500 py-4">
                      No vehicles available for this type
                    </div>
                  ) : (
                    filteredVehicles.map((vehicle) => (
                      <div 
                        key={vehicle._id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedVehicle?._id === vehicle._id 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'hover:border-gray-400'
                        }`}
                        onClick={() => setSelectedVehicle(vehicle)}
                      >
                        <div className="flex items-center gap-4">
                          {vehicle.imageUrl && (
                            <img 
                              src={`http://localhost:5002${vehicle.imageUrl}`}
                              alt={vehicle.modelName}
                              className="w-20 h-20 object-cover rounded"
                            />
                          )}
                          <div>
                            <h3 className="font-semibold">{vehicle.modelName}</h3>
                            <p className="text-gray-600">Plate: {vehicle.plateNumber}</p>
                            <p className="text-gray-600">Rate: ₱{vehicle.rate}/hour</p>
                            <Badge variant="success" className="mt-2">Available</Badge>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rental Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar">
                {selectedVehicle ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="renterName">Renter's Name</Label>
                      <Input
                        id="renterName"
                        value={renterDetails.name}
                        onChange={(e) => setRenterDetails({...renterDetails, name: e.target.value})}
                        placeholder="Enter renter's name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="age">Age</Label>
                      <Input
                        id="age"
                        type="number"
                        value={renterDetails.age}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          setRenterDetails({ ...renterDetails, age: value });
                          if (value && parseInt(value) >= 18) {
                            setError(null);
                          }
                        }}
                        min={18}
                        placeholder="Must be 18 or older"
                        className={error ? 'border-red-500' : ''}
                      />
                      {error && error.includes('18') && (
                        <p className="text-sm text-red-500">{error}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="driversLicense">Driver's License</Label>
                      <Input
                        id="driversLicense"
                        value={renterDetails.driversLicense}
                        onChange={(e) => setRenterDetails({...renterDetails, driversLicense: e.target.value})}
                        placeholder="Enter driver's license number"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Rental Duration</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="startDate" className="text-xs text-gray-600">From</Label>
                          <DatePicker
                            selected={renterDetails.startDate}
                            onChange={(date) => {
                              setRenterDetails({
                                ...renterDetails,
                                startDate: date,
                                endDate: date > renterDetails.endDate ? date : renterDetails.endDate
                              });
                            }}
                            showTimeSelect
                            timeFormat="HH:mm"
                            timeIntervals={60}
                            timeCaption="Time"
                            dateFormat="MMMM d, yyyy h:mm aa"
                            minDate={new Date()}
                            className="w-full p-2 border rounded"
                            placeholderText="Select start date"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="endDate" className="text-xs text-gray-600">Until</Label>
                          <DatePicker
                            selected={renterDetails.endDate}
                            onChange={(date) => setRenterDetails({...renterDetails, endDate: date})}
                            showTimeSelect
                            timeFormat="HH:mm"
                            timeIntervals={60}
                            timeCaption="Time"
                            dateFormat="MMMM d, yyyy h:mm aa"
                            minDate={renterDetails.startDate || new Date()}
                            className="w-full p-2 border rounded"
                            placeholderText="Select end date"
                            required
                          />
                        </div>
                      </div>
                      {renterDetails.startDate && renterDetails.endDate && (
                        <div className="text-sm text-gray-600">
                          <p>Duration: {calculateDuration(renterDetails.startDate, renterDetails.endDate)} hours</p>
                          <p>Rental Period: {
                            calculateDuration(renterDetails.startDate, renterDetails.endDate) <= 24 ? '1 Day' :
                            calculateDuration(renterDetails.startDate, renterDetails.endDate) <= 48 ? '2 Days' :
                            '1 Week'
                          }</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="paymentType">Payment Type</Label>
                      <select
                        id="paymentType"
                        value={paymentType}
                        onChange={(e) => setPaymentType(e.target.value)}
                        className="w-full p-2 border rounded"
                        required
                      >
                        <option value="" disabled>-Select Payment Type-</option>
                        <option value="Full Payment">Full Payment</option>
                        <option value="Down Payment">Down Payment (50% minimum)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="amountPaid">
                        {paymentType === 'Full Payment' ? 'Payment Amount' : 'Down Payment Amount'}
                      </Label>
                      <Input
                        id="amountPaid"
                        type="number"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(parseFloat(e.target.value))}
                        min={paymentType === 'Down Payment' ? 
                          (selectedVehicle.rate * calculateDuration(renterDetails.startDate, renterDetails.endDate) * 0.5) : 
                          selectedVehicle.rate * calculateDuration(renterDetails.startDate, renterDetails.endDate)
                        }
                        step="0.01"
                        required
                        placeholder={`Enter ${paymentType === 'Full Payment' ? 'full' : 'down'} payment amount`}
                      />
                    </div>

                    <div className="pt-4">
                      <p className="text-lg font-semibold">
                        Total Cost: ₱{(selectedVehicle.rate * calculateDuration(renterDetails.startDate, renterDetails.endDate)).toFixed(2)}
                      </p>
                      {paymentType === 'Down Payment' && (
                        <p className="text-sm text-red-600">
                          Minimum down payment: ₱{(selectedVehicle.rate * calculateDuration(renterDetails.startDate, renterDetails.endDate) * 0.5).toFixed(2)}
                        </p>
                      )}
                      <p className="text-sm text-gray-600">
                        Rate: ₱{selectedVehicle.rate}/hour × {calculateDuration(renterDetails.startDate, renterDetails.endDate)} hours
                      </p>
                    </div>

                    <Button
                      className="w-full"
                      onClick={handleRent}
                      disabled={
                        !renterDetails.name || 
                        !renterDetails.age || 
                        !renterDetails.driversLicense || 
                        !renterDetails.startDate || 
                        !renterDetails.endDate || 
                        !paymentType || 
                        !amountPaid
                      }
                    >
                      Confirm Rental
                    </Button>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Please select a vehicle first</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Rent;
