import subprocess
import time
import requests

# Start the server on port 8001
server = subprocess.Popen(
    ["uvicorn", "main:app", "--port", "8001"],
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True
)

time.sleep(3) # Wait for server to start

try:
    r = requests.post(
        "http://127.0.0.1:8001/api/tasks/breakdown",
        json={"goal": "Launch a new SaaS product called 'Agenta Pro' including market research, building a landing page, setting up Stripe billing, and running a Face"}
    )
    print("STATUS:", r.status_code)
    print("RESPONSE:", r.text)
except Exception as e:
    print("REQUEST FAILED:", e)

# Kill server
server.terminate()
time.sleep(1)
# Print stderr to see the python traceback
print("SERVER STDERR:")
print(server.stderr.read())
