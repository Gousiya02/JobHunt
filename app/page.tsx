'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import {
  MapPin, Briefcase, Clock, Coins, User, Store, Phone,
  ArrowRight, CheckCircle, LogOut, Plus, Search, Sparkles,
  Send, UserCheck, XCircle, RefreshCw, Layers, Check, CheckCircle2,
  Sun, Moon, MessageSquare
} from 'lucide-react';

// Pool of fixed skills/tags
const AVAILABLE_SKILLS = [
  'cashier', 'delivery', 'kitchen help', 'data entry',
  'retail assistant', 'cleaning', 'security', 'waiter',
  'helper', 'barista', 'receptionist', 'gardener'
];

// Pool of availabilities
const AVAILABILITY_SLOTS = [
  'weekday_morning', 'weekday_afternoon', 'weekday_evening',
  'weekend_morning', 'weekend_afternoon', 'weekend_evening'
];

// Languages
const LANGUAGES_POOL = ['English', 'Hindi', 'Kannada', 'Tamil', 'Telugu', 'Bengali', 'Marathi', 'Malayalam'];

// Company Categories
const COMPANY_CATEGORIES = ['Grocery', 'Restaurant', 'Cafe', 'Clothing Store', 'Pharmacy', 'Supermarket', 'Salon', 'Logistics/Delivery Hub', 'Other'];

export default function Dashboard() {
  const { data: session, status } = useSession();

  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === 'light') {
        document.documentElement.classList.add('light');
      } else {
        document.documentElement.classList.remove('light');
      }
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    if (nextTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  };

  // Profile data
  const [user, setUser] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [googleConfigured, setGoogleConfigured] = useState(true);

  // Role choice
  const [selectedRole, setSelectedRole] = useState<'seeker' | 'employer' | null>(null);

  // Form states
  const [seekerForm, setSeekerForm] = useState({
    name: '',
    phone: '',
    skills: [] as string[],
    availability: [] as string[],
    experienceLevel: 'none',
    locality: '',
    languages: [] as string[],
    preferredLanguage: 'English'
  });

  const [companyForm, setCompanyForm] = useState({
    companyName: '',
    category: 'Grocery',
    address: '',
    ownerPhone: '',
    preferredLanguage: 'English'
  });

  const [jobForm, setJobForm] = useState({
    companyId: '',
    title: '',
    category: 'Grocery',
    payType: 'fixed' as 'fixed' | 'hourly' | 'monthly',
    payMin: '',
    payMax: '',
    shiftTiming: '',
    requiredSkills: [] as string[]
  });

  // Seeker states
  const [jobs, setJobs] = useState<any[]>([]);
  const [distance, setDistance] = useState('5'); // 5km
  const [myApplications, setMyApplications] = useState<any[]>([]);
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [seekerSearch, setSeekerSearch] = useState('');

  // Custom Area Search states
  const [searchAreaInput, setSearchAreaInput] = useState('');
  const [customCoords, setCustomCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [activeAreaName, setActiveAreaName] = useState<string | null>(null);
  const [geocodingArea, setGeocodingArea] = useState(false);
  const [seekerTab, setSeekerTab] = useState<'find-jobs' | 'my-applications' | 'edit-profile'>('find-jobs');

  // Chat states
  const [chatMessages, setChatMessages] = useState<any[]>([
    { role: 'assistant', content: 'Hello! I am JobHunt AI. How can I help you find a job, write a resume, or learn new skills today?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Employer states
  const [myCompanies, setMyCompanies] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [employerJobs, setEmployerJobs] = useState<any[]>([]);
  const [receivedApplications, setReceivedApplications] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'jobs' | 'post-job' | 'applications' | 'edit-company'>('jobs');
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [selectedJobFilter, setSelectedJobFilter] = useState<string | null>(null);

  // Load profile details from database
  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setGoogleConfigured(data.googleConfigured ?? true);
        if (data.authenticated) {
          if (data.hasSeekerProfile) {
            setSelectedRole('seeker');
             setSeekerForm({
              name: data.seekerProfile.name || '',
              phone: data.seekerProfile.phone || '',
              skills: data.seekerProfile.skills || [],
              availability: data.seekerProfile.availability || [],
              experienceLevel: data.seekerProfile.experienceLevel || 'none',
              locality: data.seekerProfile.locality || '',
              languages: data.seekerProfile.languages || [],
              preferredLanguage: data.seekerProfile.preferredLanguage || 'English'
            });
            loadSeekerDashboard(data.seekerProfile);
          } else if (data.hasCompanyProfile) {
            setSelectedRole('employer');
            loadEmployerDashboard(data.companyProfiles);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching me status:', err);
    } finally {
      setProfileLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompanyId]);

  // Fetch profiles and check config status on session change or mount
  useEffect(() => {
    loadProfile();
  }, [status, loadProfile]);

  // Seeker Dashboard Fetchers
  const loadSeekerDashboard = async (profile: any, coords: { lat: number; lng: number } | null = customCoords) => {
    try {
      let url = `/api/jobs?distance=${distance}`;
      if (coords) {
        url += `&lat=${coords.lat}&lng=${coords.lng}`;
      }
      // Fetch nearby jobs
      const jobsRes = await fetch(url);
      if (jobsRes.ok) {
        let jobsData = await jobsRes.json();
        const seekerLang = profile?.preferredLanguage || 'English';
        if (seekerLang.toLowerCase() !== 'english') {
          try {
            const transRes = await fetch('/api/jobs/translate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ jobs: jobsData, targetLanguage: seekerLang })
            });
            if (transRes.ok) {
              jobsData = await transRes.json();
            }
          } catch (transErr) {
            console.error('Error translating jobs:', transErr);
          }
        }
        setJobs(jobsData);
      }

      // Fetch seeker's applications
      const appsRes = await fetch('/api/applications?role=seeker');
      if (appsRes.ok) {
        const appsData = await appsRes.json();
        setMyApplications(appsData);
      }
    } catch (err) {
      console.error('Error loading seeker dashboard:', err);
    }
  };

  // Employer Dashboard Fetchers
  const loadEmployerDashboard = async (companies: any[]) => {
    try {
      setMyCompanies(companies);
      if (companies.length > 0) {
        const defaultCompanyId = selectedCompanyId || companies[0]._id;
        setSelectedCompanyId(defaultCompanyId);
        setJobForm(prev => ({ ...prev, companyId: defaultCompanyId }));

         const currentCompany = companies.find(s => s._id === defaultCompanyId);
        if (currentCompany) {
          setCompanyForm({
            companyName: currentCompany.companyName || '',
            category: currentCompany.category || 'Grocery',
            address: currentCompany.address || '',
            ownerPhone: currentCompany.ownerPhone || '',
            preferredLanguage: currentCompany.preferredLanguage || 'English'
          });
        }

        // Fetch jobs for this company
        const jobsRes = await fetch(`/api/jobs?companyId=${defaultCompanyId}`);
        if (jobsRes.ok) {
          const jobsData = await jobsRes.json();
          setEmployerJobs(jobsData);
        }
      }

      // Fetch received applications
      const appsRes = await fetch('/api/applications?role=employer');
      if (appsRes.ok) {
        const appsData = await appsRes.json();
        setReceivedApplications(appsData);
      }
    } catch (err) {
      console.error('Error loading employer dashboard:', err);
    }
  };

  // Trigger distance recalculation
  useEffect(() => {
    if (status === 'authenticated' && selectedRole === 'seeker' && user?.seekerProfile) {
      loadSeekerDashboard(user.seekerProfile, customCoords);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [distance]);

  // Handle company change
  const handleCompanyChange = async (companyId: string) => {
    setSelectedCompanyId(companyId);
    setJobForm(prev => ({ ...prev, companyId }));

    const currentCompany = myCompanies.find(s => s._id === companyId);
    if (currentCompany) {
      setCompanyForm({
        companyName: currentCompany.companyName || '',
        category: currentCompany.category || 'Grocery',
        address: currentCompany.address || '',
        ownerPhone: currentCompany.ownerPhone || '',
        preferredLanguage: currentCompany.preferredLanguage || 'English'
      });
    }

    const jobsRes = await fetch(`/api/jobs?companyId=${companyId}`);
    if (jobsRes.ok) {
      const jobsData = await jobsRes.json();
      setEmployerJobs(jobsData);
    }
  };

  // Handle Area geocoded search
  const handleAreaSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchAreaInput.trim()) return;
    setGeocodingArea(true);
    try {
      let query = searchAreaInput;
      if (!/bangalore|bengaluru/i.test(query)) {
        query = `${query}, Bangalore`;
      }
      const encodedAddress = encodeURIComponent(query);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1&countrycodes=in`, {
        headers: {
          'User-Agent': 'LocalJobFinderApp/1.0 (contact: support@localjobfinder.local)'
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          const name = data[0].display_name.split(',')[0];
          const newCoords = { lat, lng };
          setCustomCoords(newCoords);
          setActiveAreaName(name);
          // Load jobs using these coordinates
          await loadSeekerDashboard(user?.seekerProfile, newCoords);
        } else {
          alert('Location not found. Try searching for a different neighborhood or city.');
        }
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      alert('Failed to search area. Please try again.');
    } finally {
      setGeocodingArea(false);
    }
  };

  const handleResetLocation = async () => {
    setCustomCoords(null);
    setActiveAreaName(null);
    setSearchAreaInput('');
    if (user?.seekerProfile) {
      await loadSeekerDashboard(user.seekerProfile, null);
    }
  };

  // Sign out
  const handleSignOut = () => {
    signOut();
    setUser(null);
    setSelectedRole(null);
    setJobs([]);
    setMyCompanies([]);
    setReceivedApplications([]);
  };

  // Submit seeker profile
  const handleSeekerOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/seeker/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(seekerForm)
      });
      if (res.ok) {
        await loadProfile();
        alert('Profile saved successfully!');
        setSeekerTab('find-jobs');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save profile');
      }
    } catch (err) {
      alert('Error saving profile');
    }
  };

  const handleSendChatMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const text = customText || chatInput;
    if (!text.trim()) return;

    const newMsg = { role: 'user', content: text };
    const updatedMessages = [...chatMessages, newMsg];
    setChatMessages(updatedMessages);
    if (!customText) setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages }),
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages([...updatedMessages, { role: 'assistant', content: data.response }]);
      } else {
        setChatMessages([...updatedMessages, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
      }
    } catch (err) {
      console.error(err);
      setChatMessages([...updatedMessages, { role: 'assistant', content: 'Connection error. Please check your network.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Submit company profile (register and update)
  const handleCompanyOnboarding = async (e: React.FormEvent, isUpdate = false) => {
    e.preventDefault();
    try {
      const body = {
        ...companyForm,
        ...(isUpdate ? { companyId: selectedCompanyId } : {})
      };

      const res = await fetch('/api/company/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        await loadProfile();
        alert(isUpdate ? 'Company profile updated successfully!' : 'Company registered successfully!');
        if (isUpdate) {
          setActiveTab('jobs');
        }
      } else {
        const data = await res.json();
        alert(data.error || (isUpdate ? 'Failed to update company' : 'Failed to register company'));
      }
    } catch (err) {
      alert(isUpdate ? 'Error updating company' : 'Error registering company');
    }
  };

  // Post or edit a job
  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = editingJobId !== null;
      const url = '/api/jobs';
      const method = isEdit ? 'PUT' : 'POST';
      const body = {
        ...jobForm,
        payMin: parseFloat(jobForm.payMin),
        payMax: jobForm.payMax ? parseFloat(jobForm.payMax) : undefined,
        ...(isEdit ? { jobId: editingJobId } : {})
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        alert(isEdit ? 'Job updated successfully!' : 'Job posted successfully!');
        setJobForm({
          companyId: selectedCompanyId,
          title: '',
          category: 'Grocery',
          payType: 'fixed',
          payMin: '',
          payMax: '',
          shiftTiming: '',
          requiredSkills: []
        });
        setEditingJobId(null);
        setActiveTab('jobs');
        loadEmployerDashboard(myCompanies);
      } else {
        const data = await res.json();
        alert(data.error || (isEdit ? 'Failed to update job' : 'Failed to post job'));
      }
    } catch (err) {
      alert(editingJobId ? 'Error updating job' : 'Error posting job');
    }
  };

  // Delete a job
  const handleDeleteJob = async (jobId: string) => {
    if (!window.confirm('Are you sure you want to delete this job recruitment? All applications for this job will also be deleted.')) {
      return;
    }
    try {
      const res = await fetch(`/api/jobs?jobId=${jobId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        alert('Job recruitment deleted successfully!');
        loadEmployerDashboard(myCompanies);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete job');
      }
    } catch (err) {
      alert('Error deleting job');
    }
  };

  // Apply for a job
  const handleApplyJob = async (jobId: string) => {
    setApplyingJobId(jobId);
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId })
      });

      if (res.ok) {
        alert('Applied successfully! AI pitch generated and sent to company owner.');
        if (user?.seekerProfile) {
          loadSeekerDashboard(user.seekerProfile);
        }
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to apply');
      }
    } catch (err) {
      alert('Error applying to job');
    } finally {
      setApplyingJobId(null);
    }
  };

  // Update application status
  const handleUpdateAppStatus = async (applicationId: string, newStatus: string) => {
    try {
      const res = await fetch('/api/applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId, status: newStatus })
      });

      if (res.ok) {
        loadEmployerDashboard(myCompanies);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update status');
      }
    } catch (err) {
      alert('Error updating status');
    }
  };

  // Helpers for chip additions
  const toggleSeekerSkill = (skill: string) => {
    setSeekerForm(prev => {
      const exists = prev.skills.includes(skill);
      const skills = exists
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill];
      return { ...prev, skills };
    });
  };

  const toggleSeekerAvailability = (slot: string) => {
    setSeekerForm(prev => {
      const exists = prev.availability.includes(slot);
      const availability = exists
        ? prev.availability.filter(a => a !== slot)
        : [...prev.availability, slot];
      return { ...prev, availability };
    });
  };

  const toggleSeekerLanguage = (lang: string) => {
    setSeekerForm(prev => {
      const exists = prev.languages.includes(lang);
      const languages = exists
        ? prev.languages.filter(l => l !== lang)
        : [...prev.languages, lang];
      return { ...prev, languages };
    });
  };

  const toggleJobSkill = (skill: string) => {
    setJobForm(prev => {
      const exists = prev.requiredSkills.includes(skill);
      const requiredSkills = exists
        ? prev.requiredSkills.filter(s => s !== skill)
        : [...prev.requiredSkills, skill];
      return { ...prev, requiredSkills };
    });
  };

  const renderResumePoints = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    return (
      <ul style={{ paddingLeft: '0', margin: '8px 0 0 0' }}>
        {lines.map((line, idx) => (
          <li key={idx} style={{
            fontSize: '0.9rem',
            color: 'var(--text-main)',
            lineHeight: '1.6',
            marginBottom: '6px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            listStyle: 'none'
          }}>
            <span style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: '2px' }}>•</span>
            <span>{line.replace(/^•\s*/, '')}</span>
          </li>
        ))}
      </ul>
    );
  };

  // Loading Screen
  if (status === 'loading' || profileLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '16px' }}>
        <RefreshCw style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary)' }} size={48} />
        <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-secondary)' }}>Loading JobHunt...</p>
        <style jsx global>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Auth Screen: Sign in with Google
  if (status === 'unauthenticated') {
    return (
      <div style={{ maxWidth: '480px', margin: '100px auto', padding: '24px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '10px', right: '36px', zIndex: 10 }}>
          <button
            onClick={toggleTheme}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 12px', borderRadius: '10px' }}
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
        <div className="glass" style={{ padding: '48px 32px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '28px' }}>
          <div>
            <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '16px', background: 'var(--color-primary-glow)', color: 'var(--color-primary)', marginBottom: '16px' }}>
              <Briefcase size={36} />
            </div>
            <h1 style={{ fontSize: '2.4rem', marginBottom: '8px', color: '#ffffff' }}>JobHunt</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Local Part-Time Jobs Finder & AI Pitch Application</p>
          </div>

          {!googleConfigured && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#FCA5A5', padding: '16px', borderRadius: '12px', fontSize: '0.9rem', textAlign: 'left', lineHeight: 1.5 }}>
              <strong style={{ display: 'block', marginBottom: '6px', color: '#EF4444' }}>⚠️ Developer Setup Required:</strong>
              Please configure your Google OAuth Client credentials inside your <strong>.env.local</strong> file:
              <code style={{ display: 'block', background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '6px', margin: '8px 0', fontSize: '0.8rem', wordBreak: 'break-all' }}>
                GOOGLE_CLIENT_ID=your_id.apps.googleusercontent.com<br />
                GOOGLE_CLIENT_SECRET=your_secret
              </code>
              Sign-In redirects will fail with an error until credentials are set.
            </div>
          )}

          <button
            onClick={() => signIn('google')}
            className="btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '16px',
              fontSize: '1rem',
              background: '#ffffff',
              color: '#1F2937',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}
          >
            {/* Google Logo svg */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  // Onboarding Role Selection Screen
  if (selectedRole === null && !user?.hasSeekerProfile && !user?.hasCompanyProfile) {
    return (
      <div style={{ maxWidth: '680px', margin: '80px auto', padding: '24px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '24px', right: '36px', zIndex: 10 }}>
          <button
            onClick={toggleTheme}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 12px', borderRadius: '10px' }}
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px', color: 'var(--text-title)' }}>Choose Your Role</h1>
          <p style={{ color: 'var(--text-muted)' }}>Are you looking for work, or are you a company owner hiring staff?</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div
            className="glass"
            onClick={() => setSelectedRole('seeker')}
            style={{ padding: '40px 24px', textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}
          >
            <div style={{ padding: '16px', borderRadius: '50%', background: 'var(--color-primary-glow)', color: 'var(--color-primary)' }}>
              <User size={40} />
            </div>
            <h2 style={{ fontSize: '1.4rem', color: '#ffffff' }}>Find Part-Time Jobs</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Quickly search nearby small jobs and apply with a single tap using instant AI resumes.</p>
            <button className="btn-primary" style={{ marginTop: '16px', width: '100%' }}>I Want to Work</button>
          </div>

          <div
            className="glass"
            onClick={() => setSelectedRole('employer')}
            style={{ padding: '40px 24px', textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}
          >
            <div style={{ padding: '16px', borderRadius: '50%', background: 'var(--color-secondary-glow)', color: 'var(--color-secondary)' }}>
              <Store size={40} />
            </div>
            <h2 style={{ fontSize: '1.4rem', color: '#ffffff' }}>Hire Staff</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Register your company, post local requirements, and receive AI-tailored candidate summaries directly.</p>
            <button className="btn-accent" style={{ marginTop: '16px', width: '100%' }}>I am Hiring</button>
          </div>
        </div>
      </div>
    );
  }

  // Profile Creation Screen: Seeker
  if (selectedRole === 'seeker' && !user?.hasSeekerProfile) {
    return (
      <div style={{ maxWidth: '640px', margin: '40px auto', padding: '24px' }} className="animate-fade-in">
        <div className="glass" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h1 style={{ fontSize: '1.6rem', color: 'var(--text-title)' }}>Create Seeker Profile</h1>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={toggleTheme}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 12px', borderRadius: '10px' }}
                title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button onClick={handleSignOut} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px' }}>
                <LogOut size={16} /> Logout
              </button>
            </div>
          </div>

          <form onSubmit={handleSeekerOnboarding} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>FULL NAME</label>
              <input
                type="text"
                placeholder="Rohan Sharma"
                value={seekerForm.name}
                onChange={(e) => setSeekerForm(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>PHONE NUMBER (Optional, for employer callbacks)</label>
              <input
                type="tel"
                placeholder="9876543210"
                value={seekerForm.phone}
                onChange={(e) => setSeekerForm(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>LOCALITY / NEIGHBORHOOD (India specific, e.g., Indiranagar, Bangalore)</label>
              <input
                type="text"
                placeholder="Indiranagar, Bangalore"
                value={seekerForm.locality}
                onChange={(e) => setSeekerForm(prev => ({ ...prev, locality: e.target.value }))}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>EXPERIENCE LEVEL</label>
              <select
                value={seekerForm.experienceLevel}
                onChange={(e) => setSeekerForm(prev => ({ ...prev, experienceLevel: e.target.value }))}
                style={{ width: '100%' }}
              >
                <option value="none">No Prior Experience</option>
                <option value="1-6 months">1 - 6 Months</option>
                <option value="6-12 months">6 - 12 Months</option>
                <option value="1+ years">1+ Years</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>SKILLS (Select all that apply)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {AVAILABLE_SKILLS.map(skill => (
                  <div
                    key={skill}
                    onClick={() => toggleSeekerSkill(skill)}
                    className={`tag-selector ${seekerForm.skills.includes(skill) ? 'active' : ''}`}
                  >
                    {seekerForm.skills.includes(skill) && <Check size={14} />}
                    {skill.replace('_', ' ')}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>AVAILABILITY</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {AVAILABILITY_SLOTS.map(slot => (
                  <div
                    key={slot}
                    onClick={() => toggleSeekerAvailability(slot)}
                    className={`tag-selector ${seekerForm.availability.includes(slot) ? 'active' : ''}`}
                  >
                    {seekerForm.availability.includes(slot) && <Check size={14} />}
                    {slot.replace('_', ' ')}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>LANGUAGES SPOKEN</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {LANGUAGES_POOL.map(lang => (
                  <div
                    key={lang}
                    onClick={() => toggleSeekerLanguage(lang)}
                    className={`tag-selector ${seekerForm.languages.includes(lang) ? 'active' : ''}`}
                  >
                    {seekerForm.languages.includes(lang) && <Check size={14} />}
                    {lang}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>PREFERRED COMMUNICATION LANGUAGE (FOR AI RESUMES & PITCHES)</label>
              <select
                value={seekerForm.preferredLanguage}
                onChange={(e) => setSeekerForm(prev => ({ ...prev, preferredLanguage: e.target.value }))}
                style={{ width: '100%' }}
              >
                <option value="English">English</option>
                <option value="Hinglish">Hinglish (mix of Hindi + English)</option>
                <option value="Hindi">Hindi (हिंदी)</option>
                <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
                <option value="Tamil">Tamil (தமிழ்)</option>
                <option value="Telugu">Telugu (తెలుగు)</option>
                <option value="Bengali">Bengali (বাংলা)</option>
              </select>
            </div>

            <button type="submit" className="btn-primary" style={{ padding: '14px', marginTop: '8px' }}>
              Create Seeker Profile
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Profile Creation Screen: Company Owner
  if (selectedRole === 'employer' && !user?.hasCompanyProfile) {
    return (
      <div style={{ maxWidth: '640px', margin: '40px auto', padding: '24px' }} className="animate-fade-in">
        <div className="glass" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h1 style={{ fontSize: '1.6rem', color: 'var(--text-title)' }}>Register Your Company</h1>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={toggleTheme}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 12px', borderRadius: '10px' }}
                title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button onClick={handleSignOut} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px' }}>
                <LogOut size={16} /> Logout
              </button>
            </div>
          </div>

          <form onSubmit={handleCompanyOnboarding} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>COMPANY NAME</label>
              <input
                type="text"
                placeholder="Sai Supermarket"
                value={companyForm.companyName}
                onChange={(e) => setCompanyForm(prev => ({ ...prev, companyName: e.target.value }))}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>CATEGORY</label>
              <select
                value={companyForm.category}
                onChange={(e) => setCompanyForm(prev => ({ ...prev, category: e.target.value }))}
              >
                {COMPANY_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>COMPANY ADDRESS (Used for geocoding to show nearby job seekers)</label>
              <textarea
                placeholder="100 Feet Rd, Indiranagar, Bengaluru, Karnataka 560038"
                value={companyForm.address}
                onChange={(e) => setCompanyForm(prev => ({ ...prev, address: e.target.value }))}
                rows={3}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>OWNER PHONE NUMBER</label>
              <input
                type="tel"
                placeholder="9876543210"
                value={companyForm.ownerPhone}
                onChange={(e) => setCompanyForm(prev => ({ ...prev, ownerPhone: e.target.value }))}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>PREFERRED LANGUAGE FOR INCOMING PITCHES</label>
              <select
                value={companyForm.preferredLanguage}
                onChange={(e) => setCompanyForm(prev => ({ ...prev, preferredLanguage: e.target.value }))}
                style={{ width: '100%' }}
              >
                <option value="English">English</option>
                <option value="Hinglish">Hinglish (mix of Hindi + English)</option>
                <option value="Hindi">Hindi (हिंदी)</option>
                <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
                <option value="Tamil">Tamil (தமிழ்)</option>
                <option value="Telugu">Telugu (తెలుగు)</option>
                <option value="Bengali">Bengali (বাংলা)</option>
              </select>
            </div>

            <button type="submit" className="btn-primary" style={{ padding: '14px', marginTop: '8px' }}>
              Register Company Profile
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ==================== SEEKER VIEW ====================
  if (selectedRole === 'seeker') {
    const filteredJobs = jobs.filter(job =>
      job.title.toLowerCase().includes(seekerSearch.toLowerCase()) ||
      job.companyId?.companyName.toLowerCase().includes(seekerSearch.toLowerCase())
    );

    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Navigation Bar */}
        <header style={{ borderBottom: '1px solid var(--border-glass)', background: 'var(--bg-header)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: 'var(--color-primary-glow)', color: 'var(--color-primary)', padding: '8px', borderRadius: '10px' }}>
                <Briefcase size={22} />
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-title)' }}>JobHunt <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)', background: 'var(--color-primary-glow)', padding: '2px 8px', borderRadius: '12px', marginLeft: '6px', fontWeight: 500 }}>Seeker</span></h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.03)', padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--border-glass)', fontSize: '0.9rem' }}>
                <MapPin size={14} style={{ color: 'var(--color-secondary)' }} />
                <span>{user?.seekerProfile?.locality}</span>
              </div>
              <button
                onClick={toggleTheme}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 12px', borderRadius: '10px' }}
                title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button onClick={handleSignOut} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}>
                <LogOut size={16} /> Logout
              </button>
            </div>
          </div>
        </header>

        {/* Seeker Dashboard Tabs */}
        <div style={{ background: 'rgba(255, 255, 255, 0.01)', borderBottom: '1px solid var(--border-glass)' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', display: 'flex', gap: '24px' }}>
            <button
              onClick={() => setSeekerTab('find-jobs')}
              style={{
                background: 'transparent',
                color: seekerTab === 'find-jobs' ? '#ffffff' : 'var(--text-muted)',
                borderBottom: seekerTab === 'find-jobs' ? '2px solid var(--color-primary)' : '2px solid transparent',
                padding: '16px 8px',
                borderRadius: 0,
                fontSize: '0.95rem'
              }}
            >
              Find Nearby Jobs
            </button>
            <button
              onClick={() => setSeekerTab('my-applications')}
              style={{
                background: 'transparent',
                color: seekerTab === 'my-applications' ? '#ffffff' : 'var(--text-muted)',
                borderBottom: seekerTab === 'my-applications' ? '2px solid var(--color-primary)' : '2px solid transparent',
                padding: '16px 8px',
                borderRadius: 0,
                fontSize: '0.95rem'
              }}
            >
              My Applications ({myApplications.length})
            </button>
            <button
              onClick={() => setSeekerTab('edit-profile')}
              style={{
                background: 'transparent',
                color: seekerTab === 'edit-profile' ? '#ffffff' : 'var(--text-muted)',
                borderBottom: seekerTab === 'edit-profile' ? '2px solid var(--color-primary)' : '2px solid transparent',
                padding: '16px 8px',
                borderRadius: 0,
                fontSize: '0.95rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <User size={16} /> My Profile
            </button>
          </div>
        </div>

        {/* Content Body */}
        <main style={{ flex: 1, maxWidth: '1200px', width: '100%', margin: '32px auto', padding: '0 24px', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>

          {/* Main Seeker Content Area */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {seekerTab === 'find-jobs' && (
              <>
                {/* Geocoded Location Search & Filters */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Location Area Search Form */}
                  <form onSubmit={handleAreaSearch} className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>SEARCH BY NEIGHBORHOOD OR CITY AREA</label>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <MapPin size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
                        <input
                          type="text"
                          placeholder="Type neighborhood name (e.g. Koramangala, Indiranagar, Whitefield)"
                          value={searchAreaInput}
                          onChange={(e) => setSearchAreaInput(e.target.value)}
                          style={{ paddingLeft: '44px' }}
                        />
                      </div>
                      <button type="submit" className="btn-primary" disabled={geocodingArea} style={{ padding: '10px 20px', minWidth: '120px' }}>
                        {geocodingArea ? 'Searching...' : 'Search Area'}
                      </button>
                    </div>
                    {(activeAreaName || customCoords) && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-primary-glow)', padding: '8px 16px', borderRadius: '10px', fontSize: '0.85rem' }}>
                        <span>Showing jobs near: <strong>{activeAreaName || searchAreaInput}</strong></span>
                        <button type="button" onClick={handleResetLocation} style={{ background: 'transparent', color: 'var(--color-secondary)', fontSize: '0.8rem', padding: 0 }}>
                          Reset to Profile Locality
                        </button>
                      </div>
                    )}
                  </form>

                  {/* Distance Slider and keyword Search */}
                  <div className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ position: 'relative' }}>
                      <Search size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        placeholder="Filter jobs or companies by name (e.g. cashier, pantry helper)"
                        value={seekerSearch}
                        onChange={(e) => setSeekerSearch(e.target.value)}
                        style={{ paddingLeft: '44px', paddingRight: '14px' }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', borderTop: '1px solid var(--border-glass)', paddingTop: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Search Radius:</span>
                        <input
                          type="range"
                          min="1"
                          max="15"
                          value={distance}
                          onChange={(e) => setDistance(e.target.value)}
                          style={{ width: '150px', accentColor: 'var(--color-primary)' }}
                        />
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-primary)' }}>{distance} km</span>
                      </div>

                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Found {filteredJobs.length} local jobs near {activeAreaName || 'your locality'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Jobs List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {filteredJobs.length === 0 ? (
                    <div className="glass" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <MapPin size={48} style={{ color: 'var(--text-muted)', marginBottom: '12px', opacity: 0.5 }} />
                      <h3>No jobs found within {distance}km.</h3>
                      <p style={{ fontSize: '0.9rem', marginTop: '6px' }}>Try increasing the search radius range or searching a different area.</p>
                    </div>
                  ) : (
                    filteredJobs.map((job) => {
                      const alreadyApplied = myApplications.find(app => app.jobId?._id === job._id || app.jobId === job._id);

                      return (
                        <div key={job._id} className="glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                            <div>
                              <span style={{ fontSize: '0.75rem', background: 'rgba(99, 102, 241, 0.15)', color: '#A5B4FC', padding: '4px 10px', borderRadius: '12px', fontWeight: 600, textTransform: 'uppercase' }}>
                                {job.category}
                              </span>
                              <h3 style={{ fontSize: '1.3rem', color: '#ffffff', marginTop: '8px' }}>{job.title}</h3>
                              <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                <Store size={14} /> {job.companyId?.companyName || 'Local Company'}
                                <span style={{ color: 'var(--border-glass-glow)' }}>•</span>
                                <MapPin size={14} /> {job.companyId?.address.split(',')[0]} ({job.companyId?.category})
                              </p>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-accent)' }}>
                                <Coins size={16} />
                                ₹{job.payMin}
                                {job.payMax && ` - ₹${job.payMax}`}
                              </span>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                per {job.payType}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', borderTop: '1px solid var(--border-glass)', borderBottom: '1px solid var(--border-glass)', padding: '12px 0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                              <Clock size={14} />
                              <span>Shift: {job.shiftTiming}</span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                              <Layers size={14} />
                              <span>Required: {job.requiredSkills.join(', ')}</span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            {alreadyApplied ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent)', fontWeight: 600 }}>
                                  <CheckCircle2 size={20} /> Applied (Status: {alreadyApplied.status})
                                </div>
                                {alreadyApplied.status === 'hired' && job.companyId?.ownerPhone && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-hired)', fontSize: '0.85rem', fontWeight: 600, marginTop: '4px' }}>
                                    <Phone size={14} /> Company Contact: +91 {job.companyId.ownerPhone}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <button
                                onClick={() => handleApplyJob(job._id)}
                                disabled={applyingJobId !== null}
                                className="btn-primary"
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px' }}
                              >
                                {applyingJobId === job._id ? (
                                  <>Applying & Generating Pitch...</>
                                ) : (
                                  <>
                                    <Sparkles size={16} /> Apply with AI Resume
                                  </>
                                )}
                              </button>
                            )}
                          </div>

                          {alreadyApplied && (
                            <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px dashed var(--border-glass)', padding: '16px', borderRadius: '12px', marginTop: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-primary)', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                                <Sparkles size={14} /> AI Tailored Resume Pitch:
                              </div>
                              {renderResumePoints(alreadyApplied.resumeText)}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}

            {/* TAB: My Applications */}
            {seekerTab === 'my-applications' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h2 style={{ fontSize: '1.5rem', color: '#ffffff' }}>Your Job Applications</h2>
                {myApplications.length === 0 ? (
                  <div className="glass" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Briefcase size={48} style={{ color: 'var(--text-muted)', marginBottom: '12px', opacity: 0.5 }} />
                    <h3>No job applications submitted yet.</h3>
                    <p style={{ fontSize: '0.9rem', marginTop: '6px' }}>Go to the "Find Nearby Jobs" tab to apply to part-time jobs in your area.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {myApplications.map((app) => {
                      const job = app.jobId;
                      const company = job?.companyId;

                      return (
                        <div key={app._id} className="glass animate-fade-in" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                            <div>
                              <span style={{ fontSize: '0.75rem', background: 'rgba(99, 102, 241, 0.15)', color: '#A5B4FC', padding: '4px 10px', borderRadius: '12px', fontWeight: 600, textTransform: 'uppercase' }}>
                                {job?.category || 'General'}
                              </span>
                              <h3 style={{ fontSize: '1.3rem', color: '#ffffff', marginTop: '8px' }}>{job?.title || 'Job Post'}</h3>
                              <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                <Store size={14} /> {company?.companyName || 'Local Company'}
                                <span style={{ color: 'var(--border-glass-glow)' }}>•</span>
                                <MapPin size={14} /> {company?.address?.split(',')[0]}
                              </p>
                              {app.status === 'hired' && company?.ownerPhone && (
                                <p style={{ fontSize: '0.9rem', color: 'var(--color-hired)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontWeight: 600 }}>
                                  <Phone size={14} /> Company Owner Contact: +91 {company.ownerPhone}
                                </p>
                              )}
                            </div>

                            <span style={{
                              fontSize: '0.75rem', textTransform: 'uppercase', padding: '4px 10px', borderRadius: '12px', fontWeight: 700,
                              background: app.status === 'hired' ? 'var(--bg-status-success)' : app.status === 'rejected' ? 'var(--bg-status-error)' : 'var(--bg-status-info)',
                              color: app.status === 'hired' ? 'var(--color-status-success)' : app.status === 'rejected' ? 'var(--color-status-error)' : 'var(--color-status-info)'
                            }}>
                              {app.status}
                            </span>
                          </div>

                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', borderTop: '1px solid var(--border-glass)', borderBottom: '1px solid var(--border-glass)', padding: '12px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Clock size={14} />
                              <span>Shift: {job?.shiftTiming}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Coins size={14} />
                              <span>Pay: ₹{job?.payMin} per {job?.payType}</span>
                            </div>
                          </div>

                          <div style={{ background: 'rgba(99, 102, 241, 0.04)', border: '1px solid rgba(99, 102, 241, 0.15)', padding: '16px', borderRadius: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-primary)', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                              <Sparkles size={14} /> AI Tailored Resume Pitch:
                            </div>
                            {renderResumePoints(app.resumeText)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB: Edit Seeker Profile */}
            {seekerTab === 'edit-profile' && (
              <div className="glass animate-fade-in" style={{ padding: '32px' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '24px', color: '#ffffff' }}>Update Seeker Profile</h2>
                <form onSubmit={handleSeekerOnboarding} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>FULL NAME</label>
                    <input
                      type="text"
                      placeholder="Rohan Sharma"
                      value={seekerForm.name}
                      onChange={(e) => setSeekerForm(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>PHONE NUMBER (Optional, for employer callbacks)</label>
                    <input
                      type="tel"
                      placeholder="9876543210"
                      value={seekerForm.phone}
                      onChange={(e) => setSeekerForm(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>LOCALITY / NEIGHBORHOOD (India specific, e.g., Indiranagar, Bangalore)</label>
                    <input
                      type="text"
                      placeholder="Indiranagar, Bangalore"
                      value={seekerForm.locality}
                      onChange={(e) => setSeekerForm(prev => ({ ...prev, locality: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>EXPERIENCE LEVEL</label>
                    <select
                      value={seekerForm.experienceLevel}
                      onChange={(e) => setSeekerForm(prev => ({ ...prev, experienceLevel: e.target.value }))}
                      style={{ width: '100%' }}
                    >
                      <option value="none">No Prior Experience</option>
                      <option value="1-6 months">1 - 6 Months</option>
                      <option value="6-12 months">6 - 12 Months</option>
                      <option value="1+ years">1+ Years</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>SKILLS (Select all that apply)</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {AVAILABLE_SKILLS.map(skill => (
                        <div
                          key={skill}
                          onClick={() => toggleSeekerSkill(skill)}
                          className={`tag-selector ${seekerForm.skills.includes(skill) ? 'active' : ''}`}
                        >
                          {seekerForm.skills.includes(skill) && <Check size={14} />}
                          {skill.replace('_', ' ')}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>AVAILABILITY</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {AVAILABILITY_SLOTS.map(slot => (
                        <div
                          key={slot}
                          onClick={() => toggleSeekerAvailability(slot)}
                          className={`tag-selector ${seekerForm.availability.includes(slot) ? 'active' : ''}`}
                        >
                          {seekerForm.availability.includes(slot) && <Check size={14} />}
                          {slot.replace('_', ' ')}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>LANGUAGES SPOKEN</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {LANGUAGES_POOL.map(lang => (
                        <div
                          key={lang}
                          onClick={() => toggleSeekerLanguage(lang)}
                          className={`tag-selector ${seekerForm.languages.includes(lang) ? 'active' : ''}`}
                        >
                          {seekerForm.languages.includes(lang) && <Check size={14} />}
                          {lang}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>PREFERRED COMMUNICATION LANGUAGE (FOR AI RESUMES & PITCHES)</label>
                    <select
                      value={seekerForm.preferredLanguage}
                      onChange={(e) => setSeekerForm(prev => ({ ...prev, preferredLanguage: e.target.value }))}
                      style={{ width: '100%' }}
                    >
                      <option value="English">English</option>
                      <option value="Hinglish">Hinglish (mix of Hindi + English)</option>
                      <option value="Hindi">Hindi (हिंदी)</option>
                      <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
                      <option value="Tamil">Tamil (தமிழ்)</option>
                      <option value="Telugu">Telugu (తెలుగు)</option>
                      <option value="Bengali">Bengali (বাংলা)</option>
                    </select>
                  </div>

                  <button type="submit" className="btn-primary" style={{ padding: '14px', marginTop: '8px' }}>
                    Save Profile Changes
                  </button>
                </form>
              </div>
            )}
          </section>

          {/* Seeker Profile / AI Chatbot Sidebar Panel */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {seekerTab === 'edit-profile' ? (
              <div className="glass" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <User size={18} /> My Profile Info
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>FULL NAME</span>
                    <span style={{ fontSize: '1rem', fontWeight: 600 }}>{user?.seekerProfile?.name}</span>
                  </div>

                  {user?.seekerProfile?.phone && (
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>PHONE NUMBER</span>
                      <span style={{ fontSize: '1rem', fontWeight: 600 }}>+91 {user?.seekerProfile?.phone}</span>
                    </div>
                  )}

                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>EMAIL ADDRESS</span>
                    <span style={{ fontSize: '1rem', fontWeight: 600 }}>{user?.seekerProfile?.email}</span>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>EXPERIENCE LEVEL</span>
                    <span style={{ fontSize: '1rem', fontWeight: 600, textTransform: 'capitalize' }}>{user?.seekerProfile?.experienceLevel}</span>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>SKILLS</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {user?.seekerProfile?.skills.map((s: string) => (
                        <span key={s} style={{ fontSize: '0.75rem', background: 'var(--color-primary-glow)', border: '1px solid var(--border-glass)', padding: '3px 10px', borderRadius: '12px', color: 'var(--color-primary)', fontWeight: 500 }}>{s}</span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>AVAILABILITY</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {user?.seekerProfile?.availability.map((a: string) => (
                        <span key={a} style={{ fontSize: '0.75rem', background: 'var(--color-primary-glow)', border: '1px solid var(--border-glass)', padding: '3px 10px', borderRadius: '12px', color: 'var(--color-primary)', fontWeight: 500 }}>{a.replace('_', ' ')}</span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>LANGUAGES</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {user?.seekerProfile?.languages.map((l: string) => (
                        <span key={l} style={{ fontSize: '0.75rem', background: 'var(--color-primary-glow)', border: '1px solid var(--border-glass)', padding: '3px 10px', borderRadius: '12px', color: 'var(--color-primary)', fontWeight: 500 }}>{l}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', height: 'fit-content' }}>
                <h3 style={{ fontSize: '1.2rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px', margin: 0 }}>
                  <MessageSquare size={18} style={{ color: 'var(--color-primary)' }} /> JobHunt AI Assistant
                </h3>

                {/* Message list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '280px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '85%',
                        padding: '10px 14px',
                        borderRadius: '14px',
                        fontSize: '0.9rem',
                        lineHeight: '1.4',
                        background: msg.role === 'user' ? 'var(--grad-primary)' : 'rgba(255, 255, 255, 0.05)',
                        border: msg.role === 'user' ? 'none' : '1px solid var(--border-glass)',
                        color: msg.role === 'user' ? '#ffffff' : 'var(--text-main)',
                        alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        whiteSpace: 'pre-line'
                      }}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div style={{ alignSelf: 'flex-start', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', padding: '10px 14px', borderRadius: '14px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      Thinking...
                    </div>
                  )}
                </div>

                {/* Chips / Quick prompts */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', borderTop: '1px solid var(--border-glass)', paddingTop: '12px' }}>
                  <button onClick={() => handleSendChatMessage(undefined, "Find me a remote job")} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '20px' }}>
                    🔍 Remote Jobs
                  </button>
                  <button onClick={() => handleSendChatMessage(undefined, "Suggest courses to improve my skills")} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '20px' }}>
                    📚 Skill Courses
                  </button>
                  <button onClick={() => handleSendChatMessage(undefined, "How do I improve my resume?")} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '20px' }}>
                    ✍️ Resume Help
                  </button>
                </div>

                {/* Input form */}
                <form onSubmit={(e) => handleSendChatMessage(e)} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Ask about jobs, skills, etc..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    style={{ flex: 1, padding: '10px 14px' }}
                    disabled={chatLoading}
                  />
                  <button type="submit" className="btn-primary" style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} disabled={chatLoading}>
                    <Send size={16} />
                  </button>
                </form>
              </div>
            )}
          </aside>
        </main>
      </div>
    );
  }

  // ==================== EMPLOYER VIEW ====================
  if (selectedRole === 'employer') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Navigation Bar */}
        <header style={{ borderBottom: '1px solid var(--border-glass)', background: 'var(--bg-header)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: 'var(--color-secondary-glow)', color: 'var(--color-secondary)', padding: '8px', borderRadius: '10px' }}>
                <Store size={22} />
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-title)' }}>JobHunt <span style={{ fontSize: '0.8rem', color: 'var(--color-secondary)', background: 'var(--color-secondary-glow)', padding: '2px 8px', borderRadius: '12px', marginLeft: '6px', fontWeight: 500 }}>Employer</span></h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {myCompanies.length > 1 ? (
                <select
                  value={selectedCompanyId}
                  onChange={(e) => handleCompanyChange(e.target.value)}
                  style={{ width: 'auto', background: 'rgba(255,255,255,0.04)', padding: '6px 12px', fontSize: '0.9rem' }}
                >
                  {myCompanies.map(company => (
                    <option key={company._id} value={company._id}>{company.companyName}</option>
                  ))}
                </select>
              ) : (
                myCompanies.length === 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.03)', padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--border-glass)', fontSize: '0.9rem' }}>
                    <Store size={14} style={{ color: 'var(--color-primary)' }} />
                    <span>{myCompanies[0].companyName}</span>
                  </div>
                )
              )}
              <button
                onClick={toggleTheme}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 12px', borderRadius: '10px' }}
                title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button onClick={handleSignOut} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}>
                <LogOut size={16} /> Logout
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard Tabs bar */}
        <div style={{ background: 'rgba(255, 255, 255, 0.01)', borderBottom: '1px solid var(--border-glass)' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', display: 'flex', gap: '24px' }}>
            <button
              onClick={() => setActiveTab('jobs')}
              style={{
                background: 'transparent',
                color: activeTab === 'jobs' ? '#ffffff' : 'var(--text-muted)',
                borderBottom: activeTab === 'jobs' ? '2px solid var(--color-primary)' : '2px solid transparent',
                padding: '16px 8px',
                borderRadius: 0,
                fontSize: '0.95rem'
              }}
            >
              My Posted Jobs ({employerJobs.length})
            </button>
            <button
              onClick={() => setActiveTab('post-job')}
              style={{
                background: 'transparent',
                color: activeTab === 'post-job' ? '#ffffff' : 'var(--text-muted)',
                borderBottom: activeTab === 'post-job' ? '2px solid var(--color-primary)' : '2px solid transparent',
                padding: '16px 8px',
                borderRadius: 0,
                fontSize: '0.95rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Plus size={16} /> Post a Job
            </button>
            <button
              onClick={() => setActiveTab('applications')}
              style={{
                background: 'transparent',
                color: activeTab === 'applications' ? '#ffffff' : 'var(--text-muted)',
                borderBottom: activeTab === 'applications' ? '2px solid var(--color-primary)' : '2px solid transparent',
                padding: '16px 8px',
                borderRadius: 0,
                fontSize: '0.95rem'
              }}
            >
              Received Applications ({receivedApplications.length})
            </button>
            <button
              onClick={() => setActiveTab('edit-company')}
              style={{
                background: 'transparent',
                color: activeTab === 'edit-company' ? '#ffffff' : 'var(--text-muted)',
                borderBottom: activeTab === 'edit-company' ? '2px solid var(--color-primary)' : '2px solid transparent',
                padding: '16px 8px',
                borderRadius: 0,
                fontSize: '0.95rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Store size={16} /> Company Profile
            </button>
          </div>
        </div>

        {/* Content Body */}
        <main style={{ flex: 1, maxWidth: '1200px', width: '100%', margin: '32px auto', padding: '0 24px' }}>

          {/* TAB 1: Posted Jobs */}
          {activeTab === 'jobs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.5rem', color: '#ffffff' }}>Active Job Recruitments</h2>
                <button onClick={() => setActiveTab('post-job')} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Plus size={16} /> Post a Job
                </button>
              </div>

              {employerJobs.length === 0 ? (
                <div className="glass" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Briefcase size={48} style={{ color: 'var(--text-muted)', marginBottom: '12px', opacity: 0.5 }} />
                  <h3>You haven't posted any jobs yet.</h3>
                  <p style={{ fontSize: '0.9rem', marginTop: '6px' }}>Tap the "Post a Job" button to start recruiting staff for your company.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
                  {employerJobs.map(job => {
                    const appCount = receivedApplications.filter(app => {
                      const appId = typeof app.jobId === 'object' && app.jobId !== null ? app.jobId._id : app.jobId;
                      return appId === job._id;
                    }).length;

                    return (
                      <div key={job._id} className="glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <span style={{ fontSize: '0.7rem', background: 'rgba(255, 255, 255, 0.06)', padding: '2px 8px', borderRadius: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                              {job.category}
                            </span>
                            <h3 style={{ fontSize: '1.2rem', color: '#ffffff', marginTop: '8px' }}>{job.title}</h3>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                            <span style={{ fontSize: '0.75rem', background: 'var(--bg-status-success)', color: 'var(--color-status-success)', padding: '4px 8px', borderRadius: '12px', fontWeight: 600 }}>
                              {job.status.toUpperCase()}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                              {appCount} {appCount === 1 ? 'applicant' : 'applicants'}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-glass)', borderBottom: '1px solid var(--border-glass)', padding: '12px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Coins size={14} />
                            <span>Pay: ₹{job.payMin} {job.payMax && `- ₹${job.payMax}`} / {job.payType}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Clock size={14} />
                            <span>Shift: {job.shiftTiming}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Layers size={14} />
                            <span>Skills required: {job.requiredSkills.join(', ') || 'None specified'}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-glass)', paddingTop: '12px' }}>
                          <span>Posted: {new Date(job.postedAt).toLocaleDateString()}</span>
                          <div style={{ display: 'flex', gap: '14px' }}>
                            <button
                              onClick={() => {
                                setSelectedJobFilter(job._id);
                                setActiveTab('applications');
                              }}
                              style={{ background: 'transparent', color: 'var(--color-primary)', fontSize: '0.85rem', padding: 0 }}
                            >
                              View Applications
                            </button>
                            <button
                              onClick={() => {
                                setJobForm({
                                  companyId: job.companyId?._id || job.companyId,
                                  title: job.title,
                                  category: job.category,
                                  payType: job.payType,
                                  payMin: job.payMin.toString(),
                                  payMax: job.payMax ? job.payMax.toString() : '',
                                  shiftTiming: job.shiftTiming,
                                  requiredSkills: job.requiredSkills || []
                                });
                                setEditingJobId(job._id);
                                setActiveTab('post-job');
                              }}
                              style={{ background: 'transparent', color: 'var(--color-secondary)', fontSize: '0.85rem', padding: 0 }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteJob(job._id)}
                              style={{ background: 'transparent', color: '#FCA5A5', fontSize: '0.85rem', padding: 0 }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Post Job Form */}
          {activeTab === 'post-job' && (
            <div style={{ maxWidth: '640px', margin: '0 auto' }} className="animate-fade-in">
              <div className="glass" style={{ padding: '32px' }}>
                <h2 style={{ fontSize: '1.4rem', marginBottom: '24px', color: '#ffffff' }}>
                  {editingJobId ? 'Edit Job Post' : 'Create Job Post'}
                </h2>

                <form onSubmit={handlePostJob} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>JOB TITLE</label>
                    <input
                      type="text"
                      placeholder="Retail Cashier / Kitchen Assistant"
                      value={jobForm.title}
                      onChange={(e) => setJobForm(prev => ({ ...prev, title: e.target.value }))}
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>CATEGORY</label>
                      <select
                        value={jobForm.category}
                        onChange={(e) => setJobForm(prev => ({ ...prev, category: e.target.value }))}
                      >
                        {COMPANY_CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>SHIFT TIMING</label>
                      <input
                        type="text"
                        placeholder="e.g. 5 PM - 10 PM (Weekday)"
                        value={jobForm.shiftTiming}
                        onChange={(e) => setJobForm(prev => ({ ...prev, shiftTiming: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>PAY TYPE</label>
                      <select
                        value={jobForm.payType}
                        onChange={(e) => setJobForm(prev => ({ ...prev, payType: e.target.value as any }))}
                      >
                        <option value="fixed">Fixed</option>
                        <option value="hourly">Hourly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>MIN PAY (₹)</label>
                      <input
                        type="number"
                        placeholder="300"
                        value={jobForm.payMin}
                        onChange={(e) => setJobForm(prev => ({ ...prev, payMin: e.target.value }))}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>MAX PAY (Optional)</label>
                      <input
                        type="number"
                        placeholder="500"
                        value={jobForm.payMax}
                        onChange={(e) => setJobForm(prev => ({ ...prev, payMax: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>REQUIRED SKILLS (Select all that apply)</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {AVAILABLE_SKILLS.map(skill => (
                        <div
                          key={skill}
                          onClick={() => toggleJobSkill(skill)}
                          className={`tag-selector ${jobForm.requiredSkills.includes(skill) ? 'active' : ''}`}
                        >
                          {jobForm.requiredSkills.includes(skill) && <Check size={14} />}
                          {skill.replace('_', ' ')}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                    <button type="submit" className="btn-primary" style={{ flex: 1, padding: '14px' }}>
                      {editingJobId ? 'Save Job Changes' : 'Publish Recruitment Post'}
                    </button>
                    {editingJobId && (
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                          setEditingJobId(null);
                          setJobForm({
                            companyId: selectedCompanyId,
                            title: '',
                            category: 'Grocery',
                            payType: 'fixed',
                            payMin: '',
                            payMax: '',
                            shiftTiming: '',
                            requiredSkills: []
                          });
                          setActiveTab('jobs');
                        }}
                        style={{ padding: '14px', minWidth: '120px' }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: Applications Received */}
          {activeTab === 'applications' && (() => {
            const displayedApplications = selectedJobFilter
              ? receivedApplications.filter(app => (app.jobId?._id || app.jobId) === selectedJobFilter)
              : receivedApplications;
            const filteredJob = employerJobs.find(j => j._id === selectedJobFilter);

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <h2 style={{ fontSize: '1.5rem', color: '#ffffff' }}>Job Applications Received</h2>
                  {selectedJobFilter && (
                    <button
                      onClick={() => setSelectedJobFilter(null)}
                      className="btn-secondary"
                      style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
                    >
                      Show All Applications
                    </button>
                  )}
                </div>

                {selectedJobFilter && filteredJob && (
                  <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '12px 18px', borderRadius: '12px', fontSize: '0.9rem', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Showing applications only for: <strong>{filteredJob.title}</strong></span>
                    <button
                      onClick={() => setSelectedJobFilter(null)}
                      style={{ background: 'transparent', color: '#FCA5A5', padding: 0, border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                    >
                      Clear Filter
                    </button>
                  </div>
                )}

                {displayedApplications.length === 0 ? (
                  <div className="glass" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Send size={48} style={{ color: 'var(--text-muted)', marginBottom: '12px', opacity: 0.5 }} />
                    <h3>No applications received {selectedJobFilter ? 'for this role' : 'yet'}.</h3>
                    <p style={{ fontSize: '0.9rem', marginTop: '6px' }}>
                      {selectedJobFilter
                        ? 'Try clearing the filter to view applications for other job postings.'
                        : 'Seekers will find your jobs and apply. Check back here to see their AI pitches.'}
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {displayedApplications.map((app) => (
                      <div key={app._id} className="glass animate-fade-in" style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
                        {/* Left: Applicant details */}
                        <div style={{ borderRight: '1px solid var(--border-glass)', paddingRight: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>CANDIDATE</span>
                            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>{app.seeker?.name}</span>
                            {app.status === 'hired' ? (
                              app.seeker?.phone && (
                                <span style={{ fontSize: '0.85rem', color: 'var(--color-hired)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontWeight: 600 }}>
                                  <Phone size={12} /> +91 {app.seeker?.phone}
                                </span>
                              )
                            ) : (
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', opacity: 0.7 }}>
                                <Phone size={12} style={{ opacity: 0.5 }} /> Contact hidden until hired
                              </span>
                            )}
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', wordBreak: 'break-all', marginTop: '2px' }}>
                              {app.seeker?.email}
                            </span>
                          </div>

                          <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>LOCALITY</span>
                            <span style={{ fontSize: '0.9rem', color: '#ffffff' }}>{app.seeker?.locality}</span>
                          </div>

                          <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>EXPERIENCE LEVEL</span>
                            <span style={{ fontSize: '0.9rem', color: '#ffffff', textTransform: 'capitalize' }}>{app.seeker?.experienceLevel}</span>
                          </div>

                          <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>LANGUAGES</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {app.seeker?.languages?.map((lang: string) => (
                                <span key={lang} style={{ fontSize: '0.75rem', background: 'rgba(255, 255, 255, 0.04)', padding: '2px 8px', borderRadius: '8px' }}>
                                  {lang}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Right: Pitch & Actions */}
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                              <span style={{ fontSize: '0.75rem', background: 'rgba(99, 102, 241, 0.15)', color: '#A5B4FC', padding: '4px 10px', borderRadius: '12px', fontWeight: 600, textTransform: 'uppercase' }}>
                                Applied For: {app.jobId?.title || 'General Job'}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {app.fitScore !== undefined && (
                                  <span style={{
                                    fontSize: '0.75rem', padding: '4px 10px', borderRadius: '12px', fontWeight: 800,
                                    background: app.fitScore >= 85 ? 'rgba(16, 185, 129, 0.15)' : app.fitScore >= 60 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                    color: app.fitScore >= 85 ? '#34D399' : app.fitScore >= 60 ? '#FBBF24' : '#F87171',
                                    border: `1px solid ${app.fitScore >= 85 ? 'rgba(16, 185, 129, 0.3)' : app.fitScore >= 60 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                                  }}>
                                    ⭐ {app.fitScore}% Match
                                  </span>
                                )}
                                <span style={{
                                  fontSize: '0.75rem', textTransform: 'uppercase', padding: '4px 10px', borderRadius: '12px', fontWeight: 700,
                                  background: app.status === 'hired' ? 'var(--bg-status-success)' : app.status === 'rejected' ? 'var(--bg-status-error)' : 'var(--bg-status-info)',
                                  color: app.status === 'hired' ? 'var(--color-status-success)' : app.status === 'rejected' ? 'var(--color-status-error)' : 'var(--color-status-info)'
                                }}>
                                  {app.status}
                                </span>
                              </div>
                            </div>

                            {app.fitExplanation && (
                              <div style={{
                                background: 'rgba(255, 255, 255, 0.02)',
                                borderLeft: `3px solid ${app.fitScore && app.fitScore >= 85 ? '#10B981' : app.fitScore && app.fitScore >= 60 ? '#F59E0B' : '#EF4444'}`,
                                padding: '12px 16px',
                                borderRadius: '0 8px 8px 0',
                                marginTop: '12px',
                                fontSize: '0.85rem',
                                color: 'var(--text-muted)'
                              }}>
                                <strong style={{ color: '#ffffff' }}>AI Fit Analysis:</strong> {app.fitExplanation}
                              </div>
                            )}

                            <div style={{ background: 'rgba(99, 102, 241, 0.04)', border: '1px solid rgba(99, 102, 241, 0.15)', padding: '20px', borderRadius: '12px', marginTop: '16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-primary)', fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px' }}>
                                <Sparkles size={14} /> AI resume pitch (Translated to your preferred language):
                              </div>
                              {renderResumePoints(app.translatedResumeText || app.resumeText)}
                              {app.translatedResumeText && app.translatedResumeText !== app.resumeText && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '8px', fontStyle: 'italic' }}>
                                  * Translated from Seeker's native language ({app.seeker?.preferredLanguage || 'unknown'})
                                </span>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-glass)', paddingTop: '16px' }}>
                            {app.status === 'applied' && (
                              <>
                                <button
                                  onClick={() => handleUpdateAppStatus(app._id, 'rejected')}
                                  className="btn-secondary"
                                  style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#FCA5A5', padding: '8px 16px', borderRadius: '10px' }}
                                >
                                  <XCircle size={14} /> Reject
                                </button>
                                <button
                                  onClick={() => handleUpdateAppStatus(app._id, 'shortlisted')}
                                  className="btn-secondary"
                                  style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6366F1', padding: '8px 16px', borderRadius: '10px', border: '1px solid rgba(99, 102, 241, 0.3)' }}
                                >
                                  <Sparkles size={14} /> Shortlist
                                </button>
                                <button
                                  onClick={() => handleUpdateAppStatus(app._id, 'hired')}
                                  className="btn-primary"
                                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', padding: '8px 16px', borderRadius: '10px' }}
                                >
                                  <UserCheck size={14} /> Hire Seeker
                                </button>
                              </>
                            )}
                            {app.status === 'shortlisted' && (
                              <>
                                <button
                                  onClick={() => handleUpdateAppStatus(app._id, 'rejected')}
                                  className="btn-secondary"
                                  style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#FCA5A5', padding: '8px 16px', borderRadius: '10px' }}
                                >
                                  <XCircle size={14} /> Reject
                                </button>
                                <button
                                  onClick={() => handleUpdateAppStatus(app._id, 'hired')}
                                  className="btn-primary"
                                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', padding: '8px 16px', borderRadius: '10px' }}
                                >
                                  <UserCheck size={14} /> Hire Seeker
                                </button>
                              </>
                            )}
                            {app.status === 'rejected' && (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Rejected</span>
                            )}
                            {app.status === 'hired' && (
                              <span style={{ color: 'var(--color-accent)', fontSize: '0.9rem', fontWeight: 600 }}>Hired!</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* TAB 4: Edit Company Profile */}
          {activeTab === 'edit-company' && (
            <div style={{ maxWidth: '640px', margin: '0 auto' }}>
              <div className="glass" style={{ padding: '32px' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '24px', color: '#ffffff' }}>Update Company Profile</h2>
                <form onSubmit={(e) => handleCompanyOnboarding(e, true)} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>COMPANY NAME</label>
                    <input
                      type="text"
                      placeholder="Sai Supermarket"
                      value={companyForm.companyName}
                      onChange={(e) => setCompanyForm(prev => ({ ...prev, companyName: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>CATEGORY</label>
                    <select
                      value={companyForm.category}
                      onChange={(e) => setCompanyForm(prev => ({ ...prev, category: e.target.value }))}
                    >
                      {COMPANY_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>COMPANY ADDRESS (Used for geocoding to show nearby job seekers)</label>
                    <textarea
                      placeholder="100 Feet Rd, Indiranagar, Bengaluru, Karnataka 560038"
                      value={companyForm.address}
                      onChange={(e) => setCompanyForm(prev => ({ ...prev, address: e.target.value }))}
                      rows={3}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>OWNER PHONE NUMBER</label>
                    <input
                      type="tel"
                      placeholder="9876543210"
                      value={companyForm.ownerPhone}
                      onChange={(e) => setCompanyForm(prev => ({ ...prev, ownerPhone: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>PREFERRED LANGUAGE FOR INCOMING PITCHES</label>
                    <select
                      value={companyForm.preferredLanguage}
                      onChange={(e) => setCompanyForm(prev => ({ ...prev, preferredLanguage: e.target.value }))}
                      style={{ width: '100%' }}
                    >
                      <option value="English">English</option>
                      <option value="Hinglish">Hinglish (mix of Hindi + English)</option>
                      <option value="Hindi">Hindi (हिंदी)</option>
                      <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
                      <option value="Tamil">Tamil (தமிழ்)</option>
                      <option value="Telugu">Telugu (తెలుగు)</option>
                      <option value="Bengali">Bengali (বাংলা)</option>
                    </select>
                  </div>

                  <button type="submit" className="btn-primary" style={{ padding: '14px', marginTop: '8px' }}>
                    Save Company Profile Changes
                  </button>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  return null;
}
