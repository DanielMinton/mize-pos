"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Banknote,
  CreditCard,
  Gift,
  Building2,
  Percent,
  DollarSign,
  Check,
  X,
  Printer,
  ArrowLeft,
} from "lucide-react";

type PaymentMethod = "CASH" | "CREDIT" | "DEBIT" | "GIFT_CARD" | "HOUSE_ACCOUNT";
type PaymentStep = "method" | "cash" | "tip" | "processing" | "complete";

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: {
    id: string;
    orderNumber?: number;
    tableName?: string;
    tabName?: string;
    subtotal: number;
    tax: number;
    total: number;
    itemCount: number;
  } | null;
  onPaymentComplete: (payment: {
    method: PaymentMethod;
    amount: number;
    tipAmount: number;
    change?: number;
  }) => Promise<void>;
}

const PAYMENT_METHODS: { method: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { method: "CASH", label: "Cash", icon: Banknote },
  { method: "CREDIT", label: "Credit", icon: CreditCard },
  { method: "DEBIT", label: "Debit", icon: CreditCard },
  { method: "GIFT_CARD", label: "Gift Card", icon: Gift },
  { method: "HOUSE_ACCOUNT", label: "House Account", icon: Building2 },
];

const TIP_PRESETS = [
  { label: "15%", value: 0.15 },
  { label: "18%", value: 0.18 },
  { label: "20%", value: 0.20 },
  { label: "25%", value: 0.25 },
];

const QUICK_CASH = [1, 5, 10, 20, 50, 100];

export function PaymentModal({
  open,
  onOpenChange,
  order,
  onPaymentComplete,
}: PaymentModalProps) {
  const [step, setStep] = useState<PaymentStep>("method");
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [tipAmount, setTipAmount] = useState(0);
  const [customTip, setCustomTip] = useState("");
  const [cashTendered, setCashTendered] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{
    success: boolean;
    change?: number;
    error?: string;
  } | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setStep("method");
      setSelectedMethod(null);
      setTipAmount(0);
      setCustomTip("");
      setCashTendered("");
      setIsProcessing(false);
      setPaymentResult(null);
    }
  }, [open]);

  if (!order) return null;

  const totalWithTip = order.total + tipAmount;

  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);
    if (method === "CASH") {
      setStep("cash");
    } else {
      setStep("tip");
    }
  };

  const handleTipSelect = (percentage: number) => {
    setTipAmount(Math.round(order.subtotal * percentage * 100) / 100);
    setCustomTip("");
  };

  const handleCustomTip = (value: string) => {
    setCustomTip(value);
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && parsed >= 0) {
      setTipAmount(Math.round(parsed * 100) / 100);
    } else {
      setTipAmount(0);
    }
  };

  const handleCashTendered = (value: string) => {
    setCashTendered(value);
  };

  const handleQuickCash = (amount: number) => {
    const current = parseFloat(cashTendered) || 0;
    setCashTendered((current + amount).toString());
  };

  const handleProcessPayment = async () => {
    if (!selectedMethod) return;

    setIsProcessing(true);
    setStep("processing");

    try {
      let change: number | undefined;

      if (selectedMethod === "CASH") {
        const tendered = parseFloat(cashTendered) || 0;
        if (tendered < totalWithTip) {
          setPaymentResult({ success: false, error: "Insufficient cash tendered" });
          setStep("cash");
          setIsProcessing(false);
          return;
        }
        change = Math.round((tendered - totalWithTip) * 100) / 100;
      }

      await onPaymentComplete({
        method: selectedMethod,
        amount: totalWithTip,
        tipAmount,
        change,
      });

      setPaymentResult({ success: true, change });
      setStep("complete");
    } catch (error) {
      setPaymentResult({
        success: false,
        error: error instanceof Error ? error.message : "Payment failed",
      });
      setStep("tip");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBack = () => {
    if (step === "cash" || step === "tip") {
      setStep("method");
      setSelectedMethod(null);
    }
  };

  const renderMethodSelection = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {PAYMENT_METHODS.map(({ method, label, icon: Icon }) => (
          <Button
            key={method}
            variant="outline"
            className="h-24 flex-col gap-2 text-lg touch-manipulation"
            onClick={() => handleMethodSelect(method)}
          >
            <Icon className="w-8 h-8" />
            {label}
          </Button>
        ))}
      </div>
    </div>
  );

  const renderCashEntry = () => {
    const tendered = parseFloat(cashTendered) || 0;
    const change = tendered - totalWithTip;

    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={handleBack} className="mb-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="text-center space-y-1">
          <p className="text-sm text-muted-foreground">Amount Due</p>
          <p className="text-3xl font-bold">{formatCurrency(totalWithTip)}</p>
        </div>

        <Separator />

        <div>
          <label className="text-sm font-medium">Cash Tendered</label>
          <Input
            type="number"
            step="0.01"
            value={cashTendered}
            onChange={(e) => handleCashTendered(e.target.value)}
            className="text-2xl h-14 text-center font-mono"
            placeholder="0.00"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          {QUICK_CASH.map((amount) => (
            <Button
              key={amount}
              variant="outline"
              className="h-12 touch-manipulation"
              onClick={() => handleQuickCash(amount)}
            >
              +${amount}
            </Button>
          ))}
        </div>

        {tendered > 0 && (
          <div className={cn(
            "p-4 rounded-lg text-center",
            change >= 0 ? "bg-green-50 dark:bg-green-950" : "bg-red-50 dark:bg-red-950"
          )}>
            <p className="text-sm text-muted-foreground">
              {change >= 0 ? "Change Due" : "Amount Short"}
            </p>
            <p className={cn(
              "text-2xl font-bold",
              change >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {formatCurrency(Math.abs(change))}
            </p>
          </div>
        )}

        <Button
          variant="pos-success"
          size="pos"
          className="w-full"
          disabled={tendered < totalWithTip}
          onClick={() => setStep("tip")}
        >
          Continue to Tip
        </Button>
      </div>
    );
  };

  const renderTipSelection = () => (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={handleBack} className="mb-2">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <div className="text-center space-y-1">
        <p className="text-sm text-muted-foreground">Subtotal</p>
        <p className="text-2xl font-bold">{formatCurrency(order.subtotal)}</p>
      </div>

      <Separator />

      <div>
        <label className="text-sm font-medium mb-2 block">Add Tip</label>
        <div className="grid grid-cols-4 gap-2">
          {TIP_PRESETS.map(({ label, value }) => {
            const tipValue = Math.round(order.subtotal * value * 100) / 100;
            const isSelected = tipAmount === tipValue && !customTip;
            return (
              <Button
                key={label}
                variant={isSelected ? "default" : "outline"}
                className="h-16 flex-col touch-manipulation"
                onClick={() => handleTipSelect(value)}
              >
                <span className="text-lg font-bold">{label}</span>
                <span className="text-xs">{formatCurrency(tipValue)}</span>
              </Button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Custom:</span>
        <div className="relative flex-1">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="number"
            step="0.01"
            min="0"
            value={customTip}
            onChange={(e) => handleCustomTip(e.target.value)}
            className="pl-8"
            placeholder="0.00"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setTipAmount(0);
            setCustomTip("");
          }}
        >
          No Tip
        </Button>
      </div>

      <Separator />

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatCurrency(order.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>Tax</span>
          <span>{formatCurrency(order.tax)}</span>
        </div>
        <div className="flex justify-between">
          <span>Tip</span>
          <span>{formatCurrency(tipAmount)}</span>
        </div>
        <Separator />
        <div className="flex justify-between text-lg font-bold">
          <span>Total</span>
          <span>{formatCurrency(totalWithTip)}</span>
        </div>
      </div>

      <Button
        variant="pos-success"
        size="pos"
        className="w-full"
        onClick={handleProcessPayment}
        disabled={isProcessing}
      >
        {isProcessing ? (
          "Processing..."
        ) : (
          <>
            <Check className="w-5 h-5 mr-2" />
            Complete Payment - {formatCurrency(totalWithTip)}
          </>
        )}
      </Button>
    </div>
  );

  const renderProcessing = () => (
    <div className="py-12 text-center space-y-4">
      <div className="w-16 h-16 mx-auto border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-lg font-medium">Processing Payment...</p>
      <p className="text-sm text-muted-foreground">Please wait</p>
    </div>
  );

  const renderComplete = () => (
    <div className="py-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-xl font-bold">Payment Complete</h3>
        {paymentResult?.change !== undefined && paymentResult.change > 0 && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
            <p className="text-sm text-muted-foreground">Change Due</p>
            <p className="text-3xl font-bold text-yellow-600">
              {formatCurrency(paymentResult.change)}
            </p>
          </div>
        )}
      </div>

      <Separator />

      {/* Receipt Preview */}
      <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg font-mono text-sm space-y-2">
        <div className="text-center">
          <p className="font-bold">MISE POS</p>
          <p className="text-xs text-muted-foreground">
            {new Date().toLocaleString()}
          </p>
        </div>
        <Separator />
        <div className="flex justify-between">
          <span>Order #{order.orderNumber}</span>
          <span>{order.tableName || order.tabName}</span>
        </div>
        <Separator />
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatCurrency(order.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>Tax</span>
          <span>{formatCurrency(order.tax)}</span>
        </div>
        <div className="flex justify-between">
          <span>Tip</span>
          <span>{formatCurrency(tipAmount)}</span>
        </div>
        <Separator />
        <div className="flex justify-between font-bold">
          <span>Total</span>
          <span>{formatCurrency(totalWithTip)}</span>
        </div>
        <div className="flex justify-between">
          <span>Payment</span>
          <span>{selectedMethod}</span>
        </div>
        {paymentResult?.change !== undefined && paymentResult.change > 0 && (
          <div className="flex justify-between">
            <span>Change</span>
            <span>{formatCurrency(paymentResult.change)}</span>
          </div>
        )}
        <Separator />
        <p className="text-center text-xs">Thank you!</p>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => {}}>
          <Printer className="w-4 h-4 mr-2" />
          Print Receipt
        </Button>
        <Button
          variant="pos-success"
          className="flex-1"
          onClick={() => onOpenChange(false)}
        >
          Done
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>
              {step === "method" && "Select Payment Method"}
              {step === "cash" && "Cash Payment"}
              {step === "tip" && "Add Tip"}
              {step === "processing" && "Processing"}
              {step === "complete" && "Payment Complete"}
            </span>
            {order.orderNumber && (
              <Badge variant="outline">#{order.orderNumber}</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {step === "method" && renderMethodSelection()}
        {step === "cash" && renderCashEntry()}
        {step === "tip" && renderTipSelection()}
        {step === "processing" && renderProcessing()}
        {step === "complete" && renderComplete()}
      </DialogContent>
    </Dialog>
  );
}
