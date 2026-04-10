import API from "./api";

export const initiateKhalti = async (amount) => {
  const res = await API.post("/khalti/initiate", { amount });
  return res.data;
};
