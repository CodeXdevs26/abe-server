export type TReview = {
  user: string; // Reference to User model
  stars: number;
  text?: string;
  product: string; // Reference to Product model
}