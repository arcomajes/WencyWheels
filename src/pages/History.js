import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Badge } from "../components/ui/badge";

const History = () => {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const navigate = useNavigate();

  const showNotification = useCallback((message, type = "success") => {
    if (type === "error") {
      toast.error(message);
    } else {
      toast.success(message);
    }
  }, []);

  const fetchTransactionHistory = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5002/rentals/history", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch history");
      }

      const data = await response.json();
      setTransactions(data);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching history:", error);
      showNotification("Failed to fetch transaction history", "error");
      setIsLoading(false);
    }
  }, [showNotification]);

  const handleFeedbackSubmit = async (feedback) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5002/rentals/${selectedTransaction._id}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ feedback })
      });

      if (!response.ok) throw new Error("Failed to submit feedback");

      showNotification("Feedback submitted successfully");
      fetchTransactionHistory(); // Refresh the list
      setIsFeedbackModalOpen(false);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      showNotification("Failed to submit feedback", "error");
    }
  };

  useEffect(() => {
    fetchTransactionHistory();
  }, [fetchTransactionHistory]);

  const filteredTransactions = transactions.filter(transaction =>
    transaction.renterName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-gray-100 min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Transaction History</CardTitle>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by renter name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-[250px]"
                />
              </div>
              <Button
                variant="secondary"
                onClick={() => navigate("/admin")}
              >
                Back to Dashboard
              </Button>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="h-12 px-4 text-left align-middle">Date</th>
                    <th className="h-12 px-4 text-left align-middle">Client Name</th>
                    <th className="h-12 px-4 text-left align-middle">Vehicle</th>
                    <th className="h-12 px-4 text-left align-middle">Duration</th>
                    <th className="h-12 px-4 text-left align-middle">Payment Type</th>
                    <th className="h-12 px-4 text-left align-middle">Total Amount</th>
                    <th className="h-12 px-4 text-left align-middle">Status</th>
                    <th className="h-12 px-4 text-left align-middle">Record</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan="8" className="p-4 text-center">Loading...</td>
                    </tr>
                  ) : filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-4 text-center">
                        {searchTerm ? 'No transactions found matching your search' : 'No transaction history found'}
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((transaction) => (
                      <tr 
                        key={transaction._id} 
                        className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
                        onClick={() => {
                          setSelectedTransaction(transaction);
                          setIsFeedbackModalOpen(true);
                        }}
                      >
                        <td className="p-4">
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-4">{transaction.renterName}</td>
                        <td className="p-4">
                          {transaction.vehicle?.modelName} - {transaction.vehicle?.plateNumber}
                        </td>
                        <td className="p-4">
                          {transaction.duration === '1_day' ? '1 Day' :
                           transaction.duration === '2_days' ? '2 Days' : '1 Week'}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            transaction.paymentType === 'Full Payment'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {transaction.paymentType}
                          </span>
                        </td>
                        <td className="p-4">₱{transaction.totalCost.toFixed(2)}</td>
                        <td className="p-4">
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800">
                            Completed
                          </span>
                        </td>
                        <td className="p-4">
                          {transaction.feedback ? (
                            <Badge
                              variant={transaction.feedback === 'Good' ? 'success' : 'destructive'}
                              className={
                                transaction.feedback === 'Good' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }
                            >
                              {transaction.feedback}
                            </Badge>
                          ) : (
                            <Badge 
                              variant="outline" 
                              className="bg-gray-100 text-gray-800"
                            >
                              No Record
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {isFeedbackModalOpen && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              Add Renter Record for {selectedTransaction.renterName}
            </h3>
            
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  onClick={() => handleFeedbackSubmit('Good')}
                  variant="outline"
                  className="flex-1 border-green-500 hover:bg-green-50"
                >
                  Mark as Good
                </Button>
                <Button
                  onClick={() => handleFeedbackSubmit('Bad')}
                  variant="outline"
                  className="flex-1 border-red-500 hover:bg-red-50"
                >
                  Mark as Bad
                </Button>
              </div>
              
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  onClick={() => setIsFeedbackModalOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;