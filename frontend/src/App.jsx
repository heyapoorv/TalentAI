import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Layout from './components/Layout';
import ApplicantManagement from './pages/ApplicantManagement';
import CandidateDashboard from './pages/CandidateDashboard';
import Login from './pages/Login';
import FindJobs from './pages/FindJobs';
import PostJob from './pages/PostJob';
import UploadResume from './pages/UploadResume';
import CandidateAiInsight from './pages/CandidateAiInsight';
import Register from './pages/Register';
import RecruiterDashboard from './pages/RecruiterDashboard';
import JobsList from './pages/JobsList';
import ApplicationStatus from './pages/ApplicationStatus';
import Profile from './pages/Profile';
import HelpSupport from './pages/HelpSupport';
import CopilotChat from './pages/CopilotChat';
import RecruiterCopilot from './pages/RecruiterCopilot';
import CandidateComparison from './pages/CandidateComparison';
import InterviewScorecard from './pages/InterviewScorecard';
import ResumeOptimizer from './pages/ResumeOptimizer';
import AdminDashboard from './pages/AdminDashboard';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);
  
  if (loading) return <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
  </div>;

  if (!user) return <Navigate to="/" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'admin' ? '/admin' : (user.role === 'recruiter' ? '/recruiter-dashboard' : '/dashboard')} />;
  }

  return <Layout>{children}</Layout>;
};

const PublicRoute = ({ children }) => {
  const { user } = useContext(AuthContext);
  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : (user.role === 'recruiter' ? '/recruiter-dashboard' : '/dashboard')} />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          
          {/* Shared Routes */}
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/help" element={<ProtectedRoute><HelpSupport /></ProtectedRoute>} />
          <Route path="/insights/:id" element={<ProtectedRoute><CandidateAiInsight /></ProtectedRoute>} />

          {/* Candidate Only Routes */}
          <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['candidate']}><CandidateDashboard /></ProtectedRoute>} />
          <Route path="/upload-resume" element={<ProtectedRoute allowedRoles={['candidate']}><UploadResume /></ProtectedRoute>} />
          <Route path="/jobs" element={<ProtectedRoute allowedRoles={['candidate']}><FindJobs /></ProtectedRoute>} />
          <Route path="/applications" element={<ProtectedRoute allowedRoles={['candidate']}><ApplicationStatus /></ProtectedRoute>} />
          <Route path="/copilot" element={<ProtectedRoute allowedRoles={['candidate']}><CopilotChat /></ProtectedRoute>} />
          <Route path="/resume-optimizer" element={<ProtectedRoute allowedRoles={['candidate']}><ResumeOptimizer /></ProtectedRoute>} />

          {/* Recruiter Routes */}
          <Route path="/recruiter-dashboard" element={<ProtectedRoute allowedRoles={['recruiter']}><RecruiterDashboard /></ProtectedRoute>} />
          <Route path="/applicants" element={<ProtectedRoute allowedRoles={['recruiter']}><ApplicantManagement /></ProtectedRoute>} />
          <Route path="/recruiter-jobs" element={<ProtectedRoute allowedRoles={['recruiter']}><JobsList /></ProtectedRoute>} />
          <Route path="/jobs/new" element={<ProtectedRoute allowedRoles={['recruiter']}><PostJob /></ProtectedRoute>} />
          <Route path="/recruiter-copilot" element={<ProtectedRoute allowedRoles={['recruiter']}><RecruiterCopilot /></ProtectedRoute>} />
          <Route path="/compare" element={<ProtectedRoute allowedRoles={['recruiter']}><CandidateComparison /></ProtectedRoute>} />
          <Route path="/scorecard/:applicationId" element={<ProtectedRoute allowedRoles={['recruiter']}><InterviewScorecard /></ProtectedRoute>} />

          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
