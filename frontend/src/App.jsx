import { useCallback, useEffect, useMemo, useState } from 'react';
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
import CustomersWorkspace from './components/CustomersWorkspace';
import DailyParkingWorkspace from './components/DailyParkingWorkspace';
import { DashboardWorkspace, MoreWorkspace, ReportsWorkspace } from './components/OperationsWorkspace';
import LanguageSelector from './components/LanguageSelector';
import { useTranslation } from 'react-i18next';
import i18n from './i18n';
import {
  BarChart3,
  Car,
  CreditCard,
  CheckCircle2,
  FileText,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  ParkingCircle,
  Settings,
  Shield,
  Users,
  UserRound,
  X,
} from 'lucide-react';

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
  { to: '/app/dashboard', key: 'nav.dashboard', Icon: LayoutDashboard },
  { to: '/app/customers', key: 'nav.customers', Icon: Users, end: true },
  { to: '/app/vehicles', key: 'nav.vehicles', Icon: Car },
  { to: '/app/dues', key: 'nav.dues', Icon: FileText },
  { to: '/app/payments', key: 'nav.payments', Icon: CreditCard },
  { to: '/app/daily-parking', key: 'nav.dailyParking', Icon: ParkingCircle },
  { to: '/app/reports', key: 'nav.reports', Icon: BarChart3 },
  { to: '/app/team', key: 'nav.team', Icon: UserRound },
];

const mobileNavigation = [
  desktopNavigation[0],
  desktopNavigation[1],
  desktopNavigation[4],
  desktopNavigation[5],
  { to: '/app/more', key: 'nav.more', Icon: MoreHorizontal },
];

function App() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [token, setToken] = useState(localStorage.getItem('easyparking_token') || '');
  const [user, setUser] = useState(null);
  const [parkings, setParkings] = useState([]);
  const [selectedParkingId, setSelectedParkingId] = useState(
    localStorage.getItem('easyparking_selected_parking') || '',
  );
  const [authForm, setAuthForm] = useState(defaultAuthForm);
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
  const currentLanguage = i18n.resolvedLanguage || i18n.language || 'en';
  const showProfileSetup = location.pathname === '/app/profile'
    && new URLSearchParams(location.search).get('setup') === '1';

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

  const logout = useCallback(() => {
    localStorage.removeItem('easyparking_token');
    localStorage.removeItem('easyparking_selected_parking');
    setToken('');
    setUser(null);
    setParkings([]);
    setSelectedParkingId('');
    setPendingInvitations([]);
    setIsSessionLoading(false);
    navigate('/login', { replace: true });
  }, [navigate]);

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

        const response = await apiSignup(payload);
        localStorage.setItem('easyparking_token', response.token);
        setIsSessionLoading(true);
        setToken(response.token);
        navigate('/app/profile?setup=1', { replace: true });
      } else {
        const response = await apiLogin({
          email: authForm.email || undefined,
          phone: authForm.phone || undefined,
          password: authForm.password,
        });

        localStorage.setItem('easyparking_token', response.token);
        setIsSessionLoading(true);
        setToken(response.token);
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
        <div className="auth-language"><LanguageSelector value={currentLanguage} onChange={changeLanguage} /></div>
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
            <input
              type="password"
              value={authForm.password}
              onChange={(event) => handleAuthInput('password', event.target.value)}
              placeholder={t('auth.passwordPlaceholder')}
            />
          </label>

          {mode === 'signup' && (
            <label className="field">
              <span>{t('auth.confirmPassword')}</span>
              <input
                type="password"
                value={authForm.confirmPassword}
                onChange={(event) => handleAuthInput('confirmPassword', event.target.value)}
                placeholder={t('auth.confirmPasswordPlaceholder')}
              />
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
      {activeParking.role === 'owner' && (
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
      {showProfileSetup && (
        <div className="profile-setup-backdrop">
          <section className="profile-setup-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-setup-title">
            <div className="profile-setup-mark"><UserRound aria-hidden="true" size={22} /></div>
            <p className="eyebrow">{t('profile.eyebrow')}</p>
            <h2 id="profile-setup-title">{t('profile.completeTitle')}</h2>
            <p>{t('profile.completeMessage')}</p>
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
                {isLoading ? t('app.saving') : t('profile.completeButton')}
              </button>
              <button type="button" className="text-button profile-later" onClick={() => navigate('/app/profile', { replace: true })}>
                {t('profile.doLater')}
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );

  const renderParkingSettings = () => (
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
        <div><span>{t('parkingSettings.name')}</span><strong>{activeParking.name}</strong></div>
        <div><span>{t('parkingSettings.address')}</span><strong>{activeParking.address || t('app.notProvided')}</strong></div>
        <div><span>{t('parkingSettings.contact')}</span><strong>{activeParking.contactInfo || t('app.notProvided')}</strong></div>
        <div><span>{t('team.role')}</span><strong>{t(`team.${activeParking.role}`)}</strong></div>
      </section>
    </div>
  );

  if (!token || !user) {
    if (token && isSessionLoading) {
      return (
        <main className="auth-shell">
          <div className="auth-card">
            <p className="eyebrow">{t('app.name')}</p>
            <h1>{t('app.loading')}</h1>
          </div>
        </main>
      );
    }

    return (
      <Routes>
        <Route path="/login" element={renderAuthForm('login')} />
        <Route path="/signup" element={renderAuthForm('signup')} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  if (isSessionLoading) {
    return (
      <main className="auth-shell">
        <div className="auth-card">
          <p className="eyebrow">{t('app.name')}</p>
          <h1>{t('app.loading')}</h1>
        </div>
      </main>
    );
  }

  if (parkings.length === 0 && location.pathname !== '/app/profile') {
    return renderParkingSetup();
  }

  return (
    <Routes>
      <Route path="/app" element={(
        <div className="app-shell">
          <aside className="app-sidebar">
            <Link to="/app/customers" className="brand-lockup" onClick={() => setIsMobileMenuOpen(false)}>
              <img src="/favicon.svg" alt="" className="brand-logo" />
              <strong>{t('app.name')}</strong>
            </Link>
            <button
              type="button"
              className="mobile-menu-button"
              aria-label={isMobileMenuOpen ? t('menu.close') : t('menu.open')}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu-drawer"
              onClick={() => setIsMobileMenuOpen((open) => !open)}
            >
              {isMobileMenuOpen ? <X aria-hidden="true" size={22} /> : <Menu aria-hidden="true" size={22} />}
            </button>
            <nav className="sidebar-nav desktop-sidebar-nav" aria-label={t('nav.main')}>
              {desktopNavigation.map(({ to, key, Icon, end }) => (
                <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}>
                  <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
                  <span>{t(key)}</span>
                </NavLink>
              ))}
            </nav>
            <NavLink to="/app/profile" className={({ isActive }) => `sidebar-user${isActive ? ' is-active' : ''}`}>
              <span className="sidebar-user-avatar" aria-hidden="true">{user.fullName.trim().charAt(0).toUpperCase()}</span>
              <span className="sidebar-user-copy">
                <strong>{user.fullName}</strong>
                <small>{t('menu.profile')}</small>
              </span>
              <UserRound aria-hidden="true" size={18} />
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
                  <strong>{user.fullName}</strong>
                  <span>{t(`team.${activeParking.role}`)}</span>
                </div>
                <nav className="mobile-menu-links">
                  <NavLink to="/app/settings" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `mobile-menu-link${isActive ? ' is-active' : ''}`}>
                    <Settings aria-hidden="true" size={19} /><span>{t('menu.parkingSettings')}</span>
                  </NavLink>
                  <NavLink to="/app/team" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `mobile-menu-link${isActive ? ' is-active' : ''}`}>
                    <Shield aria-hidden="true" size={19} /><span>{t('menu.parkingAccess')}</span>
                  </NavLink>
                  <NavLink to="/app/profile" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `mobile-menu-link${isActive ? ' is-active' : ''}`}>
                    <UserRound aria-hidden="true" size={19} /><span>{t('menu.profile')}</span>
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
              <CheckCircle2 aria-hidden="true" size={18} />
              <span>{statusMessage}</span>
            </div>
          )}
          <main className="app-main">
            <Outlet />
            {errorMessage && <p className="error-text">{errorMessage}</p>}
          </main>
          <nav className="mobile-tab-bar" aria-label={t('nav.main')}>
            {mobileNavigation.map(({ to, key, Icon }) => (
              <NavLink key={key} to={to} onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `mobile-tab${isActive ? ' is-active' : ''}`}>
                <Icon aria-hidden="true" size={17} strokeWidth={1.8} />
                <span>{t(key)}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      )}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardWorkspace key={`${activeParking?._id}-dashboard`} parkingId={activeParking._id} />} />
        <Route path="reports" element={<ReportsWorkspace key={`${activeParking?._id}-reports`} parkingId={activeParking._id} />} />
        <Route path="more" element={<MoreWorkspace />} />
        <Route path="settings" element={renderParkingSettings()} />
        <Route path="profile" element={renderProfile()} />
        <Route path="customers" element={<CustomersWorkspace key={`${activeParking?._id}-customers`} parkingId={activeParking._id} parkingRole={activeParking.role} initialScreen="customers" />} />
        <Route path="customers/:customerId" element={<CustomersWorkspace key={`${activeParking?._id}-customer-detail`} parkingId={activeParking._id} parkingRole={activeParking.role} initialScreen="customers" />} />
        <Route path="vehicles" element={<CustomersWorkspace key={`${activeParking?._id}-vehicles`} parkingId={activeParking._id} parkingRole={activeParking.role} initialScreen="vehicle-search" />} />
        <Route path="vehicles/:vehicleId" element={<CustomersWorkspace key={`${activeParking?._id}-vehicle-detail`} parkingId={activeParking._id} parkingRole={activeParking.role} initialScreen="vehicle-detail" />} />
        <Route path="dues" element={<CustomersWorkspace key={`${activeParking?._id}-dues`} parkingId={activeParking._id} parkingRole={activeParking.role} initialScreen="dues" />} />
        <Route path="payments" element={<CustomersWorkspace key={`${activeParking?._id}-payments`} parkingId={activeParking._id} parkingRole={activeParking.role} initialScreen="payments" />} />
        <Route path="daily-parking" element={<DailyParkingWorkspace key={`${activeParking?._id}-daily`} parkingId={activeParking._id} />} />
        <Route path="team" element={renderTeam()} />
        <Route path="*" element={<Navigate to="/app/customers" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/app/customers" replace />} />
    </Routes>
  );
}

export default App;
