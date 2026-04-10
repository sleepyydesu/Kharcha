import API from "./api";

// ✅ GET BALANCE
export const getBalance = async () => {
  const res = await API.get("/wallet");
  return res.data.wallet;
};

// ✅ SEND MONEY
export const sendMoney = async (data) => {
  const res = await API.post("/wallet/transfer", data);
  return res.data;
};
