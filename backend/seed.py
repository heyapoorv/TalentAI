import asyncio
import os
import datetime
from passlib.context import CryptContext
from motor.motor_asyncio import AsyncIOMotorClient
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from db.database import MONGO_URL, DB_NAME
from services.embedding import add_job_embedding, add_resume_embedding

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def seed():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("Clearing existing data...")
    await db.users.delete_many({})
    await db.jobs.delete_many({})
    await db.resumes.delete_many({})
    await db.applications.delete_many({})

    print("Seeding Users...")
    recruiter_password = pwd_context.hash("password")
    candidate_password = pwd_context.hash("password")
    
    recruiter = {
        "name": "Sarah Recruiter",
        "email": "sarah@techcorp.com",
        "password": recruiter_password,
        "role": "Recruiter",
    }
    r_res = await db.users.insert_one(recruiter)
    recruiter_id = str(r_res.inserted_id)

    candidate1 = {
        "name": "John Doe",
        "email": "john@example.com",
        "password": candidate_password,
        "role": "Candidate",
    }
    candidate2 = {
        "name": "Alice Smith",
        "email": "alice@example.com",
        "password": candidate_password,
        "role": "Candidate",
    }
    
    c1_res = await db.users.insert_one(candidate1)
    c1_id = str(c1_res.inserted_id)
    c2_res = await db.users.insert_one(candidate2)
    c2_id = str(c2_res.inserted_id)

    print("Seeding Jobs...")
    jobs = [
        {
            "recruiter_id": recruiter_id,
            "role": "Senior Frontend Developer",
            "company": "TechCorp",
            "description": "Looking for an expert in React, Tailwind, and Modern JS. Experience with state management is a plus.",
            "skills": ["React", "JavaScript", "Tailwind CSS", "Redux"],
            "status": "Active",
            "created_at": datetime.datetime.utcnow()
        },
        {
            "recruiter_id": recruiter_id,
            "role": "AI Machine Learning Engineer",
            "company": "TechCorp",
            "description": "Develop and deploy advanced ML models using PyTorch and TensorFlow. Experience with NLP and LLMs required.",
            "skills": ["Python", "PyTorch", "TensorFlow", "NLP", "Machine Learning"],
            "status": "Active",
            "created_at": datetime.datetime.utcnow()
        },
        {
            "recruiter_id": recruiter_id,
            "role": "Backend Engineer (Go/Python)",
            "company": "Global Systems",
            "description": "Build scalable backend APIs and microservices. Must have strong understanding of distributed systems.",
            "skills": ["Python", "Go", "Docker", "Kubernetes", "Microservices"],
            "status": "Active",
            "created_at": datetime.datetime.utcnow()
        }
    ]
    
    job_ids = []
    for job in jobs:
        res = await db.jobs.insert_one(job)
        job_id = str(res.inserted_id)
        job_ids.append(job_id)
        # Assuming embedding service is running synchronously or we mock it
        try:
            add_job_embedding(job_id, job["description"] + " " + " ".join(job["skills"]))
        except Exception as e:
            print(f"Skipping embedding for job {job_id}: {e}")

    print("Seeding Resumes...")
    c1_resume_text = "Experienced Frontend Engineer with 5 years building React applications. Skilled in Redux, Tailwind, and TypeScript. Passionate about UI/UX."
    c1_resume = {
        "user_id": c1_id,
        "parsed_data": '{"raw_text_preview": "'+c1_resume_text+'", "skills": ["React", "Redux", "Tailwind CSS", "TypeScript"]}',
        "created_at": datetime.datetime.utcnow()
    }
    r1_res = await db.resumes.insert_one(c1_resume)
    try:
        add_resume_embedding(str(r1_res.inserted_id), c1_resume_text)
    except:
        pass

    c2_resume_text = "AI Researcher and ML Engineer. Built production LLMs and computer vision models using PyTorch and TensorFlow. Ph.D. in Computer Science."
    c2_resume = {
        "user_id": c2_id,
        "parsed_data": '{"raw_text_preview": "'+c2_resume_text+'", "skills": ["Python", "PyTorch", "TensorFlow", "LLM", "Computer Vision"]}',
        "created_at": datetime.datetime.utcnow()
    }
    r2_res = await db.resumes.insert_one(c2_resume)
    try:
        add_resume_embedding(str(r2_res.inserted_id), c2_resume_text)
    except:
        pass

    print("Seeding Applications...")
    apps = [
        {
            "user_id": c1_id,
            "job_id": job_ids[0], # Frontend
            "match_score": 85.5,
            "status": "Applied",
            "created_at": datetime.datetime.utcnow()
        },
        {
            "user_id": c2_id,
            "job_id": job_ids[1], # ML Engineer
            "match_score": 92.0,
            "status": "Shortlisted",
            "created_at": datetime.datetime.utcnow()
        }
    ]
    await db.applications.insert_many(apps)

    print("Database seeding completed successfully!")
    print(f"Recruiter: sarah@techcorp.com / password")
    print(f"Candidate: john@example.com / password")

if __name__ == "__main__":
    asyncio.run(seed())
