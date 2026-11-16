import asyncio
import json
import logging
import aiohttp
import websockets
from aiortc import RTCPeerConnection, RTCSessionDescription, RTCIceServer, RTCConfiguration

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger("webrtc_test")

async def main():
    async with aiohttp.ClientSession() as session:
        login_resp = await session.post("http://localhost:8500/api/v1/auth/login", json={"email": "bcon@gmail.com", "password": "Bcon@1234"})
        token = (await login_resp.json())["token"]
        headers = {"Authorization": f"Bearer {token}"}

        turn_resp = await session.get("http://localhost:8500/api/v1/turn/credentials", headers=headers)
        turn_data = await turn_resp.json()

        run_resp = await session.post("http://localhost:8500/api/v1/workflow/8/runs", headers=headers, json={"mode": "small_webrtc", "name": "WR-long-test"})
        run_id = (await run_resp.json())["id"]
        logger.info(f"Created run {run_id}")

        pc = RTCPeerConnection(configuration=RTCConfiguration(iceServers=[
            RTCIceServer(urls=["turn:turn.quickblox.com:3478?transport=tcp", "turn:turn.quickblox.com:3478"], username="quickblox", credential="baccb97ba2d92d71e26eb9886da5f1e0")
        ]))
        frames = []
        @pc.on("track")
        def on_track(track):
            logger.info(f"Remote track: {track.kind}")
            async def rec():
                try:
                    while True:
                        f = await asyncio.wait_for(track.recv(), timeout=25.0)
                        frames.append(f)
                        if len(frames) in (1, 10, 50, 100, 200):
                            logger.info(f">>> GOT AUDIO FRAMES: {len(frames)}! <<<")
                except Exception as e:
                    logger.info(f"Track ended: {e}")
            asyncio.create_task(rec())

        pc.addTransceiver("audio", direction="sendrecv")

        ws_url = f"ws://localhost:8500/api/v1/ws/signaling/8/{run_id}?token={token}"
        async with websockets.connect(ws_url) as ws:
            logger.info("WS connected")
            offer = await pc.createOffer()
            await pc.setLocalDescription(offer)

            @pc.on("icecandidate")
            def on_c(c):
                if c:
                    asyncio.create_task(ws.send(json.dumps({
                        "type": "ice-candidate",
                        "payload": {
                            "candidate": {
                                "candidate": f"candidate:{c.foundation} {c.component} {c.protocol} {c.priority} {c.ip} {c.port} typ {c.type}",
                                "sdpMid": c.sdpMid,
                                "sdpMLineIndex": c.sdpMLineIndex
                            },
                            "pc_id": "pc-test"
                        }
                    })))

            await ws.send(json.dumps({
                "type": "offer",
                "payload": {
                    "sdp": pc.localDescription.sdp,
                    "type": "offer",
                    "pc_id": "pc-test",
                    "workflow_id": 8,
                    "workflow_run_id": run_id,
                    "call_context_vars": {}
                }
            }))

            async def ws_in():
                async for m in ws:
                    d = json.loads(m)
                    t = d.get("type")
                    logger.info(f"WS IN: {t}")
                    if t == "answer":
                        await pc.setRemoteDescription(RTCSessionDescription(sdp=d["payload"]["sdp"], type="answer"))
                    elif "bot" in t or "llm" in t or "node" in t:
                        logger.info(f"BOT MSG: {t} -> {d.get('payload')}")

            in_task = asyncio.create_task(ws_in())

            # Wait up to 60 seconds
            for i in range(60):
                await asyncio.sleep(1)
                if len(frames) > 20:
                    logger.info("SUCCESS: Bot is speaking audio!")
                    break

            in_task.cancel()
            await pc.close()
            logger.info(f"Total frames received: {len(frames)}")

if __name__ == "__main__":
    asyncio.run(main())
