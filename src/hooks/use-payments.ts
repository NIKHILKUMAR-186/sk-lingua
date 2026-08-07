import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  bookDemoSession,
  getDemoBooking,
  getUserDemoBookings,
  getUpcomingDemoBooking,
  cancelDemoBooking,
  createPaymentOrder,
  getPaymentOrder,
  completePayment,
  failPayment,
  getUserPaymentHistory,
  type DemoSessionBooking,
  type PaymentOrder,
} from "@/lib/payments";
import { toast } from "sonner";

// Demo Session Bookings
export function useDemoBooking(bookingId: string | null) {
  return useQuery({
    queryKey: ["demo-booking", bookingId],
    queryFn: () => (bookingId ? getDemoBooking(bookingId) : null),
    enabled: !!bookingId,
    staleTime: 1000 * 60, // 1 minute
  });
}

export function useUserDemoBookings(userId: string | null) {
  return useQuery({
    queryKey: ["user-demo-bookings", userId],
    queryFn: () => (userId ? getUserDemoBookings(userId) : []),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useUpcomingDemoBooking(userId: string | null) {
  return useQuery({
    queryKey: ["upcoming-demo-booking", userId],
    queryFn: () => (userId ? getUpcomingDemoBooking(userId) : null),
    enabled: !!userId,
    staleTime: 1000 * 60, // 1 minute
  });
}

export function useBookDemoSession() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      userId: string;
      booking_date: string;
      booking_time_start: string;
      booking_time_end: string;
      language: string;
      duration_mins?: number;
      notes?: string;
      price?: number;
    }) => {
      const { userId, ...bookingData } = data;
      return await bookDemoSession(userId, bookingData);
    },
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ["user-demo-bookings", variables.userId] });
      qc.invalidateQueries({ queryKey: ["upcoming-demo-booking", variables.userId] });
      toast.success("Demo session booked! Proceeding to payment...");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to book demo session");
    },
  });
}

export function useCancelDemoBooking() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: { bookingId: string; userId: string }) => {
      return await cancelDemoBooking(data.bookingId);
    },
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ["user-demo-bookings", variables.userId] });
      qc.invalidateQueries({ queryKey: ["upcoming-demo-booking", variables.userId] });
      toast.success("Demo booking cancelled");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to cancel booking");
    },
  });
}

// Payment Orders
export function usePaymentOrder(orderId: string | null) {
  return useQuery({
    queryKey: ["payment-order", orderId],
    queryFn: () => (orderId ? getPaymentOrder(orderId) : null),
    enabled: !!orderId,
    staleTime: 1000 * 30, // 30 seconds (payment may change)
  });
}

export function useUserPaymentHistory(userId: string | null) {
  return useQuery({
    queryKey: ["payment-history", userId],
    queryFn: () => (userId ? getUserPaymentHistory(userId) : []),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useCreatePaymentOrder() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      userId: string;
      order_type: "demo_session" | "subscription" | "renewal";
      related_id?: string;
      amount: number;
      tax_amount?: number;
      discount_amount?: number;
      final_amount: number;
      customer_email?: string;
      customer_phone?: string;
      billing_address?: any;
    }) => {
      const { userId, ...orderData } = data;
      return await createPaymentOrder(userId, orderData);
    },
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ["payment-history", variables.userId] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create payment order");
    },
  });
}

export function useCompletePayment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      orderId: string;
      userId: string;
      transactionId: string;
      gatewayOrderId?: string;
      gatewayResponse?: any;
    }) => {
      return await completePayment(
        data.orderId,
        data.transactionId,
        data.gatewayOrderId,
        data.gatewayResponse,
      );
    },
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ["payment-order", variables.orderId] });
      qc.invalidateQueries({ queryKey: ["payment-history", variables.userId] });
      toast.success("Payment completed successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to complete payment");
    },
  });
}

export function useFailPayment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: { orderId: string; userId: string; reason?: string }) => {
      return await failPayment(data.orderId, data.reason);
    },
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ["payment-order", variables.orderId] });
      qc.invalidateQueries({ queryKey: ["payment-history", variables.userId] });
      toast.error("Payment failed");
    },
  });
}
