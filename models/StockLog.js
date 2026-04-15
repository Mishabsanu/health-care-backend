import mongoose from 'mongoose';

const stockLogSchema = new mongoose.Schema({
  productId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Inventory', 
    required: true 
  },
  quantityAdded: { 
    type: Number, 
    required: true 
  },
  supplierName: { 
    type: String, 
    required: true 
  },
  purchasePrice: { 
    type: Number, 
    required: true 
  },
  salePrice: { 
    type: Number, 
    required: true 
  },
  date: { 
    type: Date, 
    default: Date.now 
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }
}, { timestamps: true });

// Optimize for fetching logs for a specific product and supplier auditing
stockLogSchema.index({ productId: 1, createdAt: -1 });
stockLogSchema.index({ supplierName: 1 });

export default mongoose.model('StockLog', stockLogSchema);
