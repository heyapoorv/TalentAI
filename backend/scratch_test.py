import requests
import sys

# Login
resp = requests.post("http://localhost:8000/api/auth/login", data={
    "username": "recruiter@company.com",
    "password": "password123"
})
if resp.status_code != 200:
    print("Login failed:", resp.status_code, resp.text)
    # try candidate
    resp = requests.post("http://localhost:8000/api/auth/login", data={
        "username": "candidate@example.com",
        "password": "password123"
    })
    if resp.status_code != 200:
        print("Candidate login failed:", resp.status_code, resp.text)
        sys.exit(1)

token = resp.json()["access_token"]
print("Token acquired.")

# Create Session
headers = {"Authorization": f"Bearer {token}"}
payload = {
    "session_type": "recruiter_review",
    "job_id": "dummy_job_id"
}
resp = requests.post("http://localhost:8000/api/copilot/sessions", json=payload, headers=headers)
print("Create Session Status:", resp.status_code)
print("Create Session Body:", resp.text)
