import axios from "axios";

export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function clientId() {
  let id = localStorage.getItem("clientId");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("clientId", id);
  }
  return id;
}

const request = async (config) => {
  const res = await axios({ ...config, url: `${API}${config.url}`, headers: { ...(config.headers || {}), "X-Client-Id": clientId() } });
  return res.data;
};

export function useApi() {
  return request;
}
