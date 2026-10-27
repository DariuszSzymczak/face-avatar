# Camera + MediaPipe smoke test with chromium fake media devices. Usage: python ui_camera_fake_media.py <ticket>
import asyncio, sys
from playwright.async_api import async_playwright

BASE = [l.split("=", 1)[1].strip() for l in open("/app/frontend/.env") if l.startswith("REACT_APP_BACKEND_URL=")][0]


async def main(ticket):
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"])
        ctx = await b.new_context(viewport={"width": 1920, "height": 1080}, permissions=["camera", "microphone"])
        page = await ctx.new_page()
        logs, fails = [], []
        page.on("console", lambda m: logs.append(f"{m.type}: {m.text}"))
        page.on("pageerror", lambda e: logs.append(f"PAGEERROR: {e}"))
        page.on("requestfailed", lambda r: fails.append(r.url))
        mp = []
        page.on("response", lambda r: "/mediapipe" in r.url and mp.append((r.status, r.url.split("/")[-1], r.headers.get("content-type"))))
        await page.goto(f"{BASE}/sign-in?__clerk_ticket={ticket}")
        await page.wait_for_selector('[data-testid="live-toggle-camera-button"]', timeout=30000)
        await page.wait_for_timeout(2000)
        await page.click('[data-testid="live-toggle-camera-button"]')
        try:
            await page.wait_for_function("document.querySelector('[data-testid=live-toggle-camera-button]').innerText.includes('Stop')", timeout=60000)
            print("Camera RUNNING")
        except Exception as e:
            print("Camera did not reach running:", e)
        await page.wait_for_timeout(3000)
        print("video readyState:", await page.eval_on_selector('[data-testid="live-webcam-video-element"]', "v=>v.readyState+' '+v.videoWidth+'x'+v.videoHeight"))
        print("calibrate enabled:", await page.locator('[data-testid="live-calibrate-button"]').is_enabled())
        await page.click('[data-testid="live-calibrate-button"]')
        await page.screenshot(path="/tmp/cam.png")
        await page.click('[data-testid="live-toggle-mic-button"]')
        await page.wait_for_timeout(1500)
        print("mic btn:", await page.locator('[data-testid="live-toggle-mic-button"]').inner_text())
        print("transcript:", await page.locator('[data-testid="live-speech-transcript"]').inner_text())
        await page.click('[data-testid="live-toggle-mic-button"]')
        await page.click('[data-testid="live-toggle-camera-button"]')
        await page.wait_for_timeout(500)
        print("cam btn after stop:", await page.locator('[data-testid="live-toggle-camera-button"]').inner_text())
        print("mediapipe responses:", mp)
        print("failed requests:", fails)
        print("\n".join(l for l in logs if "error" in l.lower() or "PAGEERROR" in l)[:3000])
        await b.close()

asyncio.run(main(sys.argv[1]))
