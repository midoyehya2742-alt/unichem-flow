import { z } from "zod";

export const dealLineSchema = z.object({
  id: z.string(),
  productId: z.string().min(1, "Product is required"),
  quantity: z.number().positive("Quantity must be positive"),
  unitPrice: z.number().min(0, "Unit price cannot be negative"),
  tax: z.number().min(0, "Tax cannot be negative"),
  total: z.number().min(0, "Total cannot be negative"),
  discount: z.number().min(0, "Discount cannot be negative"),
});

export const chequeSchema = z.object({
  id: z.string(),
  bank: z.string().min(1, "Bank is required"),
  number: z.string().min(1, "Cheque number is required"),
  amount: z.number().positive("Amount must be positive"),
  dueDate: z.string().min(1, "Due date is required"),
});

export const dealSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  lines: z.array(dealLineSchema).min(1, "At least one product is required"),
  paymentStatus: z.enum(["unpaid", "partial", "paid"]),
  paymentType: z.enum(["immediate", "cheques", "credit"]).optional(),
  dealDate: z.string().min(1, "Deal date is required"),
  subtotal: z.number(),
  discount: z.number(),
  tax: z.number(),
  total: z.number(),
  notes: z.string().optional(),
});

export const productSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  name: z.string().min(1, "Product name is required"),
  category: z.string().min(1, "Category is required"),
  unit: z.string().min(1, "Unit is required"),
  defaultPrice: z.number().min(0, "Price cannot be negative"),
  stockQuantity: z.number().min(0, "Stock cannot be negative"),
  minimumStockLevel: z.number().min(0, "Minimum stock cannot be negative"),
});

export const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  company: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().optional(),
  taxId: z.string().optional(),
});
