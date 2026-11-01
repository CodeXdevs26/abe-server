import { model, Schema } from "mongoose";
import { TCategory } from "./category.interface";
import { defaultCategoryIcon } from "../../constants/global.constant";

const categorySchema = new Schema<TCategory>(
  {
    name: { type: String, required: true },
    icon: { type: String, required: true, default: defaultCategoryIcon },
  },
  {
    timestamps: true,
  }
);

const CategoryModel = model<TCategory>("Category", categorySchema);
export default CategoryModel;
