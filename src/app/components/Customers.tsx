import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { mockCustomers } from '../lib/mockData';
import { Customer } from '../types';
import { Plus, Search, Star, Mail, Phone, MapPin } from 'lucide-react';

export function Customers() {
  const [customers, setCustomers] = useState<Customer[]>(mockCustomers);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddCustomer = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newCustomer: Customer = {
      id: `C${customers.length + 1}`,
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      address: formData.get('address') as string,
      totalBookings: 0,
      totalSpent: 0,
      vipStatus: false,
      createdAt: new Date().toISOString().split('T')[0],
      notes: formData.get('notes') as string
    };
    setCustomers([...customers, newCustomer]);
    setIsAddingCustomer(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1>Customers</h1>
          <p className="text-muted-foreground">Manage your hotel guests and customer relationships</p>
        </div>
        <Dialog open={isAddingCustomer} onOpenChange={setIsAddingCustomer}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" name="name" required />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" required />
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" name="address" />
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" name="notes" placeholder="Special preferences, requests, etc." />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsAddingCustomer(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Customer</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground/80" />
          <Input
            placeholder="Search customers by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredCustomers.map((customer) => (
          <Card key={customer.id} className="group cursor-pointer transition-all duration-300 hover:shadow-sm hover:scale-[1.02] hover:border-blue-300">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-primary-foreground group-hover:scale-110 transition-transform duration-300">
                    {customer.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-foreground group-hover:text-blue-700 transition-colors">{customer.name}</h3>
                      {customer.vipStatus && (
                        <Badge variant="default" className="bg-yellow-500">
                          <Star className="w-3 h-3 mr-1" />
                          VIP
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground">Customer ID: {customer.id}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span>{customer.email}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span>{customer.phone}</span>
                </div>
                {customer.address && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{customer.address}</span>
                  </div>
                )}
              </div>

              {customer.notes && (
                <div className="mb-4 p-3 bg-muted/50 rounded-lg group-hover:bg-blue-50 transition-colors">
                  <p className="text-foreground/80">{customer.notes}</p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                <div>
                  <p className="text-muted-foreground">Bookings</p>
                  <p className="text-foreground">{customer.totalBookings}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Spent</p>
                  <p className="text-foreground">${customer.totalSpent.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Last Visit</p>
                  <p className="text-foreground">{customer.lastBooking || 'N/A'}</p>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setSelectedCustomer(customer)}
                >
                  View Details
                </Button>
                <Button className="flex-1">New Booking</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Customer Detail Dialog */}
      <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-primary-foreground">
                  {selectedCustomer.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3>{selectedCustomer.name}</h3>
                    {selectedCustomer.vipStatus && (
                      <Badge variant="default" className="bg-yellow-500">VIP</Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground">Member since {selectedCustomer.createdAt}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <p className="text-foreground">{selectedCustomer.email}</p>
                </div>
                <div>
                  <Label>Phone</Label>
                  <p className="text-foreground">{selectedCustomer.phone}</p>
                </div>
                <div>
                  <Label>Total Bookings</Label>
                  <p className="text-foreground">{selectedCustomer.totalBookings}</p>
                </div>
                <div>
                  <Label>Total Spent</Label>
                  <p className="text-foreground">${selectedCustomer.totalSpent.toLocaleString()}</p>
                </div>
              </div>

              {selectedCustomer.notes && (
                <div>
                  <Label>Notes</Label>
                  <p className="text-foreground/80 mt-1">{selectedCustomer.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}