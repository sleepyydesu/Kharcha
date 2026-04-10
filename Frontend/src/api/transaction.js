import API from "./api";

export const getTransactions = async () => {
  const res = await API.get("/transactions");
  return res.data.statements;
};
