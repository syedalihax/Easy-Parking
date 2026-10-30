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
} from './api';
import CustomersWorkspace from './components/CustomersWorkspace';
import DailyParkingWorkspace from './components/DailyParkingWorkspace';
import { DashboardWorkspace, ReportsWorkspace } from './components/OperationsWorkspace';

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

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [token, setToken] = useState(localStorage.getItem('easyparking_token') || '');
  const [user, setUser] = useState(null);
  const [parkings, setParkings] = useState([]);
  const [selectedParkingId, setSelectedParkingId] = useState(
    localStorage.getItem('easyparking_selected_parking') || '',
  );
  const [authForm, setAuthForm] = useState(defaultAuthForm);
  const [parkingForm, setParkingForm] = useState(defaultParkingForm);
  const [inviteForm, setInviteForm] = useState(defaultInviteForm);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(Boolean(token));

  const activeParking = useMemo(
    () => parkings.find((parking) => parking._id === selectedParkingId) || null,
    [parkings, selectedParkingId],
  );

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
      };

      if (location.pathname === '/signup') {
        if (!payload.fullName || (!payload.email && !payload.phone)) {
          throw new Error('Full name and email or phone are required');
        }

        if (payload.password !== authForm.confirmPassword) {
          throw new Error('Passwords do not match');
        }

        const response = await apiSignup(payload);
        localStorage.setItem('easyparking_token', response.token);
        setIsSessionLoading(true);
        setToken(response.token);
        setStatusMessage('Account created successfully');
        navigate('/app', { replace: true });
      } else {
        const response = await apiLogin({
          email: authForm.email || undefined,
          phone: authForm.phone || undefined,
          password: authForm.password,
        });

        localStorage.setItem('easyparking_token', response.token);
        setIsSessionLoading(true);
        setToken(response.token);
        setStatusMessage('Logged in successfully');
        navigate('/app', { replace: true });
      }
    } catch (error) {
      setErrorMessage(error.message || 'Authentication failed');
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
      setStatusMessage('Parking created successfully');
      await loadParkings();
      navigate('/app/customers');
    } catch (error) {
      setErrorMessage(error.message || 'Could not create parking');
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
        throw new Error('Please select or create a parking first');
      }

      await apiCreateInvitation({
        parkingId: selectedParkingId,
        emailOrPhone: inviteForm.emailOrPhone,
        role: inviteForm.role,
      });

      setInviteForm(defaultInviteForm);
      setStatusMessage('Invitation created successfully');
      await loadPendingInvitations();
    } catch (error) {
      setErrorMessage(error.message || 'Could not create invitation');
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
      setStatusMessage('Invitation accepted');
      await loadParkings();
      await loadPendingInvitations();
    } catch (error) {
      setErrorMessage(error.message || 'Could not accept invitation');
    } finally {
      setIsLoading(false);
    }
  };

  const renderAuthForm = (mode) => (
    <div className="auth-shell">
      <div className="auth-card">
        <p className="eyebrow">easyParking</p>
        <h1>{mode === 'login' ? 'Welcome back' : 'Create account'}</h1>

        <div className="toggle-row" role="tablist" aria-label="Authentication mode">
          <Link to="/login" className={mode === 'login' ? 'pill-button is-active' : 'pill-button'}>
            Login
          </Link>
          <Link to="/signup" className={mode === 'signup' ? 'pill-button is-active' : 'pill-button'}>
            Sign up
          </Link>
        </div>

        <form className="form-grid" onSubmit={handleAuthSubmit}>
          {mode === 'signup' && (
            <label className="field">
              <span>Full name</span>
              <input
                type="text"
                value={authForm.fullName}
                onChange={(event) => handleAuthInput('fullName', event.target.value)}
                placeholder="Ali Khan"
              />
            </label>
          )}

          <label className="field">
            <span>{mode === 'signup' ? 'Email or phone' : 'Email / phone'}</span>
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
              placeholder="name@example.com or 0300..."
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={authForm.password}
              onChange={(event) => handleAuthInput('password', event.target.value)}
              placeholder="Password"
            />
          </label>

          {mode === 'signup' && (
            <label className="field">
              <span>Confirm password</span>
              <input
                type="password"
                value={authForm.confirmPassword}
                onChange={(event) => handleAuthInput('confirmPassword', event.target.value)}
                placeholder="Confirm password"
              />
            </label>
          )}

          {errorMessage && <p className="error-text">{errorMessage}</p>}
          {statusMessage && <p className="success-text">{statusMessage}</p>}

          <button type="submit" className="primary-button" disabled={isLoading}>
            {isLoading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );

  const renderParkingSetup = () => (
    <div className="dashboard-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Parking account</p>
          <h2>Create your parking</h2>
        </div>
        <button type="button" className="secondary-button" onClick={logout}>Logout</button>
      </header>

      <form className="form-grid panel" onSubmit={handleParkingSubmit}>
        <label className="field">
          <span>Parking name</span>
          <input
            type="text"
            value={parkingForm.name}
            onChange={(event) => setParkingForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="City Parking"
          />
        </label>

        <label className="field">
          <span>Address</span>
          <input
            type="text"
            value={parkingForm.address}
            onChange={(event) => setParkingForm((current) => ({ ...current, address: event.target.value }))}
            placeholder="Naseerabad, Quetta"
          />
        </label>

        <label className="field">
          <span>Contact info</span>
          <input
            type="text"
            value={parkingForm.contactInfo}
            onChange={(event) => setParkingForm((current) => ({ ...current, contactInfo: event.target.value }))}
            placeholder="0300-0000000"
          />
        </label>

        {errorMessage && <p className="error-text">{errorMessage}</p>}
        {statusMessage && <p className="success-text">{statusMessage}</p>}

        <button type="submit" className="primary-button" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Parking'}
        </button>
      </form>
    </div>
  );

  const renderTeam = () => (
    <>
      {activeParking.role === 'owner' && (
        <section className="panel">
          <div className="panel-header"><h3>Invite teammate</h3></div>
          <form className="form-grid team-invite-form" onSubmit={handleInviteSubmit}>
            <label className="field">
              <span>Email or phone</span>
              <input
                type="text"
                value={inviteForm.emailOrPhone}
                onChange={(event) => setInviteForm((current) => ({ ...current, emailOrPhone: event.target.value }))}
                placeholder="manager@example.com"
              />
            </label>
            <label className="field">
              <span>Role</span>
              <select value={inviteForm.role} onChange={(event) => setInviteForm((current) => ({ ...current, role: event.target.value }))}>
                <option value="manager">Manager</option>
                <option value="owner">Owner</option>
              </select>
            </label>
            <button type="submit" className="primary-button" disabled={isLoading}>Send invite</button>
          </form>
        </section>
      )}
      <section className="panel">
        <div className="panel-header"><h3>Pending invitations</h3></div>
        {pendingInvitations.length === 0 ? <p className="muted-text">No pending invitations found.</p> : (
          <div className="list-stack">
            {pendingInvitations.map((invitation) => (
              <div key={invitation._id} className="list-item">
                <div><strong>{invitation.emailOrPhone}</strong><p>{invitation.role} · {invitation.parkingId?.name || 'Parking'}</p></div>
                <button type="button" className="secondary-button" onClick={() => handleAcceptInvitation(invitation._id)}>Accept</button>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );

  if (!token || !user) {
    if (token && isSessionLoading) {
      return (
        <main className="auth-shell">
          <div className="auth-card">
            <p className="eyebrow">easyParking</p>
            <h1>Loading your account...</h1>
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
          <p className="eyebrow">easyParking</p>
          <h1>Loading your account...</h1>
        </div>
      </main>
    );
  }

  if (parkings.length === 0) {
    return renderParkingSetup();
  }

  return (
    <Routes>
      <Route path="/app" element={(
        <div className="app-shell">
          <aside className="app-sidebar">
            <Link to="/app/customers" className="brand-lockup">
              <span className="brand-mark">eP</span>
              <span><strong>easyParking</strong><small>Parking management</small></span>
            </Link>
            <div className="sidebar-parking">
              <label className="field">
                <span>Selected parking</span>
                <select value={selectedParkingId} onChange={(event) => setSelectedParkingId(event.target.value)}>
                  {parkings.map((parking) => <option key={parking._id} value={parking._id}>{parking.name}</option>)}
                </select>
              </label>
            </div>
            <nav className="sidebar-nav" aria-label="Main navigation">
              <NavLink to="/app/dashboard" className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}>Dashboard</NavLink>
              <NavLink to="/app/customers" className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`} end>Customers</NavLink>
              <NavLink to="/app/vehicles" className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}>Vehicles</NavLink>
              <NavLink to="/app/dues" className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}>Dues</NavLink>
              <NavLink to="/app/payments" className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}>Payments</NavLink>
              <NavLink to="/app/daily-parking" className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}>Daily parking</NavLink>
              <NavLink to="/app/reports" className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}>Reports</NavLink>
              <NavLink to="/app/team" className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}>Team</NavLink>
            </nav>
            <div className="sidebar-user">
              <div><strong>{user?.fullName}</strong><span>{activeParking?.role || 'member'}</span></div>
              <button type="button" className="secondary-button" onClick={logout}>Logout</button>
            </div>
          </aside>
          <main className="app-main">
            <header className="app-topbar">
              <div><p className="eyebrow">{activeParking?.name || 'Parking workspace'}</p><h1>{user?.fullName}</h1></div>
              <Link to="/app/payments" className="primary-button">Receive payment</Link>
            </header>
            <Outlet />
            {errorMessage && <p className="error-text">{errorMessage}</p>}
            {statusMessage && <p className="success-text">{statusMessage}</p>}
          </main>
        </div>
      )}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardWorkspace key={`${activeParking?._id}-dashboard`} parkingId={activeParking._id} />} />
        <Route path="reports" element={<ReportsWorkspace key={`${activeParking?._id}-reports`} parkingId={activeParking._id} />} />
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
