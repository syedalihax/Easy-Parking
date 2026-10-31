import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Link,
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import {
  apiAcceptInvitation,
  apiCreateInvitation,
  apiCreateParking,
  apiGetMe,
  apiGetMyParkings,
  apiGetPendingInvitations,
  apiLogin,
  apiSignup,
  apiUpdateProfile,
  apiUpdatePreferredLanguage,
} from './api';
import LanguageSelector from './components/LanguageSelector';
import { useTranslation } from 'react-i18next';
import i18n from './i18n';

const CustomersWorkspace = lazy(() => import('./components/CustomersWorkspace'));
const DailyParkingWorkspace = lazy(() => import('./components/DailyParkingWorkspace'));
const LandingPage = lazy(() => import('./components/LandingPage'));
const LandingLegalPage = lazy(() => import('./components/LandingPage').then((module) => ({
  default: module.LandingLegalPage,
})));
const DashboardWorkspace = lazy(() => import('./components/OperationsWorkspace').then((module) => ({
  default: module.DashboardWorkspace,
})));
const MoreWorkspace = lazy(() => import('./components/OperationsWorkspace').then((module) => ({
  default: module.MoreWorkspace,
})));
const ReportsWorkspace = lazy(() => import('./components/OperationsWorkspace').then((module) => ({
  default: module.ReportsWorkspace,
})));
import GoogleIcon from './components/GoogleIcon';

const defaultAuthForm = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
};

const defaultParkingForm = {
  name: '',
  address: '',
  contactInfo: '',
};

const defaultInviteForm = {
  emailOrPhone: '',
  role: 'manager',
};

const profileFormFromUser = (profile) => ({
  fullName: profile.fullName || '',
  email: profile.email || '',
  phone: profile.phone || '',
});

const desktopNavigation = [
  { to: '/app/dashboard', key: 'nav.dashboard', Icon: 'dashboard' },
  { to: '/app/customers', key: 'nav.customers', Icon: 'groups', end: true },
  { to: '/app/payments', key: 'nav.payments', Icon: 'credit_card' },
  { to: '/app/daily-parking', key: 'nav.dailyParking', Icon: 'local_parking' },
  { to: '/app/more', key: 'nav.more', Icon: 'more_horiz' },
];

const mobileNavigation = desktopNavigation;

function App() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [parkings, setParkings] = useState([]);
  const [selectedParkingId, setSelectedParkingId] = useState(
    localStorage.getItem('easyparking_selected_parking') || '',
  );
  const [authForm, setAuthForm] = useState(defaultAuthForm);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profileForm, setProfileForm] = useState({ fullName: '', email: '', phone: '' });
  const [parkingForm, setParkingForm] = useState(defaultParkingForm);
  const [inviteForm, setInviteForm] = useState(defaultInviteForm);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(Boolean(token));

  const activeParking = useMemo(
    () => parkings.find((parking) => parking._id === selectedParkingId) || null,
    [parkings, selectedParkingId],
  );
  const userDisplayName = user?.fullName?.trim() || t('profile.notAssigned');
  const currentLanguage = i18n.resolvedLanguage || i18n.language || 'en';
  const showProfileSetup = location.pathname === '/app/profile'
    && new URLSearchParams(location.search).get('setup') === '1';
  const [showProfileSuccess, setShowProfileSuccess] = useState(false);
  const [showRegistrationSuccess, setShowRegistrationSuccess] = useState(false);
  const isMoreSectionActive = [
    '/app/vehicles',
    '/app/dues',
    '/app/reports',
    '/app/team',
    '/app/settings',
    '/app/profile',
  ].some((path) => location.pathname.startsWith(path));

  useEffect(() => {
    if (!statusMessage) return undefined;
    const timer = window.setTimeout(() => setStatusMessage(''), 3000);
    return () => window.clearTimeout(timer);
  }, [statusMessage]);

  useEffect(() => {
    if (!isMobileMenuOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsMobileMenuOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const language = i18n.resolvedLanguage || i18n.language || 'en';
    document.documentElement.lang = language;
    document.documentElement.dir = ['fa-IR', 'ur'].includes(language) ? 'rtl' : 'ltr';
  }, [currentLanguage]);

  const clearStaleAuthArtifacts = useCallback(async () => {
    const staleKeys = ['easyparking_selected_parking', 'jwt', 'access_token', 'refresh_token', 'token'];
    staleKeys.forEach((key) => localStorage.removeItem(key));
    sessionStorage.clear();

    if ('caches' in window) {
      const cacheNames = await caches.keys().catch(() => []);
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    }

    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations().catch(() => []);
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
  }, []);

  useEffect(() => {
    if (location.pathname === '/login' || location.pathname === '/signup') {
      clearStaleAuthArtifacts();
      setErrorMessage('');
    }
  }, [clearStaleAuthArtifacts, location.pathname]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const isRegistered = params.get('registered') === '1';
    setShowRegistrationSuccess(isRegistered && location.pathname === '/login');
  }, [location.pathname, location.search]);

  useEffect(() => {
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.name = 'robots';
      document.head.append(robots);
    }
    robots.content = location.pathname === '/' ? 'index,follow' : 'noindex,nofollow';

    if (location.pathname.startsWith('/app')) {
      document.title = `${t('app.name')} — ${t('app.parkingManagement')}`;
    }
  }, [location.pathname, t]);

  const changeLanguage = async (language) => {
    const previousLanguage = currentLanguage;
    localStorage.setItem('easyparking_language', language);
    await i18n.changeLanguage(language);
    if (!user) return;
    try {
      const response = await apiUpdatePreferredLanguage(language);
      setUser(response.user);
    } catch (error) {
      setErrorMessage(error.message || t('errors.couldNotSave'));
      localStorage.setItem('easyparking_language', previousLanguage);
      await i18n.changeLanguage(previousLanguage);
    }
  };

  useEffect(() => {
    if (selectedParkingId) {
      localStorage.setItem('easyparking_selected_parking', selectedParkingId);
    } else {
      localStorage.removeItem('easyparking_selected_parking');
    }
  }, [selectedParkingId]);

  useEffect(() => {
    if (showProfileSetup) {
      setShowProfileSuccess(true);
    }
  }, [showProfileSetup]);

  const logout = useCallback(async () => {
    localStorage.removeItem('easyparking_selected_parking');
    await clearStaleAuthArtifacts();
    const logoutTarget = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api');
    try {
      await fetch(`${logoutTarget}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      // Ignore logout request failures so the client can still clear the local session.
    }
    setToken('');
    setUser(null);
    setParkings([]);
    setSelectedParkingId('');
    setPendingInvitations([]);
    setIsSessionLoading(false);
    navigate('/login', { replace: true });
  }, [clearStaleAuthArtifacts, navigate]);

  const loadParkings = useCallback(async () => {
    try {
      const response = await apiGetMyParkings();
      const nextParkings = response.parkings || [];
      setParkings(nextParkings);
      setSelectedParkingId((currentId) => (
        nextParkings.some((parking) => parking._id === currentId)
          ? currentId
          : nextParkings[0]?._id || ''
      ));
    } catch (error) {
      setErrorMessage(error.message);
    }
  }, []);

  const loadPendingInvitations = useCallback(async () => {
    try {
      const response = await apiGetPendingInvitations();
      setPendingInvitations(response.invitations || []);
    } catch (error) {
      setErrorMessage(error.message);
    }
  }, []);

  useEffect(() => {
    let isCurrent = true;

    const restoreSession = async () => {
      const hasSessionCookie = document.cookie.split(';').some((cookie) => {
        const trimmed = cookie.trim();
        return trimmed.startsWith('access_token=') || trimmed.startsWith('refresh_token=');
      });

      if (!hasSessionCookie) {
        if (isCurrent) {
          setUser(null);
          setToken('');
          setIsSessionLoading(false);
        }
        return;
      }

      setIsSessionLoading(true);

      try {
        const response = await apiGetMe();
        if (!isCurrent) return;

        setUser(response.user);
        setProfileForm(profileFormFromUser(response.user));
        if (response.user.preferredLanguage) {
          await i18n.changeLanguage(response.user.preferredLanguage);
        }
        setToken('session');
      } catch (error) {
        if (!isCurrent) return;
        setUser(null);
        setToken('');
      } finally {
        if (isCurrent) {
          setIsSessionLoading(false);
        }
      }
    };

    restoreSession();
    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    if (!token) return;

    let isCurrent = true;

    const loadSession = async () => {
      const [userResult, parkingResult, invitationResult] = await Promise.allSettled([
        apiGetMe(),
        apiGetMyParkings(),
        apiGetPendingInvitations(),
      ]);

      if (!isCurrent) return;

      if (userResult.status === 'rejected') {
        setErrorMessage(userResult.reason.message);
        logout();
        return;
      }

      setUser(userResult.value.user);
      setProfileForm(profileFormFromUser(userResult.value.user));
      if (userResult.value.user.preferredLanguage) {
        await i18n.changeLanguage(userResult.value.user.preferredLanguage);
      }

      if (parkingResult.status === 'fulfilled') {
        const nextParkings = parkingResult.value.parkings || [];
        setParkings(nextParkings);
        setSelectedParkingId((currentId) => (
          nextParkings.some((parking) => parking._id === currentId)
            ? currentId
            : nextParkings[0]?._id || ''
        ));
      } else {
        setErrorMessage(parkingResult.reason.message);
      }

      if (invitationResult.status === 'fulfilled') {
        setPendingInvitations(invitationResult.value.invitations || []);
      } else {
        setErrorMessage(invitationResult.reason.message);
      }

      setIsSessionLoading(false);
    };

    loadSession();
    return () => {
      isCurrent = false;
    };
  }, [token, logout]);

  const handleAuthInput = (field, value) => {
    setAuthForm((current) => ({ ...current, [field]: value }));
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const payload = {
        fullName: authForm.fullName,
        email: authForm.email || undefined,
        phone: authForm.phone || undefined,
        password: authForm.password,
        preferredLanguage: currentLanguage,
      };

      if (location.pathname === '/signup') {
        if (!payload.fullName || (!payload.email && !payload.phone)) {
          throw new Error(t('auth.credentialsRequired'));
        }

        if (payload.password !== authForm.confirmPassword) {
          throw new Error(t('auth.passwordMismatch'));
        }

        await apiSignup(payload);
        setShowRegistrationSuccess(true);
        setErrorMessage('');
        navigate('/login?registered=1', { replace: true });
      } else {
        const response = await apiLogin({
          email: authForm.email || undefined,
          phone: authForm.phone || undefined,
          password: authForm.password,
        });

        setShowRegistrationSuccess(false);
        setIsSessionLoading(true);
        setToken('session');
        navigate('/app', { replace: true });
      }
    } catch (error) {
      setErrorMessage(error.message || t('errors.couldNotLoad'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleParkingSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const response = await apiCreateParking(parkingForm);
      setSelectedParkingId(response.parking._id);
      setParkingForm(defaultParkingForm);
      setStatusMessage(t('setup.created'));
      await loadParkings();
      navigate('/app/customers');
    } catch (error) {
      setErrorMessage(error.message || t('errors.couldNotSave'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      if (!selectedParkingId) {
        throw new Error(t('setup.selectOrCreate'));
      }

      await apiCreateInvitation({
        parkingId: selectedParkingId,
        emailOrPhone: inviteForm.emailOrPhone,
        role: inviteForm.role,
      });

      setInviteForm(defaultInviteForm);
      setStatusMessage(t('team.invitationCreated'));
      await loadPendingInvitations();
    } catch (error) {
      setErrorMessage(error.message || t('errors.couldNotSave'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptInvitation = async (invitationId) => {
    setIsLoading(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      await apiAcceptInvitation(invitationId);
      setStatusMessage(t('team.invitationAccepted'));
      await loadParkings();
      await loadPendingInvitations();
    } catch (error) {
      setErrorMessage(error.message || t('errors.couldNotSave'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileInput = (field, value) => {
    setProfileForm((current) => ({ ...current, [field]: value }));
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    if (!profileForm.email.trim() && !profileForm.phone.trim()) {
      setErrorMessage(t('profile.contactRequired'));
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiUpdateProfile({
        fullName: profileForm.fullName,
        email: profileForm.email,
        phone: profileForm.phone,
      });
      setUser(response.user);
      setProfileForm(profileFormFromUser(response.user));
      setShowProfileSuccess(false);
      setStatusMessage(t('profile.saved'));
      if (showProfileSetup) navigate('/app/profile', { replace: true });
    } catch (error) {
      setErrorMessage(error.message || t('errors.couldNotSave'));
    } finally {
      setIsLoading(false);
    }
  };

  const renderAuthForm = (mode) => (
    <div className="auth-shell">
      <div className="auth-card">
        <button type="button" className="auth-back-button" onClick={() => navigate('/')}>
          <GoogleIcon name="arrow_back" size={18} />
          <span>Back</span>
        </button>

        <p className="eyebrow">{t('app.name')}</p>
        <h1>{t(mode === 'login' ? 'auth.welcomeBack' : 'auth.createAccount')}</h1>
        <p className="auth-intro">{t(mode === 'login' ? 'auth.loginHint' : 'auth.signupHint')}</p>

        <div className="toggle-row" role="tablist" aria-label={t('auth.login')}>
          <Link to="/login" className={mode === 'login' ? 'pill-button is-active' : 'pill-button'}>
            {t('auth.login')}
          </Link>
          <Link to="/signup" className={mode === 'signup' ? 'pill-button is-active' : 'pill-button'}>
            {t('auth.signup')}
          </Link>
        </div>

        {mode === 'login' && showRegistrationSuccess && (
          <div
            className="toast-notification"
            role="status"
            aria-live="polite"
            style={{
              position: 'relative',
              width: '100%',
              marginBottom: '1rem',
              justifyContent: 'flex-start',
            }}
          >
            <GoogleIcon name="check_circle" size={18} />
            <span>{t('auth.registrationSuccess')}</span>
          </div>
        )}

        <form className="form-grid" onSubmit={handleAuthSubmit}>
          {mode === 'signup' && (
            <label className="field">
              <span>{t('auth.fullName')}</span>
              <input
                type="text"
                value={authForm.fullName}
                onChange={(event) => handleAuthInput('fullName', event.target.value)}
                placeholder={t('auth.fullNamePlaceholder')}
              />
            </label>
          )}

          <label className="field">
            <span>{t('auth.emailOrPhone')}</span>
            <input
              type="text"
              value={authForm.email || authForm.phone}
              onChange={(event) => {
                const value = event.target.value;
                if (value.includes('@')) {
                  handleAuthInput('email', value);
                  handleAuthInput('phone', '');
                } else {
                  handleAuthInput('phone', value);
                  handleAuthInput('email', '');
                }
              }}
              placeholder={t('auth.identifierPlaceholder')}
            />
          </label>

          <label className="field">
            <span>{t('auth.password')}</span>
            <div className="password-input-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                value={authForm.password}
                onChange={(event) => handleAuthInput('password', event.target.value)}
                placeholder={t('auth.passwordPlaceholder')}
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((current) => !current)}
              >
                <GoogleIcon name={showPassword ? 'visibility_off' : 'visibility'} size={18} />
              </button>
            </div>
          </label>

          {mode === 'signup' && (
            <label className="field">
              <span>{t('auth.confirmPassword')}</span>
              <div className="password-input-wrap">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={authForm.confirmPassword}
                  onChange={(event) => handleAuthInput('confirmPassword', event.target.value)}
                  placeholder={t('auth.confirmPasswordPlaceholder')}
                />
                <button
                  type="button"
                  className="password-toggle"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowConfirmPassword((current) => !current)}
                >
                  <GoogleIcon name={showConfirmPassword ? 'visibility_off' : 'visibility'} size={18} />
                </button>
              </div>
            </label>
          )}

          {errorMessage && <p className="error-text">{errorMessage}</p>}
          <button type="submit" className="primary-button" disabled={isLoading}>
            {isLoading ? t('auth.pleaseWait') : t(mode === 'login' ? 'auth.login' : 'auth.createAccount')}
          </button>
        </form>
      </div>
    </div>
  );

  const renderParkingSetup = () => (
    <div className="dashboard-shell">
      <header className="topbar">
        <div>
          <LanguageSelector value={currentLanguage} onChange={changeLanguage} />
          <p className="eyebrow">{t('setup.account')}</p>
          <h2>{t('setup.heading')}</h2>
        </div>
        <button type="button" className="secondary-button" onClick={logout}>{t('app.logout')}</button>
      </header>

      <form className="form-grid panel" onSubmit={handleParkingSubmit}>
        <label className="field">
          <span>{t('setup.name')}</span>
          <input
            type="text"
            value={parkingForm.name}
            onChange={(event) => setParkingForm((current) => ({ ...current, name: event.target.value }))}
            placeholder={t('setup.namePlaceholder')}
          />
        </label>

        <label className="field">
          <span>{t('setup.address')}</span>
          <input
            type="text"
            value={parkingForm.address}
            onChange={(event) => setParkingForm((current) => ({ ...current, address: event.target.value }))}
            placeholder={t('setup.addressPlaceholder')}
          />
        </label>

        <label className="field">
          <span>{t('setup.contact')}</span>
          <input
            type="text"
            value={parkingForm.contactInfo}
            onChange={(event) => setParkingForm((current) => ({ ...current, contactInfo: event.target.value }))}
            placeholder={t('setup.contactPlaceholder')}
          />
        </label>

        {errorMessage && <p className="error-text">{errorMessage}</p>}
        <button type="submit" className="primary-button" disabled={isLoading}>
          {isLoading ? t('setup.creating') : t('setup.create')}
        </button>
      </form>
    </div>
  );

  const renderTeam = () => (
    <>
      <header className="workspace-heading">
        <div><p className="eyebrow">{t('team.role')}</p><h2>{t('menu.parkingAccess')}</h2></div>
      </header>
      {activeParking?.role === 'owner' && (
        <section className="panel">
          <div className="panel-header"><h3>{t('team.invite')}</h3></div>
          <form className="form-grid team-invite-form" onSubmit={handleInviteSubmit}>
            <label className="field">
              <span>{t('team.emailOrPhone')}</span>
              <input
                type="text"
                value={inviteForm.emailOrPhone}
                onChange={(event) => setInviteForm((current) => ({ ...current, emailOrPhone: event.target.value }))}
                placeholder="manager@example.com"
              />
            </label>
            <label className="field">
              <span>{t('team.role')}</span>
              <select value={inviteForm.role} onChange={(event) => setInviteForm((current) => ({ ...current, role: event.target.value }))}>
                <option value="manager">{t('team.manager')}</option>
                <option value="owner">{t('team.owner')}</option>
              </select>
            </label>
            <button type="submit" className="primary-button" disabled={isLoading}>{t('team.sendInvite')}</button>
          </form>
        </section>
      )}
      <section className="panel">
        <div className="panel-header"><h3>{t('team.pending')}</h3></div>
        {pendingInvitations.length === 0 ? <p className="muted-text">{t('team.none')}</p> : (
          <div className="list-stack">
            {pendingInvitations.map((invitation) => (
              <div key={invitation._id} className="list-item">
                <div><strong>{invitation.emailOrPhone}</strong><p>{t(`team.${invitation.role}`)} · {invitation.parkingId?.name || t('setup.account')}</p></div>
                <button type="button" className="secondary-button" onClick={() => handleAcceptInvitation(invitation._id)}>{t('team.accept')}</button>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );

  const renderProfile = () => (
    <div className="operations-workspace">
      <header className="workspace-heading">
        <div><p className="eyebrow">{t('profile.eyebrow')}</p><h2>{t('profile.title')}</h2></div>
      </header>
      <form className="panel form-grid profile-form" onSubmit={handleProfileSubmit}>
        <label className="field">
          <span>{t('profile.name')}</span>
          <input required autoComplete="name" value={profileForm.fullName} onChange={(event) => handleProfileInput('fullName', event.target.value)} />
        </label>
        <label className="field">
          <span>{t('profile.email')}</span>
          <input type="email" autoComplete="email" value={profileForm.email} onChange={(event) => handleProfileInput('email', event.target.value)} />
        </label>
        <label className="field">
          <span>{t('profile.phone')}</span>
          <input type="tel" autoComplete="tel" value={profileForm.phone} onChange={(event) => handleProfileInput('phone', event.target.value)} />
        </label>
        <label className="field">
          <span>{t('team.role')}</span>
          <input value={activeParking?.role ? t(`team.${activeParking.role}`) : t('profile.notAssigned')} readOnly />
        </label>
        <LanguageSelector value={currentLanguage} onChange={changeLanguage} />
        <button type="submit" className="primary-button profile-save" disabled={isLoading}>
          {isLoading ? t('app.saving') : t('app.save')}
        </button>
      </form>
      {(showProfileSetup || showProfileSuccess) && (
        <div className="profile-setup-backdrop">
          <section className="profile-setup-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-setup-title">
            <div className="profile-setup-mark"><GoogleIcon name="person" size={22} /></div>
            <p className="eyebrow">{t('profile.eyebrow')}</p>
            <h2 id="profile-setup-title">{showProfileSuccess ? 'Registration successful' : t('profile.completeTitle')}</h2>
            <p>{showProfileSuccess ? 'You are registered successfully. Now complete your profile.' : t('profile.completeMessage')}</p>
            <form className="form-grid" onSubmit={handleProfileSubmit}>
              <label className="field">
                <span>{t('profile.name')}</span>
                <input required autoComplete="name" autoFocus value={profileForm.fullName} onChange={(event) => handleProfileInput('fullName', event.target.value)} />
              </label>
              <label className="field">
                <span>{t('profile.email')}</span>
                <input type="email" autoComplete="email" value={profileForm.email} onChange={(event) => handleProfileInput('email', event.target.value)} />
              </label>
              <label className="field">
                <span>{t('profile.phone')}</span>
                <input type="tel" autoComplete="tel" value={profileForm.phone} onChange={(event) => handleProfileInput('phone', event.target.value)} />
              </label>
              {errorMessage && <p className="error-text" role="alert">{errorMessage}</p>}
              <button type="submit" className="primary-button" disabled={isLoading}>
                {isLoading ? t('app.saving') : (showProfileSuccess ? 'Save & continue' : t('profile.completeButton'))}
              </button>
              <button type="button" className="secondary-button profile-later" onClick={() => {
                setShowProfileSuccess(false);
                navigate('/app/profile', { replace: true });
              }}>
                {showProfileSuccess ? 'Skip for now' : t('profile.doLater')}
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );

  const renderParkingSettings = () => {
    const parkingDetails = activeParking || {
      name: t('profile.notAssigned'),
      address: '',
      contactInfo: '',
      role: 'manager',
    };

    return (
      <div className="operations-workspace">
        <header className="workspace-heading">
          <div><p className="eyebrow">{t('parkingSettings.eyebrow')}</p><h2>{t('parkingSettings.title')}</h2></div>
        </header>
        {parkings.length > 1 && (
          <label className="field dashboard-parking-select">
            <span>{t('app.selectedParking')}</span>
            <select value={selectedParkingId} onChange={(event) => setSelectedParkingId(event.target.value)}>
              {parkings.map((parking) => <option key={parking._id} value={parking._id}>{parking.name}</option>)}
            </select>
          </label>
        )}
        <section className="panel profile-details">
          <div><span>{t('parkingSettings.name')}</span><strong>{parkingDetails.name}</strong></div>
          <div><span>{t('parkingSettings.address')}</span><strong>{parkingDetails.address || t('app.notProvided')}</strong></div>
          <div><span>{t('parkingSettings.contact')}</span><strong>{parkingDetails.contactInfo || t('app.notProvided')}</strong></div>
          <div><span>{t('team.role')}</span><strong>{t(`team.${parkingDetails.role}`)}</strong></div>
        </section>
      </div>
    );
  };

  const renderLoadingScreen = () => (
    <main className="auth-shell" aria-busy="true">
      <div className="auth-card">
        <p className="eyebrow">{t('app.name')}</p>
        <h1>{t('app.loading')}</h1>
      </div>
    </main>
  );

  if (!token || !user) {
    if (token && isSessionLoading) {
      return renderLoadingScreen();
    }

    return (
      <Suspense fallback={renderLoadingScreen()}>
        <Routes>
          <Route path="/" element={<LandingPage onChangeLanguage={changeLanguage} />} />
          <Route path="/privacy-policy" element={<LandingLegalPage page="privacy" />} />
          <Route path="/terms" element={<LandingLegalPage page="terms" />} />
          <Route path="/login" element={renderAuthForm('login')} />
          <Route path="/signup" element={renderAuthForm('signup')} />
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    );
  }

  if (isSessionLoading) {
    return renderLoadingScreen();
  }

  if ((!activeParking || !activeParking._id) && location.pathname.startsWith('/app') && location.pathname !== '/app/profile') {
    return renderParkingSetup();
  }

  return (
    <Suspense fallback={renderLoadingScreen()}>
      <Routes>
        <Route path="/" element={<LandingPage onChangeLanguage={changeLanguage} />} />
        <Route path="/privacy-policy" element={<LandingLegalPage page="privacy" />} />
        <Route path="/terms" element={<LandingLegalPage page="terms" />} />
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="/app" element={(
        <div className="app-shell">
          <a className="skip-link" href="#app-content">{t('nav.skipToContent')}</a>
          <aside className="app-sidebar">
            <Link to="/app/customers" className="brand-lockup" onClick={() => setIsMobileMenuOpen(false)}>
              <img src="/favicon.svg" alt="" className="brand-logo" />
              <span className="brand-copy">
                <strong>{t('app.name')}</strong>
                <small>{activeParking?.name || t('app.parkingManagement')}</small>
              </span>
            </Link>
            <button
              type="button"
              className="mobile-menu-button"
              aria-label={isMobileMenuOpen ? t('menu.close') : t('menu.open')}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu-drawer"
              onClick={() => setIsMobileMenuOpen((open) => !open)}
            >
              {isMobileMenuOpen ? <GoogleIcon name="close" size={22} /> : <GoogleIcon name="menu" size={22} />}
            </button>
            <nav className="sidebar-nav desktop-sidebar-nav" aria-label={t('nav.main')}>
              {desktopNavigation.map(({ to, key, Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) => `nav-link${isActive || (key === 'nav.more' && isMoreSectionActive) ? ' is-active' : ''}`}
                >
                  <GoogleIcon name={Icon} size={18} />
                  <span>{t(key)}</span>
                </NavLink>
              ))}
            </nav>
            <NavLink
              to="/app/profile"
              aria-label={`${t('menu.profile')}: ${userDisplayName}`}
              className={({ isActive }) => `sidebar-user${isActive ? ' is-active' : ''}`}
            >
              <span className="sidebar-user-avatar" aria-hidden="true">
                {userDisplayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') || 'U'}
              </span>
              <span className="sidebar-user-copy">
                <strong>{userDisplayName}</strong>
                <small>{t('menu.profile')}</small>
              </span>
              <GoogleIcon name="chevron_right" size={17} />
            </NavLink>
          </aside>
          {isMobileMenuOpen && (
            <>
              <button
                type="button"
                className="mobile-menu-backdrop"
                aria-label={t('menu.close')}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <aside id="mobile-menu-drawer" className="mobile-menu-drawer" aria-label={t('menu.title')}>
                <div className="mobile-menu-user">
                  <strong>{userDisplayName}</strong>
                  <span>{activeParking?.role ? t(`team.${activeParking.role}`) : t('profile.notAssigned')}</span>
                </div>
                <nav className="mobile-menu-links">
                  <NavLink to="/app/settings" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `mobile-menu-link${isActive ? ' is-active' : ''}`}>
                    <GoogleIcon name="settings" size={19} /><span>{t('menu.parkingSettings')}</span>
                  </NavLink>
                  <NavLink to="/app/team" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `mobile-menu-link${isActive ? ' is-active' : ''}`}>
                    <GoogleIcon name="shield" size={19} /><span>{t('menu.parkingAccess')}</span>
                  </NavLink>
                  <NavLink to="/app/profile" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `mobile-menu-link${isActive ? ' is-active' : ''}`}>
                    <GoogleIcon name="person" size={19} /><span>{t('menu.profile')}</span>
                  </NavLink>
                </nav>
                <LanguageSelector value={currentLanguage} onChange={changeLanguage} />
                <button type="button" className="mobile-menu-logout" onClick={logout}>
                  <span>{t('app.logout')}</span>
                </button>
              </aside>
            </>
          )}
          {statusMessage && (
            <div className="toast-notification" role="status" aria-live="polite">
              <GoogleIcon name="check_circle" size={18} />
              <span>{statusMessage}</span>
            </div>
          )}
          <main className="app-main" id="app-content" tabIndex="-1">
            <Outlet />
            {errorMessage && <p className="error-text">{errorMessage}</p>}
          </main>
          <nav className="mobile-tab-bar" aria-label={t('nav.main')}>
            {mobileNavigation.map(({ to, key, Icon, end }) => (
              <NavLink
                key={key}
                to={to}
                end={end}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => `mobile-tab${isActive || (key === 'nav.more' && isMoreSectionActive) ? ' is-active' : ''}`}
              >
                <GoogleIcon name={Icon} size={17} />
                <span>{t(key)}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      )}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardWorkspace key={`${activeParking?._id || 'no-parking'}-dashboard`} parkingId={activeParking?._id || ''} />} />
        <Route path="reports" element={<ReportsWorkspace key={`${activeParking?._id || 'no-parking'}-reports`} parkingId={activeParking?._id || ''} />} />
        <Route path="more" element={<MoreWorkspace />} />
        <Route path="settings" element={renderParkingSettings()} />
        <Route path="profile" element={renderProfile()} />
        <Route path="customers" element={<CustomersWorkspace key={`${activeParking?._id || 'no-parking'}-customers`} parkingId={activeParking?._id || ''} parkingRole={activeParking?.role || 'manager'} initialScreen="customers" />} />
        <Route path="customers/:customerId" element={<CustomersWorkspace key={`${activeParking?._id || 'no-parking'}-customer-detail`} parkingId={activeParking?._id || ''} parkingRole={activeParking?.role || 'manager'} initialScreen="customers" />} />
        <Route path="vehicles" element={<CustomersWorkspace key={`${activeParking?._id || 'no-parking'}-vehicles`} parkingId={activeParking?._id || ''} parkingRole={activeParking?.role || 'manager'} initialScreen="vehicle-search" />} />
        <Route path="vehicles/:vehicleId" element={<CustomersWorkspace key={`${activeParking?._id || 'no-parking'}-vehicle-detail`} parkingId={activeParking?._id || ''} parkingRole={activeParking?.role || 'manager'} initialScreen="vehicle-detail" />} />
        <Route path="dues" element={<CustomersWorkspace key={`${activeParking?._id || 'no-parking'}-dues`} parkingId={activeParking?._id || ''} parkingRole={activeParking?.role || 'manager'} initialScreen="dues" />} />
        <Route path="payments" element={<CustomersWorkspace key={`${activeParking?._id || 'no-parking'}-payments`} parkingId={activeParking?._id || ''} parkingRole={activeParking?.role || 'manager'} initialScreen="payments" />} />
        <Route path="daily-parking" element={<DailyParkingWorkspace key={`${activeParking?._id || 'no-parking'}-daily`} parkingId={activeParking?._id || ''} />} />
        <Route path="team" element={renderTeam()} />
        <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

function NotFoundPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = `404 — ${t('app.name')}`;
  }, [t]);

  return (
    <main className="auth-shell">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <p className="eyebrow">404</p>
        <h1>Page not found</h1>
        <p className="auth-intro">The page you are looking for does not exist or has moved.</p>
        <div className="form-grid" style={{ marginTop: '1rem' }}>
          <button type="button" className="primary-button" onClick={() => navigate(-1)}>
            Go back
          </button>
          <Link to="/" className="secondary-button" style={{ textAlign: 'center', textDecoration: 'none' }}>
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}

export default App;
