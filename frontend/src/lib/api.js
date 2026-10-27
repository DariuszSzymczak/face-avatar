import { useEffect, useState } from "react";
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

const blobCache = new Map();

export function useAvatarImages(avatar) {
  const [urls, setUrls] = useState({});
  const key = avatar ? `${avatar.id}:${(avatar.emotions || []).join(",")}` : "";

  useEffect(() => {
    if (!avatar) return setUrls({});
    let alive = true;
    (async () => {
      const out = {};
      await Promise.all(
        (avatar.emotions || []).map(async (emo) => {
          const ck = `${avatar.id}/${emo}`;
          if (!blobCache.has(ck)) {
            const blob = await request({ url: `/avatars/${avatar.id}/image/${emo}`, responseType: "blob" });
            blobCache.set(ck, URL.createObjectURL(blob));
          }
          out[emo] = blobCache.get(ck);
        })
      ).catch(() => {});
      if (alive) setUrls(out);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return urls;
}
