import { Alert } from "react-native";
import RazorpayCheckout from "react-native-razorpay";
import { paymentApi } from "../services/api/paymentService";

export const payWithRazorpay = async ({
  orderId,
  user,
  onSuccess,
}: {
  orderId: string;
  user: any;
  onSuccess?: (order: any) => void;
}) => {
  try {
    const data = await paymentApi.createOrder(orderId);

    if (!data.success) {
      Alert.alert("Payment Error", data.message || "Payment start failed");
      return;
    }

    const options = {
      description: "Karto Order Payment",
      currency: data.currency,
      key: data.key,
      amount: data.amount,
      name: "Karto",
      order_id: data.razorpayOrderId,
      prefill: {
        email: user?.email || "",
        contact: user?.phone || "",
        name: user?.fullName || "Karto User",
      },
      theme: {
        color: "#FACC15",
      },
    };

    const paymentData = await RazorpayCheckout.open(options);

    const verify = await paymentApi.verifyPayment({
      kartoOrderId: data.kartoOrderId,
      razorpay_order_id: paymentData.razorpay_order_id,
      razorpay_payment_id: paymentData.razorpay_payment_id,
      razorpay_signature: paymentData.razorpay_signature,
    });

    if (!verify.success) {
      Alert.alert("Payment Failed", verify.message || "Verification failed");
      return;
    }

    Alert.alert("Payment Success", "Your payment is completed.");
    onSuccess?.(verify.order);
  } catch (error: any) {
    Alert.alert(
      "Payment Cancelled",
      error?.description || "Payment was cancelled or failed."
    );
  }
};