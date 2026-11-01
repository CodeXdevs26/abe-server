import { PaymentModel } from "../payment/payment.model";
import UserModel from "../user/user.model";

const getDashboardStats = async () => {
  const totalUsers = await UserModel.countDocuments({
    is_blocked: false,
    is_deleted: false,
  });

  const totalEarnings = await PaymentModel.aggregate([
    {
      $match: {},
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
      },
    },
  ]);

  return {
    totalUsers,
    totalEarnings: totalEarnings[0]?.total || 0,
  };
};

const getUsersOverview = async (year: number) => {
  const start = new Date(`${year}-01-01`);
  const end = new Date(`${year}-12-31`);

  const match: any = {
    createdAt: { $gte: start, $lte: end },
  };

  const result = await UserModel.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $month: "$createdAt" },
        users: { $sum: 1 },
      },
    },
  ]);

  const months = [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
  ];

  const formatted = months.map((month, index) => {
    const found = result.find((r) => r._id === index + 1);
    return {
      month,
      users: found ? found.users : 0,
    };
  });

  return formatted;
};

const getEarningOverview = async (year: number) => {
  const start = new Date(`${year}-01-01`);
  const end = new Date(`${year}-12-31`);

  const match: any = {
    createdAt: { $gte: start, $lte: end },
    payment_status: "paid", // only real earnings
  };

  const result = await PaymentModel.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $month: "$createdAt" },
        earnings: { $sum: "$amount" },
      },
    },
  ]);

  const months = [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
  ];

  const formatted = months.map((month, index) => {
    const found = result.find((r) => r._id === index + 1);
    return {
      month,
      earnings: found ? found.earnings : 0,
    };
  });

  return formatted;
};

export const SummaryService = {
  getDashboardStats,
  getUsersOverview,
  getEarningOverview
};
