import asyncio
import json
import logging
import sys
import aiohttp
import websockets
from aiortc import RTCPeerConnection, RTCSessionDescription, RTCIceServer, RTCConfiguration

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger("webrtc_test")

BASE_URL = "http://localhost:8500"
WS_URL = "ws://localhost:8500"

async def run_e2e_test():
    async with aiohttp.ClientSession() as session:
        # Step 1: Login
        logger.info("Logging in with bcon@gmail.com...")
        login_resp = await session.post(
            f"{BASE_URL}/api/v1/auth/login",
            json={"email": "bcon@gmail.com", "password": "Bcon@1234"}
        )
        if login_resp.status != 200:
            logger.error(f"Login failed: {login_resp.status} {await login_resp.text()}")
            return False
        login_data = await login_resp.json()
        token = login_data["token"]
        user = login_data["user"]
        logger.info(f"Logged in successfully as user {user['email']}, org={user.get('organization_id')}")

        headers = {"Authorization": f"Bearer {token}"}

        # Step 2: Fetch TURN credentials
        logger.info("Fetching TURN credentials from /api/v1/turn/credentials...")
        turn_resp = await session.get(f"{BASE_URL}/api/v1/turn/credentials", headers=headers)
        logger.info(f"TURN response status: {turn_resp.status}")
        turn_data = await turn_resp.json()
        logger.info(f"TURN URIs: {turn_data.get('uris')}")

        # Step 3: Create a workflow run for workflow 5
        logger.info("Creating a new workflow run for workflow 5 (/api/v1/workflow/5/runs)...")
        run_resp = await session.post(
            f"{BASE_URL}/api/v1/workflow/5/runs",
            headers=headers,
            json={"mode": "small_webrtc", "name": "WR-test-e2e"}
        )
        if run_resp.status not in (200, 201):
            logger.error(f"Failed to create run: {run_resp.status} {await run_resp.text()}")
            return False
        run_data = await run_resp.json()
        run_id = run_data["id"]
        logger.info(f"Created workflow run ID: {run_id}")

        # Step 4: Configure WebRTC PeerConnection with QuickBlox TURN
        ice_servers = [
            RTCIceServer(urls=["stun:stun.l.google.com:19302"]),
            RTCIceServer(
                urls=turn_data.get("uris", [
                    "turn:turn.quickblox.com:3478?transport=tcp",
                    "turn:turn.quickblox.com:3478"
                ]),
                username=turn_data.get("username", "quickblox"),
                credential=turn_data.get("password", "baccb97ba2d92d71e26eb9886da5f1e0")
            )
        ]
        pc = RTCPeerConnection(configuration=RTCConfiguration(iceServers=ice_servers))
        
        # Audio track received from bot
        audio_frames_received = []

        @pc.on("track")
        def on_track(track):
            logger.info(f"Received remote track: kind={track.kind}, id={track.id}")
            if track.kind == "audio":
                asyncio.create_task(record_track(track))

        async def record_track(track):
            try:
                for _ in range(50):
                    frame = await asyncio.wait_for(track.recv(), timeout=5.0)
                    audio_frames_received.append(frame)
                    if len(audio_frames_received) % 10 == 0:
                        logger.info(f"Received {len(audio_frames_received)} audio frames from bot voice pipeline!")
            except asyncio.TimeoutError:
                logger.info(f"Track read timeout. Total frames collected: {len(audio_frames_received)}")
            except Exception as e:
                logger.info(f"Track ended: {e}")

        # Add an audio transceiver
        pc.addTransceiver("audio", direction="sendrecv")

        # Step 5: Connect WebSocket
        ws_endpoint = f"{WS_URL}/api/v1/ws/signaling/5/{run_id}?token={token}"
        logger.info(f"Connecting to WebSocket: {ws_endpoint}...")

        async with websockets.connect(ws_endpoint) as ws:
            logger.info("WebSocket connected successfully!")

            # Create offer
            offer = await pc.createOffer()
            await pc.setLocalDescription(offer)

            pc_id = "test-client-pc"
            offer_msg = {
                "type": "offer",
                "payload": {
                    "sdp": pc.localDescription.sdp,
                    "type": "offer",
                    "pc_id": pc_id,
                    "workflow_id": 5,
                    "workflow_run_id": run_id,
                    "call_context_vars": {}
                }
            }
            # Send local ICE candidates to server via WebSocket
            @pc.on("icecandidate")
            def on_candidate(candidate):
                if candidate:
                    logger.info(f"Sending local ICE candidate: {candidate.candidate}")
                    cand_payload = {
                        "type": "ice-candidate",
                        "payload": {
                            "candidate": {
                                "candidate": f"candidate:{candidate.foundation} {candidate.component} {candidate.protocol} {candidate.priority} {candidate.ip} {candidate.port} typ {candidate.type}",
                                "sdpMid": candidate.sdpMid,
                                "sdpMLineIndex": candidate.sdpMLineIndex
                            },
                            "pc_id": pc_id
                        }
                    }
                    asyncio.create_task(ws.send(json.dumps(cand_payload)))

            await ws.send(json.dumps(offer_msg))
            logger.info("Sent SDP offer to server via WebSocket")

            connected_event = asyncio.Event()

            @pc.on("connectionstatechange")
            def on_state():
                logger.info(f"RTCPeerConnection state: {pc.connectionState} (ICE: {pc.iceConnectionState})")
                if pc.connectionState in ("connected", "completed"):
                    connected_event.set()

            @pc.on("iceconnectionstatechange")
            def on_ice():
                logger.info(f"ICE Connection state: {pc.iceConnectionState}")
                if pc.iceConnectionState in ("connected", "completed"):
                    connected_event.set()

            # Message listening loop
            bot_messages = []

            async def ws_loop():
                try:
                    async for raw_msg in ws:
                        msg = json.loads(raw_msg)
                        msg_type = msg.get("type")
                        logger.info(f"WS message: {msg_type}")
                        if msg_type == "answer":
                            answer_sdp = msg["payload"]["sdp"]
                            answer = RTCSessionDescription(sdp=answer_sdp, type="answer")
                            await pc.setRemoteDescription(answer)
                            logger.info("Set remote description (answer) successfully!")
                        elif msg_type == "ice-candidate":
                            cand = msg["payload"].get("candidate")
                            if cand and cand.get("candidate"):
                                logger.debug(f"Server ICE candidate: {cand['candidate']}")
                        elif msg_type in ("rtf-bot-started-speaking", "rtf-bot-stopped-speaking", "bot-text", "llm-response-start"):
                            bot_messages.append(msg)
                            logger.info(f"Bot event: {msg_type} -> {msg.get('payload')}")
                except Exception as e:
                    logger.info(f"WS loop ended: {e}")

            ws_task = asyncio.create_task(ws_loop())

            # Wait for connection to establish (up to 30s)
            try:
                await asyncio.wait_for(connected_event.wait(), timeout=30.0)
                logger.info(">>> SUCCESS: WebRTC connection established and active! <<<")
            except asyncio.TimeoutError:
                logger.warning(f"Connection wait timeout. State: {pc.connectionState}, ICE: {pc.iceConnectionState}")

            # Wait another 12 seconds to collect bot audio frames / speech events
            logger.info("Waiting for bot greeting / audio pipeline response (12s)...")
            await asyncio.sleep(12)

            ws_task.cancel()
            await pc.close()

            logger.info("--- TEST SUMMARY ---")
            logger.info(f"Connection state: {pc.connectionState}")
            logger.info(f"Audio frames received: {len(audio_frames_received)}")
            logger.info(f"Bot messages received: {len(bot_messages)}")
            
            is_successful = len(audio_frames_received) > 0 or len(bot_messages) > 0 or pc.connectionState == "connected"
            return is_successful

if __name__ == "__main__":
    success = asyncio.run(run_e2e_test())
    print(f"\nOVERALL RESULT: {'SUCCESS' if success else 'FAILED'}")
    sys.exit(0 if success else 1)
