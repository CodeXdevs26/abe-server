import { StoreModel } from "./store.model";
import VendorModel from "../vendor/vendor.model";

const getAllStores = async (query: Record<string, any>,) => {
  const searchableFields = [
    "name",
    "description"
  ];

  const page = Number(query?.page) || 1;
  const limit = Number(query?.limit) || 1000000;
  const pipelines = [

  ] as any;

  if (query?.coordinates) {
    const coordinates = query?.coordinates.split(",")

    pipelines.push({
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [parseFloat(coordinates[0]), parseFloat(coordinates[1])]
        },
        key: "location",
        maxDistance: parseFloat(query?.radius) || 5 * 1609, // 5 miles in meters
        distanceField: "dist.calculated",
        spherical: true
      }
    })
  }

  if (query?.searchTerm) {
    pipelines.push(
      {
        $match: {
          $or: searchableFields.map((field: string) => ({
            [field]: {
              $regex: query?.searchTerm,
              $options: 'i' // Case-insensitive search
            }
          }))
        }

      }
    )
  }

  pipelines.push(
    { $match: { is_deleted: false } }
  )

  if (query?.sort) pipelines.push({ $sort: { [query?.sort]: query.sort.includes('') ? -1 : 1 } })
  if (query?.page) pipelines.push({ $skip: page ? limit * (page - 1) : 0 },)
  if (query?.limit) pipelines.push({ $limit: limit })

  const meta = { total: 10 }
  const result = await StoreModel.aggregate(pipelines)
  return { data: result, meta }
};


const getSingleStore = async (id: string) => {
  const result = await StoreModel.findOne({ _id: id, is_deleted: false, is_blocked: false }).populate("categories", "name icon").lean();
  if (!result) return result;

  const vendor = await VendorModel.findOne({
    store: result._id,
    is_deleted: false,
  })
    .select("_id")
    .lean();

  return {
    ...result,
    vendor_id: vendor?._id || null,
  };
}

export const storeServices = {
  getAllStores,
  getSingleStore
}
