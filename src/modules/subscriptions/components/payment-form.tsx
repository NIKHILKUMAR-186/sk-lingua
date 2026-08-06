import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface PaymentFormProps {
  onSubmit: (data: {
    customer_email: string;
    customer_phone: string;
    billing_address: {
      street: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
  }) => void;
  loading?: boolean;
  error?: string;
  defaultEmail?: string;
  defaultPhone?: string;
}

export function PaymentForm({
  onSubmit,
  loading,
  error,
  defaultEmail,
  defaultPhone,
}: PaymentFormProps) {
  const [email, setEmail] = useState(defaultEmail || "");
  const [phone, setPhone] = useState(defaultPhone || "");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("India");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  function validateForm(): boolean {
    const errors: string[] = [];

    if (!email || !email.includes("@")) {
      errors.push("Valid email is required");
    }

    if (!phone || phone.replace(/\D/g, "").length < 10) {
      errors.push("Valid phone number is required (minimum 10 digits)");
    }

    if (!street.trim()) {
      errors.push("Street address is required");
    }

    if (!city.trim()) {
      errors.push("City is required");
    }

    if (!state.trim()) {
      errors.push("State/Province is required");
    }

    if (!postalCode.trim()) {
      errors.push("Postal code is required");
    }

    setValidationErrors(errors);
    return errors.length === 0;
  }

  function handleSubmit() {
    if (!validateForm()) {
      return;
    }

    onSubmit({
      customer_email: email,
      customer_phone: phone,
      billing_address: {
        street,
        city,
        state,
        postal_code: postalCode,
        country,
      },
    });
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="space-y-1">
              {validationErrors.map((err, i) => (
                <li key={i}>• {err}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
          <CardDescription>
            We'll use this to process your payment and send receipts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Billing Address</CardTitle>
          <CardDescription>Where should we send your invoice?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="street">Street Address</Label>
            <Input
              id="street"
              placeholder="123 Main Street, Apt 4B"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                placeholder="Mumbai"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State/Province</Label>
              <Input
                id="state"
                placeholder="Maharashtra"
                value={state}
                onChange={(e) => setState(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="postal-code">Postal Code</Label>
              <Input
                id="postal-code"
                placeholder="400001"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input id="country" value={country} disabled={true} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={handleSubmit}
        size="lg"
        className="w-full"
        disabled={loading || !email || !phone || !street || !city || !state || !postalCode}
      >
        {loading ? "Processing..." : "Proceed to Payment"}
      </Button>
    </div>
  );
}
