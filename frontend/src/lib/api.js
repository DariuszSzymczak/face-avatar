import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "@clerk/react";

export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function useApi() {
  const { getToken } = useAuth();
  return useCallback(
    async (config) => {
      const token = await getToken();
      const res = await axios({ ...config, url: `${API}${config.url}`, headers: { ...(config.headers || {}), Authorization: `Bearer ${token}` } });
      return res.data;
    },
    [getToken]
  );
}

const blobCache = new Map();

export function useAvatarImages(avatar) {
  const api = useApi();
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
            const blob = await api({ url: `/avatars/${avatar.id}/image/${emo}`, responseType: "blob" });
            blobCache.set(ck, URL.createObjectURL(blob));
          }
          out[emo] = blobCache.get(ck);
        })
      ).catch(() => {});
      if (alive) setUrls(out);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, api]);

  return urls;
}
