import mongoose, { Schema } from 'mongoose';

const reviewSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  stars: { type: Number, required: true, min: 1, max: 5 },
  text: { type: String, trim: true },
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
}, {
  timestamps: true
});

const ReviewModel = mongoose.model('Review', reviewSchema);
export default ReviewModel;