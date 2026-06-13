import os
import asyncio
from playwright.async_api import async_playwright

async def capture():
    artifact_dir = r"C:\Users\user\." + "gemini" + r"\antigravity\brain\5d3b9226-22c2-468f-9916-a19ebe494675"
    if not os.path.exists(artifact_dir):
        os.makedirs(artifact_dir)
        
    pricing_img_path = os.path.join(artifact_dir, "pricing_tab.png")
    routing_img_path = os.path.join(artifact_dir, "routing_tab.png")
    
    async with async_playwright() as p:
        print("Launching headless Chromium...")
        # Launch browser in headless mode
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1280, "height": 800})
        
        print("Navigating to http://localhost:5173...")
        await page.goto("http://localhost:5173")
        
        print("Waiting for page load and API connection sync...")
        # Wait for the "ONLINE" status to show up on the sidebar
        await page.wait_for_selector("text=ONLINE", timeout=10000)
        # Extra wait for Recharts fade-in animations to complete
        await asyncio.sleep(3.0)
        
        print("Capturing Pricing Elasticity Tab...")
        await page.screenshot(path=pricing_img_path)
        print(f"Saved: {pricing_img_path}")
        
        print("Switching to Logistics & Routing Tab...")
        await page.click("text=Logistics & Routing")
        # Wait for SVG map routes and components to render
        await page.wait_for_selector("text=Total Operational Cost", timeout=15000)
        await asyncio.sleep(3.0)
        
        print("Capturing Logistics & Routing Tab...")
        await page.screenshot(path=routing_img_path)
        print(f"Saved: {routing_img_path}")
        
        await browser.close()
        print("Verification captures completed successfully!")

if __name__ == "__main__":
    asyncio.run(capture())
