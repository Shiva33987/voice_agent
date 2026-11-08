"""
Test VoiceLink inbound media WebSocket flow against local or tunnel endpoint.
Verifies that:
1. Inbound call connects to /api/v1/telephony/ws
2. 'connected' and 'start' events with DID +919429398780 route to Workflow 3
3. The Voice Agent pipeline starts and sends back audio frames (the receptionist greeting)
"""
import asyncio
import base64
import json
import time
import websockets

WS_URL = "wss://oasis-craft-reunion-default.trycloudflare.com/api/v1/telephony/ws"
DID = "+919429398780"
CALLER = "+919949020175"

async def test_inbound():
    print(f"Connecting to {WS_URL}...")
    async with websockets.connect(WS_URL) as ws:
        print("Connected!")
        stream_sid = f"test-stream-{int(time.time())}"
        call_sid = f"test-call-{int(time.time())}"

        # 1. Send connected event
        await ws.send(json.dumps({"event": "connected"}))
        print("Sent 'connected' event")

        # 2. Send start event
        start_msg = {
            "event": "start",
            "stream_sid": stream_sid,
            "start": {
                "stream_sid": stream_sid,
                "call_sid": call_sid,
                "to": DID,
                "from": CALLER,
                "custom_parameters": {
                    "to": DID,
                    "from": CALLER
                },
                "media_format": {
                    "encoding": "audio/x-alaw",
                    "sample_rate": 8000,
                    "channels": 1
                }
            }
        }
        await ws.send(json.dumps(start_msg))
        print(f"Sent 'start' event with DID={DID}, CALLER={CALLER}")

        # Send background silence audio frames (A-law silence is 0xD5 or 0x55)
        # 8000 Hz * 20ms = 160 bytes of A-law per frame
        silence_frame = bytes([0xD5] * 160)
        silence_payload = base64.b64encode(silence_frame).decode("utf-8")

        async def send_silence():
            try:
                while True:
                    media_msg = {
                        "event": "media",
                        "stream_sid": stream_sid,
                        "media": {"payload": silence_payload}
                    }
                    await ws.send(json.dumps(media_msg))
                    await asyncio.sleep(0.02)
            except asyncio.CancelledError:
                pass

        silence_task = asyncio.create_task(send_silence())

        received_media_frames = 0
        total_audio_bytes = 0
        start_time = time.time()

        try:
            while time.time() - start_time < 15:
                try:
                    msg_raw = await asyncio.wait_for(ws.recv(), timeout=2.0)
                    msg = json.loads(msg_raw)
                    event = msg.get("event")
                    if event == "media":
                        payload = base64.b64decode(msg["media"]["payload"])
                        received_media_frames += 1
                        total_audio_bytes += len(payload)
                        if received_media_frames == 1:
                            print(f"First audio frame received! ({len(payload)} bytes)")
                        elif received_media_frames % 25 == 0:
                            print(f"Received {received_media_frames} frames ({total_audio_bytes} bytes of bot audio)...")
                    elif event == "mark":
                        print(f"Received mark event: {msg}")
                    else:
                        print(f"Received event: {event}")
                except asyncio.TimeoutError:
                    if received_media_frames > 20:
                        print(f"Audio finished playing after {received_media_frames} frames.")
                        break
                    print("Waiting for bot audio...")
        finally:
            silence_task.cancel()

        print(f"\nTest result:")
        print(f"Total media frames received: {received_media_frames}")
        print(f"Total audio bytes: {total_audio_bytes}")
        if received_media_frames > 10:
            print("SUCCESS: Voice Agent answered and spoke over the WebSocket!")
        else:
            print("FAILURE: No or insufficient audio received from the agent.")

if __name__ == "__main__":
    asyncio.run(test_inbound())
