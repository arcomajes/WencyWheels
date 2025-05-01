import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

function Vehicles() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const { token } = useAuth();
  const [vehicle, setVehicle] = useState({
    modelName: "",
    plateNumber: "",
    vehicleType: "",
    rate: "",
    status: "",
    image: null,
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const navigate = useNavigate();

  const showNotification = useCallback((message, type = "success") => {
    if (type === "error") {
      toast.error(message);
    } else {
      toast.success(message);
    }
  }, []);

  const fetchVehicles = useCallback(async () => {
    try {
      const response = await fetch("http://localhost:5002/vehicles/all", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error("Failed to fetch vehicles");
      }
      const data = await response.json();
      setVehicles(data);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      showNotification("Failed to fetch vehicles", "error");
    }
  }, [token, showNotification]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const handleChange = (e) => {
    setVehicle({ ...vehicle, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    try {
      if (!vehicle.modelName || !vehicle.plateNumber || !vehicle.vehicleType || !vehicle.rate || !vehicle.status) {
        showNotification("Please fill in all required fields", "error");
        return;
      }

      // For editing, check rental status first
      if (isEditMode) {
        const checkResponse = await fetch(`http://localhost:5002/vehicles/${editingVehicle._id}/check-rental`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        const checkData = await checkResponse.json();
        
        if (checkData.isRented) {
          showNotification("Cannot modify vehicle - currently in use", "error");
          return;
        }
      }

      const formData = new FormData();
      formData.append("modelName", vehicle.modelName);
      formData.append("plateNumber", vehicle.plateNumber);
      formData.append("vehicleType", vehicle.vehicleType);
      formData.append("rate", vehicle.rate);
      formData.append("status", vehicle.status);

      if (vehicle.image) {
        formData.append("image", vehicle.image);
      }

      const url = isEditMode 
        ? `http://localhost:5002/vehicles/${editingVehicle._id}`
        : "http://localhost:5002/vehicles/add";

      const response = await fetch(url, {
        method: isEditMode ? "PUT" : "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `Error ${isEditMode ? 'updating' : 'adding'} vehicle`);
      }

      showNotification(`Vehicle ${isEditMode ? 'updated' : 'added'} successfully!`, "success");
      fetchVehicles();
      setIsModalOpen(false);
      clearDetails();
      setIsEditMode(false);
      setEditingVehicle(null);
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'saving'} vehicle:`, error);
      showNotification(error.message, "error");
    }
  };

  const clearDetails = () => {
    setVehicle({
      modelName: "",
      plateNumber: "",
      vehicleType: "",
      rate: "",
      status: "",
      image: null,
    });
  };

  const handleEdit = async (vehicle) => {
    try {
      const response = await fetch(`http://localhost:5002/vehicles/${vehicle._id}/check-rental`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (data.isRented) {
        showNotification("Cannot edit vehicle - currently in use", "error");
        return;
      }

      setIsEditMode(true); // Set edit mode to true
      setEditingVehicle(vehicle);
      setVehicle({
        modelName: vehicle.modelName,
        plateNumber: vehicle.plateNumber,
        vehicleType: vehicle.vehicleType,
        rate: vehicle.rate,
        status: vehicle.status,
        image: null
      });
      setIsModalOpen(true);
    } catch (error) {
      console.error("Error checking vehicle rental status:", error);
      showNotification("Failed to check vehicle status", "error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this vehicle?')) {
      return;
    }
    try {
      const response = await fetch(`http://localhost:5002/vehicles/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error("Failed to delete vehicle");
      }
      showNotification("Vehicle deleted successfully!", "success");
      fetchVehicles();
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      showNotification("Failed to delete vehicle", "error");
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Vehicle List</CardTitle>
            </div>
            <Button
              variant="secondary"
              onClick={() => navigate("/admin")}
            >
              Back to Dashboard
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex justify-end mb-6">
              <Button onClick={() => setIsModalOpen(true)}>
                Add Vehicle
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vehicles.length > 0 ? (
                vehicles.map((v, index) => (
                  <Card key={index} className="overflow-hidden">
                    <div className="aspect-video relative">
                      {v.imageUrl ? (
                        <img 
                          src={`http://localhost:5002${v.imageUrl}`} 
                          alt={v.modelName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                          No Image
                        </div>
                      )}
                    </div>
                    <CardHeader>
                      <CardTitle>{v.modelName}</CardTitle>
                      <CardDescription>{v.plateNumber}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Type:</span>
                          <span className="font-medium">{v.vehicleType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Rate:</span>
                          <span className="font-medium">₱{v.rate}/hr</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">Status:</span>
                          <span className={`px-3 py-1 rounded-full text-sm ${
                            v.status === 'Available' 
                              ? 'bg-green-100 text-green-800'
                              : v.status === 'Repair'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {v.status}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-end space-x-2">
                      <Button
                        variant="secondary"
                        onClick={() => handleEdit(v)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleDelete(v._id)}
                      >
                        Delete
                      </Button>
                    </CardFooter>
                  </Card>
                ))
              ) : (
                <Card className="col-span-full">
                  <CardContent className="p-6 text-center text-gray-500">
                    No vehicles found
                  </CardContent>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[525px] max-h-[90vh] overflow-y-auto">
            <DialogHeader className=" bg-white z-10 pb-4 border-b">
              <DialogTitle>{isEditMode ? 'Edit Vehicle' : 'Add New Vehicle'}</DialogTitle>
              <DialogDescription>
                Fill in all the vehicle details below. All fields are required.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4 overflow-y-auto">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="modelName" className="text-right">
                  Model Name
                </Label>
                <Input
                  id="modelName"
                  name="modelName"
                  value={vehicle.modelName}
                  onChange={handleChange}
                  className="col-span-3"
                  placeholder="Enter model name"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="plateNumber" className="text-right">
                  Plate Number
                </Label>
                <Input
                  id="plateNumber"
                  name="plateNumber"
                  value={vehicle.plateNumber}
                  onChange={handleChange}
                  className="col-span-3"
                  placeholder="Enter plate number"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="vehicleType" className="text-right">
                  Vehicle Type
                </Label>
                <select
                  id="vehicleType"
                  name="vehicleType"
                  value={vehicle.vehicleType}
                  onChange={handleChange}
                  className="col-span-3 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                >
                  <option value="">Select vehicle type</option>
                  <option value="Motorcycle">Motorcycle</option>
                  <option value="Car">Car</option>
                  <option value="Tricycle">Tricycle</option>
                </select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="rate" className="text-right">
                  Rate (₱/hr)
                </Label>
                <Input
                  id="rate"
                  name="rate"
                  type="number"
                  value={vehicle.rate}
                  onChange={handleChange}
                  className="col-span-3"
                  placeholder="Enter hourly rate"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">
                  Status
                </Label>
                <select
                  id="status"
                  name="status"
                  value={vehicle.status}
                  onChange={handleChange}
                  className="col-span-3 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                >
                  <option value="">Select status</option>
                  <option value="Available">Available</option>
                  <option value="Not Available">Not Available</option>
                  <option value="Repair">Repair</option>
                </select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="vehicleImage" className="text-right">
                  Vehicle Image
                </Label>
                <div className="col-span-3 space-y-2">
                  <Input
                    id="vehicleImage"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setVehicle({ ...vehicle, image: e.target.files[0] })}
                    className="cursor-pointer"
                  />
                  {vehicle.image && (
                    <div className="relative aspect-video mt-2">
                      <img
                        src={URL.createObjectURL(vehicle.image)}
                        alt="Vehicle Preview"
                        className="rounded-md object-cover w-full h-full"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className=" bg-white z-10 pt-4 border-t mt-4">
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="secondary"
                onClick={clearDetails}
              >
                Clear
              </Button>
              <Button
                onClick={handleSave}
                disabled={!vehicle.modelName || !vehicle.plateNumber || !vehicle.vehicleType || !vehicle.rate || !vehicle.status}
              >
                {isEditMode ? 'Update Vehicle' : 'Add Vehicle'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default Vehicles;