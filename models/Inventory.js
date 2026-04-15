import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  sku: { type: String, unique: true }, // Stock Keeping Unit
  category: { 
    type: String, 
    required: true,
    enum: ['Products','Equipment', 'Consumables', 'Medicines', 'Stationery', 'Others']
  },
  quantity: { type: Number, default: 0 },
  unit: { type: String, required: true }, // e.g., pcs, boxes, ml
  reorderLevel: { type: Number, default: 5 },
  purchasePrice: { type: Number, default: 0 },
  salePrice: { type: Number, default: 0 },
  totalSold: { type: Number, default: 0 },
  pricePerUnit: { type: Number }, // Deprecated in favor of purchasePrice
  supplier: { type: String },
  lastRestocked: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Optimize for inventory management & financial reporting
inventorySchema.index({ name: 1 });
inventorySchema.index({ quantity: 1 });
inventorySchema.index({ category: 1 });
inventorySchema.index({ totalSold: -1 });

export default mongoose.model('Inventory', inventorySchema);
