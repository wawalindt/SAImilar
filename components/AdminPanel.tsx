import React, { useState, useEffect, useRef } from 'react';
import { AppSettings, AIProvider, UserProfile, TestLogEntry } from '../types';
import { getAvailableModels, ModelName } from '../services/perplexityService';
import { getAllUsers, resetUserPassword } from '../services/firebaseService';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  testLogs: TestLogEntry[];
  onClearLogs: () => void;
  isTestMode: boolean;
  setIsTestMode: (val: boolean) => void;
  testModels: (ModelName | 'gemini')[];
  setTestModels: (val: (ModelName | 'gemini')[]) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  testLogs,
  onClearLogs,
  isTestMode,
  setIsTestMode,
  testModels,
  setTestModels
}) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [activeTab, setActiveTab] = useState<'settings' | 'users' | 'test'>('settings');
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [permissionError, setPermissionError] = useState(false);

  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings, isOpen]);

  // Fetch users when tab is opened
  useEffect(() => {
    if (isOpen && activeTab === 'users') {
      const fetchUsers = async () => {
          setLoadingUsers(true);
          setPermissionError(false);
          try {
              const users = await getAllUsers();
              setUsersList(users);
          } catch (e: any) {
              if (e.message === 'PERMISSION_DENIED') {
                  setPermissionError(true);
              }
              setUsersList([]);
          } finally {
              setLoadingUsers(false);
          }
      };
      fetchUsers();
    }
  }, [isOpen, activeTab]);

  useEffect(() => {
    if (activeTab === 'test' && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [testLogs, activeTab]);

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  const handleResetPassword = async (email?: string) => {
      if (!email) {
          alert("User has no email address.");
          return;
      }
      if (confirm(`Send password reset email to ${email}?`)) {
          try {
              await resetUserPassword(email);
              alert("Password reset email sent!");
          } catch (e: any) {
              alert("Error: " + e.message);
          }
      }
  };

  const providers = [
    { id: 'gemini' as AIProvider, name: 'Google Gemini' },
    { id: 'perplexity' as AIProvider, name: 'Perplexity API' },
  ];

  const availableModels = getAvailableModels();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden animate-fadeIn flex flex-col h-[85vh]">
        {/* Header */}
        <div className="bg-surfaceHover px-6 py-4 flex justify-between items-center border-b border-white/5 flex-shrink-0">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('settings')}
              className={`text-sm font-bold uppercase transition-colors ${
                activeTab === 'settings' ? 'text-primary' : 'text-textMuted hover:text-white'
              }`}
            >
              ⚙️ Settings
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`text-sm font-bold uppercase transition-colors ${
                activeTab === 'users' ? 'text-primary' : 'text-textMuted hover:text-white'
              }`}
            >
              👥 Users
            </button>
            <button
              onClick={() => setActiveTab('test')}
              className={`text-sm font-bold uppercase transition-colors flex items-center gap-2 ${
                activeTab === 'test' ? 'text-primary' : 'text-textMuted hover:text-white'
              }`}
            >
              🧪 Test Logs {testLogs.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{testLogs.length}</span>}
            </button>
          </div>
          <button
            onClick={onClose}
            className="text-textMuted hover:text-white transition-colors"
          >
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-background">
          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <label className="block text-textMuted text-xs uppercase font-bold mb-2">
                  🤖 AI Provider
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {providers.map((p) => (
                    <button
                      key={p.id}
                      onClick={() =>
                        setLocalSettings({
                          ...localSettings,
                          provider: p.id,
                        })
                      }
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                        localSettings.provider === p.id
                          ? 'bg-primary text-white border-primary'
                          : 'bg-background text-textMuted border-surfaceHover hover:border-white/20'
                      }`}
                    >
                      {p.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-textMuted text-xs uppercase font-bold mb-2">
                  🔑 API Keys
                </label>
                <div className="space-y-2">
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-textMuted text-xs">Gemini</span>
                    <input
                      type="password"
                      value={localSettings.apiKeys?.gemini || ''}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          apiKeys: {
                            ...localSettings.apiKeys,
                            gemini: e.target.value,
                          },
                        })
                      }
                      placeholder="AIzaSy..."
                      className="w-full bg-background border border-surfaceHover rounded-lg pl-20 pr-4 py-2 text-sm text-white focus:border-primary outline-none"
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-textMuted text-xs">Perplexity</span>
                    <input
                      type="password"
                      value={localSettings.apiKeys?.perplexity || ''}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          apiKeys: {
                            ...localSettings.apiKeys,
                            perplexity: e.target.value,
                          },
                        })
                      }
                      placeholder="pplx-..."
                      className="w-full bg-background border border-surfaceHover rounded-lg pl-20 pr-4 py-2 text-sm text-white focus:border-primary outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <h3 className="text-white font-bold mb-4 flex items-center justify-between">
                  <span>👥 Registered Users (Firestore)</span>
                  <button onClick={() => { setLoadingUsers(true); getAllUsers().then(u => { setUsersList(u); setLoadingUsers(false); }).catch(e => { if(e.message === 'PERMISSION_DENIED') setPermissionError(true); setLoadingUsers(false); }); }} className="text-xs text-primary hover:underline">
                      <i className="fa-solid fa-rotate"></i> Refresh
                  </button>
              </h3>
              
              {permissionError && (
                  <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-lg text-sm mb-4">
                      <h4 className="text-red-400 font-bold mb-2"><i className="fa-solid fa-triangle-exclamation"></i> ACCESS DENIED TO USER LIST</h4>
                      <p className="text-textMuted mb-2">
                          Your Web App Client does not have permission to list all users. 
                          Being a "Firebase Admin" in the console only gives <b>you</b> access, not the <b>app code</b>.
                      </p>
                      <p className="text-white font-semibold mb-2">To fix this, go to Firebase Console -&gt; Firestore Database -&gt; Rules and paste this:</p>
                      <pre className="bg-black/50 p-3 rounded text-xs text-green-300 overflow-x-auto select-all">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // 1. Allow user to read/write their OWN profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // 2. Allow ADMIN (You) to read ALL users
    // This checks if the requesting user has "role: 'admin'" in their profile
    match /users/{document=**} {
       allow read: if request.auth != null && 
       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // 3. Allow Global Movie Details (Public Read)
    match /movieDetails/{movieId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}`}
                      </pre>
                  </div>
              )}

              {loadingUsers ? (
                  <div className="flex justify-center p-8">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-white/5">
                    <table className="w-full text-left text-sm text-textMuted">
                    <thead className="text-xs uppercase bg-white/5 text-white">
                        <tr>
                        <th className="px-4 py-3 border-b border-white/5">User</th>
                        <th className="px-4 py-3 border-b border-white/5">Role</th>
                        <th className="px-4 py-3 border-b border-white/5 text-center">Lists</th>
                        <th className="px-4 py-3 border-b border-white/5 text-center">Ratings</th>
                        <th className="px-4 py-3 border-b border-white/5 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 bg-surface/50">
                        {usersList.map((user) => (
                        <tr key={user.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3 font-medium text-white">
                            {user.username}
                            {user.email && <div className="text-[10px] text-textMuted">{user.email}</div>}
                            </td>
                            <td className="px-4 py-3">
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                                    user.role === 'owner' ? 'bg-red-500/20 text-red-300' : 
                                    user.role === 'admin' ? 'bg-purple-500/20 text-purple-300' :
                                    user.role === 'editor' ? 'bg-blue-500/20 text-blue-300' :
                                    'bg-white/10 text-textMuted'
                                }`}>
                                    {user.role || 'user'}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                                <div className="flex justify-center gap-3 text-xs">
                                    <span title="Wishlist Items" className="flex items-center gap-1"><i className="fa-solid fa-bookmark text-secondary"></i> {user.wishlistCount || 0}</span>
                                    <span title="Watched Items" className="flex items-center gap-1"><i className="fa-solid fa-check text-primary"></i> {user.watchedCount || 0}</span>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                                {user.userRating ? user.userRating : '-'}
                            </td>
                            <td className="px-4 py-3 text-right">
                                {user.email && (
                                    <button 
                                        onClick={() => handleResetPassword(user.email)}
                                        className="text-textMuted hover:text-red-400 transition-colors"
                                        title="Send Password Reset Email"
                                    >
                                        <i className="fa-solid fa-lock"></i>
                                    </button>
                                )}
                            </td>
                        </tr>
                        ))}
                        {usersList.length === 0 && !permissionError && (
                        <tr>
                            <td colSpan={5} className="px-4 py-8 text-center opacity-50">
                            No users found (or insufficient permissions)
                            </td>
                        </tr>
                        )}
                    </tbody>
                    </table>
                </div>
              )}
            </div>
          )}

          {/* Test Tab */}
          {activeTab === 'test' && (
            <div className="flex flex-col h-full gap-4">
              <div className="bg-surfaceHover p-4 rounded-lg flex-shrink-0 border border-white/5">
                <div className="flex justify-between items-center mb-4">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={isTestMode}
                        onChange={(e) => setIsTestMode(e.target.checked)}
                        className="sr-only"
                      />
                      <div
                        className={`w-10 h-5 rounded-full transition-colors ${
                          isTestMode ? 'bg-green-500' : 'bg-white/10'
                        }`}
                      ></div>
                      <div
                        className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform ${
                          isTestMode ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      ></div>
                    </div>
                    <span className={`font-medium ${isTestMode ? 'text-white' : 'text-textMuted'}`}>
                      {isTestMode ? 'Parallel Testing ENABLED' : 'Enable Testing'}
                    </span>
                  </label>

                  {testLogs.length > 0 && (
                    <button
                      onClick={onClearLogs}
                      className="text-xs bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded text-white border border-white/10 transition-colors"
                    >
                      Clear Logs
                    </button>
                  )}
                </div>

                {isTestMode && (
                  <div>
                    <div className="flex flex-wrap gap-2">
                       <label className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded border transition-colors select-none ${testModels.includes('gemini') ? 'bg-primary/20 border-primary text-white' : 'bg-black/20 border-white/5 text-textMuted hover:border-white/20'}`}>
                            <input
                            type="checkbox"
                            checked={testModels.includes('gemini')}
                            onChange={(e) => {
                                if (e.target.checked) {
                                setTestModels([...testModels, 'gemini']);
                                } else {
                                setTestModels(testModels.filter((m) => m !== 'gemini'));
                                }
                            }}
                            className="hidden"
                            />
                            <span className="text-xs font-bold">Gemini 3 Pro</span>
                        </label>
                      {availableModels.map((model) => (
                        <label
                          key={model.key}
                          className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded border transition-colors select-none ${testModels.includes(model.key) ? 'bg-primary/20 border-primary text-white' : 'bg-black/20 border-white/5 text-textMuted hover:border-white/20'}`}>
                          <input
                            type="checkbox"
                            checked={testModels.includes(model.key)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTestModels([...testModels, model.key]);
                              } else {
                                setTestModels(testModels.filter((m) => m !== model.key));
                              }
                            }}
                            className="hidden"
                          />
                          <span className="text-xs font-bold">{model.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* LOG VIEWER */}
              <div className="flex-1 bg-black/40 border border-white/10 rounded-lg overflow-hidden flex flex-col relative min-h-[400px]">
                {testLogs.length === 0 ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-textMuted opacity-30 p-4">
                    <i className="fa-solid fa-code-compare text-5xl mb-3"></i>
                    <p className="text-sm font-semibold">Waiting for queries...</p>
                  </div>
                ) : (
                  <div className="overflow-y-auto p-4 space-y-4 h-full">
                    {testLogs.map((log, idx) => (
                      <div
                        key={`${log.id}-${idx}`}
                        className="border border-white/10 rounded-lg bg-surface/40 overflow-hidden shadow-sm"
                      >
                        <div className="bg-white/5 px-3 py-2 flex justify-between items-center border-b border-white/5">
                          <div className="flex items-center gap-3">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${log.model.includes('Gemini') ? 'bg-blue-500/20 text-blue-300' : 'bg-teal-500/20 text-teal-300'}`}>
                                {log.model}
                              </span>
                              <span className="text-[10px] text-textMuted font-mono">
                                {new Date(log.timestamp).toLocaleTimeString()}
                              </span>
                          </div>
                          
                          {log.error ? (
                            <span className="text-[10px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded font-bold">ERROR</span>
                          ) : !log.response ? (
                             <span className="text-[10px] text-yellow-400 font-bold flex items-center gap-2">
                                <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span> PROCESSING
                             </span>
                          ) : (
                             <span className="text-[10px] text-green-400 font-bold flex items-center gap-1">
                                <i className="fa-solid fa-check"></i> {log.metadata?.responseTime}ms
                             </span>
                          )}
                        </div>

                        <div className="p-3 space-y-3">
                          <div className="text-xs text-white/90">
                             <span className="text-textMuted font-bold uppercase text-[9px] block mb-1">Query</span>
                             "{log.query}"
                          </div>

                          {log.metadata && (
                              <div className="flex gap-4 text-[10px] text-textMuted font-mono bg-black/20 p-2 rounded border border-white/5">
                                  <span><span className="text-white">In:</span> {log.metadata.inputTokens}</span>
                                  <span><span className="text-white">Out:</span> {log.metadata.outputTokens}</span>
                                  <span><span className="text-white">Cost:</span> ${log.metadata.cost ? log.metadata.cost.toFixed(6) : '0.000'}</span>
                              </div>
                          )}

                          {log.response?.chat_response && (
                            <div>
                              <span className="text-textMuted font-bold uppercase text-[9px] block mb-1">AI Response</span>
                              <div className="text-xs text-textMain bg-black/20 p-2 rounded border border-white/5">
                                {log.response.chat_response}
                              </div>
                            </div>
                          )}

                          {log.response?.recommended_titles &&
                            log.response.recommended_titles.length > 0 && (
                              <div>
                                <span className="text-textMuted font-bold uppercase text-[9px] block mb-1">
                                  Recommendations
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {log.response.recommended_titles.map((title, i) => (
                                    <span key={i} className="bg-primary/10 border border-primary/20 text-primary px-2 py-1 rounded text-[10px] font-medium">
                                      {title}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                          {log.error && (
                            <div className="text-xs text-red-300 bg-red-900/10 border border-red-500/20 p-2 rounded">
                              {log.error}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    <div ref={logsEndRef} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="bg-surfaceHover px-6 py-4 flex justify-end gap-3 border-t border-white/5 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-textMuted hover:text-white transition-colors"
          >
            Close
          </button>
          {activeTab === 'settings' && (
            <button
              onClick={handleSave}
              className="px-6 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-red-700 shadow-lg shadow-primary/20 transition-all"
            >
              Save Changes
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;