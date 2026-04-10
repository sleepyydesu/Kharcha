import API from "./api";

export const getProfile = async () => {
  const res = await API.get("/profile");
  return res.data.profile;
};
