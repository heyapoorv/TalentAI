# TalentAI

TalentAI is an AI-powered recruitment and talent matching platform. It leverages advanced machine learning models and generative AI to bridge the gap between recruiters and candidates.

## 🚀 Features

- **AI-Powered Matching**: Uses Google Gemini and Sentence Transformers to match candidates with job descriptions.
- **Dynamic Insights**: Provides detailed analysis of candidate strengths, weaknesses, and interview tips.
- **Glassmorphism UI**: A modern, premium user interface built with React and Tailwind CSS.
- **FastAPI Backend**: High-performance asynchronous API handling matching and data processing.
- **Vector Database**: Utilizes ChromaDB for efficient semantic search and retrieval.

## 🛠️ Tech Stack

### Frontend
- **Framework**: React.js (Vite)
- **Styling**: Tailwind CSS
- **State Management**: React Hooks
- **Icons**: Lucide React

### Backend
- **Framework**: FastAPI
- **AI/ML**: Google Generative AI (Gemini), Sentence Transformers, Scikit-learn
- **Database**: MongoDB (Motor), SQLAlchemy
- **Vector Store**: ChromaDB
- **Environment**: Python 3.x

## 📦 Installation

### Prerequisites
- Node.js & npm
- Python 3.10+
- MongoDB instance

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create a virtual environment:
   ```bash
   python -m venv venv
   ```
3. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - Linux/macOS: `source venv/bin/activate`
4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
5. Create a `.env` file and add your credentials (GEMINI_API_KEY, MONGODB_URL, etc.).
6. Run the server:
   ```bash
   uvicorn main:app --reload
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

## 📄 License

This project is licensed under the MIT License.
