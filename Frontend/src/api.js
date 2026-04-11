import axios from "axios";

const api = axios.create({
  baseURL: "",
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

// Attach auth token automatically if one is stored
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
