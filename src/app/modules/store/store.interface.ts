export type TStore = {
  name: string;
  cover_images: string[];
  location: {
    type: "Point";
    coordinates: number[];
  };
  ratings: number | null;
  description?: string | null;
  categories: string[];
  is_blocked?: boolean;
  is_deleted?: boolean;
};