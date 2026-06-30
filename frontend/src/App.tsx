import React, { useState, useEffect, useCallback } from 'react';
import {
  MapPin, Briefcase, Clock, Coins, User, Store, Phone,
  ArrowRight, CheckCircle, LogOut, Search, Sparkles,
  Send, UserCheck, XCircle, RefreshCw, Check,
  Sun, Moon, Info
} from 'lucide-react';

// Pool of fixed skills/tags
const AVAILABLE_SKILLS = [
  'cashier', 'delivery', 'kitchen help', 'data entry',
  'retail assistant', 'cleaning', 'security', 'waiter',
  'helper', 'barista', 'receptionist', 'gardener',
  'designer', 'poster designer'
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

export default function App() {
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [mockEmailInput, setMockEmailInput] = useState('');
  const [mockPasswordInput, setMockPasswordInput] = useState('');
  const [mockConfirmPasswordInput, setMockConfirmPasswordInput] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authError, setAuthError] = useState<string | null>(null);

  // Toast notifications state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Auto-dismiss toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  const renderToast = () => {
    if (!toast) return null;
    return (
      <div className="animate-fade-in" style={{
        position: 'fixed',
        top: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        padding: '12px 24px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        backdropFilter: 'blur(8px)',
        border: toast.type === 'success' ? '1px solid var(--color-status-success)' : toast.type === 'error' ? '1px solid var(--color-status-error)' : '1px solid var(--color-primary)',
        background: toast.type === 'success' ? 'var(--bg-status-success)' : toast.type === 'error' ? 'var(--bg-status-error)' : 'var(--color-primary-glow)',
        color: toast.type === 'success' ? 'var(--color-status-success)' : toast.type === 'error' ? 'var(--color-status-error)' : 'var(--color-primary)',
        fontWeight: 600,
        fontSize: '0.9rem'
      }}>
        {toast.type === 'success' ? <CheckCircle size={18} /> : toast.type === 'error' ? <XCircle size={18} /> : <Info size={18} />}
        <span>{toast.message}</span>
      </div>
    );
  };

  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Profile data
  const [user, setUser] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);

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
  const [filterJobId, setFilterJobId] = useState<string | null>(null);

  // Fetch Headers Helper
  const getHeaders = useCallback((): HeadersInit => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };
    const email = localStorage.getItem('user_email');
    if (email) {
      headers['x-user-email'] = email;
    }
    return headers;
  }, []);

  // Theme effects
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

  // Seeker Dashboard Fetchers
  const loadSeekerDashboard = async (profile: any, coords: { lat: number; lng: number } | null = customCoords) => {
    try {
      let url = `/api/jobs?distance=${distance}`;
      if (coords) {
        url += `&lat=${coords.lat}&lng=${coords.lng}`;
      }

      const jobsRes = await fetch(url, { headers: getHeaders() });
      if (jobsRes.ok) {
        let jobsData = await jobsRes.json();
        const seekerLang = profile?.preferredLanguage || 'English';
        if (seekerLang.toLowerCase() !== 'english') {
          try {
            const transRes = await fetch('/api/jobs/translate', {
              method: 'POST',
              headers: getHeaders(),
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

      const appsRes = await fetch('/api/applications?role=seeker', { headers: getHeaders() });
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

        const jobsRes = await fetch(`/api/jobs?companyId=${defaultCompanyId}`, { headers: getHeaders() });
        if (jobsRes.ok) {
          const jobsData = await jobsRes.json();
          setEmployerJobs(jobsData);
        }
      }

      const appsRes = await fetch('/api/applications?role=employer', { headers: getHeaders() });
      if (appsRes.ok) {
        const appsData = await appsRes.json();
        setReceivedApplications(appsData);
      }
    } catch (err) {
      console.error('Error loading employer dashboard:', err);
    }
  };

  // Load profile details
  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const res = await fetch('/api/auth/me', { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          setStatus('authenticated');
          setUser(data);

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
        } else {
          setStatus('unauthenticated');
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setStatus('unauthenticated');
    } finally {
      setProfileLoading(false);
    }
  }, [getHeaders, selectedCompanyId]);

  // Load profile on session start
  useEffect(() => {
    const savedEmail = localStorage.getItem('user_email');
    if (savedEmail) {
      loadProfile();
    } else {
      setStatus('unauthenticated');
    }
  }, []);

  // Recalculate based on distance changes
  useEffect(() => {
    if (status === 'authenticated' && selectedRole === 'seeker' && user?.seekerProfile) {
      loadSeekerDashboard(user.seekerProfile, customCoords);
    }
  }, [distance]);

  // Real-time background updates polling (every 10 seconds)
  useEffect(() => {
    if (status !== 'authenticated') return;

    const interval = setInterval(() => {
      if (selectedRole === 'seeker' && user?.seekerProfile) {
        loadSeekerDashboard(user.seekerProfile, customCoords);
      }
      if (selectedRole === 'employer' && myCompanies.length > 0) {
        loadEmployerDashboard(myCompanies);
      }
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [status, selectedRole, user, myCompanies, customCoords, distance, selectedCompanyId]);

  // Handle company select dropdown change
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

    const jobsRes = await fetch(`/api/jobs?companyId=${companyId}`, { headers: getHeaders() });
    if (jobsRes.ok) {
      const jobsData = await jobsRes.json();
      setEmployerJobs(jobsData);
    }
  };

  // Sign In flow
  const handleSignIn = async (email: string, password?: string) => {
    if (!email) return;
    setProfileLoading(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('user_email', data.email);
        loadProfile();
      } else {
        const data = await res.json();
        setAuthError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setAuthError('Error during login');
    } finally {
      setProfileLoading(false);
    }
  };

  // Sign Up flow
  const handleSignUp = async (email: string, password?: string) => {
    if (!email || !password) return;
    setProfileLoading(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (res.ok) {
        // Auto-login after successful signup
        await handleSignIn(email, password);
      } else {
        const data = await res.json();
        setAuthError(data.error || 'Registration failed');
      }
    } catch (err) {
      setAuthError('Error during registration');
    } finally {
      setProfileLoading(false);
    }
  };

  // Sign out flow
  const handleSignOut = () => {
    localStorage.removeItem('user_email');
    setStatus('unauthenticated');
    setUser(null);
    setSelectedRole(null);
    setJobs([]);
    setMyCompanies([]);
    setReceivedApplications([]);
  };

  // Handle Area Geocoding Search
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
          await loadSeekerDashboard(user?.seekerProfile, newCoords);
        } else {
          showToast('Location not found. Try searching for a different neighborhood or city.', 'error');
        }
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      showToast('Failed to search area. Please try again.', 'error');
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

  // Submit seeker profile
  const handleSeekerOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/seeker/profile', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(seekerForm)
      });
      if (res.ok) {
        await loadProfile();
        showToast('Profile saved successfully!', 'success');
        setSeekerTab('find-jobs');
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to save profile', 'error');
      }
    } catch (err) {
      showToast('Error saving profile', 'error');
    }
  };

  // AI Chat helper
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
        headers: getHeaders(),
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

  // Submit company profile
  const handleCompanyOnboarding = async (e: React.FormEvent, isUpdate = false) => {
    e.preventDefault();
    try {
      const body = {
        ...companyForm,
        ...(isUpdate ? { companyId: selectedCompanyId } : {})
      };

      const res = await fetch('/api/company/profile', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body)
      });
      if (res.ok) {
        await loadProfile();
        showToast(isUpdate ? 'Company profile updated successfully!' : 'Company registered successfully!', 'success');
        if (isUpdate) {
          setActiveTab('jobs');
        }
      } else {
        const data = await res.json();
        showToast(data.error || (isUpdate ? 'Failed to update company' : 'Failed to register company'), 'error');
      }
    } catch (err) {
      showToast(isUpdate ? 'Error updating company' : 'Error registering company', 'error');
    }
  };

  // Post or Edit Job opening
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
        headers: getHeaders(),
        body: JSON.stringify(body)
      });

      if (res.ok) {
        showToast(isEdit ? 'Job updated successfully!' : 'Job posted successfully!', 'success');
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
        showToast(data.error || (isEdit ? 'Failed to update job' : 'Failed to post job'), 'error');
      }
    } catch (err) {
      showToast(editingJobId ? 'Error updating job' : 'Error posting job', 'error');
    }
  };

  // Delete Job Opening
  const handleDeleteJob = async (jobId: string) => {
    if (!window.confirm('Are you sure you want to delete this job recruitment? All applications for this job will also be deleted.')) {
      return;
    }
    try {
      const res = await fetch(`/api/jobs?jobId=${jobId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        showToast('Job recruitment deleted successfully!', 'success');
        loadEmployerDashboard(myCompanies);
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to delete job', 'error');
      }
    } catch (err) {
      showToast('Error deleting job', 'error');
    }
  };

  // Apply to Job
  const handleApplyJob = async (jobId: string) => {
    setApplyingJobId(jobId);
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ jobId })
      });

      if (res.ok) {
        showToast('Applied successfully! AI pitch generated and sent to company owner.', 'success');
        if (user?.seekerProfile) {
          loadSeekerDashboard(user.seekerProfile);
        }
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to apply', 'error');
      }
    } catch (err) {
      showToast('Error applying to job', 'error');
    } finally {
      setApplyingJobId(null);
    }
  };

  // Update application status
  const handleUpdateAppStatus = async (applicationId: string, newStatus: string) => {
    try {
      const res = await fetch('/api/applications', {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ applicationId, status: newStatus })
      });

      if (res.ok) {
        showToast(`Candidate status updated to ${newStatus}!`, 'success');
        loadEmployerDashboard(myCompanies);
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to update status', 'error');
      }
    } catch (err) {
      showToast('Error updating status', 'error');
    }
  };

  // Toggle skills selections
  const toggleSeekerSkill = (skill: string) => {
    setSeekerForm(prev => {
      const exists = prev.skills.includes(skill);
      const skills = exists ? prev.skills.filter(s => s !== skill) : [...prev.skills, skill];
      return { ...prev, skills };
    });
  };

  const toggleSeekerAvailability = (slot: string) => {
    setSeekerForm(prev => {
      const exists = prev.availability.includes(slot);
      const availability = exists ? prev.availability.filter(a => a !== slot) : [...prev.availability, slot];
      return { ...prev, availability };
    });
  };

  const toggleSeekerLanguage = (lang: string) => {
    setSeekerForm(prev => {
      const exists = prev.languages.includes(lang);
      const languages = exists ? prev.languages.filter(l => l !== lang) : [...prev.languages, lang];
      return { ...prev, languages };
    });
  };

  const toggleJobSkill = (skill: string) => {
    setJobForm(prev => {
      const exists = prev.requiredSkills.includes(skill);
      const requiredSkills = exists ? prev.requiredSkills.filter(s => s !== skill) : [...prev.requiredSkills, skill];
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
        <RefreshCw style={{ animation: 'spin 1.2s linear infinite', color: 'var(--color-primary)' }} size={48} />
        <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-secondary)' }}>Loading JobHunt Portal...</p>
      </div>
    );
  }

  // Auth Screen: Sign In & Sign Up
  if (status === 'unauthenticated') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '24px' }}>
        <div style={{ width: '100%', maxWidth: '440px', position: 'relative' }}>
          <div className="glass" style={{ padding: '32px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10 }}>
              <button
                onClick={toggleTheme}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 12px', borderRadius: '10px' }}
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </div>
            <div>
              <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '16px', background: 'var(--color-primary-glow)', color: 'var(--color-primary)', marginBottom: '8px' }}>
                <Briefcase size={36} />
              </div>
              <h1 style={{ fontSize: '2.2rem', marginBottom: '4px', color: '#ffffff' }}>JobHunt</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Local Job Finder & AI Resume Generator</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-title)', textAlign: 'center', marginBottom: '4px' }}>
                {authMode === 'login' ? 'Log In' : 'Sign Up'}
              </h3>

              {authError && (
                <div style={{ color: 'var(--color-status-error)', background: 'var(--bg-status-error)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 500, border: '1px solid rgba(239, 68, 68, 0.25)', textAlign: 'center' }}>
                  {authError}
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>EMAIL ADDRESS</label>
                <input
                  type="email"
                  placeholder="e.g. rohan@gmail.com"
                  value={mockEmailInput}
                  onChange={(e) => setMockEmailInput(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>PASSWORD</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={mockPasswordInput}
                  onChange={(e) => setMockPasswordInput(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px' }}
                />
              </div>

              {authMode === 'signup' && (
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>CONFIRM PASSWORD</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={mockConfirmPasswordInput}
                    onChange={(e) => setMockConfirmPasswordInput(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px' }}
                  />
                </div>
              )}

              <button
                onClick={() => {
                  if (authMode === 'login') {
                    handleSignIn(mockEmailInput, mockPasswordInput);
                  } else {
                    if (mockPasswordInput !== mockConfirmPasswordInput) {
                      setAuthError("Passwords do not match!");
                      return;
                    }
                    handleSignUp(mockEmailInput, mockPasswordInput);
                  }
                }}
                disabled={!mockEmailInput.trim() || !mockPasswordInput.trim() || (authMode === 'signup' && !mockConfirmPasswordInput.trim())}
                className="btn-primary"
                style={{ padding: '12px', width: '100%', marginTop: '4px' }}
              >
                {authMode === 'login' ? 'Log In' : 'Sign Up'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '4px' }}>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setAuthMode(authMode === 'login' ? 'signup' : 'login');
                    setMockConfirmPasswordInput('');
                    setAuthError(null);
                  }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  {authMode === 'login' ? "Don't have an account? Sign Up" : 'Already have an account? Log In'}
                </button>
              </div>
            </div>
          </div>
        </div>
        {renderToast()}
      </div>
    );
  }

  // Onboarding Selection Screen
  if (selectedRole === null && !user?.hasSeekerProfile && !user?.hasCompanyProfile) {
    return (
      <div style={{ maxWidth: '680px', margin: '80px auto', padding: '24px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '24px', right: '36px', zIndex: 10 }}>
          <button
            onClick={toggleTheme}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 12px', borderRadius: '10px' }}
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
            <button className="btn-primary" style={{ marginTop: '16px', width: '100%' }}>I am Hiring</button>
          </div>
        </div>
        {renderToast()}
      </div>
    );
  }

  // Seeker Onboarding Form
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
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>PHONE NUMBER (Optional)</label>
              <input
                type="tel"
                placeholder="9876543210"
                maxLength={10}
                pattern="[0-9]{10}"
                value={seekerForm.phone}
                onChange={(e) => setSeekerForm(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>LOCALITY (e.g. Indiranagar, Bangalore)</label>
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



            <button type="submit" className="btn-primary" style={{ padding: '14px', marginTop: '8px' }}>
              Create Seeker Profile
            </button>
          </form>
        </div>
        {renderToast()}
      </div>
    );
  }

  // Company Onboarding Form
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
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>ADDRESS</label>
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
                maxLength={10}
                pattern="[0-9]{10}"
                value={companyForm.ownerPhone}
                onChange={(e) => setCompanyForm(prev => ({ ...prev, ownerPhone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                required
              />
            </div>

            <button type="submit" className="btn-primary" style={{ padding: '14px', marginTop: '8px' }}>
              Register Company
            </button>
          </form>
        </div>
        {renderToast()}
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
        <header style={{ borderBottom: '1px solid var(--border-glass)', background: 'var(--bg-header)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: 'var(--color-primary-glow)', color: 'var(--color-primary)', padding: '8px', borderRadius: '10px' }}>
                <Briefcase size={22} />
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-title)' }}>
                JobHunt <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)', background: 'var(--color-primary-glow)', padding: '2px 8px', borderRadius: '12px', marginLeft: '6px', fontWeight: 500 }}>Seeker</span>
              </h2>
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
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button onClick={handleSignOut} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}>
                <LogOut size={16} /> Logout
              </button>
            </div>
          </div>
        </header>

        <main style={{ flex: 1, maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '32px 24px', display: 'grid', gridTemplateColumns: '1fr 360px', gap: '32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
              <button
                onClick={() => setSeekerTab('find-jobs')}
                className={seekerTab === 'find-jobs' ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '8px 16px', fontSize: '0.9rem', borderRadius: '20px' }}
              >
                Find Jobs
              </button>
              <button
                onClick={() => setSeekerTab('my-applications')}
                className={seekerTab === 'my-applications' ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '8px 16px', fontSize: '0.9rem', borderRadius: '20px' }}
              >
                My Applications ({myApplications.length})
              </button>
              <button
                onClick={() => setSeekerTab('edit-profile')}
                className={seekerTab === 'edit-profile' ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '8px 16px', fontSize: '0.9rem', borderRadius: '20px' }}
              >
                My Profile
              </button>
            </div>

            {/* TAB: FIND JOBS */}
            {seekerTab === 'find-jobs' && (
              <>
                {/* Search & Radius filter */}
                <div className="glass animate-fade-in" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <Search size={18} style={{ position: 'absolute', left: '14px', top: '13px', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        placeholder="Search jobs or companies..."
                        value={seekerSearch}
                        onChange={(e) => setSeekerSearch(e.target.value)}
                        style={{ paddingLeft: '42px', width: '100%' }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '180px' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>WITHIN:</label>
                      <select value={distance} onChange={(e) => setDistance(e.target.value)}>
                        <option value="2">2 km</option>
                        <option value="5">5 km</option>
                        <option value="10">10 km</option>
                        <option value="20">20 km</option>
                      </select>
                    </div>
                  </div>

                  {/* Search by area */}
                  <form onSubmit={handleAreaSearch} style={{ display: 'flex', gap: '12px', borderTop: '1px solid var(--border-glass)', paddingTop: '20px' }}>
                    <input
                      type="text"
                      placeholder="Or search near a specific area (e.g. Koramangala, Bengaluru)"
                      value={searchAreaInput}
                      onChange={(e) => setSearchAreaInput(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button type="submit" disabled={geocodingArea} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', whiteSpace: 'nowrap' }}>
                      {geocodingArea ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <MapPin size={16} />}
                      Search Area
                    </button>
                    {activeAreaName && (
                      <button type="button" onClick={handleResetLocation} className="btn-secondary" style={{ padding: '10px' }}>
                        Reset
                      </button>
                    )}
                  </form>

                  {activeAreaName && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-primary)', background: 'var(--color-primary-glow)', padding: '6px 12px', borderRadius: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <Sparkles size={14} /> Showing jobs near: <strong>{activeAreaName}</strong>
                    </div>
                  )}
                </div>

                {/* Job Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {filteredJobs.length === 0 ? (
                    <div className="glass" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No matching jobs found in this distance. Try increasing the distance filter or changing locality.
                    </div>
                  ) : (
                    filteredJobs.map(job => {
                      const hasApplied = myApplications.some(app => app.jobId?._id === job._id || app.jobId === job._id);
                      return (
                        <div key={job._id} className="glass animate-fade-in" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                              <span style={{ fontSize: '0.8rem', background: 'var(--color-primary-glow)', color: 'var(--color-primary)', padding: '4px 10px', borderRadius: '12px', fontWeight: 600 }}>
                                {job.category}
                              </span>
                              <h3 style={{ fontSize: '1.25rem', marginTop: '6px', color: 'var(--text-title)' }}>{job.title}</h3>
                              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                <Store size={14} /> {job.companyId?.companyName} • {job.companyId?.address.split(',')[0]}
                              </p>
                            </div>

                            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                                <Coins size={14} style={{ color: 'var(--color-accent)' }} />
                                <span>₹{job.payMin}{job.payMax ? ' - ₹' + job.payMax : ''} / {job.payType}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                                <Clock size={14} style={{ color: 'var(--color-primary)' }} />
                                <span>{job.shiftTiming}</span>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginRight: '4px' }}>Skills Required:</span>
                              {job.requiredSkills && job.requiredSkills.length > 0 ? (
                                job.requiredSkills.map((skill: string) => (
                                  <span key={skill} style={{ fontSize: '0.75rem', background: 'var(--color-primary-glow)', color: 'var(--color-primary)', border: '1px solid rgba(99, 102, 241, 0.25)', padding: '3px 10px', borderRadius: '12px', fontWeight: 500, textTransform: 'capitalize' }}>
                                    {skill.replace('_', ' ')}
                                  </span>
                                ))
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>None</span>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: '130px' }}>
                            {hasApplied ? (
                              <button disabled style={{ background: 'var(--bg-status-success)', color: 'var(--color-status-success)', cursor: 'default', display: 'flex', alignItems: 'center', gap: '6px', padding: '10px' }}>
                                <CheckCircle size={16} /> Applied
                              </button>
                            ) : (
                              <button
                                onClick={() => handleApplyJob(job._id)}
                                disabled={applyingJobId === job._id}
                                className="btn-primary"
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px' }}
                              >
                                {applyingJobId === job._id ? (
                                  <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                ) : (
                                  <>
                                    Apply <ArrowRight size={16} />
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}

            {/* TAB: MY APPLICATIONS */}
            {seekerTab === 'my-applications' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {myApplications.length === 0 ? (
                  <div className="glass" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    You haven't applied for any jobs yet.
                  </div>
                ) : (
                  myApplications.map(app => {
                    const job = app.jobId;
                    if (!job) return null;
                    return (
                      <div key={app._id} className="glass animate-fade-in" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                          <div>
                            <h3 style={{ fontSize: '1.2rem', color: 'var(--text-title)' }}>{job.title}</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                              <Store size={14} /> {job.companyId?.companyName}
                            </p>
                            {app.status === 'hired' && (
                              <p style={{ color: 'var(--color-accent)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', fontWeight: 600 }}>
                                <Phone size={14} /> Contact Owner: {job.companyId?.ownerPhone || 'Not provided'}
                              </p>
                            )}
                          </div>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            background: app.status === 'hired' || app.status === 'shortlisted' ? 'var(--bg-status-success)' : app.status === 'rejected' ? 'var(--bg-status-error)' : 'var(--bg-status-info)',
                            color: app.status === 'hired' || app.status === 'shortlisted' ? 'var(--color-status-success)' : app.status === 'rejected' ? 'var(--color-status-error)' : 'var(--color-status-info)'
                          }}>
                            {app.status}
                          </span>
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                          <p style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 700, marginBottom: '8px', letterSpacing: '0.05em' }}>AI GENERATED PITCH FOR OWNER</p>
                          {renderResumePoints(app.resumeText)}
                        </div>

                        {app.fitExplanation && (
                          <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            <Sparkles size={14} style={{ color: 'var(--color-primary)' }} />
                            <span>Fit Analysis: <strong>{app.fitExplanation}</strong></span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB: EDIT PROFILE */}
            {seekerTab === 'edit-profile' && (
              <div className="glass animate-fade-in" style={{ padding: '32px' }}>
                <form onSubmit={handleSeekerOnboarding} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>FULL NAME</label>
                    <input
                      type="text"
                      value={seekerForm.name}
                      onChange={(e) => setSeekerForm(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>PHONE NUMBER</label>
                    <input
                      type="tel"
                      placeholder="9876543210"
                      maxLength={10}
                      pattern="[0-9]{10}"
                      value={seekerForm.phone}
                      onChange={(e) => setSeekerForm(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>LOCALITY / NEIGHBORHOOD</label>
                    <input
                      type="text"
                      value={seekerForm.locality}
                      onChange={(e) => setSeekerForm(prev => ({ ...prev, locality: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>EXPERIENCE LEVEL</label>
                    <select value={seekerForm.experienceLevel} onChange={(e) => setSeekerForm(prev => ({ ...prev, experienceLevel: e.target.value }))}>
                      <option value="none">No Prior Experience</option>
                      <option value="1-6 months">1 - 6 Months</option>
                      <option value="6-12 months">6 - 12 Months</option>
                      <option value="1+ years">1+ Years</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>SKILLS</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {AVAILABLE_SKILLS.map(skill => (
                        <div key={skill} onClick={() => toggleSeekerSkill(skill)} className={`tag-selector ${seekerForm.skills.includes(skill) ? 'active' : ''}`}>
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
                        <div key={slot} onClick={() => toggleSeekerAvailability(slot)} className={`tag-selector ${seekerForm.availability.includes(slot) ? 'active' : ''}`}>
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
                        <div key={lang} onClick={() => toggleSeekerLanguage(lang)} className={`tag-selector ${seekerForm.languages.includes(lang) ? 'active' : ''}`}>
                          {seekerForm.languages.includes(lang) && <Check size={14} />}
                          {lang}
                        </div>
                      ))}
                    </div>
                  </div>



                  <button type="submit" className="btn-primary" style={{ padding: '14px' }}>
                    Save Profile Changes
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* AI Career Assistant Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'sticky', top: '88px', maxHeight: '600px', height: 'fit-content' }}>
            <div className="glass" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px', height: '550px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
                <Sparkles style={{ color: 'var(--color-primary)' }} size={20} />
                <h3 style={{ fontSize: '1.1rem', color: '#ffffff' }}>JobHunt AI Guide</h3>
              </div>

              {/* Chat Log */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px', maxHeight: '380px' }}>
                {chatMessages.map((msg, idx) => (
                  <div key={idx} style={{
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    background: msg.role === 'user' ? 'var(--color-primary-glow)' : 'rgba(255,255,255,0.03)',
                    border: msg.role === 'user' ? '1px solid var(--color-primary)' : '1px solid var(--border-glass)',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    maxWidth: '85%',
                    fontSize: '0.85rem',
                    lineHeight: '1.4',
                    whiteSpace: 'pre-wrap',
                    color: 'var(--text-main)'
                  }}>
                    {msg.content}
                  </div>
                ))}
                {chatLoading && (
                  <div style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', padding: '10px 14px', borderRadius: '12px', fontSize: '0.85rem' }}>
                    Thinking...
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendChatMessage} style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-glass)', paddingTop: '12px' }}>
                <input
                  type="text"
                  placeholder="Ask about courses, skills, or resume..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }}
                />
                <button type="submit" className="btn-primary" style={{ padding: '8px 12px' }}>
                  <Send size={14} />
                </button>
              </form>
            </div>
          </div>
        </main>
        {renderToast()}
      </div>
    );
  }

  // ==================== EMPLOYER VIEW ====================
  if (selectedRole === 'employer') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <header style={{ borderBottom: '1px solid var(--border-glass)', background: 'var(--bg-header)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: 'var(--color-secondary-glow)', color: 'var(--color-secondary)', padding: '8px', borderRadius: '10px' }}>
                <Store size={22} />
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-title)' }}>
                JobHunt <span style={{ fontSize: '0.8rem', color: 'var(--color-secondary)', background: 'var(--color-secondary-glow)', padding: '2px 8px', borderRadius: '12px', marginLeft: '6px', fontWeight: 500 }}>Employer</span>
              </h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {myCompanies.length > 0 && (
                <div style={{ minWidth: '180px' }}>
                  <select value={selectedCompanyId} onChange={(e) => handleCompanyChange(e.target.value)}>
                    {myCompanies.map(c => (
                      <option key={c._id} value={c._id}>{c.companyName}</option>
                    ))}
                  </select>
                </div>
              )}
              <button
                onClick={toggleTheme}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 12px', borderRadius: '10px' }}
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button onClick={handleSignOut} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}>
                <LogOut size={16} /> Logout
              </button>
            </div>
          </div>
        </header>

        <main style={{ flex: 1, maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Navigation tabs */}
          <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
            <button
              onClick={() => { setActiveTab('jobs'); setEditingJobId(null); }}
              className={activeTab === 'jobs' ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '8px 16px', fontSize: '0.9rem', borderRadius: '20px' }}
            >
              My Job Posts ({employerJobs.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('post-job');
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
              }}
              className={activeTab === 'post-job' ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '8px 16px', fontSize: '0.9rem', borderRadius: '20px' }}
            >
              Post a Job
            </button>
            <button
              onClick={() => { setActiveTab('applications'); setEditingJobId(null); setFilterJobId(null); }}
              className={activeTab === 'applications' ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '8px 16px', fontSize: '0.9rem', borderRadius: '20px' }}
            >
              Applications Received ({receivedApplications.filter(a => a.jobId?.companyId === selectedCompanyId || a.jobId?.companyId?._id === selectedCompanyId).length})
            </button>
            <button
              onClick={() => { setActiveTab('edit-company'); setEditingJobId(null); }}
              className={activeTab === 'edit-company' ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '8px 16px', fontSize: '0.9rem', borderRadius: '20px' }}
            >
              Company Settings
            </button>
          </div>

          {/* TAB: JOB LISTINGS */}
          {activeTab === 'jobs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {employerJobs.length === 0 ? (
                <div className="glass" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  You haven't posted any jobs for this company yet. Click 'Post a Job' above to start!
                </div>
              ) : (
                employerJobs.map(job => (
                  <div key={job._id} className="glass animate-fade-in" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.8rem', background: 'var(--color-primary-glow)', color: 'var(--color-primary)', padding: '4px 10px', borderRadius: '12px', fontWeight: 600 }}>
                        {job.category}
                      </span>
                      <h3 style={{ fontSize: '1.25rem', marginTop: '6px', color: 'var(--text-title)' }}>{job.title}</h3>
                      <div style={{ display: 'flex', gap: '16px', marginTop: '8px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          <Coins size={14} />
                          <span>₹{job.payMin}{job.payMax ? ' - ₹' + job.payMax : ''} / {job.payType}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          <Clock size={14} />
                          <span>{job.shiftTiming}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginRight: '4px' }}>Skills Required:</span>
                        {job.requiredSkills && job.requiredSkills.length > 0 ? (
                          job.requiredSkills.map((skill: string) => (
                            <span key={skill} style={{ fontSize: '0.75rem', background: 'var(--color-primary-glow)', color: 'var(--color-primary)', border: '1px solid rgba(99, 102, 241, 0.25)', padding: '3px 10px', borderRadius: '12px', fontWeight: 500, textTransform: 'capitalize' }}>
                              {skill.replace('_', ' ')}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>None</span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        onClick={() => {
                          setFilterJobId(job._id);
                          setActiveTab('applications');
                        }}
                        className="btn-primary"
                        style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                      >
                        Applications ({receivedApplications.filter(a => a.jobId?._id === job._id || a.jobId === job._id).length})
                      </button>
                      <button
                        onClick={() => {
                          setEditingJobId(job._id);
                          setJobForm({
                            companyId: job.companyId,
                            title: job.title,
                            category: job.category,
                            payType: job.payType,
                            payMin: String(job.payMin),
                            payMax: job.payMax ? String(job.payMax) : '',
                            shiftTiming: job.shiftTiming,
                            requiredSkills: job.requiredSkills || []
                          });
                          setActiveTab('post-job');
                        }}
                        className="btn-secondary"
                        style={{ padding: '8px 16px' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteJob(job._id)}
                        className="btn-secondary"
                        style={{ padding: '8px 16px', color: 'var(--color-status-error)' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB: POST OR EDIT JOB */}
          {activeTab === 'post-job' && (
            <div className="glass animate-fade-in" style={{ padding: '32px', maxWidth: '640px', margin: '0 auto', width: '100%' }}>
              <h2 style={{ fontSize: '1.4rem', marginBottom: '24px', color: 'var(--text-title)' }}>
                {editingJobId ? 'Edit Job Opening' : 'Post a New Job Requirement'}
              </h2>
              <form onSubmit={handlePostJob} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>JOB TITLE</label>
                  <input
                    type="text"
                    placeholder="Cashier or Delivery Boy"
                    value={jobForm.title}
                    onChange={(e) => setJobForm(prev => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>CATEGORY</label>
                  <select value={jobForm.category} onChange={(e) => setJobForm(prev => ({ ...prev, category: e.target.value }))}>
                    {COMPANY_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>PAY TYPE</label>
                  <select value={jobForm.payType} onChange={(e) => setJobForm(prev => ({ ...prev, payType: e.target.value as any }))}>
                    <option value="fixed">Fixed</option>
                    <option value="hourly">Hourly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>PAY MINIMUM (₹)</label>
                    <input
                      type="number"
                      placeholder="12000"
                      value={jobForm.payMin}
                      onChange={(e) => setJobForm(prev => ({ ...prev, payMin: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>PAY MAXIMUM (₹, Optional)</label>
                    <input
                      type="number"
                      placeholder="15000"
                      value={jobForm.payMax}
                      onChange={(e) => setJobForm(prev => ({ ...prev, payMax: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>SHIFT TIMINGS</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                    {['9 AM to 6 PM', '10 PM to 6 AM', '6 AM to 2 PM', '2 PM to 10 PM', 'Flexible Timings'].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '12px' }}
                        onClick={() => setJobForm(prev => ({ ...prev, shiftTiming: preset }))}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. 9 AM to 6 PM or custom timings"
                    value={jobForm.shiftTiming}
                    onChange={(e) => setJobForm(prev => ({ ...prev, shiftTiming: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>REQUIRED SKILLS</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {AVAILABLE_SKILLS.map(skill => (
                      <div key={skill} onClick={() => toggleJobSkill(skill)} className={`tag-selector ${jobForm.requiredSkills.includes(skill) ? 'active' : ''}`}>
                        {jobForm.requiredSkills.includes(skill) && <Check size={14} />}
                        {skill.replace('_', ' ')}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                  <button type="submit" className="btn-primary" style={{ flex: 1, padding: '14px' }}>
                    {editingJobId ? 'Save Changes' : 'Post Job Opening'}
                  </button>
                  {editingJobId && (
                    <button type="button" onClick={() => { setEditingJobId(null); setActiveTab('jobs'); }} className="btn-secondary" style={{ padding: '14px' }}>
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* TAB: APPLICATIONS RECEIVED */}
          {activeTab === 'applications' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filterJobId && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-primary-glow)', border: '1px solid rgba(99, 102, 241, 0.25)', padding: '12px 20px', borderRadius: '12px' }} className="animate-fade-in">
                  <span style={{ fontSize: '0.9rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                    Showing applications only for: <strong style={{ color: '#ffffff' }}>{employerJobs.find(j => j._id === filterJobId)?.title || 'Selected Job'}</strong>
                  </span>
                  <button
                    onClick={() => setFilterJobId(null)}
                    className="btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '20px' }}
                  >
                    Show All Applications
                  </button>
                </div>
              )}

              {receivedApplications.filter(a => (a.jobId?.companyId === selectedCompanyId || a.jobId?.companyId?._id === selectedCompanyId) && (!filterJobId || a.jobId?._id === filterJobId || a.jobId === filterJobId)).length === 0 ? (
                <div className="glass" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  {filterJobId ? 'No applications received for this specific job post yet.' : "No applications received yet for this company's postings."}
                </div>
              ) : (
                receivedApplications
                  .filter(a => (a.jobId?.companyId === selectedCompanyId || a.jobId?.companyId?._id === selectedCompanyId) && (!filterJobId || a.jobId?._id === filterJobId || a.jobId === filterJobId))
                  .map(app => {
                    const seeker = app.seeker;
                    const job = app.jobId;
                    return (
                      <div key={app._id} className="glass animate-fade-in" style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 240px', gap: '24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <h3 style={{ fontSize: '1.25rem', color: 'var(--text-title)' }}>{seeker.name}</h3>
                              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                <Store size={14} /> Applied for: <strong>{job?.title}</strong>
                              </p>
                            </div>
                            {app.fitScore && (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: app.fitScore > 80 ? 'var(--color-accent)' : 'var(--color-primary)' }}>
                                  {app.fitScore}% Match
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>AI Fit Score</div>
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '0.85rem', borderTop: '1px solid var(--border-glass)', paddingTop: '12px' }}>
                            <div>
                              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>CONTACT PHONE:</span>
                              <p style={{ marginTop: '2px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Phone size={12} /> {app.status === 'hired' ? (seeker.phone || 'Not provided') : 'Hidden until hired'}
                              </p>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>LOCALITY:</span>
                              <p style={{ marginTop: '2px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <MapPin size={12} /> {seeker.locality}
                              </p>
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
                            <div>
                              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>SEEKER SKILLS:</span>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                                {seeker.skills.map((s: string) => (
                                  <span key={s} style={{ background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>{s}</span>
                                ))}
                              </div>
                            </div>
                            <div style={{ marginTop: '6px' }}>
                              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>AVAILABILITY:</span>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                                {seeker.availability.map((a: string) => (
                                  <span key={a} style={{ background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>{a.replace('_', ' ')}</span>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                              AI TAILORED PITCH
                            </span>
                            {renderResumePoints(app.translatedResumeText || app.resumeText)}
                          </div>

                          {app.fitExplanation && (
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                              <Sparkles size={14} style={{ color: 'var(--color-primary)' }} />
                              <span>AI Fit explanation: <strong>{app.fitExplanation}</strong></span>
                            </div>
                          )}
                        </div>

                        {/* Status updating actions */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center', borderLeft: '1px solid var(--border-glass)', paddingLeft: '24px' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>STATUS: <span style={{ color: 'var(--text-main)' }}>{app.status}</span></span>
                          <button
                            onClick={() => handleUpdateAppStatus(app._id, 'shortlisted')}
                            disabled={app.status === 'hired'}
                            className={app.status === 'shortlisted' ? 'btn-primary' : 'btn-secondary'}
                            style={{ padding: '8px', fontSize: '0.85rem', display: 'flex', justifyContent: 'center', gap: '6px', opacity: app.status === 'hired' ? 0.5 : 1, cursor: app.status === 'hired' ? 'not-allowed' : 'pointer' }}
                          >
                            <Sparkles size={14} /> Shortlist Candidate
                          </button>
                          <button
                            onClick={() => handleUpdateAppStatus(app._id, 'hired')}
                            disabled={app.status === 'hired'}
                            className={app.status === 'hired' ? 'btn-accent' : 'btn-secondary'}
                            style={{ padding: '8px', fontSize: '0.85rem', display: 'flex', justifyContent: 'center', gap: '6px', opacity: app.status === 'hired' ? 0.85 : 1 }}
                          >
                            <UserCheck size={14} /> Mark as Hired
                          </button>
                          <button
                            onClick={() => handleUpdateAppStatus(app._id, 'rejected')}
                            disabled={app.status === 'hired'}
                            className="btn-secondary"
                            style={{ padding: '8px', fontSize: '0.85rem', color: 'var(--color-status-error)', display: 'flex', justifyContent: 'center', gap: '6px', opacity: app.status === 'hired' ? 0.5 : 1, cursor: app.status === 'hired' ? 'not-allowed' : 'pointer' }}
                          >
                            <XCircle size={14} /> Reject Application
                          </button>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          )}

          {/* TAB: EDIT COMPANY PROFILE */}
          {activeTab === 'edit-company' && (
            <div className="glass animate-fade-in" style={{ padding: '32px', maxWidth: '640px', margin: '0 auto', width: '100%' }}>
              <h2 style={{ fontSize: '1.4rem', marginBottom: '24px', color: 'var(--text-title)' }}>Update Company Settings</h2>
              <form onSubmit={(e) => handleCompanyOnboarding(e, true)} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>COMPANY NAME</label>
                  <input
                    type="text"
                    value={companyForm.companyName}
                    onChange={(e) => setCompanyForm(prev => ({ ...prev, companyName: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>CATEGORY</label>
                  <select value={companyForm.category} onChange={(e) => setCompanyForm(prev => ({ ...prev, category: e.target.value }))}>
                    {COMPANY_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>ADDRESS</label>
                  <textarea
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
                    maxLength={10}
                    pattern="[0-9]{10}"
                    value={companyForm.ownerPhone}
                    onChange={(e) => setCompanyForm(prev => ({ ...prev, ownerPhone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                    required
                  />
                </div>

                <button type="submit" className="btn-primary" style={{ padding: '14px', marginTop: '12px' }}>
                  Save Company Updates
                </button>
              </form>
            </div>
          )}
        </main>
        {renderToast()}
      </div>
    );
  }

  return null;
}
